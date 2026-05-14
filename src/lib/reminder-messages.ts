export interface SubmitterSummary {
  name: string;
  songCount: number;
}

function normalizeAppBaseUrl(appBaseUrl: string): string {
  return appBaseUrl.trim().replace(/\/+$/, "");
}

export function formatSubmitterNames(submitters: SubmitterSummary[]): string {
  const names = submitters.map((submitter) => submitter.name.trim()).filter(Boolean);

  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;

  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function buildMondayReminderMessage(appBaseUrl: string): string {
  const url = normalizeAppBaseUrl(appBaseUrl);
  return [
    "Good morning! New week, new picks.",
    "Share one song you have been replaying on FM Playlist:",
    url,
  ].join("\n");
}

export function buildFridayThanksMessage(
  submitters: SubmitterSummary[],
  appBaseUrl: string
): string {
  const url = normalizeAppBaseUrl(appBaseUrl);
  const names = formatSubmitterNames(submitters);

  if (!names) {
    return buildFridayNoSubmittersMessage(url);
  }

  return [
    `Thanks for keeping the playlist moving this week: ${names}.`,
    "Listen to the latest picks here:",
    url,
  ].join("\n");
}

export function buildFridayNoSubmittersMessage(appBaseUrl: string): string {
  const url = normalizeAppBaseUrl(appBaseUrl);
  return [
    "No new songs landed in the playlist this week.",
    "Start the next round with a track you want the team to hear:",
    url,
  ].join("\n");
}