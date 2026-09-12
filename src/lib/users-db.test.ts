import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { query } = vi.hoisted(() => ({ query: vi.fn().mockResolvedValue({ rows: [] }) }));
vi.mock("./db", () => ({ ensureSchema: vi.fn(), getPool: () => ({ query }) }));
import { syncAppUserIdentity } from "./users-db";

describe("identity sync after the temporary admin removal", () => {
  beforeEach(() => { query.mockClear(); });

  it("links approved emails using only permanent application tables", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("contributor_identity_mappings")) throw new Error("relation does not exist");
      return { rows: [] };
    });
    await expect(syncAppUserIdentity({ id: "user1", name: "Ada", email: "ada@example.com" })).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE songs"), ["user1", "Ada", "ada@example.com"]);
  });
});
