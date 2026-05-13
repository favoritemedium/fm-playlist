import "server-only";

import { NextResponse } from "next/server";
import type { ZodIssue } from "zod";
import { makeApiError } from "@/lib/api";
import { EngagementError } from "@/lib/engagement-db";

export function jsonValidationError(
  error: string,
  code: string,
  issues: ZodIssue[],
  status = 400
): NextResponse {
  return NextResponse.json(
    makeApiError(
      error,
      code,
      issues.map((issue) => issue.message)
    ),
    { status }
  );
}

export function jsonRouteError(
  error: unknown,
  logMessage: string,
  fallbackError: string,
  fallbackCode: string
): NextResponse {
  if (error instanceof EngagementError) {
    return NextResponse.json(
      makeApiError(error.message, error.code, error.details),
      { status: error.status }
    );
  }

  console.error(logMessage, error);
  return NextResponse.json(makeApiError(fallbackError, fallbackCode), {
    status: 500,
  });
}