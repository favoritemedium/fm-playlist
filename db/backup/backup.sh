#!/bin/sh
# Copies the app database into a dated schema on an offsite Postgres (Neon).
#
# Source:  libpq env vars PGHOST/PGUSER/PGPASSWORD/PGDATABASE (set by
#          docker-compose.yml). DATABASE_URL is used only when PGHOST is not
#          set: hosts such as Coolify inject their own (possibly stale)
#          DATABASE_URL into every service, and it must not win.
# Target:  BACKUP_DATABASE_URL  (set in .env / the Coolify environment)
#
# The source credentials are handed to libpq through the environment, not the
# command line, so they do not show up in the process list.
# Keeps:   BACKUP_RETENTION     most recent copies (default 7)
#
# Each run loads the dump into the target's `public` schema, renames it to
# backup_YYYYMMDD_HHMMSS (UTC), and drops copies beyond the retention count.
# See docs/DEPLOYMENT.md for scheduling and restore instructions.
set -eu

: "${BACKUP_DATABASE_URL:?BACKUP_DATABASE_URL is not set}"
if [ -z "${DATABASE_URL:-}" ] && [ -z "${PGHOST:-}" ]; then
  echo "Set PGHOST/PGUSER/PGPASSWORD/PGDATABASE or DATABASE_URL for the source" >&2
  exit 2
fi
RETENTION="${BACKUP_RETENTION:-7}"
case "$RETENTION" in
  ''|*[!0-9]*|0) echo "BACKUP_RETENTION must be a positive integer" >&2; exit 2 ;;
esac

log() { echo "[backup] $(date -u +%H:%M:%S) $*"; }
# Source: libpq env vars (credentials stay off the command line). Only without
# PGHOST do we fall back to --dbname=$DATABASE_URL.
src() {
  cmd="$1"; shift
  if [ -z "${PGHOST:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
    "$cmd" --dbname="$DATABASE_URL" "$@"
  else
    "$cmd" "$@"
  fi
}
# Target: URL only; clear source env so nothing leaks across.
target() {
  env -u PGHOST -u PGPORT -u PGUSER -u PGPASSWORD -u PGDATABASE -u PGSERVICE \
    PGOPTIONS="-c client_min_messages=warning" \
    psql -X -q -v ON_ERROR_STOP=1 --dbname="$BACKUP_DATABASE_URL" "$@"
}

SCHEMA="backup_$(date -u +%Y%m%d_%H%M%S)"
DUMP="$(mktemp)"
trap 'rm -f "$DUMP"' EXIT

log "dumping source database"
# pg_dump emits CREATE SCHEMA public; the target's public already exists.
# (Not piped, so a pg_dump failure stops the script.)
src pg_dump --schema=public --no-owner --no-privileges --no-comments -f "$DUMP"
sed -i '/^CREATE SCHEMA public;$/d' "$DUMP"

SRC_TABLES="$(src psql -X -At -c \
  "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")"
[ "$SRC_TABLES" -gt 0 ] || { log "source has no tables, refusing to back up"; exit 1; }

log "loading dump into $SCHEMA ($SRC_TABLES tables)"
# Clear any leftover from an interrupted run, load, then rename atomically.
target -c "DROP SCHEMA IF EXISTS public CASCADE" -c "CREATE SCHEMA public"
target --single-transaction -f "$DUMP" >/dev/null

DST_TABLES="$(target -At -c \
  "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")"
if [ "$DST_TABLES" != "$SRC_TABLES" ]; then
  log "table count mismatch (source $SRC_TABLES, backup $DST_TABLES)"
  exit 1
fi
target -c "ALTER SCHEMA public RENAME TO $SCHEMA" -c "CREATE SCHEMA public"

log "pruning to the newest $RETENTION copies"
OLD="$(target -At -c "
  SELECT nspname FROM pg_namespace
  WHERE nspname ~ '^backup_[0-9]{8}_[0-9]{6}\$'
  ORDER BY nspname DESC OFFSET $RETENTION")"
for s in $OLD; do
  log "dropping $s"
  target -c "DROP SCHEMA \"$s\" CASCADE"
done

log "done: $SCHEMA"
