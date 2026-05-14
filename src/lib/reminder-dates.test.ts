import { describe, expect, it } from "vitest";
import {
  addDaysToDateOnly,
  getLocalDateOnly,
  getRollingReminderDateWindow,
  getSingleDayReminderDateWindow,
} from "./reminder-dates";

describe("reminder date helpers", () => {
  it("derives local dates in the reminder timezone", () => {
    expect(getLocalDateOnly(new Date("2026-05-14T16:30:00.000Z"), "Asia/Singapore")).toBe(
      "2026-05-15"
    );
  });

  it("adds days to date-only values without timezone drift", () => {
    expect(addDaysToDateOnly("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysToDateOnly("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("builds the Friday seven-date window in Singapore time", () => {
    const window = getRollingReminderDateWindow(
      new Date("2026-05-15T09:00:00.000Z"),
      "Asia/Singapore",
      7
    );

    expect(window).toEqual({
      startDate: "2026-05-09",
      endDate: "2026-05-15",
      endExclusiveDate: "2026-05-16",
    });
  });

  it("builds a single-day reminder window", () => {
    expect(
      getSingleDayReminderDateWindow(new Date("2026-05-11T01:00:00.000Z"), "Asia/Singapore")
    ).toEqual({
      startDate: "2026-05-11",
      endDate: "2026-05-11",
      endExclusiveDate: "2026-05-12",
    });
  });
});