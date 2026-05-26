const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);
const SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"]);

function toUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed);
  } catch {
    try {
      return new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }
}

function isYouTubeVideoId(value: string): boolean {
  return YOUTUBE_VIDEO_ID_PATTERN.test(value);
}

export function extractYouTubeId(url: string): string | null {
  const parsed = toUrl(url);
  if (!parsed || !["http:", "https:"].includes(parsed.protocol)) {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  let videoId: string | null = null;

  if (SHORT_HOSTS.has(hostname)) {
    videoId = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (YOUTUBE_HOSTS.has(hostname)) {
    if (parsed.pathname === "/watch") {
      videoId = parsed.searchParams.get("v");
    } else if (
      parsed.pathname.startsWith("/embed/") ||
      parsed.pathname.startsWith("/shorts/")
    ) {
      videoId = parsed.pathname.split("/").filter(Boolean)[1] ?? null;
    }
  }

  return videoId && isYouTubeVideoId(videoId) ? videoId : null;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

export function getYouTubeEmbedUrl(
  videoId: string,
  autoplay = false
): string {
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=${autoplay ? 1 : 0}&enablejsapi=1`;
}

export interface YouTubeOEmbed {
  title: string;
  authorName: string;
}

export async function fetchYouTubeOEmbed(
  videoId: string
): Promise<YouTubeOEmbed | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`;
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as unknown;
    if (
      data &&
      typeof data === "object" &&
      "title" in data &&
      typeof data.title === "string"
    ) {
      const title = data.title;
      const authorName =
        "author_name" in data && typeof data.author_name === "string"
          ? data.author_name
          : "";
      return {
        title,
        authorName,
      };
    }
  } catch (error) {
    console.error(`Failed to fetch YouTube oEmbed for video ID ${videoId}:`, error);
  }
  return null;
}

export function parseYouTubeTitle(
  youtubeTitle: string,
  authorName?: string
): { artistName: string | null; songTitle: string } {
  // Common cleanups for video titles: strip trailing things like "[Official Video]", "(Official Music Video)", etc.
  let cleaned = youtubeTitle
    .replace(/\s*[([{(][^)\]}]*(?:video|audio|lyrics|lyric|hd|4k|clip|remaster|visualizer|hq|version)[^)\]}]*[)\]}]/gi, "")
    .replace(/\s*-\s*youtube$/gi, "")
    .trim();

  // Strip empty brackets/parentheses at the end if any (e.g. from previous replace)
  cleaned = cleaned.replace(/\s*[([{\[]\s*[)\]}]/g, "").trim();

  // Look for standard separators: ' - ', ' – ', ' — '
  const separators = [/\s+-\s+/, /\s+–\s+/, /\s+—\s+/];
  for (const sep of separators) {
    const match = cleaned.split(sep);
    if (match.length >= 2) {
      const artist = match[0].trim();
      const title = match.slice(1).join(" - ").trim();
      if (artist && title) {
        return { artistName: artist, songTitle: title };
      }
    }
  }

  // Fallback: use authorName (channel name) as artistName, cleaned title as songTitle.
  let artist: string | null = null;
  if (authorName) {
    artist = authorName
      .replace(/\s*-\s*Topic$/i, "")
      .replace(/\s*VEVO$/i, "")
      .trim();
  }

  return {
    artistName: artist || null,
    songTitle: cleaned,
  };
}

