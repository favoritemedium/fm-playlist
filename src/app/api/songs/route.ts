import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import {
  authenticateAgentToken,
  parseAgentBearerToken,
} from "@/lib/agent-tokens";
import { getCurrentAppAuth } from "@/lib/auth";
import type { AppUser } from "@/lib/auth";
import { AgentRateLimitError } from "@/lib/songs-db";
import { DuplicateSongError, getAllSongs, createSong } from "@/lib/songs";
import { makeApiError } from "@/lib/api";
import { createSongInputSchema } from "@/lib/validation";

export async function GET() {
  try {
    const appAuth = await getCurrentAppAuth();
    const user = appAuth.status === "authenticated" ? appAuth.user : null;

    const songs = await getAllSongs(user ?? undefined);
    return NextResponse.json(songs);
  } catch (error) {
    console.error("Failed to fetch songs:", error);
    return NextResponse.json(
      makeApiError("Failed to fetch songs", "FETCH_SONGS_FAILED"),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Either a signed-in person (Clerk session) or an agent acting for one
    // (Authorization: Bearer fmp_...). Agent submissions are rate limited.
    let user: AppUser;
    let via: string | undefined;
    const authorization = request.headers.get("authorization");
    if (authorization) {
      const token = parseAgentBearerToken(authorization);
      const agent = token ? await authenticateAgentToken(token) : null;
      if (!agent) {
        return NextResponse.json(
          makeApiError("Invalid or revoked agent token", "INVALID_AGENT_TOKEN"),
          { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
        );
      }
      user = agent.user;
      via = agent.agentName;
    } else {
      const { appAuth, response } = await authorizeApiRequest();
      if (response) return response;
      user = appAuth.user;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        makeApiError("Invalid JSON body", "INVALID_JSON"),
        { status: 400 }
      );
    }

    const parsed = createSongInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        makeApiError(
          "Invalid song submission",
          "INVALID_SONG_INPUT",
          parsed.error.issues.map((issue) => issue.message)
        ),
        { status: 400 }
      );
    }

    const song = await createSong(parsed.data, user, { via });
    return NextResponse.json(song, { status: 201 });
  } catch (error) {
    if (error instanceof AgentRateLimitError) {
      return NextResponse.json(
        makeApiError(error.message, "AGENT_WEEKLY_LIMIT", [
          error.availableAt.toISOString(),
        ]),
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        }
      );
    }
    if (error instanceof DuplicateSongError) {
      return NextResponse.json(
        makeApiError(error.message, "DUPLICATE_SONG", [
          error.existingSong.id,
          error.existingSong.songTitle || "",
          error.existingSong.submitterName,
        ]),
        { status: 409 }
      );
    }
    console.error("Failed to create song:", error);
    return NextResponse.json(
      makeApiError("Failed to create song", "CREATE_SONG_FAILED"),
      { status: 500 }
    );
  }
}
