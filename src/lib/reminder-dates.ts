import { parseDateOnly } from "@/lib/dates";

export interface ReminderDateWindow {
  startDate: string;
  endDate: string;
  endExclusiveDate: string;
}

function toDateOnly(year: number, month: number, day: number): string {
  return [year, month, day]
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, "0")))
    .join("-");
}

export function getLocalDateOnly(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!year || !month || !day) {
    throw new Error("Could not derive local reminder date");
  }

  return toDateOnly(year, month, day);
}

export function addDaysToDateOnly(dateOnly: string, days: number): string {
  const parts = parseDateOnly(dateOnly);
  if (!parts) {
    throw new Error(`Invalid date-only value: ${dateOnly}`);
  }

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return toDateOnly(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function getRollingReminderDateWindow(
  now: Date,
  timeZone: string,
  days: number
): ReminderDateWindow {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error("Reminder date window must be at least one day");
  }

  const endDate = getLocalDateOnly(now, timeZone);
  const startDate = addDaysToDateOnly(endDate, -(days - 1));
  const endExclusiveDate = addDaysToDateOnly(endDate, 1);

  return { startDate, endDate, endExclusiveDate };
}

export function getSingleDayReminderDateWindow(
  now: Date,
  timeZone: string
): ReminderDateWindow {
  const startDate = getLocalDateOnly(now, timeZone);
  return {
    startDate,
    endDate: startDate,
    endExclusiveDate: addDaysToDateOnly(startDate, 1),
  };
}