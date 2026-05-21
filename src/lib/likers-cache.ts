import type { SongLiker, EngagementUser } from "@/types/song";

interface CacheEntry {
  likers: SongLiker[];
  fetchedAt: number;
}

const cache: Record<string, CacheEntry> = {};

// Cache duration: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

export function getCachedLikers(songId: string): SongLiker[] | null {
  const entry = cache[songId];
  if (!entry) return null;

  // If expired, return null to refetch
  if (Date.now() - entry.fetchedAt > CACHE_TTL) {
    delete cache[songId];
    return null;
  }

  return entry.likers;
}

export function setCachedLikers(songId: string, likers: SongLiker[]) {
  cache[songId] = {
    likers,
    fetchedAt: Date.now(),
  };
}

export function updateLikerInCache(
  songId: string,
  user: EngagementUser | null | undefined,
  isLiked: boolean
) {
  const entry = cache[songId];
  if (!entry) return;

  if (!user || !user.id) return;

  const newLikers = [...entry.likers];
  const userIndex = newLikers.findIndex((l) => l.user.id === user.id);

  if (isLiked) {
    if (userIndex === -1) {
      newLikers.push({
        user: {
          id: user.id,
          name: user.name || "Anonymous",
          email: user.email || "",
          picture: user.picture || null,
        },
        likedAt: new Date().toISOString(),
      });
    }
  } else {
    if (userIndex !== -1) {
      newLikers.splice(userIndex, 1);
    }
  }

  cache[songId] = {
    likers: newLikers,
    fetchedAt: Date.now(),
  };
}

export function clearCachedLikers(songId: string) {
  delete cache[songId];
}
