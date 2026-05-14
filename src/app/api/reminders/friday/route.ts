import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { jsonReminderRouteError } from "@/lib/reminder-api";
import { sendFridaySubmitterThanks } from "@/lib/reminders";

export const dynamic = "force-dynamic";

async function handleReminderRequest(request: NextRequest): Promise<NextResponse> {
  const authorization = authorizeCronRequest(request);
  if (authorization.response) return authorization.response;

  try {
    const result = await sendFridaySubmitterThanks();
    return NextResponse.json(result);
  } catch (error) {
    return jsonReminderRouteError(
      error,
      "Friday reminder job failed:",
      "Friday reminder job failed",
      "FRIDAY_REMINDER_FAILED"
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleReminderRequest(request);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleReminderRequest(request);
}