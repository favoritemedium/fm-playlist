import { describe, expect, it } from "vitest";
import { ALL_FILTER_VALUE } from "@/lib/constants";
import type { Song } from "@/types/song";
import { songMatchesMonthYearFilter, sortPlaylistSongs } from "./usePlaylistFiltering";

const song = { month: 3, year: 2026 };

function makeSong(overrides: Partial<Song>): Song {
  return {
    id: "db_1",
    source: "app",
    airtableRecordId: null,
    submitterUserId: null,
    submitterName: "Test User",
    submitterEmail: "test@favoritemedium.com",
    artistName: null,
    songTitle: null,
    description: null,
    youtubeUrl: "https://www.youtube.com/watch?v=abcdefghijk",
    youtubeVideoId: "abcdefghijk",
    submittedDate: "2026-03-01",
    month: 3,
    year: 2026,
    likeCount: 0,
    commentCount: 0,
    userLiked: false,
    ...overrides,
  };
}

describe("songMatchesMonthYearFilter", () => {
  it("matches a specific month and year", () => {
    expect(songMatchesMonthYearFilter(song, 2026, 3)).toBe(true);
    expect(songMatchesMonthYearFilter(song, 2025, 3)).toBe(false);
    expect(songMatchesMonthYearFilter(song, 2026, 4)).toBe(false);
  });

  it("treats all as an unbounded year or month filter", () => {
    expect(songMatchesMonthYearFilter(song, ALL_FILTER_VALUE, 3)).toBe(true);
    expect(songMatchesMonthYearFilter(song, 2026, ALL_FILTER_VALUE)).toBe(true);
    expect(
      songMatchesMonthYearFilter(song, ALL_FILTER_VALUE, ALL_FILTER_VALUE)
    ).toBe(true);
  });
});

describe("sortPlaylistSongs", () => {
  it("sorts filtered songs by most liked", () => {
    const songs = [
      makeSong({ id: "db_1", likeCount: 1, submittedDate: "2026-03-03" }),
      makeSong({ id: "db_2", likeCount: 4, submittedDate: "2026-03-01" }),
      makeSong({ id: "db_3", likeCount: 4, submittedDate: "2026-03-04" }),
    ];

    expect(sortPlaylistSongs(songs, "most-liked").map((item) => item.id)).toEqual([
      "db_3",
      "db_2",
      "db_1",
    ]);
  });
});