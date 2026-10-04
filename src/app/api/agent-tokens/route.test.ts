import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getCurrentAppAuth, createAgentToken, listAgentTokens, revokeAgentToken, syncAppUserIdentity } = vi.hoisted(() => ({
  getCurrentAppAuth: vi.fn(),
  createAgentToken: vi.fn(),
  listAgentTokens: vi.fn(),
  revokeAgentToken: vi.fn(),
  syncAppUserIdentity: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getCurrentAppAuth }));
vi.mock("@/lib/agent-tokens", () => ({ createAgentToken, listAgentTokens, revokeAgentToken }));
vi.mock("@/lib/users-db", () => ({ syncAppUserIdentity }));

// Use the real session-only API guard: bearer headers must never grant access
// to token management, even though they work on agent submission endpoints.
import { GET, POST } from "./route";
import { DELETE } from "./[tokenId]/route";
import { EngagementError } from "@/lib/engagement-db";

const user = { id: "user_1", name: "Ada", email: "ada@favoritemedium.com" };
const summary = { id: 4, name: "Muse", prefix: "fmp_abcd", createdAt: new Date(0).toISOString(), lastUsedAt: null };
const token = `fmp_${"a".repeat(43)}`;

function request(body: string, authorization?: string) {
  return new NextRequest("http://localhost/api/agent-tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) },
    body,
  });
}

function deletion(tokenId = "4", authorization?: string) {
  return DELETE(new Request(`http://localhost/api/agent-tokens/${tokenId}`, {
    method: "DELETE",
    headers: authorization ? { Authorization: authorization } : {},
  }), { params: Promise.resolve({ tokenId }) });
}

describe("session-only agent token API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getCurrentAppAuth.mockResolvedValue({ status: "authenticated", user });
    syncAppUserIdentity.mockResolvedValue(undefined);
    listAgentTokens.mockResolvedValue([summary]);
    createAgentToken.mockResolvedValue({ token, summary });
    revokeAgentToken.mockResolvedValue(undefined);
  });

  it.each([
    { status: "unauthenticated", httpStatus: 401, code: "UNAUTHORIZED" },
    { status: "forbidden", httpStatus: 403, code: "FORBIDDEN_DOMAIN" },
  ])("blocks all management for $status sessions", async ({ status, httpStatus, code }) => {
    getCurrentAppAuth.mockResolvedValue({ status });
    const responses = await Promise.all([GET(), POST(request('{"name":"Muse"}')), deletion()]);
    for (const response of responses) {
      expect(response.status).toBe(httpStatus);
      expect(await response.json()).toMatchObject({ code });
    }
    expect(listAgentTokens).not.toHaveBeenCalled();
    expect(createAgentToken).not.toHaveBeenCalled();
    expect(revokeAgentToken).not.toHaveBeenCalled();
    expect(syncAppUserIdentity).not.toHaveBeenCalled();
  });

  it("does not let a bearer token create or revoke tokens without a human session", async () => {
    getCurrentAppAuth.mockResolvedValue({ status: "unauthenticated" });
    const responses = await Promise.all([
      POST(request('{"name":"Muse"}', `Bearer ${token}`)),
      deletion("4", `Bearer ${token}`),
    ]);
    expect(responses.map((response) => response.status)).toEqual([401, 401]);
    expect(createAgentToken).not.toHaveBeenCalled();
    expect(revokeAgentToken).not.toHaveBeenCalled();
  });

  it("lists only the session owner's summaries", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tokens: [summary] });
    expect(listAgentTokens).toHaveBeenCalledExactlyOnceWith(user.id);
  });

  it("creates for the session owner with a trimmed name and an uncached one-time secret", async () => {
    const response = await POST(request('{"name":"  Muse  "}'));
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ token, summary });
    expect(syncAppUserIdentity).toHaveBeenCalledExactlyOnceWith(user);
    expect(createAgentToken).toHaveBeenCalledExactlyOnceWith(user.id, "Muse");
  });

  it.each([
    { body: "{", code: "INVALID_JSON" },
    { body: '{"name":"   "}', code: "INVALID_AGENT_TOKEN_INPUT" },
    { body: JSON.stringify({ name: "x".repeat(41) }), code: "INVALID_AGENT_TOKEN_INPUT" },
    { body: '{"name":"Muse","userId":"other_user"}', code: "INVALID_AGENT_TOKEN_INPUT" },
    { body: "null", code: "INVALID_AGENT_TOKEN_INPUT" },
  ])("rejects invalid input before writing: $body", async ({ body, code }) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code });
    expect(createAgentToken).not.toHaveBeenCalled();
    expect(syncAppUserIdentity).not.toHaveBeenCalled();
  });

  it("returns the token limit as a conflict without a token", async () => {
    createAgentToken.mockRejectedValue(new EngagementError("Limit reached", "AGENT_TOKEN_LIMIT", 409));
    const response = await POST(request('{"name":"Muse"}'));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Limit reached", code: "AGENT_TOKEN_LIMIT" });
  });

  it("passes only the session owner to revocation", async () => {
    const response = await deletion("5");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ revoked: true });
    expect(revokeAgentToken).toHaveBeenCalledExactlyOnceWith(user.id, 5);
  });

  it.each(["0", "-1", "1.5", "abc", "9007199254740993"])("rejects invalid token ID %s", async (id) => {
    const response = await deletion(id);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_AGENT_TOKEN_ID" });
    expect(revokeAgentToken).not.toHaveBeenCalled();
  });

  it("returns the same not-found response for another owner's or a revoked token", async () => {
    revokeAgentToken.mockRejectedValue(new EngagementError("Agent token not found", "AGENT_TOKEN_NOT_FOUND", 404));
    const response = await deletion();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Agent token not found", code: "AGENT_TOKEN_NOT_FOUND" });
  });
});
