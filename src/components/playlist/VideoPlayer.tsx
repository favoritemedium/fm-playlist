"use client";

import { motion } from "motion/react";
import { Heart, MessageSquare } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Song } from "@/types/song";
import { formatDateOnlyForDisplay } from "@/lib/dates";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import { LikesTooltip } from "./LikesTooltip";

interface VideoPlayerProps {
  song: Song;
  autoplay?: boolean;
  isLikePending: boolean;
  onLikeToggle: (song: Song) => void;
  onOpenEngagement: (song: Song) => void;
}

export function VideoPlayer({
  song,
  autoplay = false,
  isLikePending,
  onLikeToggle,
  onOpenEngagement,
}: VideoPlayerProps) {
  const t = useTranslations("videoPlayer");
  const locale = useLocale();
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
          title={song.songTitle || t("iframeTitle")}
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
              {song.artistName && ` ${t("byArtist", { artist: song.artistName })}`}
            </p>
          )}
        </div>
        {song.description && (
          <p className="text-lg text-foreground leading-relaxed font-medium">
            &ldquo;{song.description}&rdquo;
          </p>
        )}
        <div className="text-sm text-muted-foreground font-semibold">
          {t("added", { date: formatDateOnlyForDisplay(song.submittedDate, locale) })}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <LikesTooltip songId={song.id} likeCount={song.likeCount}>
            <Button
              type="button"
              disabled={isLikePending}
              onClick={() => onLikeToggle(song)}
              title={song.userLiked ? t("unlike") : t("like")}
              className={
                song.userLiked
                  ? "bg-primary hover:bg-primary/90 text-white font-bold"
                  : "bg-white text-foreground border-2 border-border hover:border-primary font-bold"
              }
            >
              <Heart
                className="size-4"
                fill={song.userLiked ? "currentColor" : "none"}
              />
              {song.likeCount}
            </Button>
          </LikesTooltip>
          <Button
            type="button"
            onClick={() => onOpenEngagement(song)}
            title={t("openComments")}
            className="bg-white text-foreground border-2 border-border hover:border-secondary font-bold"
          >
            <MessageSquare className="size-4 text-secondary" />
            {song.commentCount}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
