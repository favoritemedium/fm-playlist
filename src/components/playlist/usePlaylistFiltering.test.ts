import { describe, expect, it } from "vitest";
import { ALL_FILTER_VALUE } from "@/lib/constants";
import { songMatchesMonthYearFilter } from "./usePlaylistFiltering";

const song = { month: 3, year: 2026 };

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