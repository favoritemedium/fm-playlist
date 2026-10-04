"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Bookmark, Heart, MessageSquare, Bot, Share2, Trash2 } from "lucide-react";
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
  isBookmarked?: boolean;
  isBookmarkPending?: boolean;
  onBookmarkToggle?: (song: Song) => void;
  onShare?: (song: Song) => void;
  /** Provided only when the viewer may delete this song (their own). */
  onDelete?: (song: Song) => void;
}

export function VideoPlayer({
  song,
  autoplay = false,
  isLikePending,
  isLoggedIn = false,
  onLikeToggle,
  onOpenEngagement,
  onVideoEnd,
  isBookmarked = false,
  isBookmarkPending = false,
  onBookmarkToggle,
  onShare,
  onDelete,
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      // Below lg the wrapper is `display: contents` so the video can stick to
      // the top of the page on its own while the details card scrolls away.
      className="overflow-hidden rounded-2xl border-2 border-primary/20 bg-white shadow-xl max-lg:contents lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]"
    >
      <div
        className={
          "relative aspect-video bg-black lg:aspect-auto lg:min-h-[22rem] " +
          // Mobile/tablet: keep the player pinned and full-bleed while scrolling.
          // Height is 16:9 but capped at 40vh so the list stays usable (the
          // YouTube player letterboxes). Not sticky on short (landscape phone)
          // viewports, where the player would fill the screen.
          "max-lg:sticky max-lg:top-0 max-lg:z-40 max-lg:-mx-4 max-lg:aspect-auto max-lg:h-[min(56.25vw,40vh)] max-lg:shadow-lg sm:max-lg:-mx-6 " +
          "max-lg:[@media(max-height:500px)]:relative max-lg:[@media(max-height:500px)]:h-[56.25vw]"
        }
      >
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
      <div className="space-y-3 p-4 sm:p-6 max-lg:mt-3 max-lg:rounded-2xl max-lg:border-2 max-lg:border-primary/20 max-lg:bg-white max-lg:shadow-md lg:mt-0 lg:flex lg:flex-col lg:justify-center">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="min-w-0 max-w-full break-words font-bold text-foreground">{song.submitterName}</p>
          {song.submittedVia && (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-bold text-secondary">
              <Bot className="size-3 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{t("viaAgent", { agent: song.submittedVia })}</span>
            </span>
          )}
          {song.songTitle && (
            <p className="min-w-0 max-w-full break-words text-sm text-muted-foreground">
              — {song.songTitle}
              {song.artistName && ` ${t("byArtist", { artist: song.artistName })}`}
            </p>
          )}
        </div>
        {song.description && (
          <p className="break-words text-lg text-foreground leading-relaxed font-medium">
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
          {isLoggedIn && onBookmarkToggle && (
            <Button
              type="button"
              disabled={isBookmarkPending}
              onClick={() => onBookmarkToggle(song)}
              title={isBookmarked ? t("removeSaved") : t("save")}
              className={isBookmarked ? "bg-primary hover:bg-primary/90 text-white font-bold rounded-xl" : "bg-white text-foreground border-2 border-border hover:border-primary font-bold rounded-xl"}
            >
              <Bookmark className="size-4" fill={isBookmarked ? "currentColor" : "none"} />
              {isBookmarked ? t("saved") : t("save")}
            </Button>
          )}
          {onShare && (
            <Button
              type="button"
              onClick={() => onShare(song)}
              title={t("share")}
              className="bg-white text-foreground border-2 border-border hover:border-secondary font-bold rounded-xl"
            >
              <Share2 className="size-4 text-secondary" />
              {t("share")}
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              onClick={() => onDelete(song)}
              title={t("delete")}
              className="bg-white text-destructive border-2 border-border hover:border-destructive font-bold rounded-xl"
            >
              <Trash2 className="size-4" />
              {t("delete")}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
