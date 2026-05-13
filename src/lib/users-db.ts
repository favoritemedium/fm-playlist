import "server-only";

import type { AppUser } from "@/lib/auth";
import { ensureSchema, getPool } from "./db";

export async function upsertAppUser(user: AppUser): Promise<void> {
  await ensureSchema();

  await getPool().query(
    `INSERT INTO app_users (clerk_user_id, name, email, picture)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (clerk_user_id) DO UPDATE SET
       name = EXCLUDED.name,
       email = EXCLUDED.email,
       picture = EXCLUDED.picture,
       updated_at = now()`,
    [user.id, user.name, user.email, user.picture ?? null]
  );
}

export async function syncAppUserIdentity(user: AppUser): Promise<void> {
  await upsertAppUser(user);

  await getPool().query(
    `UPDATE songs
     SET submitter_user_id = $1
     WHERE submitter_user_id IS NULL
       AND source = 'app'
       AND submitter_email IS NOT NULL
       AND lower(submitter_email) = lower($2)`,
    [user.id, user.email]
  );
}