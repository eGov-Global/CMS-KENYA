#!/usr/bin/env bash
# Tenant-agnostic upgrade driver for a DIGIT compose box.
#
#   ./upgrade.sh --config upgrade.conf.bomet --dry-run        # see the plan, change nothing
#   ./upgrade.sh --config upgrade.conf.bomet                  # gated, asks before each risky step
#   ./upgrade.sh --config upgrade.conf.bomet --yes            # non-interactive (CI)
#   ./upgrade.sh --config ... --from-step 6 --backup-dir DIR  # resume after a failure
#   ./upgrade.sh --config ... --only 5                        # run one step
#   ./upgrade.sh --config ... --rollback DIR                  # restore a backup taken by step 4
#   ./upgrade.sh --list-steps
#
# Runs ON the DIGIT server, against $DIGIT_DIR and the local docker daemon.
# Every tenant name, path, container name, port and credential comes from the
# config file (see upgrade.conf.example), so the same script serves any tenant.
#
# Ported from the CMS-MOZAMBIQUE driver (proven on the ige box, 2026-10-16),
# for a v2.12 -> v2.12.1 upgrade: check the host_vars traps first, back up,
# check escalation is safe (migration guide 1.5/1.6), deploy, then refresh
# sessions and test. Mozambique's access-control sync is not here: it was for
# their beta box, and v2.12 already ships the same gateway permission checks.
# Kenya adds steps 5 and 8: the deploy overwrites hand-made config under
# $DIGIT_DIR, so it is recorded before and put back after.
#
# What it deliberately does NOT do:
#   - pick or merge the release (git is the operator's call)
#   - the escalation migration, which needs MDMS decisions per tenant
#     (docs/2.12/migration-guide-v2.12-to-v2.12.1.md step 6a)
#   - credential rotation
# Each is reported as a follow-up at the end rather than silently skipped.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$SCRIPT_DIR/lib"

ASSUME_YES=0
DRY_RUN=0
FROM_STEP=0
ONLY_STEP=""
CONFIG=""
ROLLBACK_DIR=""
REUSE_BACKUP_DIR=""

STEP_NAMES=(
  "preflight         tools, paths, password, host_vars traps"
  "safety-check      Postgres location, OpenBao key + secrets_path, failed migrations"
  "drain             every Kafka consumer group at zero lag"
  "backup            dumps, config tarballs, volume copies, restart + wait until ready"
  "config-snapshot   record the box's own config changes against the release"
  "escalation-check  scheduler off in the overlay, no legacy PGR escalation rows"
  "deploy            ansible deploy.sh for the tenant"
  "config-restore    put back the config changes the deploy dropped"
  "post-deploy       session refresh, health, one-shot jobs, schema, new 403s"
  "smoke             wrong OTP refused, 401 without login, pages, virus-scan upload"
)

usage() {
  sed -n '2,26p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  echo; list_steps; exit 0
}

list_steps() {
  echo "Steps:"
  local i=1
  for s in "${STEP_NAMES[@]}"; do printf "  %d  %s\n" "$i" "$s"; i=$((i + 1)); done
}

while [ $# -gt 0 ]; do
  case "$1" in
    --config)     CONFIG="$2"; shift 2 ;;
    --yes|-y)     ASSUME_YES=1; shift ;;
    --dry-run)    DRY_RUN=1; shift ;;
    --from-step)  FROM_STEP="$2"; shift 2 ;;
    --only)       ONLY_STEP="$2"; shift 2 ;;
    --backup-dir) REUSE_BACKUP_DIR="$2"; shift 2 ;;
    --rollback)   ROLLBACK_DIR="$2"; shift 2 ;;
    --list-steps) list_steps; exit 0 ;;
    -h|--help)    usage ;;
    *) echo "unknown argument: $1 (try --help)" >&2; exit 2 ;;
  esac
done

# Precedence: config file > environment > default. The config is sourced first
# and the defaults below use `:=`, so a key left commented out in the file can
# still be set from the environment for a one-off run.
if [ -n "$CONFIG" ]; then
  [ -f "$CONFIG" ] || { echo "config not found: $CONFIG" >&2; exit 2; }
  # shellcheck disable=SC1090
  . "$CONFIG"
fi

# ── Defaults ─────────────────────────────────────────────────────────────────
: "${REPO:=$(cd "$SCRIPT_DIR/../.." && pwd)}"
: "${DIGIT_DIR:=/opt/digit}"
: "${BACKUP_ROOT:=$HOME}"
: "${PG_CONTAINER:=docker-postgres}"
: "${DB_USER:=egov}"
: "${DB_NAME:=egov}"
: "${KAFKA_CONTAINER:=digit-redpanda}"
: "${KONG_CONTAINER:=kong-gateway}"
: "${OPENBAO_CONTAINER:=openbao}"
: "${KONG_URL:=http://127.0.0.1:18000}"
: "${MDMS_URL:=http://127.0.0.1:18094}"
: "${PUBLIC_URL:=http://localhost}"
# Host header for the smoke tests when PUBLIC_URL is an IP/localhost but nginx
# routes by server_name (e.g. PUBLIC_HOST=falacidadao.gov.mz). Empty = none.
: "${PUBLIC_HOST:=}"
: "${ADMIN_USER:=ADMIN}"
: "${COMPOSE_PROFILES:=mcp,notifications}"
: "${COMPOSE_FILES:=docker-compose.egov-digit.yaml docker-compose.fast-path.yml docker-compose.migrations.yml docker-compose.monitoring.yml}"
# Optional second `up` for containers the box runs from an extra overlay
# (e.g. a hand-enabled file-scan test). Only used when START_EXTRA_FILES is set.
: "${START_EXTRA_FILES:=}"
: "${START_EXTRA_PROFILES:=}"
: "${START_EXTRA_SERVICES:=}"
# Services that crash when the whole stack starts at once (they need MDMS
# before it is ready); restarted once the rest is healthy.
: "${RESTART_AFTER_START:=$(basename "$DIGIT_DIR")-egov-user-1 egov-hrms $(basename "$DIGIT_DIR")-egov-workflow-v2-1}"
: "${READY_TIMEOUT:=900}"
: "${EXPECT_SCHEMA_VERSION:=}"
# Config retention (steps 5 and 8, lib/config_retain.sh). CONFIG_BASE_REF is the
# commit the box was last deployed from; without it edits are only reported.
: "${CONFIG_BASE_REF:=}"
: "${RETAIN_VERBATIM:=}"
# Restarted after step 8 changes a file, so they read it again.
: "${RESTART_AFTER_RESTORE:=kong-gateway digit-gatus}"
: "${TENANT:?set TENANT in the config file or environment}"
: "${HOST_VARS:=$REPO/local-setup/ansible/inventory/host_vars/$TENANT.yml}"
# Optional YAML of top-level keys that override host_vars for this run only
# (passed to deploy.sh as -e @file; preflight reads it before host_vars). For a
# test copy of a box, e.g. another digit_dir, without editing the real host_vars.
: "${HOST_VARS_OVERRIDE:=}"

RUN_ID="$(date +%F-%H%M)"
BACKUP_DIR="${REUSE_BACKUP_DIR:-$BACKUP_ROOT/digit-backup-$TENANT-$RUN_ID}"
LOG_DIR="$BACKUP_ROOT/digit-upgrade-$TENANT-$RUN_ID"
mkdir -p "$LOG_DIR"
STATE_FILE="$LOG_DIR/state"
FOLLOW_UPS=()

# ── Output ───────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  C_OK=$'\033[32m'; C_BAD=$'\033[31m'; C_WARN=$'\033[33m'; C_HEAD=$'\033[1m'; C_OFF=$'\033[0m'
else
  C_OK=""; C_BAD=""; C_WARN=""; C_HEAD=""; C_OFF=""
fi
head_() { printf '\n%s== %s%s\n' "$C_HEAD" "$*" "$C_OFF"; }
ok()    { printf '  %sok%s   %s\n' "$C_OK" "$C_OFF" "$*"; }
warn()  { printf '  %swarn%s %s\n' "$C_WARN" "$C_OFF" "$*"; }
bad()   { printf '  %sFAIL%s %s\n' "$C_BAD" "$C_OFF" "$*"; }
die()   { bad "$*"; exit 1; }

# Risky steps route through here. A dry run never asks. --yes answers for the
# operator; a non-tty without --yes is a hard stop, never an implicit yes.
confirm() {
  [ "$DRY_RUN" = 1 ] && return 0
  [ "$ASSUME_YES" = 1 ] && return 0
  [ -t 0 ] || die "$1 — refusing to assume yes on a non-interactive terminal (pass --yes)"
  local ans; read -r -p "  $1 [y/N] " ans
  [ "$ans" = "y" ] || [ "$ans" = "Y" ]
}

psql_() { docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -Atc "$1"; }

# Loose YAML read: enough for flat scalar keys in host_vars. A missing key or
# file prints nothing and succeeds (under pipefail grep's 1 would abort `x=$(hv k)`).
hv() { { [ -n "$HOST_VARS_OVERRIDE" ] && grep -E "^$1:" "$HOST_VARS_OVERRIDE" 2>/dev/null; grep -E "^$1:" "$HOST_VARS" 2>/dev/null || true; } | head -1 | sed -E "s/^$1:[[:space:]]*//; s/[[:space:]]+#.*//; s/^[\"']//; s/[\"']$//"; }
# host_vars as the deploy sees it: the override's keys first, so a reader that
# takes the first match (lib/safety_check.sh) honours them. 0600: host_vars
# holds secrets.
effective_host_vars() {
  [ -n "$HOST_VARS_OVERRIDE" ] || { echo "$HOST_VARS"; return; }
  local f="$LOG_DIR/host-vars-effective.yml"
  ( umask 077; cat "$HOST_VARS_OVERRIDE" "$HOST_VARS" > "$f" ); echo "$f"
}

# The MDMS state tenant is what host_vars deploys as state_tenant_id (bomet:
# "bo"), which is rarely the ansible tenant name.
: "${STATE_TENANT:=$(hv state_tenant_id)}"
: "${STATE_TENANT:=$TENANT}"
# Where ansible will deploy: host_vars digit_dir, else the group_vars default.
DEPLOY_DIR="$(hv digit_dir)"; DEPLOY_DIR="${DEPLOY_DIR:-/opt/digit}"
RETAIN_DIR="$BACKUP_DIR/config-retain"

have_password() { [ -n "${ADMIN_PASSWORD:-}" ] || { [ -n "${ADMIN_PASSWORD_FILE:-}" ] && [ -f "$ADMIN_PASSWORD_FILE" ]; }; }
# Exported once so every helper reads it from its environment, never argv.
export_password() {
  if [ -z "${ADMIN_PASSWORD:-}" ] && [ -n "${ADMIN_PASSWORD_FILE:-}" ] && [ -f "$ADMIN_PASSWORD_FILE" ]; then
    ADMIN_PASSWORD="$(tr -d '\n' < "$ADMIN_PASSWORD_FILE")"
  fi
  [ -n "${ADMIN_PASSWORD:-}" ] || die "no admin password: set ADMIN_PASSWORD or ADMIN_PASSWORD_FILE"
  export ADMIN_PASSWORD ADMIN_USER KONG_URL MDMS_URL PUBLIC_URL PUBLIC_HOST
}

compose_args() { local f; for f in $COMPOSE_FILES; do printf -- '-f\n%s\n' "$f"; done; }

compose_up() {
  local args=(); mapfile -t args < <(compose_args)
  (cd "$DIGIT_DIR" && sudo COMPOSE_PROFILES="$COMPOSE_PROFILES" docker compose "${args[@]}" up -d) \
    >> "$LOG_DIR/compose-up.log" 2>&1
}

start_stack() {
  : > "$LOG_DIR/compose-up.log"
  # With the whole stack starting at once, a slow service can outlast its
  # healthcheck budget; compose then reports "dependency failed" and skips what
  # depends on it (2026-10-19: novu-api took ~12 min to boot, then went healthy
  # on its own). Docker keeps probing an unhealthy container, so WAIT for it
  # first; restart only what is still unhealthy after READY_TIMEOUT. Then run
  # `up -d` again so the skipped dependants start.
  if ! compose_up; then
    local bad still t0=$SECONDS
    bad="$(docker ps --filter health=unhealthy --format '{{.Names}}')"
    [ -n "$bad" ] || { tail -20 "$LOG_DIR/compose-up.log"; die "compose up failed"; }
    warn "slow to become healthy: $(echo $bad) — waiting (up to ${READY_TIMEOUT}s)"
    printf '  waiting'
    while still="$(docker ps --filter health=unhealthy --format '{{.Names}}' | grep -xF "$bad")" \
          && [ $((SECONDS - t0)) -lt "$READY_TIMEOUT" ]; do printf '.'; sleep 15; done
    echo
    if [ -n "$still" ]; then
      warn "still unhealthy after ${READY_TIMEOUT}s: $(echo $still) — restarting once"
      # shellcheck disable=SC2086
      docker restart $still >/dev/null
    fi
    compose_up || { tail -20 "$LOG_DIR/compose-up.log"; die "compose up failed again (check: $(echo $bad))"; }
  fi
  if [ -n "$START_EXTRA_FILES" ]; then
    local extra=() f
    for f in $COMPOSE_FILES $START_EXTRA_FILES; do extra+=(-f "$f"); done
    # shellcheck disable=SC2086
    (cd "$DIGIT_DIR" && sudo COMPOSE_PROFILES="$START_EXTRA_PROFILES" docker compose "${extra[@]}" \
       up -d --no-deps $START_EXTRA_SERVICES) >> "$LOG_DIR/compose-up.log" 2>&1 \
      || warn "extra overlay up failed — see $LOG_DIR/compose-up.log"
  fi
  ok "stack started (compose log: $LOG_DIR/compose-up.log)"
}

can_login() {
  ADMIN_PASSWORD="$ADMIN_PASSWORD" KONG_URL="$KONG_URL" python3 -I -c '
import os, sys
sys.path.insert(0, sys.argv[1])
from digit_api import login
login(os.environ["KONG_URL"], os.environ["ADMIN_USER"], os.environ["ADMIN_PASSWORD"], sys.argv[2])
' "$LIB_DIR" "$STATE_TENANT" >/dev/null 2>&1
}

# `up -d` returns long before the JVMs serve. Wait for the healthchecks to
# settle, restart the services known to lose the startup race with MDMS, then
# prove readiness with a real admin login through Kong.
wait_ready() {
  local t0=$SECONDS c st
  printf '  waiting for healthchecks'
  while [ "$(docker ps --format '{{.Status}}' | grep -c 'health: starting')" != "0" ]; do
    [ $((SECONDS - t0)) -gt "$READY_TIMEOUT" ] && { echo; die "stack not ready after ${READY_TIMEOUT}s"; }
    printf '.'; sleep 10
  done
  echo
  for c in $RESTART_AFTER_START; do
    st="$(docker inspect -f '{{.State.Status}}/{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$c" 2>/dev/null || echo missing)"
    case "$st" in
      running/healthy|running/|missing) ;;
      *) warn "$c is $st — restarting (startup race with MDMS)"; docker restart "$c" >/dev/null ;;
    esac
  done
  if [ -z "${ADMIN_PASSWORD:-}" ]; then
    warn "no admin password given — readiness checked by healthchecks only (no login probe)"
    ok "stack ready ($((SECONDS - t0))s)"; return 0
  fi
  printf '  waiting for admin login through Kong'
  until can_login; do
    [ $((SECONDS - t0)) -gt "$READY_TIMEOUT" ] && { echo; die "admin login still failing after ${READY_TIMEOUT}s"; }
    printf '.'; sleep 10
  done
  echo; ok "stack ready ($((SECONDS - t0))s)"
}

# ── 1. preflight ─────────────────────────────────────────────────────────────
# ── Host OS ──────────────────────────────────────────────────────────────────
# Detected once; everything OS-specific below branches on these, never on
# hard-coded assumptions (Ubuntu sites-enabled vs RHEL conf.d, ufw vs
# firewalld, SELinux). Same families the deploy playbook supports.
detect_os() {
  OS_FAMILY=unknown OS_NAME=unknown OS_VER="" PKG=""
  if [ "$(uname -s)" = "Darwin" ]; then
    OS_FAMILY=darwin OS_NAME=macOS OS_VER="$(sw_vers -productVersion 2>/dev/null)" PKG=brew
  elif [ -r /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    OS_NAME="${NAME:-unknown}" OS_VER="${VERSION_ID:-}"
    case " ${ID:-} ${ID_LIKE:-} " in
      *" debian "*|*" ubuntu "*)                     OS_FAMILY=debian PKG=apt ;;
      *" rhel "*|*" centos "*|*" fedora "*|*" rocky "*) OS_FAMILY=rhel PKG=dnf ;;
    esac
  fi
  SELINUX=none
  command -v getenforce >/dev/null 2>&1 && SELINUX="$(getenforce 2>/dev/null | tr 'A-Z' 'a-z')"
  FIREWALL=none
  if command -v firewall-cmd >/dev/null 2>&1 && systemctl is-active -q firewalld 2>/dev/null; then FIREWALL=firewalld
  elif command -v ufw >/dev/null 2>&1; then FIREWALL=ufw; fi
  NGINX_SITES=""
  if [ "$OS_FAMILY" = rhel ]; then NGINX_SITES=/etc/nginx/conf.d
  elif [ "$OS_FAMILY" = debian ]; then NGINX_SITES=/etc/nginx/sites-enabled; fi
  command -v sha256sum >/dev/null 2>&1 && SHA256="sha256sum" || SHA256="shasum -a 256"
}

firewall_snapshot() {   # stdout: the host firewall's current rules, read-only
  case "$FIREWALL" in
    firewalld) sudo firewall-cmd --list-all 2>/dev/null ;;
    ufw)       sudo ufw status verbose 2>/dev/null ;;
    *)         echo "no managed host firewall (ufw/firewalld) detected" ;;
  esac
}

step_preflight() {
  head_ "1/10 preflight"
  local fail=0 t s

  ok "host        $OS_NAME $OS_VER (family $OS_FAMILY, SELinux $SELINUX, firewall $FIREWALL)"
  case "$OS_FAMILY" in
    debian|rhel|darwin) ;;
    *) warn "unrecognised OS — the deploy supports Ubuntu/Debian, Rocky/Alma/RHEL/CentOS Stream and macOS" ;;
  esac
  [ "$OS_FAMILY" = rhel ] && warn "Red Hat family is supported by the playbook but not by the v2.12.1 release notes — dry-run on a copy first"

  for t in docker python3 curl tar rsync; do
    if command -v "$t" >/dev/null 2>&1; then ok "$t present"
    else
      bad "$t not on PATH — install it: $([ "$PKG" = apt ] && echo "sudo apt-get install -y $t" || { [ "$PKG" = dnf ] && echo "sudo dnf install -y $t" || echo "brew install $t"; })"; fail=1
    fi
  done
  # The helpers use subprocess.run(capture_output=...) — Python 3.7+.
  if command -v python3 >/dev/null 2>&1 && ! python3 -c 'import sys; sys.exit(sys.version_info < (3, 7))'; then
    bad "python3 is $(python3 -V 2>&1 | cut -d' ' -f2); 3.7+ needed$([ "$PKG" = dnf ] && echo " — on EL8: sudo dnf install -y python39 and put it first on PATH")"; fail=1
  fi
  if [ "$OS_FAMILY" = rhel ] && [ "$SELINUX" = enforcing ]; then
    command -v restorecon >/dev/null 2>&1 && ok "SELinux enforcing; restorecon available for rollback relabel" \
      || { bad "SELinux enforcing but restorecon missing (sudo dnf install -y policycoreutils)"; fail=1; }
  fi
  # The deploy dnf-installs these for the nginx basic-auth files (status board
  # on by default). Base Rocky/RHEL 10 repos lack them; they are in EPEL (+CRB).
  # Seen 2026-10-19 on mz UAT. The playbook now falls back to a private venv.
  # Skipped when host_vars turns the status board off (inline or block form).
  if [ "$OS_FAMILY" = rhel ] && ! python3 -I - "$HOST_VARS" <<'PY' 2>/dev/null
import re, sys
t = open(sys.argv[1]).read()
inline = re.search(r'^nginx_features:\s*\{[^}]*\bstatus:\s*false', t, re.M | re.I)
block = re.search(r'^nginx_features:\s*\n((?:[ \t]+.*\n?)*)', t, re.M)
sys.exit(0 if inline or (block and re.search(r'^\s+status:\s*false', block.group(1), re.M | re.I)) else 1)
PY
  then
    local p missing=""
    for p in python3-passlib python3-bcrypt; do
      rpm -q "$p" >/dev/null 2>&1 || dnf -q list --available "$p" >/dev/null 2>&1 || missing="$missing $p"
    done
    if [ -z "$missing" ]; then ok "nginx basic-auth packages installable (python3-passlib, python3-bcrypt)"
    else
      warn "not in the enabled repos:$missing — the deploy will pip-install passlib+bcrypt into"
      warn "  /opt/digit-htpasswd-venv instead (needs https://pypi.org from this box)"
      curl -sS -m 10 -o /dev/null https://pypi.org/simple/passlib/ 2>/dev/null \
        && ok "pypi.org reachable" \
        || { bad "pypi.org not reachable — enable EPEL or set nginx_features: { status: false } in host_vars"; fail=1; }
    fi
  fi
  if [ "$FIREWALL" != none ] && [ "$(hv manage_host_firewall)" != "false" ]; then
    warn "the deploy manages the $FIREWALL firewall (incoming: SSH, 80, 443 only). Current rules are saved in step 4;"
    warn "  if other machines need other ports, set manage_host_firewall: false (or allow them) in host_vars first"
  fi
  # tls_enabled defaults to TRUE: the rendered vhost then includes certbot's
  # files under /etc/letsencrypt, and nginx refuses the whole config if they are
  # missing (mz UAT 2026-10-19, prod 2026-10-23: TLS ends in front of the box).
  local tls dom
  tls="$(hv tls_enabled)"; dom="$(hv domain)"
  if [ "$OS_FAMILY" != darwin ] && [ "${tls:-true}" != "false" ]; then
    if [ -n "$dom" ] && [ -f "/etc/letsencrypt/live/$dom/fullchain.pem" ] && [ -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
      ok "tls_enabled: Let's Encrypt files present for $dom"
    else
      bad "tls_enabled is ${tls:-unset (= true)} but /etc/letsencrypt has no certificate/options for ${dom:-<domain>} — nginx will refuse the new site."
      bad "  if HTTPS ends in front of this box (old vhost only 'listen 80'), set tls_enabled: false plus"
      bad "  kong_cors_origins / novu_public_base_url / chatbot_webhook_base_url to the https:// address"; fail=1
    fi
  fi
  # A container started by hand (docker run) under a name the compose files
  # declare makes the deploy's `up -d` fail on a name conflict (mz UAT,
  # 2026-10-19 and -22: a hand-run xstate-chatbot). Name them before any downtime.
  if command -v docker >/dev/null 2>&1; then
    local names c proj clash=""
    names="$(cat "$REPO"/local-setup/docker-compose.egov-digit.yaml "$REPO"/local-setup/docker-compose.migrations.yml \
               "$REPO"/local-setup/docker-compose.monitoring.yml "$REPO"/local-setup/docker-compose.matomo.yml \
               "$REPO/local-setup/docker-compose.$TENANT.yml" 2>/dev/null \
             | sed -nE 's/^[[:space:]]+container_name:[[:space:]]*"?([^"[:space:]]+)"?.*/\1/p' | sort -u)"
    for c in $names; do
      proj="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$c" 2>/dev/null)" || continue
      [ "$proj" = "$(basename "$DIGIT_DIR")" ] || clash="$clash $c(${proj:-docker run})"
    done
    if [ -z "$clash" ]; then ok "no hand-started containers clash with compose names"
    else
      bad "containers not started by the digit compose project use names the deploy needs:$clash"
      bad "  check them (docker inspect NAME), then docker rm -f NAME — or the deploy fails on a name conflict"; fail=1
    fi
  fi
  command -v ansible-playbook >/dev/null 2>&1 && ok "ansible-playbook present" \
    || { bad "ansible-playbook not on PATH (needed by step 7)"; fail=1; }
  docker info >/dev/null 2>&1 && ok "docker daemon reachable" \
    || { bad "cannot talk to the docker daemon (docker group?)"; fail=1; }
  sudo -n true 2>/dev/null && ok "passwordless sudo" \
    || warn "sudo will prompt (backup, compose up and the deploy need it)"

  [ -d "$REPO" ]      && ok "repo        $REPO"      || { bad "repo not found: $REPO"; fail=1; }
  [ -d "$DIGIT_DIR" ] && ok "digit dir   $DIGIT_DIR" || { bad "digit dir not found: $DIGIT_DIR"; fail=1; }
  [ -f "$HOST_VARS" ] && ok "host_vars   $HOST_VARS" \
    || { bad "host_vars not found: $HOST_VARS (deploy.sh only reads inventory/host_vars/$TENANT.yml — copy the box's file there; it is gitignored)"; fail=1; }
  [ -x "$REPO/local-setup/ansible/deploy.sh" ] && ok "deploy.sh executable" \
    || { bad "not executable: $REPO/local-setup/ansible/deploy.sh"; fail=1; }
  for s in safety_check.sh backup.sh config_retain.sh refresh_session.py digit_api.py smoke_upload.py; do
    [ -f "$LIB_DIR/$s" ] || { bad "missing helper: $LIB_DIR/$s"; fail=1; }
  done
  docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER" \
    && ok "postgres container $PG_CONTAINER up" || { bad "postgres container not running: $PG_CONTAINER"; fail=1; }
  if have_password; then ok "admin password configured"
  elif [ "$DRY_RUN" = 1 ]; then warn "no admin password (ADMIN_PASSWORD or ADMIN_PASSWORD_FILE) — fine for a dry run, required for the real run"
  else bad "no admin password (ADMIN_PASSWORD or ADMIN_PASSWORD_FILE)"; fail=1; fi

  # host_vars traps — each one broke a real deploy on 2026-10-16.
  if [ -f "$HOST_VARS" ]; then
    local ddr cur pins
    # The compose project is the basename of the deploy dir. A box living in
    # /opt/digit-<tenant> deployed to the default /opt/digit gets a NEW project
    # with new, empty volumes — the old data is untouched but no longer served.
    if [ "$DEPLOY_DIR" = "$DIGIT_DIR" ]; then ok "deploy target $DEPLOY_DIR is this box's dir"
    else
      bad "the deploy would go to $DEPLOY_DIR, but this box runs from $DIGIT_DIR — a new, EMPTY stack."
      bad "  add  digit_dir: $DIGIT_DIR  to $HOST_VARS"; fail=1
    fi
    # *_image pins override the release's images. Left at old tags they deploy
    # old code onto the new schema; point them at the new build or remove them.
    pins="$(grep -E '^[a-z0-9_]+_image:' "$HOST_VARS" | sed -E 's/[[:space:]]+#.*//' || true)"
    if [ -n "$pins" ]; then
      warn "host_vars pins these images (they win over the release) — set them to the new build or remove them:"
      echo "$pins" | sed 's/^/         /'
    else ok "no *_image pins in host_vars (release images are used)"; fi
    if docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
      [ "$(psql_ "select count(*) from eg_mdms_data where tenantid='$STATE_TENANT'" 2>/dev/null || echo 0)" -gt 0 ] \
        && ok "state tenant $STATE_TENANT has MDMS data" \
        || { bad "no MDMS data for state tenant '$STATE_TENANT' — set STATE_TENANT (host_vars state_tenant_id is '$(hv state_tenant_id)')"; fail=1; }
    fi
    ddr="$(hv docker_data_root)"; cur="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null)"
    if [ -n "$ddr" ] && [ "$ddr" != "$cur" ]; then
      bad "docker_data_root '$ddr' but Docker runs on '$cur' — the deploy would MOVE Docker to an empty dir (looks like total data loss). Set docker_data_root: \"\""; fail=1
    else ok "docker_data_root does not move Docker"; fi

    [ -n "$(hv secrets_path)" ] && ok "secrets_path $(hv secrets_path) (verified against OpenBao in step 2)" \
      || { bad "secrets_path unset"; fail=1; }

    if [ "$(hv enable_digit_ui_v2)" = "true" ] && [ -n "$(hv digit_ui_v2_repo)" ] \
       && [ -d /opt/digit-ui-v2 ] && [ ! -d /opt/digit-ui-v2/.git ]; then
      bad "digit_ui_v2_repo is set but /opt/digit-ui-v2 is a plain copy — the clone fails mid-deploy. Comment digit_ui_v2_repo out to build from this checkout"; fail=1
    else ok "digit-ui-v2 source mode ok"; fi

    # Direct-mode SMS/mail credentials: the deploy re-renders .env from
    # templates/digit.env.j2 + host_vars. A key set on the box but missing from
    # either would come back empty (SMS/OTP and mail stop); one whose host_vars
    # value differs would deploy a stale credential. Values are compared,
    # never printed.
    if [ "$(hv enable_notifications_direct)" = "true" ]; then
      local tmpl="$REPO/local-setup/ansible/templates/digit.env.j2" envf="$DIGIT_DIR/.env" k v hk dropped="" differ=""
      local envtxt; envtxt="$(cat "$envf" 2>/dev/null || sudo -n cat "$envf" 2>/dev/null || true)"
      for k in NOVU_BRIDGE_DIRECT_CHANNELS NOVU_BRIDGE_DIRECT_SMS_PROVIDER NOVU_BRIDGE_DIRECT_SMS_BASE_URL \
               NOVU_BRIDGE_DIRECT_SMS_USERNAME NOVU_BRIDGE_DIRECT_SMS_PASSWORD NOVU_BRIDGE_DIRECT_SMS_TOKEN \
               NOVU_BRIDGE_DIRECT_EMAIL_FROM SPRING_MAIL_HOST SPRING_MAIL_PORT SPRING_MAIL_USERNAME \
               SPRING_MAIL_PASSWORD SPRING_MAIL_SMTP_AUTH SPRING_MAIL_SMTP_STARTTLS; do
        v="$(printf '%s\n' "$envtxt" | sed -n "s/^$k=//p" | tail -1)"
        [ -n "$v" ] || continue
        hk="$(hv "$(echo "$k" | tr 'A-Z' 'a-z')")"
        if ! grep -q "^$k=" "$tmpl" 2>/dev/null || [ -z "$hk" ]; then dropped="$dropped $k"
        elif [ "$(printf '%s' "$hk" | tr 'A-Z' 'a-z')" != "$(printf '%s' "$v" | sed -E "s/^[\"']//; s/[\"']$//" | tr 'A-Z' 'a-z')" ]; then
          differ="$differ $k"
        fi
      done
      if [ -z "$envtxt" ]; then warn "cannot read $envf — direct SMS/mail credentials not checked"
      else
        [ -n "$dropped" ] && { bad "the deploy would empty these direct-notification settings (set on the box, missing from digit.env.j2 or host_vars):$dropped"; fail=1; }
        [ -n "$differ" ] && { bad "host_vars differs from the box's .env for:$differ — copy the box's values into host_vars (tenant/bomet/env-to-host-vars.sh)"; fail=1; }
        [ -z "$dropped$differ" ] && ok "direct SMS/mail settings in host_vars match the box"
      fi
    fi

    [ -n "$(hv locale_default)" ] && ok "UI language locale_default=$(hv locale_default)" \
      || warn "locale_default unset — the UI falls back to English (en/IN); set locale_region/locale_default"
    if [ "$(hv enable_novu)" = "true" ] && [ -z "$(hv novu_api_key)" ]; then
      warn "enable_novu true and novu_api_key empty in host_vars — fine on an existing box (the deploy reuses the key stored in OpenBao); a fresh box fails because v2.12.1 disables Novu sign-up"
    fi
    [ -n "$(hv bootstrap_password)" ] \
      && warn "bootstrap_password is set — it must equal ADMIN's CURRENT password or the deploy stops" \
      || ok "bootstrap_password unset (deploy logs in with ADMIN's current password)"
  fi

  if git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1; then
    ok "branch      $(git -C "$REPO" branch --show-current 2>/dev/null || echo '<detached>')"
    local dirty; dirty="$(git -C "$REPO" status --porcelain | wc -l)"
    [ "$dirty" -gt 0 ] && warn "$dirty uncommitted file(s) — these WILL be deployed"
  fi

  printf '\n  tenant %s   state tenant %s\n  backup -> %s\n  logs   -> %s\n' \
    "$TENANT" "$STATE_TENANT" "$BACKUP_DIR" "$LOG_DIR"
  [ "$fail" = 0 ] || die "preflight failed; fix the above before continuing"
  ok "preflight clean"
}

# ── 2. safety check ──────────────────────────────────────────────────────────
step_safety_check() {
  head_ "2/10 safety check"
  if [ "$DRY_RUN" = 1 ]; then echo "  would run: safety_check.sh $DIGIT_DIR $HOST_VARS"; return 0; fi
  PG_CONTAINER="$PG_CONTAINER" DB_USER="$DB_USER" DB_NAME="$DB_NAME" \
    bash "$LIB_DIR/safety_check.sh" "$DIGIT_DIR" "$(effective_host_vars)" 2>&1 | tee "$LOG_DIR/safety-check-before.log" || true
  grep -q "RESULT: no blocking problems" "$LOG_DIR/safety-check-before.log" \
    || die "safety check reported blocking problems — see $LOG_DIR/safety-check-before.log"
  grep -q "secrets_path .* matches .env" "$LOG_DIR/safety-check-before.log" \
    || warn "secrets_path was not verified (OpenBao not running?) — check it by hand before deploying"
}

# ── 3. drain ─────────────────────────────────────────────────────────────────
step_drain() {
  head_ "3/10 kafka drain"
  if ! docker ps --format '{{.Names}}' | grep -qx "$KAFKA_CONTAINER"; then
    warn "kafka container $KAFKA_CONTAINER not running — skipping lag check"; return 0
  fi
  local busy=0 g lag
  for g in $(docker exec "$KAFKA_CONTAINER" rpk group list 2>/dev/null | awk 'NR>1{print $2}'); do
    lag="$(docker exec "$KAFKA_CONTAINER" rpk group describe "$g" 2>/dev/null | awk '/TOTAL-LAG/{print $2}')"
    if [ "${lag:-0}" != "0" ]; then bad "$g lag=$lag"; busy=1; else ok "$g drained"; fi
  done
  [ "$busy" = 1 ] && { confirm "consumer groups still have lag — continue anyway?" || die "stopped at drain"; }
  return 0
}

# ── 4. backup ────────────────────────────────────────────────────────────────
step_backup() {
  head_ "4/10 backup -> $BACKUP_DIR"
  confirm "take the backup now? the stack is stopped for the volume copies" \
    || die "stopped at backup — a backup is required before deploying"
  if [ "$DRY_RUN" = 1 ]; then echo "  would run: backup.sh, restart the stack, wait until ready"; return 0; fi
  export_password

  BACKUP_STOP_STACK=1 PG_CONTAINER="$PG_CONTAINER" DB_USER="$DB_USER" DB_NAME="$DB_NAME" \
    bash "$LIB_DIR/backup.sh" "$DIGIT_DIR" "$BACKUP_DIR" 2>&1 | tee "$LOG_DIR/backup.log"
  [ -s "$BACKUP_DIR/pg_dumpall.sql" ] || die "backup has no database dump — stopping"
  # The unseal key is the one file whose loss is unrecoverable.
  # .openbao is 0700 and often root-owned, so test and copy through sudo too.
  if [ -f "$DIGIT_DIR/.openbao/init.json" ] || sudo -n test -f "$DIGIT_DIR/.openbao/init.json" 2>/dev/null; then
    ( umask 077; cat "$DIGIT_DIR/.openbao/init.json" 2>/dev/null || sudo -n cat "$DIGIT_DIR/.openbao/init.json" ) \
      > "$BACKUP_DIR/init.json.correct"
    chmod 600 "$BACKUP_DIR/init.json.correct"; ok "openbao unseal key copied"
  else warn "no $DIGIT_DIR/.openbao/init.json to copy"; fi
  echo "$BACKUP_DIR" > "$STATE_FILE"
  # The deploy may change the host firewall; keep the rules as they were.
  firewall_snapshot > "$BACKUP_DIR/firewall-before.txt" 2>&1 && ok "firewall rules saved ($FIREWALL) -> firewall-before.txt"

  start_stack
  wait_ready
  FOLLOW_UPS+=("copy $BACKUP_DIR to another machine — it is only on this box")
}

# ── 5. config snapshot ───────────────────────────────────────────────────────
# The deploy rsyncs the release's config dirs over $DIGIT_DIR and re-renders
# .env / globalConfigs.js / digit-ui.conf from host_vars, so edits made on the
# box are dropped. Record them against the release about to be deployed (the
# checkout in $REPO) while the box still has them. Read-only.
retain_() {
  CONFIG_BASE_REF="$CONFIG_BASE_REF" RETAIN_VERBATIM="$RETAIN_VERBATIM" \
    bash "$LIB_DIR/config_retain.sh" "$@"
}

step_config_snapshot() {
  head_ "5/10 config snapshot"
  local out="$RETAIN_DIR"
  [ "$DRY_RUN" = 1 ] && out="$LOG_DIR/config-retain"
  [ -n "$CONFIG_BASE_REF" ] && ok "merge base CONFIG_BASE_REF=$CONFIG_BASE_REF" \
    || warn "CONFIG_BASE_REF unset — edited files are reported, not merged (only RETAIN_VERBATIM is restored)"
  retain_ snapshot "$DIGIT_DIR" "$REPO" "$out" 2>&1 | tee "$LOG_DIR/config-snapshot.log" | sed 's/^/  /' \
    || die "config snapshot failed — see $LOG_DIR/config-snapshot.log"
  grep -q '^TMPL' "$LOG_DIR/config-snapshot.log" \
    && FOLLOW_UPS+=("templated files (TMPL in $LOG_DIR/config-snapshot.log) are re-rendered from host_vars: hand edits there must move into host_vars to survive")
  return 0
}

# ── 6. escalation check ─────────────────────────────────────────────────────
# Migration guide steps 1.5 and 1.6. The v2.12.1 escalation scheduler must stay
# off until step 6a is done, and pgr-services refuses to escalate at all while
# a legacy PGR row is active in the generic Workflow escalation masters.
# Read-only: it only stops the run.
step_escalation_check() {
  head_ "6/10 escalation check"
  local overlay="$REPO/local-setup/docker-compose.$TENANT.yml" fail=0
  if grep -qE 'PGR_ESCALATION_ENABLED:[[:space:]]*"?true' "$overlay" 2>/dev/null; then
    bad "PGR_ESCALATION_ENABLED is true in $overlay — set it to \"false\" until guide step 6a is done (guide step 1.5)"; fail=1
  else
    ok "automatic escalation off in the tenant overlay"
  fi
  local rows
  rows="$(psql_ "select tenantid||' '||schemacode||' '||uniqueidentifier from eg_mdms_data
                 where schemacode in ('Workflow.AutoEscalation','Workflow.AutoEscalationStatesToIgnore')
                   and isactive and (data->>'businessService' ilike 'PGR%' or data->>'module' ilike 'PGR%')")"
  if [ -n "$rows" ]; then
    bad "active legacy PGR escalation rows (disable them in MDMS admin first, guide step 1.6):"
    printf '%s\n' "$rows" | sed 's/^/      /'; fail=1
  else
    ok "no legacy PGR escalation rows"
  fi
  [ "$fail" = 0 ] || die "escalation not safe to upgrade — fix the above and resume with --from-step 6"
}

# ── 7. deploy ────────────────────────────────────────────────────────────────
step_deploy() {
  head_ "7/10 deploy"
  confirm "run ./deploy.sh $TENANT now? all services restart (20-40 min with UI builds)" \
    || die "stopped at deploy"
  local extra=(); [ -n "$HOST_VARS_OVERRIDE" ] && extra=(-e "@$HOST_VARS_OVERRIDE")
  if [ "$DRY_RUN" = 1 ]; then echo "  would run: deploy.sh $TENANT ${extra[*]}"; return 0; fi
  local log="$LOG_DIR/deploy.log" rc
  date -u +%Y-%m-%dT%H:%M:%SZ > "$LOG_DIR/deploy-start"
  echo "  progress: tail -f $log"
  # </dev/null: ansible aborts with a blocking-IO error when it inherits a tty.
  set +e
  ( cd "$REPO/local-setup/ansible" && ./deploy.sh "$TENANT" "${extra[@]}" </dev/null ) > "$log" 2>&1
  rc=$?
  set -e
  date -u +%Y-%m-%dT%H:%M:%SZ > "$LOG_DIR/deploy-end"
  grep -A2 "PLAY RECAP" "$log" | tail -2 | sed 's/^/  /' || true
  if [ "$rc" != 0 ] || grep -qE 'failed=[1-9]' "$log"; then
    grep -nE '^fatal:' "$log" | tail -3 | cut -c1-300 | sed 's/^/  /' || true
    die "deploy failed (exit $rc) — see $log; fix and resume with --from-step 7 --backup-dir $BACKUP_DIR"
  fi
  grep -q "published dev secret" "$log" \
    && FOLLOW_UPS+=("the deploy warned about published default secrets (e.g. Novu) — rotate them")
  ok "deploy finished with failed=0"
}

# ── 8. config restore ────────────────────────────────────────────────────────
step_config_restore() {
  head_ "8/10 config restore"
  if [ "$DRY_RUN" = 1 ]; then
    echo "  would put back the config changes recorded in step 5 (local-only files, merged edits)"; return 0
  fi
  [ -f "$RETAIN_DIR/manifest.tsv" ] || die "no config snapshot in $RETAIN_DIR — run step 5 (before the deploy) or pass the right --backup-dir"
  echo "  -- plan --"
  retain_ restore "$DIGIT_DIR" "$REPO" "$RETAIN_DIR" 2>&1 | tee "$LOG_DIR/config-restore-plan.txt" | sed 's/^/  /' \
    || die "config restore plan failed — see $LOG_DIR/config-restore-plan.txt"
  if ! grep -qE '^PLAN' "$LOG_DIR/config-restore-plan.txt"; then
    ok "nothing to put back"
  else
    confirm "apply the config changes above?" || die "stopped at config restore"
    retain_ restore "$DIGIT_DIR" "$REPO" "$RETAIN_DIR" --apply 2>&1 | tee "$LOG_DIR/config-restore.log" | sed 's/^/  /' \
      || die "config restore failed part-way — see $LOG_DIR/config-restore.log"
    local c
    if [ -s "$RETAIN_DIR/applied.txt" ]; then
      for c in $RESTART_AFTER_RESTORE; do
        docker ps --format '{{.Names}}' | grep -qx "$c" && docker restart "$c" >/dev/null && ok "$c restarted"
      done
    fi
  fi
  grep -qE '^(CONF|LOST)' "$LOG_DIR/config-restore-plan.txt" \
    && FOLLOW_UPS+=("config changes NOT carried over (CONF/LOST in $LOG_DIR/config-restore-plan.txt) — resolve them by hand; box copies are in $RETAIN_DIR/box")
  return 0
}

# ── 9. post-deploy ───────────────────────────────────────────────────────────
step_post_deploy() {
  head_ "9/10 post-deploy"
  if [ "$DRY_RUN" = 1 ]; then
    echo "  would refresh the $ADMIN_USER session, re-run the safety check, check one-shot jobs,"
    echo "  the schema version and summarise Kong 403s since the deploy"; return 0
  fi
  export_password
  can_login || wait_ready

  # egov-user keeps serving the pre-upgrade token with the pre-upgrade roles.
  TENANT="$STATE_TENANT" python3 -I "$LIB_DIR/refresh_session.py" | tee -a "$LOG_DIR/post-deploy.log"

  PG_CONTAINER="$PG_CONTAINER" DB_USER="$DB_USER" DB_NAME="$DB_NAME" \
    bash "$LIB_DIR/safety_check.sh" "$DIGIT_DIR" "$(effective_host_vars)" > "$LOG_DIR/safety-check-after.log" 2>&1 || true
  grep -E "^(FAIL|RESULT)" "$LOG_DIR/safety-check-after.log" | sed 's/^/  /'
  echo "  data counts after:"; grep -A6 "Data counts" "$LOG_DIR/safety-check-after.log" | tail -5

  local stuck
  stuck="$(docker ps -a --format '{{.Names}}\t{{.Status}}' | grep -E 'migration|init|seed|normalize' \
           | grep -v 'Exited (0)' | grep -v 'Up ' || true)"
  if [ -n "$stuck" ]; then bad "one-shot containers did not exit cleanly:"; echo "$stuck" | sed 's/^/      /'
  else ok "migration/init/seed containers all exited 0"; fi

  if [ -n "$EXPECT_SCHEMA_VERSION" ]; then
    local v; v="$(psql_ "select max(version) from pgr_services_schema where success" 2>/dev/null || true)"
    [ "$v" = "$EXPECT_SCHEMA_VERSION" ] && ok "pgr schema $v" \
      || bad "pgr schema is '$v', expected '$EXPECT_SCHEMA_VERSION'"
  fi

  # The deploy's MCP tenant bootstrap copies masters from pg that the state
  # tenant lacks by uid. StateInfo Demo.pg lands next to the tenant's own
  # record, MDMS returns it FIRST, and the UI takes StateInfo[0]: the portal
  # shows the demo logo, name and languages (seen on bomet, 2026-10-28).
  local foreign
  foreign="$(psql_ "select uniqueidentifier from eg_mdms_data where schemacode='common-masters.StateInfo'
                    and tenantid='$STATE_TENANT' and isactive and coalesce(data->>'code','') <> '$STATE_TENANT'")"
  if [ -n "$foreign" ]; then
    bad "StateInfo records copied from another tenant are active on $STATE_TENANT: $(echo $foreign) — the UI would use the first one"
    if confirm "switch them off (isactive=false, data kept)?"; then
      psql_ "update eg_mdms_data set isactive=false, lastmodifiedtime=(extract(epoch from now())*1000)::bigint
             where schemacode='common-masters.StateInfo' and tenantid='$STATE_TENANT' and isactive
               and coalesce(data->>'code','') <> '$STATE_TENANT'" >/dev/null \
        && docker restart "$(docker ps --format '{{.Names}}' | grep -m1 -E 'mdms-backend')" egov-mdms-service >/dev/null \
        && ok "foreign StateInfo switched off; MDMS restarted"
    else
      FOLLOW_UPS+=("switch off the foreign StateInfo on $STATE_TENANT ($(echo $foreign)) or the portal shows demo branding")
    fi
  else
    ok "StateInfo on $STATE_TENANT is the tenant's own"
  fi

  # Only refusals after the deploy ended: during it, the tenant bootstrap logs
  # in on the demo tenant and gets hundreds of expected (harmless) 403s.
  local since denied
  since="$(cat "$LOG_DIR/deploy-end" 2>/dev/null || echo 10m)"
  denied="$(docker logs --since "$since" "$KONG_CONTAINER" 2>&1 | grep '" 403 ' \
            | awk '{print $7}' | sed 's/?.*//' | sort | uniq -c | sort -rn | head || true)"
  if [ -n "$denied" ]; then
    warn "paths refused by the permission check since the deploy:"; echo "$denied" | sed 's/^/      /'
    FOLLOW_UPS+=("grant the 403 paths above to the roles that need them, then re-test")
  else ok "no 403s since the deploy (re-check after real users have logged in)"; fi
}

# ── 10. smoke ─────────────────────────────────────────────────────────────────
step_smoke() {
  head_ "10/10 smoke tests"
  if [ "$DRY_RUN" = 1 ]; then echo "  would run smoke tests against $PUBLIC_URL"; return 0; fi
  export_password
  local otp code p
  local H=(); [ -n "$PUBLIC_HOST" ] && H=(-H "Host: $PUBLIC_HOST")
  otp="$(curl -s -m 10 "${H[@]}" -X POST "$PUBLIC_URL/otp/v1/_validate" -H 'Content-Type: application/json' \
    -d "{\"RequestInfo\":{\"apiId\":\"Rainmaker\"},\"otp\":{\"otp\":\"000000\",\"identity\":\"840000000\",\"tenantId\":\"$STATE_TENANT\"}}" || true)"
  case "$otp" in
    *'"isValidationSuccessful":true'*) bad "a wrong OTP was ACCEPTED — the Kong OTP route is mocked; stop and investigate" ;;
    *) ok "wrong OTP rejected" ;;
  esac

  for p in pgr-services/v2/request/_search user/_search; do
    code="$(curl -s -o /dev/null -w '%{http_code}' -m 10 "${H[@]}" -X POST -H 'Content-Type: application/json' -d '{}' "$PUBLIC_URL/$p" || true)"
    [ "$code" = "401" ] && ok "no-login /$p -> 401" || bad "no-login /$p -> $code (expected 401)"
  done

  for p in /digit-ui/ /digit-ui/employee/user/login /citizen/ /configurator/; do
    code="$(curl -s -o /dev/null -w '%{http_code}' -m 10 "${H[@]}" "$PUBLIC_URL$p" || true)"
    case "$code" in 200|301|302) ok "$p -> $code" ;; *) bad "$p -> $code" ;; esac
  done

  if [ "$(hv enable_file_scan)" = "true" ]; then
    TENANT="$STATE_TENANT" python3 -I "$LIB_DIR/smoke_upload.py" || bad "virus-scan upload test failed"
  fi

  FOLLOW_UPS+=("browser check: log in (UI language), file/assign/resolve a complaint, dashboard, Configurator save")
  FOLLOW_UPS+=("escalation migration: docs/2.12/migration-guide-v2.12-to-v2.12.1.md step 6a, then PGR_ESCALATION_ENABLED in docker-compose.$TENANT.yml")
  FOLLOW_UPS+=("rotate credentials: change $ADMIN_USER's password then set bootstrap_password in host_vars; Novu and gateway secrets")
}

# ── rollback ─────────────────────────────────────────────────────────────────
# Restores a backup taken by step 4: data volumes, $DIGIT_DIR (incl. .env and
# the OpenBao key it held), /etc/nginx, then starts the previous stack and stops
# containers that only exist in the new release. Migrations are forward-only,
# so this — not older images — is the way back.
do_rollback() {
  local B="$ROLLBACK_DIR" t v f
  head_ "rollback from $B"
  [ -d "$B" ] || die "no such backup dir: $B"
  for f in pg_dumpall.sql opt-digit.tgz images.txt; do [ -f "$B/$f" ] || die "backup incomplete: $B/$f missing"; done
  ls "$B"/vol-*.tgz >/dev/null 2>&1 || die "backup has no volume copies (vol-*.tgz) — cannot roll back the data"
  (cd "$B" && $SHA256 -c --quiet SHA256SUMS 2>/dev/null) && ok "backup checksums OK" || warn "checksum check failed or missing"
  confirm "STOP the stack and overwrite all data with this backup?" || die "rollback cancelled"
  if [ "$DRY_RUN" = 1 ]; then echo "  would restore volumes, $DIGIT_DIR, /etc/nginx and start the old stack"; return 0; fi
  # The password is only used for the final login probe; a rollback must never
  # be blocked by it.
  if have_password; then export_password; fi

  local project running; project="$(basename "$DIGIT_DIR")"
  running="$(docker ps -q --filter "label=com.docker.compose.project=$project")"
  [ -n "$running" ] && docker stop $running >/dev/null; ok "stack stopped"

  for t in "$B"/vol-*.tgz; do
    v="$(basename "$t" .tgz)"; v="${v#vol-}"
    docker volume inspect "$v" >/dev/null 2>&1 || docker volume create "$v" >/dev/null
    docker run --rm -v "$v":/v -v "$B":/b:ro alpine sh -c \
      "find /v -mindepth 1 -maxdepth 1 -exec rm -rf {} + && tar xzf /b/vol-$v.tgz -C /v" \
      && ok "volume $v" || die "restoring $v failed"
  done

  # Anonymous volumes: restore into whatever volume the container mounts at
  # that spot NOW (compose carries anonymous volumes over when it recreates a
  # container; the backed-up name is only the fallback).
  local cname dest old cur
  if [ -s "$B/anon-volumes.tsv" ]; then
    while IFS=$'\t' read -r cname dest old; do
      cur="$(docker inspect "$cname" --format "{{range .Mounts}}{{if eq .Destination \"$dest\"}}{{.Name}}{{end}}{{end}}" 2>/dev/null || true)"
      [ -n "$cur" ] || { docker volume inspect "$old" >/dev/null 2>&1 && cur="$old"; }
      [ -n "$cur" ] || { warn "no volume for $cname:$dest any more — not restored (copy: $B/anon-$old.tgz)"; continue; }
      docker run --rm -v "$cur":/v -v "$B":/b:ro alpine sh -c \
        "find /v -mindepth 1 -maxdepth 1 -exec rm -rf {} + && tar xzf /b/anon-$old.tgz -C /v" \
        && ok "anonymous volume $cname:$dest" || die "restoring $cname:$dest failed"
    done < "$B/anon-volumes.tsv"
  fi

  local tmp; tmp="$(mktemp -d)"
  sudo tar xzf "$B/opt-digit.tgz" -C "$tmp"
  # --inplace keeps the inodes that single-file bind mounts (kong.yml, …) hold.
  sudo rsync -a --inplace --exclude='.git/' "$tmp/$project/" "$DIGIT_DIR/" && ok "$DIGIT_DIR restored"
  sudo rm -rf "$tmp"

  # Host nginx: Ubuntu keeps sites in sites-enabled, RHEL in conf.d; macOS runs
  # nginx in a container (nothing on the host to restore).
  if [ -f "$B/etc-nginx.tgz" ] && [ -n "$NGINX_SITES" ] && [ -d "$NGINX_SITES" ]; then
    local rel keep; rel="nginx/${NGINX_SITES#/etc/nginx/}"
    keep="$(tar tzf "$B/etc-nginx.tgz" | grep -E "^$rel/." || true)"
    mkdir -p "$LOG_DIR/nginx-removed"
    for f in "$NGINX_SITES"/*; do
      [ -e "$f" ] || [ -L "$f" ] || continue
      printf '%s\n' "$keep" | grep -qx "$rel/$(basename "$f")" \
        || { sudo mv "$f" "$LOG_DIR/nginx-removed/"; warn "moved new nginx site aside: $NGINX_SITES/$(basename "$f")"; }
    done
    sudo tar xzf "$B/etc-nginx.tgz" -C /etc
    [ "$SELINUX" = enforcing ] && sudo restorecon -R /etc/nginx && ok "SELinux labels restored on /etc/nginx"
    sudo nginx -t >/dev/null 2>&1 && sudo systemctl reload nginx && ok "/etc/nginx restored and reloaded" \
      || bad "nginx config test failed after restore — check /etc/nginx"
  elif [ "$OS_FAMILY" = darwin ]; then
    ok "macOS: nginx runs in a container — nothing to restore on the host"
  fi
  # Restored files get the default label of their path; relabel so the
  # containers' bind mounts and host nginx can read them again.
  if [ "$SELINUX" = enforcing ]; then
    sudo restorecon -R "$DIGIT_DIR" >/dev/null 2>&1 && ok "SELinux labels restored on $DIGIT_DIR" \
      || warn "restorecon on $DIGIT_DIR failed — if containers cannot read their config, re-run the deploy (it relabels)"
  fi
  if [ -f "$B/firewall-before.txt" ]; then
    warn "the firewall is NOT rolled back automatically — compare with $B/firewall-before.txt"
  fi

  start_stack
  local extra
  extra="$(comm -13 <(cut -f1 "$B/images.txt" | sort) <(docker ps --format '{{.Names}}' | sort))"
  # shellcheck disable=SC2086
  [ -n "$extra" ] && docker stop $extra >/dev/null && warn "stopped containers not in the backup: $(echo $extra)"
  wait_ready

  local missing; missing="$(comm -23 <(cut -f1 "$B/images.txt" | sort) <(docker ps --format '{{.Names}}' | sort))"
  [ -z "$missing" ] && ok "all $(wc -l < "$B/images.txt") containers from the backup are running" \
    || warn "not running (were running at backup time): $(echo $missing)"
  echo "  data counts:"
  for t in eg_pgr_service_v2 eg_user eg_mdms_data message; do printf '      %s: %s\n' "$t" "$(psql_ "select count(*) from $t")"; done
  FOLLOW_UPS+=("not restored by rollback: web roots under /var/www, the host firewall ($FIREWALL — see $B/firewall-before.txt), packages the deploy installed")
}

# ── Driver ───────────────────────────────────────────────────────────────────
STEP_FNS=(step_preflight step_safety_check step_drain step_backup step_config_snapshot
          step_escalation_check step_deploy step_config_restore step_post_deploy step_smoke)

main() {
  detect_os
  printf '%sDIGIT upgrade — tenant %s — %s%s\n' "$C_HEAD" "$TENANT" "$RUN_ID" "$C_OFF"
  [ "$DRY_RUN" = 1 ] && printf '%sdry run: nothing will be changed%s\n' "$C_WARN" "$C_OFF"

  if [ -n "$ROLLBACK_DIR" ]; then
    do_rollback
  else
    # --backup-dir is for RESUMING after the backup. Starting at step 4 or
    # earlier would stop the stack again and write a new backup over the good
    # one — half-overwritten if it fails (mz prod, 2026-10-23).
    local first="${ONLY_STEP:-$FROM_STEP}"
    if [ -n "$REUSE_BACKUP_DIR" ] && [ "${first:-0}" -le 4 ] && [ -s "$REUSE_BACKUP_DIR/pg_dumpall.sql" ] \
       && [ "$DRY_RUN" != 1 ]; then
      die "--backup-dir $REUSE_BACKUP_DIR already holds a backup; add --from-step 5 (or later) to resume, or drop --backup-dir for a fresh backup"
    fi
    local i n
    for i in "${!STEP_FNS[@]}"; do
      n=$((i + 1))
      if [ -n "$ONLY_STEP" ]; then [ "$n" = "$ONLY_STEP" ] || continue
      elif [ "$n" -lt "$FROM_STEP" ]; then printf '  skip %d  %s\n' "$n" "${STEP_NAMES[$i]%% *}"; continue
      fi
      "${STEP_FNS[$i]}"
    done
  fi

  head_ "done"
  ok "logs in $LOG_DIR"
  if [ ${#FOLLOW_UPS[@]} -gt 0 ]; then
    printf '\n%sStill to do:%s\n' "$C_HEAD" "$C_OFF"
    local f; for f in "${FOLLOW_UPS[@]}"; do printf '  - %s\n' "$f"; done
  fi
}

main "$@"
