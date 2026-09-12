import type { Song } from "@/types/song";

export interface SubmitterSummary {
  name: string;
  count: number;
}

export function getTopSubmitters(
  songs: (Pick<Song, "submitterName"> & Partial<Pick<Song, "submitterEmail" | "submitterUserId">>)[],
  limit = 3
): SubmitterSummary[] {
  const submitters = new Map<string, SubmitterSummary>();
  const emailUserIds = new Map<string, string>();
  for (const song of songs) {
    const email = song.submitterEmail?.trim().toLowerCase();
    if (email && song.submitterUserId) emailUserIds.set(email, song.submitterUserId);
  }

  for (const song of songs) {
    const name = song.submitterName.trim().replace(/\s+/g, " ");
    if (!name) continue;

    const email = song.submitterEmail?.trim().toLowerCase();
    const userId = song.submitterUserId || (email ? emailUserIds.get(email) : undefined);
    const key = userId ? `user:${userId}` : email ? `email:${email}` : `name:${name.toLocaleLowerCase("en-US")}`;
    const existing = submitters.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      submitters.set(key, { name, count: 1 });
    }
  }

  return [...submitters.values()]
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, Math.max(0, limit));
}
