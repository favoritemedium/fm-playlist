const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(value: string): DateParts | null {
  const match = value.match(DATE_ONLY_PATTERN);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function toDateOnlyString(value: string | Date): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("Invalid date value");
    }
    return formatUtcDate(value);
  }

  const trimmed = value.trim();
  const datePart = trimmed.includes("T") ? trimmed.split("T")[0] : trimmed;

  if (parseDateOnly(datePart)) {
    return datePart;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }

  return formatUtcDate(parsed);
}

export function getDateParts(value: string | Date): DateParts {
  const dateOnly = toDateOnlyString(value);
  const parts = parseDateOnly(dateOnly);
  if (!parts) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return parts;
}

export function compareDateOnlyDesc(a: string | Date, b: string | Date): number {
  const left = toDateOnlyString(a);
  const right = toDateOnlyString(b);
  return right.localeCompare(left);
}

export function formatDateOnlyForDisplay(value: string | Date, locale: string = "en"): string {
  const dateOnly = toDateOnlyString(value);
  const { year, month, day } = getDateParts(dateOnly);

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

