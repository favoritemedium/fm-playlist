import "server-only";

import { NextResponse } from "next/server";
import { getCurrentAppAuth } from "@/lib/auth";
import type { AppAuthResult } from "@/lib/auth";
import { getAuthError } from "@/lib/api";

export type AuthenticatedAppAuth = Extract<
  AppAuthResult,
  { status: "authenticated" }
>;

export type AuthorizedApiRequest =
  | { appAuth: AuthenticatedAppAuth; response: null }
  | { appAuth: null; response: NextResponse };

export async function authorizeApiRequest(): Promise<AuthorizedApiRequest> {
  const appAuth = await getCurrentAppAuth();
  const authError = getAuthError(appAuth);

  if (authError) {
    return {
      appAuth: null,
      response: NextResponse.json(authError.body, { status: authError.status }),
    };
  }

  if (appAuth.status !== "authenticated") {
    throw new Error("Unexpected auth state");
  }

  return { appAuth, response: null };
}