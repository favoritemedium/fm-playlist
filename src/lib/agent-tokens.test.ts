import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { query, clientQuery, connect, release } = vi.hoisted(() => ({
  query: vi.fn(),
  clientQuery: vi.fn(),
  connect: vi.fn(),
  release: vi.fn(),
}));
vi.mock("./db", () => ({
  ensureSchema: vi.fn(),
  getPool: () => ({ query, connect }),
}));
import {
  authenticateAgentToken,
  createAgentToken,
  generateAgentToken,
  hashAgentToken,
  listAgentTokens,
  parseAgentBearerToken,
  revokeAgentToken,
} from "./agent-tokens";

describe("agent token format", () => {
  it("generates unique, well-formed tokens", () => {
    const a = generateAgentToken();
    expect(a).toMatch(/^fmp_[A-Za-z0-9_-]{43}$/);
    expect(generateAgentToken()).not.toBe(a);
  });

  it("hashes deterministically without exposing the token", () => {
    const token = generateAgentToken();
    expect(hashAgentToken(token)).toBe(hashAgentToken(token));
    expect(hashAgentToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashAgentToken(token)).not.toContain(token);
  });

  it("only accepts well-formed Bearer headers", () => {
    const token = generateAgentToken();
    expect(parseAgentBearerToken(`Bearer ${token}`)).toBe(token);
    expect(parseAgentBearerToken(`bearer ${token}`)).toBe(token);
    expect(parseAgentBearerToken(token)).toBeNull();
    expect(parseAgentBearerToken("Bearer nope")).toBeNull();
    expect(parseAgentBearerToken(`Basic ${token}`)).toBeNull();
    expect(parseAgentBearerToken(null)).toBeNull();
  });
});

describe("authenticateAgentToken", () => {
  beforeEach(() => query.mockReset());
  const row = {
    token_id: 3,
    agent_name: "Claude Code",
    clerk_user_id: "user_1",
    user_name: "Ada",
    email: "ada@favoritemedium.com",
    picture: null,
  };

  it("rejects malformed tokens without touching the database", async () => {
    expect(await authenticateAgentToken("fmp_short")).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("returns null for unknown or revoked tokens", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await authenticateAgentToken(generateAgentToken())).toBeNull();
    // Revoked tokens are filtered in SQL.
    expect(query.mock.calls[0][0]).toContain("revoked_at IS NULL");
  });

  it("returns null when the owner is outside the allowed email domain", async () => {
    query.mockResolvedValueOnce({ rows: [{ ...row, email: "ada@elsewhere.com" }] });
    expect(await authenticateAgentToken(generateAgentToken())).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("looks up by hash and returns the owner and agent name", async () => {
    const token = generateAgentToken();
    query.mockResolvedValueOnce({ rows: [row] }).mockResolvedValueOnce({ rows: [] });
    const agent = await authenticateAgentToken(token);
    expect(query.mock.calls[0][1]).toEqual([hashAgentToken(token)]);
    expect(query.mock.calls[1][0]).toContain("id = $1 AND revoked_at IS NULL");
    expect(query.mock.calls[1][0]).toContain("interval '1 minute'");
    expect(agent).toEqual({
      tokenId: 3,
      agentName: "Claude Code",
      user: { id: "user_1", name: "Ada", email: "ada@favoritemedium.com", picture: undefined },
    });
  });
});

describe("createAgentToken / revokeAgentToken", () => {
  const tokenRow = {
    id: 1,
    name: "Muse",
    token_prefix: "fmp_abcd",
    created_at: new Date(0),
    last_used_at: null,
  };

  beforeEach(() => {
    query.mockReset();
    clientQuery.mockReset().mockResolvedValue({ rows: [] });
    release.mockReset();
    connect.mockReset().mockResolvedValue({ query: clientQuery, release });
  });

  function prepareCreation(count: number) {
    clientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ email: "ada@favoritemedium.com" }] })
      .mockResolvedValueOnce({ rows: [{ count }] });
  }

  it("stores only the hash and returns the plaintext once", async () => {
    prepareCreation(0);
    clientQuery.mockResolvedValueOnce({ rows: [tokenRow] });
    const { token, summary } = await createAgentToken("user_1", "Muse");
    const insertParams = clientQuery.mock.calls[3][1] as string[];
    expect(insertParams).toEqual(["user_1", "Muse", hashAgentToken(token), token.slice(0, 8)]);
    expect(JSON.stringify(summary)).not.toContain(token);
    expect(query).not.toHaveBeenCalled();
    expect(clientQuery.mock.calls[0]).toEqual(["BEGIN ISOLATION LEVEL READ COMMITTED"]);
    expect(clientQuery.mock.calls[1]).toEqual([
      expect.stringContaining("FOR UPDATE"),
      ["user_1"],
    ]);
    expect(clientQuery).toHaveBeenLastCalledWith("COMMIT");
    expect(release).toHaveBeenCalledOnce();
  });

  it("caps active tokens per user", async () => {
    prepareCreation(10);
    await expect(createAgentToken("user_1", "One more")).rejects.toMatchObject({
      code: "AGENT_TOKEN_LIMIT",
      status: 409,
    });
    expect(clientQuery).toHaveBeenLastCalledWith("ROLLBACK");
    expect(clientQuery.mock.calls.some(([sql]) => sql.includes("INSERT"))).toBe(false);
    expect(release).toHaveBeenCalledOnce();
  });

  it.each([{ owners: [] }, { owners: [{ email: "ada@elsewhere.com" }] }])(
    "does not mint tokens for a missing or disallowed owner (%j)",
    async ({ owners }) => {
      clientQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: owners });
      await expect(createAgentToken("user_1", "Muse")).rejects.toMatchObject({
        code: "AGENT_TOKEN_FORBIDDEN",
        status: 403,
      });
      expect(clientQuery).toHaveBeenCalledTimes(3);
      expect(clientQuery).toHaveBeenLastCalledWith("ROLLBACK");
      expect(release).toHaveBeenCalledOnce();
    }
  );

  it("rolls back and releases the connection when insertion fails", async () => {
    const failure = new Error("insert failed");
    prepareCreation(9);
    clientQuery.mockRejectedValueOnce(failure);
    await expect(createAgentToken("user_1", "Muse")).rejects.toBe(failure);
    expect(clientQuery).toHaveBeenLastCalledWith("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });

  it("preserves the original error if rollback also fails", async () => {
    const failure = new Error("insert failed");
    prepareCreation(9);
    clientQuery.mockRejectedValueOnce(failure).mockRejectedValueOnce(new Error("rollback failed"));
    await expect(createAgentToken("user_1", "Muse")).rejects.toBe(failure);
    expect(release).toHaveBeenCalledOnce();
  });

  it("does not return a token when commit fails", async () => {
    const failure = new Error("commit failed");
    prepareCreation(9);
    clientQuery.mockResolvedValueOnce({ rows: [tokenRow] }).mockRejectedValueOnce(failure);
    await expect(createAgentToken("user_1", "Muse")).rejects.toBe(failure);
    expect(clientQuery).toHaveBeenLastCalledWith("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });

  it("keeps concurrent creations from filling the same final slot", async () => {
    // Model separate database clients and the owner-row lock. Each transaction
    // sees committed counts only; no real database or server is needed.
    let active = 9;
    let lock: Promise<void> = Promise.resolve();
    const counts: number[] = [];
    const releases = [vi.fn(), vi.fn()];
    for (const releaseClient of releases) {
      let unlock: (() => void) | undefined;
      let inserted = false;
      const execute = vi.fn(async (sql: string) => {
        if (sql.includes("FROM app_users") && sql.includes("FOR UPDATE")) {
          const previous = lock;
          lock = new Promise<void>((resolve) => { unlock = resolve; });
          await previous;
          return { rows: [{ email: "ada@favoritemedium.com" }] };
        }
        if (sql.includes("count(*)")) {
          counts.push(active);
          return { rows: [{ count: active }] };
        }
        if (sql.includes("INSERT INTO agent_tokens")) {
          inserted = true;
          return { rows: [tokenRow] };
        }
        if (sql === "COMMIT" || sql === "ROLLBACK") {
          if (sql === "COMMIT" && inserted) active++;
          unlock?.();
        }
        return { rows: [] };
      });
      connect.mockResolvedValueOnce({ query: execute, release: releaseClient });
    }
    const results = await Promise.allSettled([
      createAgentToken("user_1", "First"),
      createAgentToken("user_1", "Second"),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "AGENT_TOKEN_LIMIT", status: 409 },
    });
    expect(counts).toEqual([9, 10]);
    expect(active).toBe(10);
    for (const releaseClient of releases) expect(releaseClient).toHaveBeenCalledOnce();
  });

  it("lists only active tokens belonging to the caller without secrets", async () => {
    query.mockResolvedValueOnce({ rows: [tokenRow] });
    expect(await listAgentTokens("user_1")).toEqual([{
      id: 1, name: "Muse", prefix: "fmp_abcd", createdAt: new Date(0).toISOString(), lastUsedAt: null,
    }]);
    expect(query.mock.calls[0][0]).toContain("user_id = $1 AND revoked_at IS NULL");
    expect(query.mock.calls[0][1]).toEqual(["user_1"]);
    expect(query.mock.calls[0][0]).not.toContain("token_hash");
  });

  it("revokes only the caller's own token", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 5 }] });
    await revokeAgentToken("user_1", 5);
    expect(query.mock.calls[0][1]).toEqual([5, "user_1"]);
    expect(query.mock.calls[0][0]).toContain("id = $1 AND user_id = $2 AND revoked_at IS NULL");

    query.mockResolvedValueOnce({ rows: [] });
    await expect(revokeAgentToken("user_1", 6)).rejects.toMatchObject({
      code: "AGENT_TOKEN_NOT_FOUND",
      status: 404,
    });
  });
});
