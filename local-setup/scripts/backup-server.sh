#!/bin/bash
# Full backup of a DIGIT server, pulled to this machine over SSH.
#
# Captures:
#   1. /opt/digit               (deploy dir: compose files, .env, configs)
#   2. Postgres  (egov DB)      via pg_dump inside the docker-postgres container
#   3. Mongo     (novu-db)      via mongodump inside the novu-mongo container
#
# Dumps are streamed straight over SSH — nothing is left behind on the server.
# Mongo credentials are read from the container's own MONGO_INITDB_ROOT_*
# env, so no passwords need to be passed on the command line.
#
# Usage:
#   backup-server.sh <ssh-target> [dest-dir]
#   backup-server.sh root@10.40.20.3
#   backup-server.sh root@10.40.20.3 /mnt/backups
#
# Overridable via env (defaults shown):
#   DIGIT_DIR=/opt/digit
#   PG_CONTAINER=docker-postgres   PG_USER=egov   PG_DB=egov
#   MONGO_CONTAINER=novu-mongo     MONGO_DB=novu-db
#   SKIP_FILES=0 SKIP_PG=0 SKIP_MONGO=0      set to 1 to skip a step
#   CONTAINER_WAIT=60                        seconds to wait for a restarting container
#   USE_SUDO=auto                            auto | 1 | 0  (sudo for docker on remote)
#   SSH_OPTS="-o ServerAliveInterval=30"     extra ssh options (e.g. "-p 2222 -i key")
#   FILES_EXCLUDE="data/postgres data/mongo" space-separated paths under DIGIT_DIR to skip

set -euo pipefail

if [[ $# -lt 1 || "$1" == "-h" || "$1" == "--help" ]]; then
  sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

TARGET="$1"
DEST_ROOT="${2:-.}"

DIGIT_DIR="${DIGIT_DIR:-/opt/digit}"
PG_CONTAINER="${PG_CONTAINER:-docker-postgres}"
PG_USER="${PG_USER:-egov}"
PG_DB="${PG_DB:-egov}"
MONGO_CONTAINER="${MONGO_CONTAINER:-novu-mongo}"
MONGO_DB="${MONGO_DB:-novu-db}"
SKIP_FILES="${SKIP_FILES:-0}"
SKIP_PG="${SKIP_PG:-0}"
SKIP_MONGO="${SKIP_MONGO:-0}"
USE_SUDO="${USE_SUDO:-auto}"
FILES_EXCLUDE="${FILES_EXCLUDE:-}"
read -r -a SSH_ARGS <<< "${SSH_OPTS:--o ServerAliveInterval=30 -o ServerAliveCountMax=10}"

# Reuse one SSH connection for every step, so a password (or key passphrase)
# is asked only once instead of once per command.
SSH_CTL_DIR="$(mktemp -d)"
SSH_ARGS+=(-o ControlMaster=auto -o "ControlPath=$SSH_CTL_DIR/%C" -o ControlPersist=600)

TS="$(date +%Y%m%d_%H%M%S)"
HOST_LABEL="$(echo "${TARGET#*@}" | tr -c 'A-Za-z0-9._\n-' '_')"
DEST="$DEST_ROOT/backup_${HOST_LABEL}_${TS}"
mkdir -p "$DEST"
LOG="$DEST/backup.log"

log()  { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }
fail() { log "ERROR: $2"; FAILED+=("$1"); }
remote() { ssh "${SSH_ARGS[@]}" "$TARGET" "$@"; }

FAILED=()

log "=== DIGIT backup: $TARGET → $DEST ==="

# ── Preflight ────────────────────────────────────────────────────────────
cleanup() {
  ssh "${SSH_ARGS[@]}" -O exit "$TARGET" >/dev/null 2>&1 || true
  rm -rf "$SSH_CTL_DIR"
}
trap cleanup EXIT

log "Connecting to $TARGET (enter the password if asked — only once) ..."
remote true || { log "ERROR: cannot SSH to $TARGET"; exit 1; }

DOCKER="docker"
case "$USE_SUDO" in
  1) DOCKER="sudo docker" ;;
  0) DOCKER="docker" ;;
  auto) remote "docker ps >/dev/null 2>&1" || DOCKER="sudo docker" ;;
esac
log "Remote docker command: $DOCKER"

# True only when the container is actually "running" — `docker ps` also lists
# containers stuck in a restart loop. Waits up to CONTAINER_WAIT seconds; on
# failure logs the container's state and last log lines for diagnosis.
CONTAINER_WAIT="${CONTAINER_WAIT:-60}"
container_running() {
  local state
  state="$(remote "for i in \$(seq 1 $((CONTAINER_WAIT / 5 + 1))); do
      s=\$($DOCKER inspect -f '{{.State.Status}}' '$1' 2>/dev/null || echo missing)
      [ \"\$s\" = running ] && break
      [ \"\$s\" = missing ] && break
      sleep 5
    done; echo \$s")" || state="ssh-error"
  [[ "$state" == "running" ]] && return 0
  log "      container $1 state: $state"
  if [[ "$state" != "missing" ]]; then
    log "      last log lines of $1:"
    remote "$DOCKER logs --tail 20 '$1' 2>&1" 2>&1 | sed 's/^/        | /' | tee -a "$LOG" || true
  fi
  return 1
}

# ── 1. Deploy directory ──────────────────────────────────────────────────
if [[ "$SKIP_FILES" != "1" ]]; then
  log "[1/3] Copying $DIGIT_DIR ..."
  if remote "test -d '$DIGIT_DIR'"; then
    excludes=""
    for e in $FILES_EXCLUDE; do excludes+=" --exclude='./$e'"; done
    # tar over ssh keeps permissions, symlinks and dotfiles (unlike scp -r).
    # --ignore-failed-read: files rotating under us (logs) shouldn't abort the copy.
    if remote "cd '$DIGIT_DIR' && tar --ignore-failed-read $excludes -czf - ." \
         > "$DEST/digit-files.tar.gz" 2>>"$LOG"; then
      log "      ok  digit-files.tar.gz ($(du -h "$DEST/digit-files.tar.gz" | cut -f1))"
    else
      fail "files" "tar of $DIGIT_DIR failed (see $LOG)"
    fi
  else
    fail "files" "$DIGIT_DIR not found on $TARGET"
  fi
else
  log "[1/3] Skipping files"
fi

# ── 2. Postgres ──────────────────────────────────────────────────────────
if [[ "$SKIP_PG" != "1" ]]; then
  log "[2/3] Dumping Postgres $PG_DB from $PG_CONTAINER ..."
  PG_OUT="$DEST/${PG_DB}_backup_${TS}.sql.gz"
  if container_running "$PG_CONTAINER"; then
    # set -o pipefail on the remote so a pg_dump failure isn't masked by gzip.
    if remote "set -o pipefail; $DOCKER exec '$PG_CONTAINER' pg_dump -U '$PG_USER' -d '$PG_DB' | gzip" \
         > "$PG_OUT" 2>>"$LOG" \
       && gzip -t "$PG_OUT" \
       && zcat "$PG_OUT" | tail -n 5 | grep -q "PostgreSQL database dump complete"; then
      log "      ok  $(basename "$PG_OUT") ($(du -h "$PG_OUT" | cut -f1))"
    else
      rm -f "$PG_OUT"
      fail "postgres" "pg_dump failed or dump incomplete (see $LOG)"
    fi
  else
    fail "postgres" "container $PG_CONTAINER not running (see state/logs above)"
  fi
else
  log "[2/3] Skipping Postgres"
fi

# ── 3. Mongo (Novu) ──────────────────────────────────────────────────────
if [[ "$SKIP_MONGO" != "1" ]]; then
  log "[3/3] Dumping Mongo $MONGO_DB from $MONGO_CONTAINER ..."
  MONGO_OUT="$DEST/${MONGO_DB}-${TS}.archive.gz"
  if container_running "$MONGO_CONTAINER"; then
    # Credentials come from the container's env; single quotes keep $VARS
    # unexpanded until the shell inside the container.
    if remote "$DOCKER exec '$MONGO_CONTAINER' sh -c 'mongodump \
          --username \"\${MONGO_INITDB_ROOT_USERNAME:-root}\" \
          --password \"\${MONGO_INITDB_ROOT_PASSWORD:-secret}\" \
          --authenticationDatabase admin \
          --db \"$MONGO_DB\" --archive --gzip --quiet'" \
         > "$MONGO_OUT" 2>>"$LOG" \
       && [[ -s "$MONGO_OUT" ]]; then
      log "      ok  $(basename "$MONGO_OUT") ($(du -h "$MONGO_OUT" | cut -f1))"
    else
      rm -f "$MONGO_OUT"
      fail "mongo" "mongodump failed (see $LOG)"
    fi
  else
    fail "mongo" "container $MONGO_CONTAINER not running (see state/logs above)"
  fi
else
  log "[3/3] Skipping Mongo"
fi

# ── Checksums + summary ──────────────────────────────────────────────────
(cd "$DEST" && sha256sum -- *.gz > SHA256SUMS 2>/dev/null) || true

cat > "$DEST/RESTORE.md" <<EOF
# Restore notes — $TARGET @ $TS

Files:
  sudo mkdir -p $DIGIT_DIR && sudo tar -xzf digit-files.tar.gz -C $DIGIT_DIR

Postgres (into a running $PG_CONTAINER):
  zcat ${PG_DB}_backup_${TS}.sql.gz | docker exec -i $PG_CONTAINER psql -U $PG_USER -d $PG_DB

Mongo (into a running $MONGO_CONTAINER; --drop replaces existing collections):
  docker exec -i $MONGO_CONTAINER sh -c 'mongorestore --username "\$MONGO_INITDB_ROOT_USERNAME" \\
    --password "\$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin \\
    --archive --gzip --drop' < ${MONGO_DB}-${TS}.archive.gz

Verify integrity first:  sha256sum -c SHA256SUMS
EOF

log "=== Done ==="
ls -la "$DEST" | tee -a "$LOG"

if (( ${#FAILED[@]} )); then
  log "FAILED steps: ${FAILED[*]}"
  exit 2
fi
log "All steps succeeded."
