"use client";

import { useEffect } from "react";
import type { SongEngagementEvent } from "@/types/song";

export function useEngagementEvents(
  onEvent: ((event: SongEngagementEvent) => void) | null
) {
  useEffect(() => {
    if (!onEvent) return;

    const handleEvent = onEvent;

    const source = new EventSource("/api/engagement/events");

    function handleMessage(message: MessageEvent<string>) {
      try {
        handleEvent(JSON.parse(message.data) as SongEngagementEvent);
      } catch (error) {
        console.error("Failed to read engagement event:", error);
      }
    }

    source.addEventListener("song_engagement_updated", handleMessage);
    source.addEventListener("song_comment_notification", handleMessage);

    return () => {
      source.removeEventListener("song_engagement_updated", handleMessage);
      source.removeEventListener("song_comment_notification", handleMessage);
      source.close();
    };
  }, [onEvent]);
}