import "server-only";

import type { AirtableResponse, Song } from "@/types/song";
import { getDateParts, toDateOnlyString } from "./dates";
import { extractYouTubeId } from "./youtube";

const AIRTABLE_API_TOKEN = process.env.AIRTABLE_API_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = "videos";
const AIRTABLE_VIEW_NAME = "FM Playlist";
const AIRTABLE_PAGE_SIZE = "100";
const MAX_RATE_LIMIT_RETRIES = 4;
const MAX_AIRTABLE_PAGES = 200;

const AIRTABLE_FIELDS = {
  submitterName: "submitterName",
  artistName: "artistName",
  songTitle: "songTitle",
  songDescription: "songDescription",
  youtubeLink: "youtubeLink",
  submittedDate: "submittedDate",
} as const;

function getAirtableUrl(): string {
  return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
}

function retryDelayMs(retryCount: number): number {
  return Math.min(1000 * 2 ** (retryCount - 1), 8000);
}

export async function fetchAllAirtableRecords(): Promise<Song[]> {
  if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID) {
    console.warn("Airtable credentials not configured, skipping Airtable fetch");
    return [];
  }

  const allSongs: Song[] = [];
  let offset: string | undefined;
  let rateLimitRetries = 0;
  let pageCount = 0;
  const skipped = {
    missingUrl: 0,
    invalidUrl: 0,
    invalidDate: 0,
  };

  do {
    pageCount++;
    if (pageCount > MAX_AIRTABLE_PAGES) {
      console.error(
        `[SYNC] Airtable pagination exceeded ${MAX_AIRTABLE_PAGES} pages; stopping sync`
      );
      break;
    }

    const url = new URL(getAirtableUrl());
    url.searchParams.set("pageSize", AIRTABLE_PAGE_SIZE);
    url.searchParams.set("sort[0][field]", AIRTABLE_FIELDS.submittedDate);
    url.searchParams.set("sort[0][direction]", "desc");
    url.searchParams.set("view", AIRTABLE_VIEW_NAME);
    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      if (response.status === 429) {
        rateLimitRetries++;
        if (rateLimitRetries > MAX_RATE_LIMIT_RETRIES) {
          console.error("Airtable rate limit: max retries exceeded");
          break;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelayMs(rateLimitRetries))
        );
        continue;
      }
      console.error(`Airtable API error: ${response.status} ${response.statusText}`);
      break;
    }

    rateLimitRetries = 0; // Reset on success

    const data: AirtableResponse = await response.json();

    for (const record of data.records) {
      const { fields } = record;
      const youtubeUrl = fields[AIRTABLE_FIELDS.youtubeLink];
      if (!youtubeUrl) {
        skipped.missingUrl++;
        continue;
      }

      const videoId = extractYouTubeId(youtubeUrl);
      if (!videoId) {
        skipped.invalidUrl++;
        continue;
      }

      let submittedDate: string;
      let month: number;
      let year: number;
      try {
        submittedDate = toDateOnlyString(
          fields[AIRTABLE_FIELDS.submittedDate] || record.createdTime
        );
        ({ month, year } = getDateParts(submittedDate));
      } catch {
        skipped.invalidDate++;
        continue;
      }

      allSongs.push({
        id: `at_${record.id}`,
        source: "airtable",
        airtableRecordId: record.id,
        submitterUserId: null,
        submitterName: fields[AIRTABLE_FIELDS.submitterName] || "Anonymous",
        submitterEmail: null,
        artistName: fields[AIRTABLE_FIELDS.artistName] || null,
        songTitle: fields[AIRTABLE_FIELDS.songTitle] || null,
        description: fields[AIRTABLE_FIELDS.songDescription] || null,
        youtubeUrl,
        youtubeVideoId: videoId,
        submittedDate,
        month,
        year,
        likeCount: 0,
        commentCount: 0,
        userLiked: false,
      });
    }

    offset = data.offset;
  } while (offset);

  const skippedTotal = skipped.missingUrl + skipped.invalidUrl + skipped.invalidDate;
  if (skippedTotal > 0) {
    console.warn(
      `[SYNC] Skipped ${skippedTotal} Airtable rows: ${skipped.missingUrl} missing URL, ${skipped.invalidUrl} invalid URL, ${skipped.invalidDate} invalid date`
    );
  }

  return allSongs;
}
