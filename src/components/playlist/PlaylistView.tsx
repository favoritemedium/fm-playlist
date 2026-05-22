"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowDownUp, Bell, X } from "lucide-react";
import { PlaylistSettings } from "./PlaylistSettings";
import { LanguageDropdown } from "./LanguageDropdown";
import type {
  Song,
  SongEngagementEvent,
  SongEngagementSummary,
} from "@/types/song";
import {
  ALL_FILTER_VALUE,
  getCurrentMonth,
  getCurrentYear,
  isAllFilterValue,
  type PlaylistFilterValue,
} from "@/lib/constants";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MonthYearFilter } from "./MonthYearFilter";
import { SearchBar } from "./SearchBar";
import { VideoPlayer } from "./VideoPlayer";
import { ThumbnailGrid } from "./ThumbnailGrid";
import { AddTrackDialog } from "./AddTrackDialog";
import { EngagementDialog } from "./EngagementDialog";
import { useEngagementEvents } from "./useEngagementEvents";
import {
  usePlaylistFiltering,
  type PlaylistSortMode,
} from "./usePlaylistFiltering";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateLikerInCache } from "@/lib/likers-cache";
import { useTranslations } from "next-intl";

interface PlaylistViewProps {
  initialSongs: Song[];
  user?: {
    id?: string;
    name?: string;
    picture?: string;
    email?: string;
  } | null;
}

interface PlaylistNotification {
  id: string;
  songId: string;
  commentId: number;
  commenterName: string;
  createdAt: string;
}

interface SummaryResponse {
  summary: SongEngagementSummary;
}

const AUTOPLAY_STORAGE_KEY = "fm-playlist-autoplay-enabled";

export function PlaylistView({ initialSongs, user }: PlaylistViewProps) {
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [selectedYear, setSelectedYear] = useState<PlaylistFilterValue>(
    getCurrentYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<PlaylistFilterValue>(
    getCurrentMonth()
  );
  const [sortMode, setSortMode] = useState<PlaylistSortMode>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState<Song | null>(null);
  const [engagementSongId, setEngagementSongId] = useState<string | null>(null);
  const [pendingLikeSongIds, setPendingLikeSongIds] = useState<Set<string>>(
    () => new Set()
  );
  const [engagementError, setEngagementError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<PlaylistNotification[]>([]);
  const [autoplayEnabled, setAutoplayEnabled] = useState(false);
  const [shouldAutoplayActiveVideo, setShouldAutoplayActiveVideo] =
    useState(false);
  const t = useTranslations("playlist");
  const tEngagement = useTranslations("engagement");

  const {
    availableYears,
    availableMonths,
    filteredSongs,
    getAvailableMonthsForYear,
  } = usePlaylistFiltering({
    songs,
    searchQuery,
    selectedYear,
    selectedMonth,
    sortMode,
  });

  useEffect(() => {
    try {
      const savedAutoplay = window.localStorage.getItem(AUTOPLAY_STORAGE_KEY);
      if (savedAutoplay !== null) {
        setAutoplayEnabled(savedAutoplay === "true");
      }
    } catch {
      // Ignore unavailable localStorage, such as private browsing restrictions.
    }
  }, []);

  // Keep year and month selection valid as the search result set changes.
  useEffect(() => {
    let nextYear = selectedYear;
    let nextMonth = selectedMonth;

    if (!isAllFilterValue(selectedYear) && !availableYears.includes(selectedYear)) {
      nextYear = ALL_FILTER_VALUE;
      nextMonth = ALL_FILTER_VALUE;
    }

    const monthsForYear = getAvailableMonthsForYear(nextYear);
    if (!isAllFilterValue(nextMonth) && !monthsForYear.includes(nextMonth)) {
      nextMonth = ALL_FILTER_VALUE;
    }

    if (nextYear !== selectedYear) {
      setSelectedYear(nextYear);
    }

    if (nextMonth !== selectedMonth) {
      setSelectedMonth(nextMonth);
    }
  }, [
    availableYears,
    getAvailableMonthsForYear,
    selectedMonth,
    selectedYear,
  ]);

  // Auto-select first video when filter changes
  const currentActive = useMemo(() => {
    if (activeVideo) {
      const visibleActive = filteredSongs.find((s) => s.id === activeVideo.id);
      if (visibleActive) return visibleActive;
    }
    return filteredSongs[0] || null;
  }, [filteredSongs, activeVideo]);

  const engagementSong = useMemo(() => {
    if (!engagementSongId) return null;
    return songs.find((song) => song.id === engagementSongId) ?? null;
  }, [engagementSongId, songs]);

  const applyEngagementSummary = useCallback(
    (summary: SongEngagementSummary) => {
      setSongs((currentSongs) =>
        currentSongs.map((song) =>
          song.id === summary.songId
            ? song.likeCount === summary.likeCount &&
              song.commentCount === summary.commentCount &&
              song.userLiked === summary.userLiked
              ? song
              : {
                ...song,
                likeCount: summary.likeCount,
                commentCount: summary.commentCount,
                userLiked: summary.userLiked,
              }
            : song
        )
      );
    },
    []
  );

  const applyEngagementEvent = useCallback(
    (event: SongEngagementEvent) => {
      if (event.type === "song_engagement_updated") {
        setSongs((currentSongs) =>
          currentSongs.map((song) => {
            if (song.id !== event.songId) return song;

            const userLiked =
              event.actorUserId &&
              event.actorUserId === user?.id &&
              typeof event.actorLiked === "boolean"
                ? event.actorLiked
                : song.userLiked;

            return {
              ...song,
              likeCount: event.likeCount,
              commentCount: event.commentCount,
              userLiked,
            };
          })
        );
        return;
      }

      const notification = {
        id: `${event.songId}-${event.commentId}`,
        songId: event.songId,
        commentId: event.commentId,
        commenterName: event.commenterName,
        createdAt: event.createdAt,
      };

      setNotifications((current) => {
        if (current.some((item) => item.id === notification.id)) return current;
        return [notification, ...current].slice(0, 3);
      });
    },
    [user?.id]
  );

  useEngagementEvents(user ? applyEngagementEvent : null);

  const setLikePending = useCallback((songId: string, pending: boolean) => {
    setPendingLikeSongIds((current) => {
      const next = new Set(current);
      if (pending) {
        next.add(songId);
      } else {
        next.delete(songId);
      }
      return next;
    });
  }, []);

  const handleLikeToggle = useCallback(
    async (song: Song) => {
      if (pendingLikeSongIds.has(song.id)) return;

      const nextLiked = !song.userLiked;
      const previousSummary: SongEngagementSummary = {
        songId: song.id,
        likeCount: song.likeCount,
        commentCount: song.commentCount,
        userLiked: song.userLiked,
      };

      applyEngagementSummary({
        ...previousSummary,
        likeCount: Math.max(0, song.likeCount + (nextLiked ? 1 : -1)),
        userLiked: nextLiked,
      });

      if (user) {
        updateLikerInCache(
          song.id,
          {
            id: user.id || "",
            name: user.name || "",
            email: user.email || "",
            picture: user.picture || null,
          },
          nextLiked
        );
      }

      setLikePending(song.id, true);
      setEngagementError(null);

      try {
        const response = await fetch(`/api/songs/${song.id}/likes`, {
          method: nextLiked ? "POST" : "DELETE",
        });
        const data = (await response.json()) as unknown;

        if (!response.ok) {
          const message =
            data &&
            typeof data === "object" &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Failed to update like";
          throw new Error(message);
        }

        applyEngagementSummary((data as SummaryResponse).summary);
      } catch (err) {
        applyEngagementSummary(previousSummary);
        if (user) {
          updateLikerInCache(
            song.id,
            {
              id: user.id || "",
              name: user.name || "",
              email: user.email || "",
              picture: user.picture || null,
            },
            !nextLiked
          );
        }
        setEngagementError(
          err instanceof Error ? err.message : tEngagement("errors.failedToUpdateLike")
        );
      } finally {
        setLikePending(song.id, false);
      }
    },
    [applyEngagementSummary, pendingLikeSongIds, setLikePending, user, tEngagement]
  );

  useEffect(() => {
    if (!activeVideo) return;

    const activeVideoIsVisible = filteredSongs.some(
      (song) => song.id === activeVideo.id
    );

    if (!activeVideoIsVisible) {
      setShouldAutoplayActiveVideo(false);
    }
  }, [activeVideo, filteredSongs]);

  const handleAutoplayToggle = useCallback(() => {
    setAutoplayEnabled((currentValue) => {
      const nextValue = !currentValue;
      try {
        window.localStorage.setItem(
          AUTOPLAY_STORAGE_KEY,
          nextValue ? "true" : "false"
        );
      } catch {
        // Ignore unavailable localStorage, such as private browsing restrictions.
      }
      return nextValue;
    });
  }, []);

  const handleYearChange = useCallback(
    (year: PlaylistFilterValue) => {
      setSelectedYear(year);

      if (isAllFilterValue(year)) {
        setSelectedMonth(ALL_FILTER_VALUE);
      } else if (!isAllFilterValue(selectedMonth)) {
        const monthsForYear = getAvailableMonthsForYear(year);
        setSelectedMonth(
          monthsForYear[monthsForYear.length - 1] ?? ALL_FILTER_VALUE
        );
      }

      setActiveVideo(null);
      setShouldAutoplayActiveVideo(false);
    },
    [getAvailableMonthsForYear, selectedMonth]
  );

  const handleMonthChange = useCallback((month: PlaylistFilterValue) => {
    setSelectedMonth(month);
    setShouldAutoplayActiveVideo(false);
  }, []);

  const handleSongSelect = useCallback(
    (song: Song) => {
      setActiveVideo(song);
      setShouldAutoplayActiveVideo(autoplayEnabled);
    },
    [autoplayEnabled]
  );

  const handleTrackAdded = useCallback((song: Song) => {
    setSongs((prev) => [song, ...prev]);
    setSelectedYear(song.year);
    setSelectedMonth(song.month);
    setActiveVideo(song);
    setShouldAutoplayActiveVideo(false);
  }, []);

  const handleOpenEngagement = useCallback((song: Song) => {
    setEngagementSongId(song.id);
  }, []);

  const handleNotificationOpen = useCallback(
    (notification: PlaylistNotification) => {
      const song = songs.find((item) => item.id === notification.songId);
      if (!song) return;

      setSelectedYear(song.year);
      setSelectedMonth(song.month);
      setActiveVideo(song);
      setShouldAutoplayActiveVideo(false);
      setEngagementSongId(song.id);
      setNotifications((current) =>
        current.filter((item) => item.id !== notification.id)
      );
    },
    [songs]
  );

  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId)
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Header
          user={user}
          settings={
            <div className="flex items-center gap-2">
              <LanguageDropdown />
              <PlaylistSettings
                startPlayingWhenSelected={autoplayEnabled}
                onStartPlayingWhenSelectedChange={handleAutoplayToggle}
              />
            </div>
          }
        />

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-10"
        >
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full lg:w-auto">
            <MonthYearFilter
              availableYears={availableYears}
              availableMonths={availableMonths}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onYearChange={handleYearChange}
              onMonthChange={handleMonthChange}
            />
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <div className="flex items-center gap-2 bg-white px-3 sm:px-5 py-2 sm:py-3 rounded-xl shadow-md border border-border w-full sm:w-auto">
              <ArrowDownUp
                className="w-5 h-5 text-secondary shrink-0"
                strokeWidth={2.5}
              />
              <Select
                value={sortMode}
                onValueChange={(value) => setSortMode(value as PlaylistSortMode)}
              >
                <SelectTrigger className="flex-1 sm:w-36 sm:flex-none bg-transparent border-0 shadow-none font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("sort.newest")}</SelectItem>
                  <SelectItem value="most-liked">{t("sort.mostLiked")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          {user && (
            <div className="w-full lg:w-auto">
              <AddTrackDialog onTrackAdded={handleTrackAdded} />
            </div>
          )}
        </motion.div>

        {(engagementError || notifications.length > 0) && (
          <div className="mb-8 space-y-3" aria-live="polite">
            {engagementError && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                <span>{engagementError}</span>
                <button
                  type="button"
                  aria-label={t("notification.dismissError")}
                  title={t("notification.dismissError")}
                  onClick={() => setEngagementError(null)}
                  className="rounded-md p-1 hover:bg-destructive/10"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => handleNotificationOpen(notification)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Bell className="size-5 shrink-0 text-secondary" />
                  <span className="truncate text-sm font-bold text-foreground">
                    {t("notification.newComment", { name: notification.commenterName })}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={t("notification.dismissNotification")}
                  title={t("notification.dismissNotification")}
                  onClick={() => dismissNotification(notification.id)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-secondary/10 hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Playlist */}
        {filteredSongs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <h3 className="text-3xl font-black mb-3 text-foreground">
              {searchQuery ? t("empty.noMatchingTitle") : t("empty.noTracksTitle")}
            </h3>
            <p className="text-lg text-muted-foreground mb-8 font-medium">
              {searchQuery
                ? t("empty.noMatchingDescription")
                : t("empty.noTracksDescription")}
            </p>
            {!searchQuery && user && (
              <AddTrackDialog onTrackAdded={handleTrackAdded} />
            )}
          </motion.div>
        ) : (
          <div className="space-y-8">
            {currentActive && (
              <VideoPlayer
                song={currentActive}
                autoplay={
                  shouldAutoplayActiveVideo &&
                  activeVideo?.id === currentActive.id
                }
                isLikePending={pendingLikeSongIds.has(currentActive.id)}
                onLikeToggle={handleLikeToggle}
                onOpenEngagement={handleOpenEngagement}
              />
            )}
            <ThumbnailGrid
              songs={filteredSongs}
              activeVideoId={currentActive?.id || null}
              onSelect={handleSongSelect}
            />
          </div>
        )}

        <Footer
          trackCount={filteredSongs.length}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
        <EngagementDialog
          song={engagementSong}
          open={Boolean(engagementSong)}
          isLikePending={
            engagementSong ? pendingLikeSongIds.has(engagementSong.id) : false
          }
          onOpenChange={(open) => {
            if (!open) setEngagementSongId(null);
          }}
          onLikeToggle={handleLikeToggle}
          onSummaryChange={applyEngagementSummary}
        />
      </div>
    </div>
  );
}
