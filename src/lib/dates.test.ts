import { describe, expect, it } from "vitest";
import {
  compareDateOnlyDesc,
  formatDateOnlyForDisplay,
  getDateParts,
  parseDateOnly,
  toDateOnlyString,
} from "./dates";

describe("date-only helpers", () => {
  it("normalizes strings and Date values to YYYY-MM-DD", () => {
    expect(toDateOnlyString("2025-02-18T13:45:00.000Z")).toBe("2025-02-18");
    expect(toDateOnlyString(new Date("2025-02-18T23:59:00.000Z"))).toBe(
      "2025-02-18"
    );
  });

  it("rejects invalid date-only values", () => {
    expect(parseDateOnly("2025-02-31")).toBeNull();
    expect(() => toDateOnlyString("not-a-date")).toThrow("Invalid date value");
  });

  it("returns consistent date parts", () => {
    expect(getDateParts("2025-02-18")).toEqual({
      year: 2025,
      month: 2,
      day: 18,
    });
  });

  it("sorts newest date-only values first", () => {
    expect(compareDateOnlyDesc("2025-02-18", "2025-03-01")).toBeGreaterThan(0);
    expect(compareDateOnlyDesc("2025-03-01", "2025-02-18")).toBeLessThan(0);
  });

  it("formats date-only values without timezone drift", () => {
    expect(formatDateOnlyForDisplay("2025-02-18")).toBe("Feb 18, 2025");
    // Verify other locales format dates as expected
    expect(formatDateOnlyForDisplay("2025-02-18", "ko")).toContain("2025");
    expect(formatDateOnlyForDisplay("2025-02-18", "ko")).toContain("2");
    expect(formatDateOnlyForDisplay("2025-02-18", "ko")).toContain("18");
    expect(formatDateOnlyForDisplay("2025-02-18", "vi")).toContain("18");
    expect(formatDateOnlyForDisplay("2025-02-18", "vi")).toContain("2");
    expect(formatDateOnlyForDisplay("2025-02-18", "vi")).toContain("2025");
  });
});
