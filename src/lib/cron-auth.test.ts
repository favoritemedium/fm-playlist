import { describe, expect, it } from "vitest";
import { authorizeCronRequest } from "./cron-auth";

function requestWithAuthorization(value?: string): Pick<Request, "headers"> {
  const headers = new Headers();
  if (value) headers.set("authorization", value);
  return { headers };
}

describe("authorizeCronRequest", () => {
  it("rejects requests when the cron secret is not configured", async () => {
    const result = authorizeCronRequest(requestWithAuthorization("Bearer test"), {});

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(500);
      await expect(result.response.json()).resolves.toEqual({
        error: "Reminder cron secret is not configured",
        code: "REMINDER_CRON_SECRET_MISSING",
      });
    }
  });

  it("rejects missing or incorrect bearer tokens", async () => {
    const env = { REMINDER_CRON_SECRET: "correct" };

    const missing = authorizeCronRequest(requestWithAuthorization(), env);
    const wrong = authorizeCronRequest(requestWithAuthorization("Bearer wrong"), env);

    expect(missing.authorized).toBe(false);
    expect(wrong.authorized).toBe(false);

    if (!wrong.authorized) {
      expect(wrong.response.status).toBe(401);
      await expect(wrong.response.json()).resolves.toEqual({
        error: "Unauthorized",
        code: "UNAUTHORIZED_REMINDER_CRON",
      });
    }
  });

  it("accepts the configured bearer token", () => {
    const result = authorizeCronRequest(
      requestWithAuthorization("Bearer correct"),
      { REMINDER_CRON_SECRET: "correct" }
    );

    expect(result).toEqual({ authorized: true, response: null });
  });
});