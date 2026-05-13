import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import {
  deleteSongComment,
  fetchSongComments,
  fetchSongEngagementSummary,
  updateSongComment,
} from "@/lib/engagement-db";
import { publishEngagementEvent } from "@/lib/engagement-events";
import { makeApiError } from "@/lib/api";
import { jsonRouteError, jsonValidationError } from "@/lib/api-route-errors";
import { syncAppUserIdentity } from "@/lib/users-db";
import {
  positiveIntegerParamSchema,
  updateSongCommentInputSchema,
} from "@/lib/validation";

interface CommentRouteContext {
  params: Promise<{ commentId: string }>;
}

async function parseCommentId(context: CommentRouteContext) {
  const { commentId } = await context.params;
  return positiveIntegerParamSchema.safeParse(commentId);
}

async function buildUpdatedCommentResponse(songId: number, userId: string) {
  const [comments, summary] = await Promise.all([
    fetchSongComments(songId, userId),
    fetchSongEngagementSummary(songId, userId),
  ]);

  await publishEngagementEvent({
    type: "song_engagement_updated",
    songId: summary.songId,
    likeCount: summary.likeCount,
    commentCount: summary.commentCount,
    actorUserId: userId,
  });

  return NextResponse.json({ comments, summary });
}

export async function PATCH(request: Request, context: CommentRouteContext) {
  try {
    const { appAuth, response } = await authorizeApiRequest();
    if (response) return response;

    const parsedCommentId = await parseCommentId(context);
    if (!parsedCommentId.success) {
      return jsonValidationError(
        "Invalid comment ID",
        "INVALID_COMMENT_ID",
        parsedCommentId.error.issues
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(makeApiError("Invalid JSON body", "INVALID_JSON"), {
        status: 400,
      });
    }

    const parsedBody = updateSongCommentInputSchema.safeParse(body);
    if (!parsedBody.success) {
      return jsonValidationError(
        "Invalid comment",
        "INVALID_COMMENT_INPUT",
        parsedBody.error.issues
      );
    }

    await syncAppUserIdentity(appAuth.user);

    const songId = await updateSongComment({
      commentId: parsedCommentId.data,
      userId: appAuth.user.id,
      body: parsedBody.data.body,
    });

    return buildUpdatedCommentResponse(songId, appAuth.user.id);
  } catch (error) {
    return jsonRouteError(
      error,
      "Failed to update song comment:",
      "Failed to update song comment",
      "UPDATE_SONG_COMMENT_FAILED"
    );
  }
}

export async function DELETE(_request: Request, context: CommentRouteContext) {
  try {
    const { appAuth, response } = await authorizeApiRequest();
    if (response) return response;

    const parsedCommentId = await parseCommentId(context);
    if (!parsedCommentId.success) {
      return jsonValidationError(
        "Invalid comment ID",
        "INVALID_COMMENT_ID",
        parsedCommentId.error.issues
      );
    }

    await syncAppUserIdentity(appAuth.user);

    const songId = await deleteSongComment({
      commentId: parsedCommentId.data,
      userId: appAuth.user.id,
    });

    return buildUpdatedCommentResponse(songId, appAuth.user.id);
  } catch (error) {
    return jsonRouteError(
      error,
      "Failed to delete song comment:",
      "Failed to delete song comment",
      "DELETE_SONG_COMMENT_FAILED"
    );
  }
}