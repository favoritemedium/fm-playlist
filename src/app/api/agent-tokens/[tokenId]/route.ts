import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { jsonRouteError, jsonValidationError } from "@/lib/api-route-errors";
import { revokeAgentToken } from "@/lib/agent-tokens";
import { positiveIntegerParamSchema } from "@/lib/validation";

interface AgentTokenRouteContext {
  params: Promise<{ tokenId: string }>;
}

export async function DELETE(
  _request: Request,
  context: AgentTokenRouteContext
) {
  try {
    const { appAuth, response } = await authorizeApiRequest();
    if (response) return response;

    const { tokenId } = await context.params;
    const parsedTokenId = positiveIntegerParamSchema.safeParse(tokenId);
    if (!parsedTokenId.success) {
      return jsonValidationError(
        "Invalid token ID",
        "INVALID_AGENT_TOKEN_ID",
        parsedTokenId.error.issues
      );
    }

    await revokeAgentToken(appAuth.user.id, parsedTokenId.data);
    return NextResponse.json({ revoked: true });
  } catch (error) {
    return jsonRouteError(
      error,
      "Failed to revoke agent token:",
      "Failed to revoke agent token",
      "REVOKE_AGENT_TOKEN_FAILED"
    );
  }
}
