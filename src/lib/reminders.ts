import "server-only";

import { sendGoogleChatMessage } from "@/lib/google-chat";
import { getReminderConfig } from "@/lib/reminder-config";
import {
  getRollingReminderDateWindow,
  getSingleDayReminderDateWindow,
} from "@/lib/reminder-dates";
import {
  buildFridayThanksMessage,
  buildMondayReminderMessage,
} from "@/lib/reminder-messages";
import {
  fetchSubmittersForWindow,
  markReminderRunFailed,
  markReminderRunSent,
  reserveReminderRun,
  type ReminderJobName,
  type ReminderSkipReason,
} from "@/lib/reminders-db";

const FRIDAY_ROLLING_WINDOW_DAYS = 7;
const MONDAY_JOB_NAME: ReminderJobName = "monday_song_reminder";
const FRIDAY_JOB_NAME: ReminderJobName = "friday_submitter_thanks";

export interface ReminderSendResult {
  sent: boolean;
  skippedDuplicate: boolean;
  skippedReason: ReminderSkipReason | null;
  jobName: ReminderJobName;
  periodStart: string;
  periodEnd: string;
  submitterCount: number | null;
}

function getReminderIdempotencyKey(
  jobName: ReminderJobName,
  periodStart: string,
  periodEnd: string
): string {
  return `${jobName}:${periodStart}:${periodEnd}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown reminder error";
}

async function sendReminderMessage(params: {
  jobName: ReminderJobName;
  periodStart: string;
  periodEnd: string;
  messageText: string;
  webhookUrl: string;
  submitterCount: number | null;
}): Promise<ReminderSendResult> {
  const idempotencyKey = getReminderIdempotencyKey(
    params.jobName,
    params.periodStart,
    params.periodEnd
  );
  const reservation = await reserveReminderRun(
    params.jobName,
    idempotencyKey,
    params.periodStart,
    params.periodEnd,
    params.messageText
  );

  if (!reservation.shouldSend) {
    return {
      sent: false,
      skippedDuplicate: true,
      skippedReason: reservation.skippedReason,
      jobName: params.jobName,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      submitterCount: params.submitterCount,
    };
  }

  if (!reservation.runId) {
    throw new Error("Reminder run reservation did not return a run ID");
  }

  try {
    const googleChatResponse = await sendGoogleChatMessage(
      params.webhookUrl,
      params.messageText
    );
    await markReminderRunSent(reservation.runId, googleChatResponse);
  } catch (error) {
    await markReminderRunFailed(reservation.runId, getErrorMessage(error));
    throw error;
  }

  return {
    sent: true,
    skippedDuplicate: false,
    skippedReason: null,
    jobName: params.jobName,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    submitterCount: params.submitterCount,
  };
}

export async function sendMondaySongReminder(
  now: Date = new Date()
): Promise<ReminderSendResult> {
  const config = getReminderConfig();
  const window = getSingleDayReminderDateWindow(now, config.timeZone);
  const messageText = buildMondayReminderMessage(config.appBaseUrl);

  return sendReminderMessage({
    jobName: MONDAY_JOB_NAME,
    periodStart: window.startDate,
    periodEnd: window.endExclusiveDate,
    messageText,
    webhookUrl: config.googleChatWebhookUrl,
    submitterCount: null,
  });
}

export async function sendFridaySubmitterThanks(
  now: Date = new Date()
): Promise<ReminderSendResult> {
  const config = getReminderConfig();
  const window = getRollingReminderDateWindow(
    now,
    config.timeZone,
    FRIDAY_ROLLING_WINDOW_DAYS
  );
  const submitters = await fetchSubmittersForWindow(
    window.startDate,
    window.endExclusiveDate
  );
  const messageText = buildFridayThanksMessage(submitters, config.appBaseUrl);

  return sendReminderMessage({
    jobName: FRIDAY_JOB_NAME,
    periodStart: window.startDate,
    periodEnd: window.endExclusiveDate,
    messageText,
    webhookUrl: config.googleChatWebhookUrl,
    submitterCount: submitters.length,
  });
}