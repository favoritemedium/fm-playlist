"use client";

import { motion } from "motion/react";
import type { Song } from "@/types/song";
import { formatDateOnlyForDisplay } from "@/lib/dates";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

interface VideoPlayerProps {
  song: Song;
  autoplay?: boolean;
}

export function VideoPlayer({ song, autoplay = false }: VideoPlayerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-primary/20"
    >
      <div className="relative aspect-video bg-black">
        <iframe
          key={song.id}
          src={getYouTubeEmbedUrl(song.youtubeVideoId, autoplay)}
          title={song.songTitle || "YouTube video"}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="p-4 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="font-bold text-foreground">{song.submitterName}</p>
          {song.songTitle && (
            <p className="text-sm text-muted-foreground">
              — {song.songTitle}
              {song.artistName && ` by ${song.artistName}`}
            </p>
          )}
        </div>
        {song.description && (
          <p className="text-lg text-foreground leading-relaxed font-medium">
            &ldquo;{song.description}&rdquo;
          </p>
        )}
        <div className="text-sm text-muted-foreground font-semibold">
          Added {formatDateOnlyForDisplay(song.submittedDate)}
        </div>
      </div>
    </motion.div>
  );
}
