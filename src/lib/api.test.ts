import { describe, expect, it } from "vitest";
import { getAuthError, makeApiError } from "./api";
import type { AppAuthResult } from "./auth";

describe("API helpers", () => {
  it("maps unauthenticated users to 401", () => {
    expect(getAuthError({ status: "unauthenticated" })).toEqual({
      status: 401,
      body: { error: "Unauthorized", code: "UNAUTHORIZED" },
    });
  });

  it("maps forbidden users to 403", () => {
    const result = getAuthError({ status: "forbidden", email: "x@example.com" });

    expect(result?.status).toBe(403);
    expect(result?.body.code).toBe("FORBIDDEN_DOMAIN");
  });

  it("does not reject authenticated users", () => {
    const auth: AppAuthResult = {
      status: "authenticated",
      user: {
        id: "user_123",
        name: "Test User",
        email: "test@favoritemedium.com",
      },
    };

    expect(getAuthError(auth)).toBeNull();
  });

  it("omits empty detail arrays", () => {
    expect(makeApiError("Nope", "NOPE", [])).toEqual({
      error: "Nope",
      code: "NOPE",
    });
  });
});
