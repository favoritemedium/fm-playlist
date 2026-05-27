import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { getCurrentAppAuth } from "@/lib/auth";
import {
  fetchSongEngagementSummary,
  fetchSongLikers,
  setSongLiked,
} from "@/lib/engagement-db";
import { publishEngagementEvent } from "@/lib/engagement-events";
import { jsonRouteError, jsonValidationError } from "@/lib/api-route-errors";
import { syncAppUserIdentity } from "@/lib/users-db";
import { dbSongIdSchema } from "@/lib/validation";

interface SongLikesRouteContext {
  params: Promise<{ songId: string }>;
}

async function parseSongId(context: SongLikesRouteContext) {
  const { songId } = await context.params;
  return dbSongIdSchema.safeParse(songId);
}

export async function GET(_request: Request, context: SongLikesRouteContext) {
  try {
    const appAuth = await getCurrentAppAuth();
    const user = appAuth.status === "authenticated" ? appAuth.user : null;

    const parsedSongId = await parseSongId(context);
    if (!parsedSongId.success) {
      return jsonValidationError(
        "Invalid song ID",
        "INVALID_SONG_ID",
        parsedSongId.error.issues
      );
    }

    if (user) {
      await syncAppUserIdentity(user);
    }

    const [summary, likers] = await Promise.all([
      fetchSongEngagementSummary(parsedSongId.data, user?.id ?? null),
      fetchSongLikers(parsedSongId.data),
    ]);

    return NextResponse.json({ summary, likers });
  } catch (error) {
    return jsonRouteError(
      error,
      "Failed to fetch song likes:",
      "Failed to fetch song likes",
      "FETCH_SONG_LIKES_FAILED"
    );
  }
}

export async function POST(_request: Request, context: SongLikesRouteContext) {
  try {
    const { appAuth, response } = await authorizeApiRequest();
    if (response) return response;

    const parsedSongId = await parseSongId(context);
    if (!parsedSongId.success) {
      return jsonValidationError(
        "Invalid song ID",
        "INVALID_SONG_ID",
        parsedSongId.error.issues
      );
    }

    await syncAppUserIdentity(appAuth.user);
    const summary = await setSongLiked(parsedSongId.data, appAuth.user.id, true);

    await publishEngagementEvent({
      type: "song_engagement_updated",
      songId: summary.songId,
      likeCount: summary.likeCount,
      commentCount: summary.commentCount,
      actorUserId: appAuth.user.id,
      actorLiked: true,
    });

    return NextResponse.json({ summary });
  } catch (error) {
    return jsonRouteError(
      error,
      "Failed to like song:",
      "Failed to like song",
      "LIKE_SONG_FAILED"
    );
  }
}

export async function DELETE(_request: Request, context: SongLikesRouteContext) {
  try {
    const { appAuth, response } = await authorizeApiRequest();
    if (response) return response;

    const parsedSongId = await parseSongId(context);
    if (!parsedSongId.success) {
      return jsonValidationError(
        "Invalid song ID",
        "INVALID_SONG_ID",
        parsedSongId.error.issues
      );
    }

    await syncAppUserIdentity(appAuth.user);
    const summary = await setSongLiked(parsedSongId.data, appAuth.user.id, false);

    await publishEngagementEvent({
      type: "song_engagement_updated",
      songId: summary.songId,
      likeCount: summary.likeCount,
      commentCount: summary.commentCount,
      actorUserId: appAuth.user.id,
      actorLiked: false,
    });

    return NextResponse.json({ summary });
  } catch (error) {
    return jsonRouteError(
      error,
      "Failed to unlike song:",
      "Failed to unlike song",
      "UNLIKE_SONG_FAILED"
    );
  }
}