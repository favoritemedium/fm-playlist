"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import type { Song } from "@/types/song";
import { SongCard } from "./SongCard";
import { Button } from "@/components/ui/button";

const INITIAL_PAGE_SIZE = 30;
const PAGE_SIZE_INCREMENT = 30;

interface ThumbnailGridProps {
  songs: Song[];
  activeVideoId: string | null;
  playedSongIds?: Set<string>;
  onSelect: (song: Song) => void;
  isLoggedIn: boolean;
  pendingBookmarkSongIds: Set<string>;
  onBookmarkToggle: (song: Song) => void;
}

export function ThumbnailGrid({
  songs,
  activeVideoId,
  playedSongIds,
  onSelect,
  isLoggedIn,
  pendingBookmarkSongIds,
  onBookmarkToggle,
}: ThumbnailGridProps) {
  const t = useTranslations("playlist");
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);

  // Engagement updates replace song objects without changing the result set.
  const resultIds = songs.map((song) => song.id).join(",");
  useEffect(() => {
    setVisibleCount(INITIAL_PAGE_SIZE);
  }, [resultIds]);

  // Ensure currently selected active track is always rendered
  useEffect(() => {
    if (!activeVideoId) return;
    const activeIndex = songs.findIndex((s) => s.id === activeVideoId);
    if (activeIndex >= visibleCount) {
      setVisibleCount(Math.ceil((activeIndex + 1) / PAGE_SIZE_INCREMENT) * PAGE_SIZE_INCREMENT);
    }
  }, [activeVideoId, songs, visibleCount]);

  const visibleSongs = songs.slice(0, visibleCount);
  const hasMore = visibleCount < songs.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE_INCREMENT, songs.length));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-black text-foreground tracking-tight">
            {t("allTracks")}
          </h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-neutral-200/70 text-foreground/80">
            {songs.length}
          </span>
        </div>
        {songs.length > INITIAL_PAGE_SIZE && (
          <span className="text-xs font-semibold text-muted-foreground">
            {t("pagination.showing", { count: visibleSongs.length, total: songs.length })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {visibleSongs.map((song, index) => (
          <SongCard
            key={song.id}
            song={song}
            isActive={activeVideoId === song.id}
            isPlayed={playedSongIds?.has(song.id)}
            index={index}
            onClick={() => onSelect(song)}
            isLoggedIn={isLoggedIn}
            isBookmarkPending={pendingBookmarkSongIds.has(song.id)}
            onBookmarkToggle={() => onBookmarkToggle(song)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex flex-col items-center justify-center pt-4 pb-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleLoadMore}
            className="rounded-xl font-bold bg-white/80 hover:bg-white border-2 border-border/80 hover:border-primary px-6 py-5 shadow-sm hover:shadow-md transition-all gap-2 text-foreground"
          >
            <span>{t("pagination.loadMore", { count: songs.length - visibleCount })}</span>
            <ChevronDown className="size-4 text-primary" />
          </Button>
        </div>
      )}
    </div>
  );
}
