import { NextResponse } from "next/server";
import { makeApiError } from "@/lib/api";
import { GoogleChatError } from "@/lib/google-chat";
import { ReminderConfigError } from "@/lib/reminder-config";

export function jsonReminderRouteError(
  error: unknown,
  logMessage: string,
  fallbackError: string,
  fallbackCode: string
): NextResponse {
  if (error instanceof ReminderConfigError) {
    return NextResponse.json(
      makeApiError(error.message, error.code, error.details),
      { status: 500 }
    );
  }

  if (error instanceof GoogleChatError) {
    return NextResponse.json(
      makeApiError("Google Chat notification failed", error.code, [
        `Google Chat status: ${error.status}`,
      ]),
      { status: 502 }
    );
  }

  console.error(logMessage, error);
  return NextResponse.json(makeApiError(fallbackError, fallbackCode), {
    status: 500,
  });
}