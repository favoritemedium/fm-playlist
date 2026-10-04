import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { resolvePoolConfig } from "./db";

describe("resolvePoolConfig", () => {
  it("uses the PG* variables when PGHOST is set, even if DATABASE_URL is also set", () => {
    const config = resolvePoolConfig({
      PGHOST: "db",
      DATABASE_URL: "postgres://stale:old@elsewhere:5432/x",
    });
    expect(config.connectionString).toBeUndefined();
    expect(config.max).toBe(10);
  });

  it("falls back to DATABASE_URL without PGHOST", () => {
    expect(resolvePoolConfig({ DATABASE_URL: "postgres://u:p@h:5432/d" })).toMatchObject({
      connectionString: "postgres://u:p@h:5432/d",
    });
  });

  it("fails clearly when nothing is configured", () => {
    expect(() => resolvePoolConfig({})).toThrow(/No database configured/);
    expect(() => resolvePoolConfig({ DATABASE_URL: "" })).toThrow(/No database configured/);
  });
});
