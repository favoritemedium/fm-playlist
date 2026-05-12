export const ALLOWED_EMAIL_DOMAIN =
  (process.env.ALLOWED_EMAIL_DOMAIN || "favoritemedium.com")
    .trim()
    .toLowerCase();

export const ALL_FILTER_VALUE = "all" as const;

export type PlaylistFilterValue = number | typeof ALL_FILTER_VALUE;

export function isAllFilterValue(
  value: PlaylistFilterValue
): value is typeof ALL_FILTER_VALUE {
  return value === ALL_FILTER_VALUE;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function getMonthName(month: number): string {
  return MONTHS[month - 1] ?? "";
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function formatMonthYear(month: number, year: number): string {
  return `${getMonthName(month)} ${year}`;
}

export function formatPlaylistPeriod(
  month: PlaylistFilterValue,
  year: PlaylistFilterValue
): string | null {
  if (isAllFilterValue(month)) {
    return isAllFilterValue(year) ? null : year.toString();
  }

  if (isAllFilterValue(year)) {
    return getMonthName(month);
  }

  return formatMonthYear(month, year);
}
