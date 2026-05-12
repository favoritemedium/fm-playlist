"use client";

import type { Song } from "@/types/song";
import { SongCard } from "./SongCard";

interface ThumbnailGridProps {
  songs: Song[];
  activeVideoId: string | null;
  onSelect: (song: Song) => void;
}

export function ThumbnailGrid({
  songs,
  activeVideoId,
  onSelect,
}: ThumbnailGridProps) {
  return (
    <div>
      <h3 className="text-xl font-black mb-4 text-foreground">All Tracks</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {songs.map((song, index) => (
          <SongCard
            key={song.id}
            song={song}
            isActive={activeVideoId === song.id}
            index={index}
            onClick={() => onSelect(song)}
          />
        ))}
      </div>
    </div>
  );
}
