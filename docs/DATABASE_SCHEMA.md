# Database Schema

FM Playlist stores songs and engagement data in Postgres. Song rows come from
two sources: Airtable legacy sync and new app submissions. Postgres is the
source of truth for songs, likes, comments, and in-app engagement events.

The schema is auto-provisioned on first `docker compose up` by
[../db/init/001_schema.sql](../db/init/001_schema.sql) and guarded at runtime by
`ensureSchema()` in [../src/lib/db.ts](../src/lib/db.ts).

## `app_users` Table

`app_users` stores the Clerk-backed identity snapshot used by likes, comments,
and ownership checks.

| Column | Type | Null | Description |
|---|---|---|---|
| `clerk_user_id` | `TEXT PK` | No | Stable Clerk user ID |
| `name` | `TEXT` | No | Display name from Clerk |
| `email` | `TEXT` | No | Primary email address from Clerk |
| `picture` | `TEXT` | Yes | Clerk avatar URL |
| `created_at` | `TIMESTAMPTZ` | No | Auto-populated |
| `updated_at` | `TIMESTAMPTZ` | No | Auto-updated by trigger |

Indexes:

- `app_users_email_idx` on `lower(email)`

## `songs` Table

| Column | Type | Null | Description |
|---|---|---|---|
| `id` | `SERIAL PK` | No | Auto-increment primary key |
| `source` | `TEXT` | No | `airtable` for synced rows, `app` for new submissions |
| `airtable_record_id` | `TEXT UNIQUE` | Yes | Original Airtable record ID for sync idempotency |
| `submitter_user_id` | `TEXT FK` | Yes | Clerk user ID for app-submitted songs when known |
| `submitter_name` | `TEXT` | No | Airtable submitter or Clerk display name |
| `submitter_email` | `TEXT` | Yes | Populated only for app submissions |
| `artist_name` | `TEXT` | Yes | Airtable artist field |
| `song_title` | `TEXT` | Yes | Airtable title field |
| `description` | `TEXT` | Yes | Airtable description or app-provided note |
| `youtube_url` | `TEXT` | No | Full submitted YouTube URL |
| `youtube_video_id` | `TEXT` | No | Extracted 11-character YouTube video ID |
| `submitted_date` | `DATE` | No | Submission date as `YYYY-MM-DD` |
| `month` | `SMALLINT` | No | 1-12, derived from `submitted_date` |
| `year` | `INTEGER` | No | Derived from `submitted_date` |
| `created_at` | `TIMESTAMPTZ` | No | Auto-populated |
| `updated_at` | `TIMESTAMPTZ` | No | Auto-updated by trigger |

Indexes:

- `songs_submitted_date_idx` on `submitted_date DESC`
- `songs_year_month_idx` on `(year, month)`
- `songs_youtube_video_id_idx` on `youtube_video_id`
- `songs_submitter_user_id_idx` on `submitter_user_id`

Constraints:

- `source` must be `airtable` or `app`.
- `youtube_video_id` must match `^[A-Za-z0-9_-]{11}$`.
- `month` must be between 1 and 12.
- `year` must be between 2000 and 2100.
- `submitter_user_id` references `app_users(clerk_user_id)` and is set to
   `NULL` if the user row is deleted.

## `song_likes` Table

`song_likes` stores one reversible like per user per song.

| Column | Type | Null | Description |
|---|---|---|---|
| `song_id` | `INTEGER FK` | No | Liked song; cascades on song delete |
| `user_id` | `TEXT FK` | No | Liking Clerk user; cascades on user delete |
| `created_at` | `TIMESTAMPTZ` | No | Like timestamp |

Primary key:

- `(song_id, user_id)` prevents duplicate likes from the same user.

Indexes:

- `song_likes_user_id_idx` on `user_id`
- `song_likes_created_at_idx` on `created_at DESC`

## `song_comments` Table

`song_comments` stores top-level comments and one level of replies. The API
enforces that replies can only target top-level comments on the same song.

| Column | Type | Null | Description |
|---|---|---|---|
| `id` | `SERIAL PK` | No | Auto-increment primary key |
| `song_id` | `INTEGER FK` | No | Commented song; cascades on song delete |
| `parent_comment_id` | `INTEGER FK` | Yes | Parent top-level comment for replies |
| `user_id` | `TEXT FK` | No | Comment author; cascades on user delete |
| `body` | `TEXT` | No | Trimmed comment text, 1-500 characters |
| `created_at` | `TIMESTAMPTZ` | No | Auto-populated |
| `updated_at` | `TIMESTAMPTZ` | No | Auto-updated by trigger |

Indexes:

- `song_comments_song_parent_created_idx` on
   `(song_id, parent_comment_id, created_at, id)`
- `song_comments_user_created_idx` on `(user_id, created_at DESC)`
- `song_comments_parent_comment_id_idx` on `parent_comment_id`

Constraints:

- `body` must be non-empty after trimming and no more than 500 characters.
- Deleting a parent comment deletes its replies.

Existing volumes receive these checks through `ensureSchema()` with `NOT VALID`
constraints. That avoids rejecting old rows during startup while enforcing new
writes. Fresh databases get the same constraints at table creation time.

## Data Flow

### Airtable To Postgres

1. Authenticated page/API reads call `getAllSongs()`.
2. The server fetches Airtable records and Postgres records in parallel.
3. Postgres failures throw; Airtable failures degrade to Postgres-only data.
4. Missing Airtable rows are inserted into Postgres with
   `ON CONFLICT (airtable_record_id) DO NOTHING`.
5. Results are returned from Postgres with stable `db_` IDs only, so likes and
   comments can reference `songs.id` safely.
6. Results include like counts, comment counts, and whether the current user
   liked each song.

### New App Submissions

1. User submits a YouTube URL and optional description.
2. `/api/songs` validates JSON with Zod and requires an allowed Clerk user.
3. YouTube video ID is extracted from supported YouTube URL shapes only.
4. Submitter name/email come from Clerk.
5. Record is inserted into Postgres with `source: "app"`.

The current Clerk user is upserted into `app_users` before writes. Existing
app-submitted songs are opportunistically linked to `submitter_user_id` when the
signed-in user's email matches `submitter_email`.

### Likes And Comments

1. User identity is verified with the same approved-domain Clerk flow as song
   submissions.
2. Likes are inserted with `ON CONFLICT DO NOTHING` and removed with `DELETE`.
3. Comment creates validate non-empty text, 500-character maximum, one-level
   reply rules, and a 5-comments-per-user-per-minute rate limit.
4. Comment edits/deletes require ownership. Deletions are hard deletes in v1.
5. Mutations publish compact Postgres `NOTIFY` events for Server-Sent Events
   clients to reconcile counts and in-app submitter notifications.

Descriptions are limited to 500 characters. Dates are normalized to
`YYYY-MM-DD`, and `month` and `year` are derived from that same value.

## Airtable Fields

The app reads these fields from the Airtable `videos` table:

| Field | Type | Example |
|---|---|---|
| `submitterName` | String | `Chanaka Karunarathne` |
| `artistName` | String | `Sunidhi, Labh Janjua` |
| `songTitle` | String | `Dance Pe Chance` |
| `songDescription` | String | `This is a song from one of my favorite movies.` |
| `youtubeLink` | URL | `https://www.youtube.com/watch?v=rap8SoUIPaw` |
| `submittedDate` | Date | `2025-02-18` |