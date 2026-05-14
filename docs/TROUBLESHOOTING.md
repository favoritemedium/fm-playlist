# Troubleshooting

## App Will Not Start

**`DATABASE_URL is not set`**

The app requires Postgres. Compose derives `DATABASE_URL` automatically from
`POSTGRES_*` values. Local Node and managed deployments must set it explicitly.

**Clerk publishable key error**

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is required at build time and runtime.
Docker Compose passes it as a build arg; managed hosts need the same setting in
their build-variable UI.

## Authentication Issues

**Allowed user sees the sign-in page after OAuth**

The `RefreshOnSignIn` component should refresh the server-rendered homepage
after Clerk reports a signed-in session. Check browser console errors and Clerk
redirect settings.

**Unexpected user can sign in**

Check both Clerk dashboard restrictions and `ALLOWED_EMAIL_DOMAIN`. The app's
server-side check is the final authorization boundary for playlist access.

**Clerk logs `secure-context: false`**

The deployed app is being served over HTTP. Clerk cookies and OAuth flows should
use HTTPS in production. Configure TLS for the deployment domain, update Clerk's
allowed production domain to the HTTPS URL, and use live Clerk keys for a real
production deployment.

## Playlist Or API Issues

**Playlist fails to load**

Check Postgres connectivity first. Postgres failures now surface as app/API
errors because Postgres is required.

**Airtable rows are missing**

Check logs for `[SYNC]` messages. Rows are skipped if they lack a YouTube URL,
have an unsupported URL, or have an invalid date. Airtable failures do not stop
Postgres data from loading.

**Invalid YouTube URL rejected**

Accepted formats are:

- `https://youtube.com/watch?v=<videoId>`
- `https://www.youtube.com/watch?v=<videoId>`
- `https://youtu.be/<videoId>`
- `https://www.youtube.com/embed/<videoId>`
- `https://www.youtube.com/shorts/<videoId>`

The video ID must be exactly 11 characters.

## Google Chat Reminders

**Reminder endpoint returns 401**

The request is missing the cron bearer token or has the wrong value. Configure
the scheduler to send `Authorization: Bearer <REMINDER_CRON_SECRET>`.

**Reminder endpoint returns 500**

The reminder runtime configuration is incomplete. Set `SERVICE_URL_APP`,
`GOOGLE_CHAT_WEBHOOK_URL`, and `REMINDER_CRON_SECRET` in the deployed app env.

**Reminder endpoint returns 502**

Google Chat rejected the webhook call. Confirm the Space webhook still exists,
then rotate or recreate `GOOGLE_CHAT_WEBHOOK_URL` if the URL was exposed.

**Cron retries do not send another message**

The app records reminder sends in `reminder_runs` and skips duplicate attempts
for the same job and date window. Inspect app logs and `reminder_runs` if a job
was expected to send again.

## Docker And Database

**Reset local database**

```bash
docker compose down -v
docker compose up -d --build
```

**Inspect rows by source**

```bash
docker compose exec db psql -U fmplaylist -d fm_playlist -c "SELECT source, COUNT(*) FROM songs GROUP BY source;"
```

**Inspect app logs**

```bash
docker compose logs -f app
```

## Quality Gate Failures

- `npm run lint`: check framework, accessibility, and unused-code issues.
- `npm run typecheck`: check TypeScript errors, especially route/helper types.
- `npm run test`: check focused unit tests for parsing, validation, and dates.
- `npm run test`: check focused unit tests for parsing, validation, dates, and
	reminder message/client helpers.
- `npm run build`: check runtime configuration required by Next.js and Clerk.
