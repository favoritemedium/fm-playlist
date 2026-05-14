import { NextResponse } from "next/server";
import { makeApiError } from "@/lib/api";
import { getReminderCronSecret } from "@/lib/reminder-config";

type CronAuthEnv = Record<string, string | undefined>;

export type AuthorizedCronRequest =
  | { authorized: true; response: null }
  | { authorized: false; response: NextResponse };

function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization")?.trim();
  if (!authorization) return null;

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

export function authorizeCronRequest(
  request: Pick<Request, "headers">,
  env: CronAuthEnv = process.env
): AuthorizedCronRequest {
  const cronSecret = getReminderCronSecret(env);

  if (!cronSecret) {
    return {
      authorized: false,
      response: NextResponse.json(
        makeApiError("Reminder cron secret is not configured", "REMINDER_CRON_SECRET_MISSING"),
        { status: 500 }
      ),
    };
  }

  if (getBearerToken(request.headers) !== cronSecret) {
    return {
      authorized: false,
      response: NextResponse.json(
        makeApiError("Unauthorized", "UNAUTHORIZED_REMINDER_CRON"),
        { status: 401 }
      ),
    };
  }

  return { authorized: true, response: null };
}