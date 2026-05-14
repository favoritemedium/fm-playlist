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

function formatSubmitterBulletList(submitters: SubmitterSummary[]): string {
  return submitters
    .map((submitter) => submitter.name.trim())
    .filter(Boolean)
    .map((name) => `* ${name}`)
    .join("\n");
}

export function buildMondayReminderMessage(appBaseUrl: string): string {
  const url = normalizeAppBaseUrl(appBaseUrl);
  return [
    "🌟 *Happy Monday!*",
    "",
    "Let's kick off the week with a fresh round of songs.",
    "",
    "* Share one track you've been loving",
    `* <${url}|Open FM Playlist>`,
    "",
    "_Have a fantastic week ahead!_",
  ].join("\n");
}

export function buildFridayThanksMessage(
  submitters: SubmitterSummary[],
  appBaseUrl: string
): string {
  const url = normalizeAppBaseUrl(appBaseUrl);
  const submitterList = formatSubmitterBulletList(submitters);

  if (!submitterList) {
    return buildFridayNoSubmittersMessage(url);
  }

  return [
    "🎉 *Happy Friday!*",
    "",
    "Thanks for keeping the playlist moving this week:",
    submitterList,
    "",
    `<${url}|Listen to this week's FM Playlist>`,
    "",
    "_Have a wonderful weekend!_",
  ].join("\n");
}

export function buildFridayNoSubmittersMessage(appBaseUrl: string): string {
  const url = normalizeAppBaseUrl(appBaseUrl);
  return [
    "🎧 *Happy Friday!*",
    "",
    "No new songs landed in the playlist this week.",
    "",
    `<${url}|Add a track to start next week's FM Playlist>`,
    "",
    "_Have a wonderful weekend!_",
  ].join("\n");
}