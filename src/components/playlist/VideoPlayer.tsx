"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Heart, MessageSquare } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Song } from "@/types/song";
import { formatDateOnlyForDisplay } from "@/lib/dates";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import { LikesTooltip } from "./LikesTooltip";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/constants";

interface VideoPlayerProps {
  song: Song;
  autoplay?: boolean;
  isLikePending: boolean;
  isLoggedIn?: boolean;
  onLikeToggle: (song: Song) => void;
  onOpenEngagement: (song: Song) => void;
  onVideoEnd?: () => void;
}

export function VideoPlayer({
  song,
  autoplay = false,
  isLikePending,
  isLoggedIn = false,
  onLikeToggle,
  onOpenEngagement,
  onVideoEnd,
}: VideoPlayerProps) {
  const t = useTranslations("videoPlayer");
  const locale = useLocale();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.match(/^https?:\/\/(www\.)?youtube(-nocookie)?\.com$/)) {
        return;
      }

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.event === "infoDelivery" && data.info && data.info.playerState !== undefined) {
          if (data.info.playerState === 0) {
            onVideoEnd?.();
          }
        }
      } catch {
        // Ignore parsing errors
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [song.id, onVideoEnd]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-primary/20"
    >
      <div className="relative aspect-video bg-black">
        <iframe
          ref={iframeRef}
          key={song.id}
          src={getYouTubeEmbedUrl(song.youtubeVideoId, autoplay)}
          title={song.songTitle || t("iframeTitle")}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => {
            if (iframeRef.current?.contentWindow) {
              iframeRef.current.contentWindow.postMessage(
                JSON.stringify({
                  event: "listening",
                  id: 1,
                  channel: "widget",
                }),
                "*"
              );
            }
          }}
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
              disabled={isLikePending || !isLoggedIn}
              onClick={() => onLikeToggle(song)}
              title={!isLoggedIn ? t("signInToLike", { domain: ALLOWED_EMAIL_DOMAIN, defaultValue: `Sign in with a ${ALLOWED_EMAIL_DOMAIN} account to like` }) : (song.userLiked ? t("unlike") : t("like"))}
              className={
                song.userLiked
                  ? "bg-primary hover:bg-primary/90 text-white font-bold rounded-xl"
                  : !isLoggedIn
                  ? "bg-white text-muted-foreground border-2 border-border font-bold opacity-60 cursor-not-allowed rounded-xl"
                  : "bg-white text-foreground border-2 border-border hover:border-primary font-bold rounded-xl"
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
            className="bg-white text-foreground border-2 border-border hover:border-secondary font-bold rounded-xl"
          >
            <MessageSquare className="size-4 text-secondary" />
            {song.commentCount}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
