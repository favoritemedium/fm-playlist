"use client";

import { useCallback, useMemo } from "react";
import type { Song } from "@/types/song";
import {
  getCurrentMonth,
  getCurrentYear,
  isAllFilterValue,
  type PlaylistFilterValue,
} from "@/lib/constants";

interface UsePlaylistFilteringOptions {
  songs: Song[];
  searchQuery: string;
  selectedYear: PlaylistFilterValue;
  selectedMonth: PlaylistFilterValue;
  sortMode?: PlaylistSortMode;
}

export type PlaylistSortMode = "newest" | "most-liked";

export function sortPlaylistSongs(
  songs: Song[],
  sortMode: PlaylistSortMode
): Song[] {
  if (sortMode !== "most-liked") return songs;

  return [...songs].sort((a, b) => {
    const likeDifference = b.likeCount - a.likeCount;
    if (likeDifference !== 0) return likeDifference;
    return b.submittedDate.localeCompare(a.submittedDate);
  });
}

export function songMatchesMonthYearFilter(
  song: Pick<Song, "month" | "year">,
  selectedYear: PlaylistFilterValue,
  selectedMonth: PlaylistFilterValue
): boolean {
  const matchesYear =
    isAllFilterValue(selectedYear) || song.year === selectedYear;
  const matchesMonth =
    isAllFilterValue(selectedMonth) || song.month === selectedMonth;

  return matchesYear && matchesMonth;
}

export function usePlaylistFiltering({
  songs,
  searchQuery,
  selectedYear,
  selectedMonth,
  sortMode = "newest",
}: UsePlaylistFilteringOptions) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const searchMatchedSongs = useMemo(() => {
    if (!normalizedQuery) return songs;

    return songs.filter(
      (song) =>
        song.submitterName.toLowerCase().includes(normalizedQuery) ||
        (song.songTitle?.toLowerCase().includes(normalizedQuery) ?? false) ||
        (song.artistName?.toLowerCase().includes(normalizedQuery) ?? false) ||
        (song.description?.toLowerCase().includes(normalizedQuery) ?? false)
    );
  }, [songs, normalizedQuery]);

  const availableYears = useMemo(() => {
    const years = new Set(searchMatchedSongs.map((song) => song.year));
    if (!normalizedQuery) years.add(getCurrentYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [searchMatchedSongs, normalizedQuery]);

  const getAvailableMonthsForYear = useCallback(
    (year: PlaylistFilterValue) => {
      const months = new Set(
        searchMatchedSongs
          .filter((song) => isAllFilterValue(year) || song.year === year)
          .map((song) => song.month)
      );

      if (
        !normalizedQuery &&
        (isAllFilterValue(year) || year === getCurrentYear())
      ) {
        months.add(getCurrentMonth());
      }

      return Array.from(months).sort((a, b) => a - b);
    },
    [searchMatchedSongs, normalizedQuery]
  );

  const availableMonths = useMemo(
    () => getAvailableMonthsForYear(selectedYear),
    [getAvailableMonthsForYear, selectedYear]
  );

  const filteredSongs = useMemo(() => {
    const matches = searchMatchedSongs.filter((song) =>
      songMatchesMonthYearFilter(song, selectedYear, selectedMonth)
    );

    return sortPlaylistSongs(matches, sortMode);
  }, [searchMatchedSongs, selectedYear, selectedMonth, sortMode]);

  return {
    availableYears,
    availableMonths,
    filteredSongs,
    getAvailableMonthsForYear,
  };
}
