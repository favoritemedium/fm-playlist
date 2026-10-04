import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { query, clientQuery, release } = vi.hoisted(() => ({
  query: vi.fn(),
  clientQuery: vi.fn(),
  release: vi.fn(),
}));
vi.mock("./db", () => ({
  ensureSchema: vi.fn(),
  getPool: () => ({
    query,
    connect: async () => ({ query: clientQuery, release }),
  }),
}));
import { AgentRateLimitError, createAgentSongRow, deleteOwnSong } from "./songs-db";

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

describe("createAgentSongRow", () => {
  const row = {
    source: "app",
    airtable_record_id: null,
    submitter_user_id: "user1",
    submitter_name: "Ada",
    submitter_email: "ada@favoritemedium.com",
    artist_name: null,
    song_title: null,
    description: null,
    youtube_url: "https://youtu.be/dQw4w9WgXcQ",
    youtube_video_id: "dQw4w9WgXcQ",
    submitted_date: "2026-10-03",
    month: 10,
    year: 2026,
    submitted_via: "Claude Code",
  };
  const sqlOf = () => clientQuery.mock.calls.map((call) => String(call[0]).trim().split(/\s+/)[0]);

  beforeEach(() => {
    clientQuery.mockReset();
    release.mockReset();
  });

  it("inserts inside a locked transaction when the weekly limit is free", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO songs")) return { rows: [{ ...row, id: 9, source: "app" }] };
      return { rows: [] };
    });

    const song = await createAgentSongRow(row);
    expect(song).toMatchObject({ id: "db_9", submittedVia: "Claude Code" });
    expect(sqlOf()).toEqual(["BEGIN", "SELECT", "SELECT", "INSERT", "COMMIT"]);
    expect(clientQuery.mock.calls[1][0]).toContain("pg_advisory_xact_lock");
    // Transactions can begin before a competing submission commits. Evaluate
    // the window after obtaining the lock, not at transaction-start time.
    expect(clientQuery.mock.calls[2][0]).toContain("statement_timestamp()");
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("refuses a second agent song within the week and reports when to retry", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("retry_after")) return { rows: [{ retry_after: 86400 }] };
      return { rows: [] };
    });

    await expect(createAgentSongRow(row)).rejects.toSatisfy((error: unknown) =>
      error instanceof AgentRateLimitError && error.retryAfterSeconds === 86400
    );
    expect(sqlOf()).toEqual(["BEGIN", "SELECT", "SELECT", "ROLLBACK"]);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("rolls back and releases the connection when the insert fails", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO songs")) throw new Error("boom");
      return { rows: [] };
    });

    await expect(createAgentSongRow(row)).rejects.toThrow("boom");
    expect(sqlOf().at(-1)).toBe("ROLLBACK");
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("requires an owner and an agent name", async () => {
    await expect(createAgentSongRow({ ...row, submitted_via: null })).rejects.toThrow();
    await expect(createAgentSongRow({ ...row, submitter_user_id: null })).rejects.toThrow();
    expect(clientQuery).not.toHaveBeenCalled();
  });
});
