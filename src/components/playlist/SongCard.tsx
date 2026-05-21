"use client";

import { Heart, MessageSquare, Play } from "lucide-react";
import Image from "next/image";
import type { Song } from "@/types/song";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";
import { LikesTooltip } from "./LikesTooltip";

interface SongCardProps {
  song: Song;
  isActive: boolean;
  index: number;
  onClick: () => void;
}

export function SongCard({ song, isActive, index, onClick }: SongCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative aspect-video bg-black rounded-xl overflow-hidden transition-all ${
        isActive
          ? "ring-4 ring-primary shadow-xl shadow-primary/30"
          : "ring-2 ring-border hover:ring-primary/50 shadow-md"
      }`}
    >
      <Image
        src={getYouTubeThumbnailUrl(song.youtubeVideoId)}
        alt={`${song.submitterName}'s track`}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
        loading={index === 0 ? "eager" : "lazy"}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20">
        <LikesTooltip songId={song.id} likeCount={song.likeCount}>
          <span className="inline-flex min-w-10 items-center justify-center gap-1 rounded-full bg-black/80 px-2 py-1 text-[11px] font-black text-white">
            <Heart
              className="size-3"
              fill={song.userLiked ? "currentColor" : "none"}
            />
            {song.likeCount}
          </span>
        </LikesTooltip>
        {song.commentCount > 0 && (
          <span className="inline-flex min-w-10 items-center justify-center gap-1 rounded-full bg-black/80 px-2 py-1 text-[11px] font-black text-white">
            <MessageSquare className="size-3" />
            {song.commentCount}
          </span>
        )}
      </div>
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
            <Play
              className="w-6 h-6 text-white ml-0.5"
              fill="currentColor"
              strokeWidth={0}
            />
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/90">
        <p className="text-xs font-bold text-white truncate">
          {song.submitterName}
        </p>
      </div>
    </button>
  );
}
