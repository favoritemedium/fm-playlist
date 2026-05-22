"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { SongLiker } from "@/types/song";
import {
  getCachedLikers,
  setCachedLikers,
  clearCachedLikers,
} from "@/lib/likers-cache";

interface LikesTooltipProps {
  songId: string;
  likeCount: number;
  children: React.ReactNode;
}

function getInitials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]).join("");
  return initials || email[0]?.toUpperCase() || "?";
}

export function LikesTooltip({ songId, likeCount, children }: LikesTooltipProps) {
  const t = useTranslations("engagement");
  const [mounted, setMounted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [likers, setLikers] = useState<SongLiker[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // When tooltip is visible and likeCount changes (due to user liking/unliking or real-time event),
  // sync the local state with cache or refetch if mismatch.
  useEffect(() => {
    if (showTooltip) {
      const cached = getCachedLikers(songId);
      if (cached && cached.length === likeCount) {
        setLikers(cached);
        setLoading(false);
        setError(null);
      } else {
        // Cache is missing or stale compared to current likeCount
        clearCachedLikers(songId);
        setLoading(true);
        setError(null);
        
        fetch(`/api/songs/${songId}/likes`)
          .then((res) => {
            if (!res.ok) throw new Error(t("errors.failedToLoadLikes"));
            return res.json() as Promise<{ likers: SongLiker[] }>;
          })
          .then((data) => {
            setCachedLikers(songId, data.likers);
            setLikers(data.likers);
            setError(null);
          })
          .catch((err) => {
            setError(err instanceof Error ? err.message : t("errors.somethingWentWrong"));
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [songId, likeCount, showTooltip, t]);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (likeCount === 0) return;

    const target = e.currentTarget;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const rect = target.getBoundingClientRect();
      setPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
      setShowTooltip(true);
    }, 400); // Wait delay
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  const tooltipWidth = 220;
  const targetCenterX = position.left + position.width / 2;
  const calculatedLeft = targetCenterX - tooltipWidth / 2;
  // Clamp left to avoid overflowing screen edges (8px margin)
  const left = typeof window !== "undefined"
    ? Math.max(8, Math.min(window.innerWidth - tooltipWidth - 8, calculatedLeft))
    : calculatedLeft;

  // If less than 100px from top of viewport, show below trigger
  const showBelow = typeof window !== "undefined" && (position.top - window.scrollY) < 100;
  const top = showBelow ? position.top + position.height + 8 : position.top - 8;

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex"
      >
        {children}
      </div>
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showTooltip && likeCount > 0 && (
            <div
              style={{
                position: "absolute",
                top,
                left,
                width: tooltipWidth,
                transform: showBelow ? undefined : "translateY(-100%)",
                zIndex: 9999,
                pointerEvents: "none",
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: showBelow ? -4 : 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: showBelow ? -4 : 4 }}
                transition={{ duration: 0.12 }}
                className="bg-slate-950/95 backdrop-blur-md text-white border border-slate-800 rounded-xl p-3 shadow-2xl"
              >
                <div className="space-y-2">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {t("likedBy")}
                  </div>
                  {loading ? (
                    <div className="flex items-center gap-1.5 text-slate-300 py-1">
                      <span className="size-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                      <span className="text-[11px] font-medium">{t("loading")}</span>
                    </div>
                  ) : error ? (
                    <div className="text-[11px] text-destructive font-medium py-1">
                      {t("errors.failedToLoadLikes")}
                    </div>
                  ) : likers && likers.length > 0 ? (
                    <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {likers.map((liker) => (
                        <div key={liker.user.id} className="flex items-center gap-2">
                          {liker.user.picture ? (
                            <Image
                              src={liker.user.picture}
                              alt={liker.user.name}
                              width={16}
                              height={16}
                              className="size-4 rounded-full object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="size-4 inline-flex items-center justify-center rounded-full bg-slate-800 text-[8px] font-black text-slate-300 shrink-0">
                              {getInitials(liker.user.name, liker.user.email)}
                            </span>
                          )}
                          <span className="truncate font-bold text-slate-200 text-[11px]">
                            {liker.user.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 font-medium py-1">
                      {t("noLikesYet")}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
