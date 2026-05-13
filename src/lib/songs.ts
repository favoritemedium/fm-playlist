import "server-only";

import type { Song, CreateSongInput } from "@/types/song";
import type { AppUser } from "@/lib/auth";
import { fetchAllAirtableRecords } from "./airtable";
import {
  fetchAllSongs,
  createSongRow,
  bulkCreateSongRows,
  type SongInsert,
} from "./songs-db";
import { compareDateOnlyDesc, getDateParts, toDateOnlyString } from "./dates";
import { syncAppUserIdentity } from "./users-db";
import { extractYouTubeId } from "./youtube";

/** Normalize a composite key for dedup comparison. Trims whitespace,
 *  lowercases, and strips any time component from dates. */
function songKey(name: string, date: string, url: string): string {
  return `${name.trim().toLowerCase()}|${toDateOnlyString(date)}|${url.trim().toLowerCase()}`;
}

export async function getAllSongs(user?: AppUser): Promise<Song[]> {
  if (user) {
    await syncAppUserIdentity(user);
  }

  const currentUserId = user?.id ?? null;
  const airtableSongsPromise =
    fetchAllAirtableRecords().catch((err) => {
      console.error("Airtable fetch failed:", err);
      return [] as Song[];
    });

  // Postgres is the source of truth. If it fails, surface the failure instead
  // of showing an empty playlist that looks valid.
  const [airtableSongs, dbSongs] = await Promise.all([
    airtableSongsPromise,
    fetchAllSongs(currentUserId),
  ]);

  let syncedDbSongs = dbSongs;

  // 2. Build a set of composite keys from the DB rows we already fetched
  const existingKeys = new Set<string>();
  const existingAirtableIds = new Set<string>();
  for (const s of dbSongs) {
    existingKeys.add(songKey(s.submitterName, s.submittedDate, s.youtubeUrl));
    if (s.airtableRecordId) {
      existingAirtableIds.add(s.airtableRecordId);
    }
  }

  console.log(
    `[SYNC] Airtable: ${airtableSongs.length} rows, DB: ${dbSongs.length} rows, DB keys: ${existingKeys.size}, Airtable IDs: ${existingAirtableIds.size}`
  );

  // 3. Find Airtable records that don't exist in the DB
  const newAirtableSongs = airtableSongs.filter(
    (song) =>
      !existingAirtableIds.has(song.airtableRecordId ?? "") &&
      !existingKeys.has(
        songKey(song.submitterName, song.submittedDate, song.youtubeUrl)
      )
  );

  // 4. Insert new records into the DB (await so next reload sees them)
  if (newAirtableSongs.length > 0) {
    try {
      const rows: SongInsert[] = newAirtableSongs.map((song) => ({
        source: "airtable",
        airtable_record_id: song.airtableRecordId,
        submitter_user_id: null,
        submitter_name: song.submitterName,
        submitter_email: null,
        artist_name: song.artistName,
        song_title: song.songTitle,
        description: song.description,
        youtube_url: song.youtubeUrl,
        youtube_video_id: song.youtubeVideoId,
        submitted_date: song.submittedDate,
        month: song.month,
        year: song.year,
      }));
      const insertedCount = await bulkCreateSongRows(rows);
      console.log(
        `[SYNC] Inserted ${insertedCount}/${newAirtableSongs.length} new Airtable rows into Postgres`
      );
      syncedDbSongs = await fetchAllSongs(currentUserId);
    } catch (err) {
      console.error("Airtable→DB sync failed:", err);
    }
  }

  // 5. Return DB-backed songs only. Interactions need stable `db_` IDs.
  const merged: Song[] = [...syncedDbSongs];

  merged.sort((a, b) => {
    return compareDateOnlyDesc(a.submittedDate, b.submittedDate);
  });

  return merged;
}

export async function createSong(
  input: CreateSongInput,
  user: AppUser
): Promise<Song> {
  await syncAppUserIdentity(user);

  const youtubeUrl = input.youtubeUrl.trim();
  const description = input.description?.trim();
  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  const now = new Date();
  const submittedDate = toDateOnlyString(now);
  const { month, year } = getDateParts(submittedDate);

  return createSongRow({
    source: "app",
    airtable_record_id: null,
    submitter_user_id: user.id,
    submitter_name: user.name,
    submitter_email: user.email,
    artist_name: null,
    song_title: null,
    description: description || null,
    youtube_url: youtubeUrl,
    youtube_video_id: videoId,
    submitted_date: submittedDate,
    month,
    year,
  });
}
