import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("./db", () => ({ ensureSchema: vi.fn(), getPool: () => ({ query }) }));
import { deleteOwnSong } from "./songs-db";

describe("deleteOwnSong", () => {
  beforeEach(() => query.mockReset());

  it("deletes a song submitted by the user", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ submitter_user_id: "user1" }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(deleteOwnSong(7, "user1")).resolves.toBeUndefined();
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining("DELETE FROM songs"),
      [7, "user1"]
    );
  });

  it("rejects deleting someone else's song without touching it", async () => {
    query.mockResolvedValueOnce({ rows: [{ submitter_user_id: "user2" }] });

    await expect(deleteOwnSong(7, "user1")).rejects.toMatchObject({
      code: "SONG_FORBIDDEN",
      status: 403,
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("rejects songs with no linked submitter (legacy imports)", async () => {
    query.mockResolvedValueOnce({ rows: [{ submitter_user_id: null }] });

    await expect(deleteOwnSong(7, "user1")).rejects.toMatchObject({
      code: "SONG_FORBIDDEN",
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("reports a missing song as not found", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await expect(deleteOwnSong(7, "user1")).rejects.toMatchObject({
      code: "SONG_NOT_FOUND",
      status: 404,
    });
  });
});
