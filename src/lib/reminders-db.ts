import "server-only";

import { ensureSchema, getPool } from "@/lib/db";
import type { GoogleChatResponseSummary } from "@/lib/google-chat";
import type { SubmitterSummary } from "@/lib/reminder-messages";

export type ReminderJobName = "monday_song_reminder" | "friday_submitter_thanks";
export type ReminderRunStatus = "started" | "sent" | "failed";
export type ReminderSkipReason = "already_sent" | "in_progress";

interface ReminderRunRow {
  id: number;
  status: ReminderRunStatus;
}

export interface ReminderRunReservation {
  runId: number | null;
  shouldSend: boolean;
  skippedReason: ReminderSkipReason | null;
}

interface SubmitterRow {
  name: string;
  song_count: number | string;
}

export async function fetchSubmittersForWindow(
  startDate: string,
  endExclusiveDate: string
): Promise<SubmitterSummary[]> {
  await ensureSchema();

  const result = await getPool().query<SubmitterRow>(
    `WITH normalized_submitters AS (
       SELECT btrim(submitter_name) AS name
       FROM songs
       WHERE submitted_date >= $1::date
         AND submitted_date < $2::date
     )
     SELECT min(name) AS name, count(*)::int AS song_count
     FROM normalized_submitters
     WHERE name <> ''
     GROUP BY lower(name)
     ORDER BY lower(min(name))`,
    [startDate, endExclusiveDate]
  );

  return result.rows.map((row) => ({
    name: row.name,
    songCount: Number(row.song_count),
  }));
}

export async function reserveReminderRun(
  jobName: ReminderJobName,
  idempotencyKey: string,
  periodStart: string,
  periodEnd: string,
  messageText: string
): Promise<ReminderRunReservation> {
  await ensureSchema();
  const pool = getPool();

  const inserted = await pool.query<ReminderRunRow>(
    `INSERT INTO reminder_runs (
       job_name, idempotency_key, period_start, period_end, status, message_text
     ) VALUES ($1, $2, $3::date, $4::date, 'started', $5)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING id, status`,
    [jobName, idempotencyKey, periodStart, periodEnd, messageText]
  );

  if (inserted.rows[0]) {
    return {
      runId: inserted.rows[0].id,
      shouldSend: true,
      skippedReason: null,
    };
  }

  const existing = await pool.query<ReminderRunRow>(
    `SELECT id, status
     FROM reminder_runs
     WHERE idempotency_key = $1`,
    [idempotencyKey]
  );

  const row = existing.rows[0];
  if (!row || row.status === "sent") {
    return { runId: row?.id ?? null, shouldSend: false, skippedReason: "already_sent" };
  }

  if (row.status === "started") {
    const stale = await pool.query<ReminderRunRow>(
      `UPDATE reminder_runs
       SET message_text = $2,
           error_message = NULL,
           google_chat_response = NULL,
           sent_at = NULL
       WHERE id = $1
         AND updated_at < now() - interval '15 minutes'
       RETURNING id, status`,
      [row.id, messageText]
    );

    if (stale.rows[0]) {
      return { runId: stale.rows[0].id, shouldSend: true, skippedReason: null };
    }

    return { runId: row.id, shouldSend: false, skippedReason: "in_progress" };
  }

  const retry = await pool.query<ReminderRunRow>(
    `UPDATE reminder_runs
     SET status = 'started',
         message_text = $2,
         error_message = NULL,
         google_chat_response = NULL,
         sent_at = NULL
     WHERE id = $1
       AND status = 'failed'
     RETURNING id, status`,
    [row.id, messageText]
  );

  if (retry.rows[0]) {
    return { runId: retry.rows[0].id, shouldSend: true, skippedReason: null };
  }

  return { runId: row.id, shouldSend: false, skippedReason: "in_progress" };
}

export async function markReminderRunSent(
  runId: number,
  googleChatResponse: GoogleChatResponseSummary
): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `UPDATE reminder_runs
     SET status = 'sent',
         google_chat_response = $2::jsonb,
         error_message = NULL,
         sent_at = now()
     WHERE id = $1`,
    [runId, JSON.stringify(googleChatResponse)]
  );
}

export async function markReminderRunFailed(
  runId: number,
  errorMessage: string
): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `UPDATE reminder_runs
     SET status = 'failed',
         error_message = $2
     WHERE id = $1`,
    [runId, errorMessage]
  );
}