import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { jsonRouteError, jsonValidationError } from "@/lib/api-route-errors";
import { deleteOwnSong } from "@/lib/songs-db";
import { dbSongIdSchema } from "@/lib/validation";

interface SongRouteContext {
  params: Promise<{ songId: string }>;
}

export async function DELETE(_request: Request, context: SongRouteContext) {
  try {
    const { appAuth, response } = await authorizeApiRequest();
    if (response) return response;

    const { songId } = await context.params;
    const parsedSongId = dbSongIdSchema.safeParse(songId);
    if (!parsedSongId.success) {
      return jsonValidationError(
        "Invalid song ID",
        "INVALID_SONG_ID",
        parsedSongId.error.issues
      );
    }

    await deleteOwnSong(parsedSongId.data, appAuth.user.id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return jsonRouteError(
      error,
      "Failed to delete song:",
      "Failed to delete song",
      "DELETE_SONG_FAILED"
    );
  }
}
