import "server-only";

import type { PoolClient } from "pg";
import type { SongEngagementEvent } from "@/types/song";
import { ensureSchema, getPool } from "./db";

const ENGAGEMENT_EVENTS_CHANNEL = "song_engagement_events";

type EngagementEventSubscriber = (event: SongEngagementEvent) => void;

const globalForEngagementEvents = globalThis as unknown as {
  __engagementEventSubscribers?: Set<EngagementEventSubscriber>;
  __engagementListenerClient?: Promise<PoolClient>;
};

function getSubscribers(): Set<EngagementEventSubscriber> {
  if (!globalForEngagementEvents.__engagementEventSubscribers) {
    globalForEngagementEvents.__engagementEventSubscribers = new Set();
  }
  return globalForEngagementEvents.__engagementEventSubscribers;
}

async function ensureEngagementListener(): Promise<void> {
  if (!globalForEngagementEvents.__engagementListenerClient) {
    globalForEngagementEvents.__engagementListenerClient = getPool()
      .connect()
      .then(async (client) => {
        client.on("notification", (message) => {
          if (message.channel !== ENGAGEMENT_EVENTS_CHANNEL || !message.payload) {
            return;
          }

          try {
            const event = JSON.parse(message.payload) as SongEngagementEvent;
            for (const subscriber of getSubscribers()) {
              subscriber(event);
            }
          } catch (error) {
            console.error("Failed to parse engagement event:", error);
          }
        });

        client.on("error", (error) => {
          console.error("Engagement event listener failed:", error);
          globalForEngagementEvents.__engagementListenerClient = undefined;
        });

        await client.query(`LISTEN ${ENGAGEMENT_EVENTS_CHANNEL}`);
        return client;
      })
      .catch((error) => {
        globalForEngagementEvents.__engagementListenerClient = undefined;
        throw error;
      });
  }

  await globalForEngagementEvents.__engagementListenerClient;
}

export function subscribeToEngagementEvents(
  subscriber: EngagementEventSubscriber
): () => void {
  getSubscribers().add(subscriber);
  void ensureEngagementListener();

  return () => {
    getSubscribers().delete(subscriber);
  };
}

export async function publishEngagementEvent(
  event: SongEngagementEvent
): Promise<void> {
  await ensureSchema();
  await getPool().query("SELECT pg_notify($1, $2)", [
    ENGAGEMENT_EVENTS_CHANNEL,
    JSON.stringify(event),
  ]);
}