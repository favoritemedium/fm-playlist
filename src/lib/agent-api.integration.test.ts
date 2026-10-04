import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ALLOWED_EMAIL_DOMAIN } from "./constants";

vi.mock("server-only", () => ({}));
const database = vi.hoisted(() => ({ pool: undefined as Pool | undefined }));
// Never bootstrap through the application's db.ts or resolve its .env/PG* URL.
vi.mock("./db", () => ({
  ensureSchema: async () => undefined,
  getPool: () => {
    if (!database.pool) throw new Error("Integration database has not been initialized");
    return database.pool;
  },
}));
import {
  authenticateAgentToken,
  createAgentToken,
  hashAgentToken,
  listAgentTokens,
  MAX_ACTIVE_AGENT_TOKENS,
  revokeAgentToken,
} from "./agent-tokens";
import { AgentRateLimitError, createAgentSongRow, type SongInsert } from "./songs-db";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const schema = `agent_api_test_${randomUUID().replaceAll("-", "")}`;
let admin: Pool | undefined;
let schemaCreated = false;
const userId = "integration_owner";
const otherUserId = "integration_other_owner";
const email = `integration@${ALLOWED_EMAIL_DOMAIN}`;

function pool() {
  if (!database.pool) throw new Error("Integration database has not been initialized");
  return database.pool;
}

function song(owner = userId, agentName = "First agent"): SongInsert {
  return {
    source: "app",
    airtable_record_id: null,
    submitter_user_id: owner,
    submitter_name: "Integration owner",
    submitter_email: email,
    artist_name: null,
    song_title: null,
    description: null,
    youtube_url: "https://youtu.be/dQw4w9WgXcQ",
    youtube_video_id: "dQw4w9WgXcQ",
    submitted_date: "2026-10-04",
    month: 10,
    year: 2026,
    submitted_via: agentName,
  };
}

describe.skipIf(!testDatabaseUrl)("agent API against isolated review Postgres", () => {
  beforeAll(async () => {
    // Refuse the app database and nonlocal targets even if opt-in is mistaken.
    const url = new URL(testDatabaseUrl!);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      url.port !== "55432" || url.pathname !== "/review" || url.search
    ) {
      throw new Error("TEST_DATABASE_URL must target the dedicated localhost:55432/review database without query parameters");
    }
    const config = {
      host: url.hostname,
      port: Number(url.port),
      database: "review",
      user: decodeURIComponent(url.username) || "postgres",
      password: decodeURIComponent(url.password),
      ssl: false as const,
      connectionTimeoutMillis: 3000,
      statement_timeout: 10000,
      lock_timeout: 10000,
    };
    admin = new Pool({ ...config, max: 1 });
    await admin.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    // No public schema fallback: missing test tables must fail, never resolve
    // to similarly named tables belonging to another app or another test.
    database.pool = new Pool({ ...config, max: 10, options: `-c search_path=${schema}` });
    const schemaSql = await readFile(new URL("../../db/init/001_schema.sql", import.meta.url), "utf8");
    await pool().query(schemaSql);
  }, 15000);

  beforeEach(async () => {
    await pool().query("TRUNCATE app_users CASCADE");
    await pool().query(
      `INSERT INTO app_users (clerk_user_id, name, email) VALUES
       ($1, 'Integration owner', $3), ($2, 'Other owner', $3)`,
      [userId, otherUserId, email]
    );
  });

  afterAll(async () => {
    try {
      await database.pool?.end();
    } finally {
      database.pool = undefined;
      try {
        if (schemaCreated) await admin!.query(`DROP SCHEMA "${schema}" CASCADE`);
      } finally {
        await admin?.end();
      }
    }
  });

  it("permits exactly one concurrent creation in the final slot and reopens a revoked slot", async () => {
    const initial = [];
    for (let index = 0; index < MAX_ACTIVE_AGENT_TOKENS - 1; index++) {
      initial.push(await createAgentToken(userId, `Seed ${index}`));
    }
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, index) => createAgentToken(userId, `Concurrent ${index}`))
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter((result) => result.status === "rejected");
    expect(rejected).toHaveLength(7);
    for (const result of rejected) expect(result.reason).toMatchObject({ code: "AGENT_TOKEN_LIMIT", status: 409 });
    expect(await listAgentTokens(userId)).toHaveLength(MAX_ACTIVE_AGENT_TOKENS);
    await revokeAgentToken(userId, initial[0].summary.id);
    await expect(createAgentToken(userId, "Replacement")).resolves.toMatchObject({ summary: { name: "Replacement" } });
    expect(await listAgentTokens(userId)).toHaveLength(MAX_ACTIVE_AGENT_TOKENS);
    // Another owner has an independent quota.
    await expect(createAgentToken(otherUserId, "Independent")).resolves.toMatchObject({ summary: { name: "Independent" } });
  });

  it("authenticates by hash, throttles last-used writes, and denies a committed revocation", async () => {
    const { token, summary } = await createAgentToken(userId, "Auth agent");
    const stored = await pool().query("SELECT token_hash, last_used_at FROM agent_tokens WHERE id = $1", [summary.id]);
    expect(stored.rows[0]).toEqual({ token_hash: hashAgentToken(token), last_used_at: null });
    expect(await authenticateAgentToken(token)).toMatchObject({ tokenId: summary.id, user: { id: userId } });
    const firstUse = (await listAgentTokens(userId))[0].lastUsedAt;
    expect(firstUse).not.toBeNull();
    await authenticateAgentToken(token);
    expect((await listAgentTokens(userId))[0].lastUsedAt).toBe(firstUse);
    await revokeAgentToken(userId, summary.id);
    expect(await authenticateAgentToken(token)).toBeNull();
    expect(await listAgentTokens(userId)).toEqual([]);
  });

  it("cannot list or revoke another owner's token", async () => {
    const { token, summary } = await createAgentToken(userId, "Owned agent");
    expect(await listAgentTokens(otherUserId)).toEqual([]);
    await expect(revokeAgentToken(otherUserId, summary.id)).rejects.toMatchObject({ code: "AGENT_TOKEN_NOT_FOUND", status: 404 });
    expect(await authenticateAgentToken(token)).toMatchObject({ user: { id: userId } });
  });

  it("rejects removed or disallowed owners and releases locks after a failed insert", async () => {
    const { token } = await createAgentToken(userId, "Existing agent");
    await expect(createAgentToken(userId, " ")).rejects.toMatchObject({ code: "23514" });
    await expect(createAgentToken(userId, "After rollback")).resolves.toMatchObject({ summary: { name: "After rollback" } });
    await pool().query("UPDATE app_users SET email = $2 WHERE clerk_user_id = $1", [userId, "integration@invalid.example"]);
    expect(await authenticateAgentToken(token)).toBeNull();
    await expect(createAgentToken(userId, "Disallowed")).rejects.toMatchObject({ code: "AGENT_TOKEN_FORBIDDEN", status: 403 });
    await pool().query("DELETE FROM app_users WHERE clerk_user_id = $1", [userId]);
    expect(await authenticateAgentToken(token)).toBeNull();
    await expect(createAgentToken(userId, "Removed")).rejects.toMatchObject({ code: "AGENT_TOKEN_FORBIDDEN", status: 403 });
  });

  it("permits one concurrent weekly song across an owner's different agents", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, index) => createAgentSongRow(song(userId, `Agent ${index}`)))
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter((result) => result.status === "rejected");
    expect(rejected).toHaveLength(7);
    for (const result of rejected) {
      expect(result.reason).toBeInstanceOf(AgentRateLimitError);
      expect(result.reason.retryAfterSeconds).toBeGreaterThan(0);
      expect(result.reason.retryAfterSeconds).toBeLessThanOrEqual(7 * 24 * 60 * 60);
    }
    const count = await pool().query("SELECT count(*)::int AS count FROM songs WHERE submitter_user_id = $1", [userId]);
    expect(count.rows[0].count).toBe(1);
    await expect(createAgentSongRow(song(otherUserId))).resolves.toMatchObject({ submitterUserId: otherUserId });
    await pool().query("UPDATE songs SET created_at = now() - interval '8 days' WHERE submitter_user_id = $1", [userId]);
    await expect(createAgentSongRow(song())).resolves.toMatchObject({ submitterUserId: userId });
  });
});
