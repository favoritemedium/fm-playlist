export const DEFAULT_REMINDER_TIME_ZONE = "Asia/Singapore";

type ReminderEnv = Record<string, string | undefined>;

export interface ReminderConfig {
  googleChatWebhookUrl: string;
  cronSecret: string;
  appBaseUrl: string;
  timeZone: string;
}

export class ReminderConfigError extends Error {
  readonly code = "REMINDER_CONFIG_INVALID";
  readonly details: string[];

  constructor(details: string[]) {
    super("Reminder notification configuration is incomplete");
    this.name = "ReminderConfigError";
    this.details = details;
  }
}

function getEnvValue(env: ReminderEnv, name: string): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getReminderCronSecret(
  env: ReminderEnv = process.env
): string | null {
  return getEnvValue(env, "REMINDER_CRON_SECRET");
}

export function getReminderConfig(
  env: ReminderEnv = process.env
): ReminderConfig {
  const googleChatWebhookUrl = getEnvValue(env, "GOOGLE_CHAT_WEBHOOK_URL");
  const cronSecret = getEnvValue(env, "REMINDER_CRON_SECRET");
  const appBaseUrl = getEnvValue(env, "SERVICE_URL_APP");
  const timeZone = getEnvValue(env, "REMINDER_TIME_ZONE") ?? DEFAULT_REMINDER_TIME_ZONE;

  const details: string[] = [];
  if (!googleChatWebhookUrl) details.push("GOOGLE_CHAT_WEBHOOK_URL is required");
  if (!cronSecret) details.push("REMINDER_CRON_SECRET is required");
  if (!appBaseUrl) details.push("SERVICE_URL_APP is required");
  if (!isValidTimeZone(timeZone)) details.push("REMINDER_TIME_ZONE is invalid");

  if (details.length > 0) {
    throw new ReminderConfigError(details);
  }

  return {
    googleChatWebhookUrl: googleChatWebhookUrl!,
    cronSecret: cronSecret!,
    appBaseUrl: appBaseUrl!,
    timeZone,
  };
}