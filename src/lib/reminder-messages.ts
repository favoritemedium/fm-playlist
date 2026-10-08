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
    "🎵 *Happy Monday!*",
    "",
    "Start the week with some music. Share one track you've been enjoying with the team.",
    "",
    `▶️ <${url}|Add your song>`,
    "",
    `_You can also ask your AI agent to submit a song for you (one per week). <${url}/agent-api.md|Learn how>_`,
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
    "Thank you to everyone who shared a track this week:",
    submitterList,
    "",
    `🎧 <${url}|Listen to this week's picks>`,
    "",
    "_Have a great weekend!_",
  ].join("\n");
}

export function buildFridayNoSubmittersMessage(appBaseUrl: string): string {
  const url = normalizeAppBaseUrl(appBaseUrl);
  return [
    "🎧 *Happy Friday!*",
    "",
    "No new songs were added this week. There's still time to share one before the weekend.",
    "",
    `<${url}|Add a track>`,
    "",
    "_Have a great weekend!_",
  ].join("\n");
}
