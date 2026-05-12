import { describe, expect, it } from "vitest";
import { ALL_FILTER_VALUE, formatPlaylistPeriod } from "./constants";

describe("playlist period formatting", () => {
  it("formats specific month and year selections", () => {
    expect(formatPlaylistPeriod(3, 2026)).toBe("March 2026");
  });

  it("formats all month or all year selections", () => {
    expect(formatPlaylistPeriod(ALL_FILTER_VALUE, 2026)).toBe("2026");
    expect(formatPlaylistPeriod(3, ALL_FILTER_VALUE)).toBe("March");
  });

  it("omits a period label when both filters are all", () => {
    expect(formatPlaylistPeriod(ALL_FILTER_VALUE, ALL_FILTER_VALUE)).toBeNull();
  });
});