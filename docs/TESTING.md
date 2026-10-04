# Testing

## Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run test:watch` starts Vitest in watch mode for local development.

### Isolated agent API database tests

The optional `src/lib/agent-api.integration.test.ts` suite exercises real
Postgres locks, concurrent token/song limits, revocation, and ownership.
It skips unless `TEST_DATABASE_URL` is set and refuses anything except the
dedicated local `review` database on port 55432. It creates a unique schema,
uses no `public` fallback, and removes only that schema when finished.

With that dedicated test database running:

```bash
TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/review npm test -- src/lib/agent-api.integration.test.ts
```

Never point verification scripts at production or reuse the application's
database credentials. Stop task-started databases and browsers after testing,
preserving existing services and persistent volumes.

## Current Test Coverage

Unit tests cover:

- YouTube URL parsing and rejection of lookalike hosts
- Date-only normalization and display formatting
- Song submission validation
- API auth/error helper behavior
- Agent token formatting, hashing, ownership, revocation, and active-token limits
- Agent versus human song submission routes, invalid payloads, duplicate responses,
  and weekly rate-limit response headers
- Reminder date-window, message, cron auth, and Google Chat client behavior

Test files live beside the code they cover as `*.test.ts` files.
Realtime engagement and comment permissions are currently verified through the
manual checks below rather than dedicated automated tests.

## Manual Smoke Tests

After larger changes, verify these flows in a browser:

1. Signed-out homepage shows the playlist and Clerk sign-in button; likes,
   saves, comments, and submissions remain mutation-gated.
2. Allowed-domain user can view the playlist.
3. Forbidden-domain user sees the account restriction message and can switch
   accounts.
4. Search filters submitter, title, artist, and description.
5. Month/year filters stay valid when search changes result sets.
6. Add Track accepts valid YouTube URLs and updates the playlist immediately.
7. Add Track rejects invalid URLs and overlong descriptions visibly.
8. Liking and unliking a song updates the count immediately and stays in sync
  after the server response.
9. Opening the engagement dialog loads the liker list, top-level comments, and
  one-level replies for the selected song.
10. Posting a top-level comment and a reply updates counts and thread content.
11. Editing and deleting your own comments works, while another account cannot
  edit or delete them.
12. When one user comments on another user's song, the submitter sees an
  in-app notification and can open the related track from it.
13. Mobile, tablet, and desktop layouts do not overlap.
14. Settings → Agent access is available only to eligible signed-in users. Check
   loading, empty, failure, create/copy, and revoke states at 320px, 390px, 768px,
   and desktop widths. Never include real plaintext tokens in screenshots.
15. Closing/reopening Agent access while a request is pending must not restore a
   plaintext token from a closed dialog. Verify clipboard failure feedback.
16. The footer's Agent API link, `/agent-api.md`, and `/llms.txt` work signed out.
17. Escape closes Settings and returns focus to its button. Tab-out and an
   outside pointer press dismiss it. Closing Agent access also returns focus to
   the persistent Settings button, even though the menu item has unmounted.
18. At 320px, recap stat labels remain readable without clipping or splitting
   the English Contributors label; longer translations may wrap within cards.

## API Checks

With a running app, verify:

- `GET /api/health` returns 200 without authentication.
- `GET /api/songs` is available without authentication, while `POST /api/songs`
  rejects unauthenticated users.
- `POST /api/songs` rejects malformed JSON, invalid YouTube URLs, and
  forbidden-domain users.
- Allowed users can submit a valid YouTube URL.
- A personal agent token can submit on its owner's behalf only at `POST /api/songs`.
  Verify attribution, duplicate handling, weekly limits across multiple tokens,
  revoked/unknown token rejection, and rejection by token-management endpoints.
  Use an isolated database and synthetic credentials for mutating tests.
- `GET /api/songs/[songId]/likes` returns `{ summary, likers }` for an
  authenticated song.
- `POST /api/songs/[songId]/likes` likes the song, and
  `DELETE /api/songs/[songId]/likes` removes that like.
- `GET /api/songs/[songId]/comments` returns `{ comments, summary }` and keeps
  replies attached to top-level comments only.
- `POST /api/songs/[songId]/comments` rejects malformed JSON, empty comments,
  replies-to-replies, and the sixth comment within one minute.
- `PATCH /api/comments/[commentId]` and `DELETE /api/comments/[commentId]`
  reject non-owners and refresh the thread summary for owners.
- `GET /api/engagement/events` stays open as `text/event-stream` for an
  authenticated user and receives engagement updates after likes/comments.
- `POST /api/reminders/monday` rejects missing or invalid cron bearer tokens.
- `POST /api/reminders/monday` sends one Google Chat message and skips a
  duplicate retry for the same date window.
- `POST /api/reminders/friday` lists recent submitter names, and sends the
  no-submitters nudge when the seven-date window is empty.

## CI

`.github/workflows/ci.yml` runs install, lint, typecheck, tests, and build on
pushes to `main` and pull requests.

The build step requires GitHub Actions secrets named
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Use CI-safe Clerk
credentials and keep literal key values out of the workflow file.
