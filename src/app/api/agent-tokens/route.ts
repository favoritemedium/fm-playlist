import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { makeApiError } from "@/lib/api";
import { jsonRouteError, jsonValidationError } from "@/lib/api-route-errors";
import { createAgentToken, listAgentTokens } from "@/lib/agent-tokens";
import { syncAppUserIdentity } from "@/lib/users-db";
import { createAgentTokenInputSchema } from "@/lib/validation";

// Token management is for signed-in people only (Clerk session). Agent tokens
// themselves can never be used here, so an agent cannot mint more tokens.

export async function GET() {
  try {
    const { appAuth, response } = await authorizeApiRequest();
    if (response) return response;

    const tokens = await listAgentTokens(appAuth.user.id);
    return NextResponse.json({ tokens });
  } catch (error) {
    return jsonRouteError(
      error,
      "Failed to list agent tokens:",
      "Failed to list agent tokens",
      "LIST_AGENT_TOKENS_FAILED"
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appAuth, response } = await authorizeApiRequest();
    if (response) return response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        makeApiError("Invalid JSON body", "INVALID_JSON"),
        { status: 400 }
      );
    }

    const parsed = createAgentTokenInputSchema.safeParse(body);
    if (!parsed.success) {
      return jsonValidationError(
        "Invalid agent token request",
        "INVALID_AGENT_TOKEN_INPUT",
        parsed.error.issues
      );
    }

    await syncAppUserIdentity(appAuth.user);
    const created = await createAgentToken(appAuth.user.id, parsed.data.name);
    return NextResponse.json(created, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return jsonRouteError(
      error,
      "Failed to create agent token:",
      "Failed to create agent token",
      "CREATE_AGENT_TOKEN_FAILED"
    );
  }
}
