import { describe, expect, it } from "vitest";
import { extractYouTubeId, isValidYouTubeUrl, parseYouTubeTitle } from "./youtube";

const videoId = "dQw4w9WgXcQ";

describe("YouTube URL parsing", () => {
  it.each([
    `https://www.youtube.com/watch?v=${videoId}`,
    `https://youtube.com/watch?v=${videoId}&t=42`,
    `https://m.youtube.com/watch?v=${videoId}`,
    `https://music.youtube.com/watch?v=${videoId}`,
    `https://youtu.be/${videoId}`,
    `https://www.youtube.com/embed/${videoId}`,
    `https://www.youtube.com/shorts/${videoId}`,
    `www.youtube.com/watch?v=${videoId}`,
  ])("extracts supported YouTube URL %s", (url) => {
    expect(extractYouTubeId(url)).toBe(videoId);
    expect(isValidYouTubeUrl(url)).toBe(true);
  });

  it.each([
    "",
    "not a url",
    `https://example.com/watch?v=${videoId}`,
    `https://example.com/youtube.com/watch?v=${videoId}`,
    `https://youtube.com.evil.test/watch?v=${videoId}`,
    "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=too-short",
    "https://www.youtube.com/channel/dQw4w9WgXcQ",
  ])("rejects unsupported URL %s", (url) => {
    expect(extractYouTubeId(url)).toBeNull();
    expect(isValidYouTubeUrl(url)).toBe(false);
  });
});

describe("parseYouTubeTitle", () => {
  it("extracts artist and song from simple hyphenated titles", () => {
    const result = parseYouTubeTitle("Taylor Swift - Cardigan");
    expect(result).toEqual({
      artistName: "Taylor Swift",
      songTitle: "Cardigan",
    });
  });

  it("cleans up official video tags in brackets and parentheses", () => {
    const result1 = parseYouTubeTitle("Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)");
    expect(result1).toEqual({
      artistName: "Rick Astley",
      songTitle: "Never Gonna Give You Up",
    });

    const result2 = parseYouTubeTitle("Radiohead - Karma Police [Official Music Video]");
    expect(result2).toEqual({
      artistName: "Radiohead",
      songTitle: "Karma Police",
    });

    const result3 = parseYouTubeTitle("Lorde - Green Light (Official Audio)");
    expect(result3).toEqual({
      artistName: "Lorde",
      songTitle: "Green Light",
    });
  });

  it("handles different separators (dashes)", () => {
    const result1 = parseYouTubeTitle("Billie Eilish – Bad Guy"); // en-dash
    expect(result1).toEqual({
      artistName: "Billie Eilish",
      songTitle: "Bad Guy",
    });

    const result2 = parseYouTubeTitle("Adele — Hello"); // em-dash
    expect(result2).toEqual({
      artistName: "Adele",
      songTitle: "Hello",
    });
  });

  it("falls back to authorName when no separator is found", () => {
    const result = parseYouTubeTitle("Green Light", "Lorde - Topic");
    expect(result).toEqual({
      artistName: "Lorde",
      songTitle: "Green Light",
    });
  });

  it("falls back to null artist when no separator and no authorName", () => {
    const result = parseYouTubeTitle("Just a Video Title");
    expect(result).toEqual({
      artistName: null,
      songTitle: "Just a Video Title",
    });
  });
});

