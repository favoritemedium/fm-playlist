import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(), authenticate: vi.fn(), create: vi.fn(),
  currentAuth: vi.fn(), getAll: vi.fn(),
}));
vi.mock("@/lib/api-auth", () => ({ authorizeApiRequest: mocks.authorize }));
vi.mock("@/lib/auth", () => ({ getCurrentAppAuth: mocks.currentAuth }));
vi.mock("@/lib/agent-tokens", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/agent-tokens")>(),
  authenticateAgentToken: mocks.authenticate,
}));
vi.mock("@/lib/songs", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/songs")>(),
  createSong: mocks.create,
  getAllSongs: mocks.getAll,
}));

import { GET, POST } from "./route";
import { AgentRateLimitError } from "@/lib/songs-db";
import { DuplicateSongError } from "@/lib/songs";
import { generateAgentToken } from "@/lib/agent-tokens";
import type { Song } from "@/types/song";

const user = { id: "test-user", name: "Example", email: "example@favoritemedium.com" };
const input = { youtubeUrl: "https://youtu.be/dQw4w9WgXcQ" };
const song = { id: "db_1", songTitle: "Example song", submitterName: user.name } as Song;
function request(body: unknown, authorization?: string) {
  return new NextRequest("http://localhost/api/songs", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("songs HTTP contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticate.mockResolvedValue({ user, agentName: "Test agent", tokenId: 1 });
    mocks.authorize.mockResolvedValue({ appAuth: { status: "authenticated", user }, response: null });
    mocks.currentAuth.mockResolvedValue({ status: "unauthenticated" });
    mocks.create.mockResolvedValue(song);
    mocks.getAll.mockResolvedValue([song]);
  });

  it("allows public reads without agent or session authorization", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([song]);
    expect(mocks.getAll).toHaveBeenCalledWith(undefined);
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });

  it("uses token ownership and attribution, not browser auth", async () => {
    const response = await POST(request(input, `Bearer ${generateAgentToken()}`));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(song);
    expect(mocks.create).toHaveBeenCalledWith({ ...input, allowDuplicate: false }, user, { via: "Test agent" });
    expect(mocks.authorize).not.toHaveBeenCalled();
  });

  it("preserves human submissions without agent attribution", async () => {
    expect((await POST(request(input))).status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({ ...input, allowDuplicate: false }, user, { via: undefined });
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });

  it("does not fall back to browser auth for a bad authorization header", async () => {
    const response = await POST(request(input, "Bearer malformed"));
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    expect((await response.json()).code).toBe("INVALID_AGENT_TOKEN");
    expect(mocks.authorize).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown or revoked token", async () => {
    mocks.authenticate.mockResolvedValue(null);
    expect((await POST(request(input, `Bearer ${generateAgentToken()}`))).status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects anonymous writes", async () => {
    mocks.authorize.mockResolvedValue({ appAuth: null, response: NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 }) });
    expect((await POST(request(input))).status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([
    ["{", "INVALID_JSON"],
    [{ ...input, submitterName: "Impersonation" }, "INVALID_SONG_INPUT"],
    [{ ...input, description: "x".repeat(501) }, "INVALID_SONG_INPUT"],
    [{ youtubeUrl: "https://example.com" }, "INVALID_SONG_INPUT"],
  ])("rejects invalid request %j", async (body, code) => {
    const response = await POST(request(body, `Bearer ${generateAgentToken()}`));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe(code);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns duplicate details so agents can ask before resharing", async () => {
    mocks.create.mockRejectedValueOnce(new DuplicateSongError(song));
    const response = await POST(request(input, `Bearer ${generateAgentToken()}`));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "DUPLICATE_SONG", details: [song.id, song.songTitle, user.name] });
  });

  it("returns the weekly retry contract", async () => {
    const availableAt = new Date("2026-10-12T00:00:00Z");
    mocks.create.mockRejectedValueOnce(new AgentRateLimitError(3600, availableAt));
    const response = await POST(request(input, `Bearer ${generateAgentToken()}`));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("3600");
    expect(await response.json()).toMatchObject({ code: "AGENT_WEEKLY_LIMIT", details: [availableAt.toISOString()] });
  });
});
