#!/usr/bin/env bash
# =============================================================================
# complaint-triage installer for an EXISTING, RUNNING DIGIT server.
#
# Adds AI complaint priority (additionalDetail.priority) without touching the
# running stack: no compose file, persister config, database schema or other
# container is changed. Safe to run again (upgrade); existing MDMS records are
# never overwritten.
#
# What it does
#   1. Pre-flight: Docker, the DIGIT network, required services healthy.
#   2. Builds the complaint-triage image from this repo (keeps the previous
#      image as complaint-triage:previous for rollback).
#   3. MDMS (tenant you name): registers RAINMAKER-PGR.PiiPatterns and
#      RAINMAKER-PGR.TriageConfig schemas and loads the default records,
#      skipping any that already exist.
#   4. Writes the service settings to an env file (mode 600).
#   5. Starts (or replaces) the complaint-triage container on the DIGIT network.
#   6. Verifies it is healthy and connected to the database and Kafka.
#
# Usage
#   sudo ./install-prod.sh --tenant bo --dry-run        # show what would happen
#   sudo LLM_API_KEY=gsk_... ./install-prod.sh --tenant bo
#   sudo ./install-prod.sh --tenant bo --llm-key-file /root/groq.key
#   sudo ./install-prod.sh --tenant bo --no-ai          # rules only, no AI calls
#   sudo ./install-prod.sh --uninstall                  # stop and remove the container
#
# Options
#   --tenant <id>         State tenant to seed MDMS for (required unless --uninstall)
#   --digit-dir <dir>     DIGIT deploy dir (default /opt/digit); holds the env file
#   --network <name>      Docker network (default: detected from digit-pgbouncer)
#   --env-file <path>     Settings file (default <digit-dir>/complaint-triage.env)
#   --image <ref>         Use this image instead of building (e.g. a registry tag)
#   --llm-key-file <f>    Read the LLM API key from a file (else $LLM_API_KEY, else prompt)
#   --no-ai               Run rules-only (no key, nothing sent outside)
#   --skip-mdms           Don't touch MDMS
#   --log-model-input     Log what is sent to the model (audits/testing only)
#   --dry-run             Check everything, change nothing
#   --yes                 Don't ask for confirmation
#   --uninstall           Remove the container (keeps env file, MDMS and saved priorities)
#
# Other settings (environment variables, optional):
#   LLM_BASE_URL (https://api.groq.com/openai/v1)  LLM_MODEL (openai/gpt-oss-20b)
#   LLM_REASONING_EFFORT (low)  TRIAGE_DEFAULT_PRIORITY (MEDIUM)  BASE_PRIORITY_JSON
#   MDMS_USER_UUID (createdBy for MDMS records)
#
# Rollback
#   docker tag complaint-triage:previous complaint-triage:local && rerun with --skip-mdms
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SERVICE_DIR/../.." && pwd)"
SCHEMA_FILE="$REPO_ROOT/utilities/default-data-handler/src/main/resources/schema/RAINMAKER-PGR.json"
SEED_DIR="$REPO_ROOT/utilities/default-data-handler/src/main/resources/mdmsData/RAINMAKER-PGR"

CONTAINER=complaint-triage
TENANT=""
DIGIT_DIR=/opt/digit
NETWORK=""
ENV_FILE=""
IMAGE=""
LLM_KEY_FILE=""
NO_AI=false
SKIP_MDMS=false
LOG_INPUT=false
DRY_RUN=false
YES=false
UNINSTALL=false

# ── output helpers ───────────────────────────────────────────────────────────
if [ -t 1 ]; then B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; N=$'\e[0m'; else B= G= Y= R= N=; fi
step() { echo; echo "${B}==> $*${N}"; }
ok()   { echo "   ${G}[ OK ]${N} $*"; }
warn() { echo "   ${Y}[WARN]${N} $*"; }
fail() { echo "   ${R}[FAIL]${N} $*" >&2; exit 1; }
info() { echo "          $*"; }

usage() { sed -n '2,/^# ====/p' "$0" | sed '$d; s/^# \{0,1\}//'; exit "${1:-0}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --tenant) TENANT="$2"; shift 2 ;;
    --digit-dir) DIGIT_DIR="$2"; shift 2 ;;
    --network) NETWORK="$2"; shift 2 ;;
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --image) IMAGE="$2"; shift 2 ;;
    --llm-key-file) LLM_KEY_FILE="$2"; shift 2 ;;
    --no-ai) NO_AI=true; shift ;;
    --skip-mdms) SKIP_MDMS=true; shift ;;
    --log-model-input) LOG_INPUT=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --yes|-y) YES=true; shift ;;
    --uninstall) UNINSTALL=true; shift ;;
    -h|--help) usage 0 ;;
    *) echo "unknown option: $1" >&2; usage 2 ;;
  esac
done
ENV_FILE="${ENV_FILE:-$DIGIT_DIR/complaint-triage.env}"

confirm() {
  $YES && return 0
  [ -t 0 ] || fail "not a terminal; rerun with --yes to confirm"
  read -r -p "   $1 [y/N] " a
  [[ "$a" =~ ^[Yy]$ ]] || { echo "   Aborted. Nothing more was changed."; exit 1; }
}

# ── uninstall ────────────────────────────────────────────────────────────────
if $UNINSTALL; then
  step "Uninstall"
  if docker inspect "$CONTAINER" >/dev/null 2>&1; then
    confirm "Remove container $CONTAINER? (env file, MDMS records and saved priorities are kept)"
    $DRY_RUN && { info "dry run: would remove $CONTAINER"; exit 0; }
    docker rm -f "$CONTAINER" >/dev/null && ok "removed $CONTAINER"
  else
    ok "$CONTAINER is not installed"
  fi
  info "Kept: $ENV_FILE, MDMS records, additionalDetail.priority on complaints."
  exit 0
fi

[ -n "$TENANT" ] || { echo "--tenant is required" >&2; usage 2; }
[[ "$TENANT" =~ ^[A-Za-z0-9._-]+$ ]] || fail "invalid tenant: $TENANT"
STATE_TENANT="${TENANT%%.*}"
[ "$STATE_TENANT" = "$TENANT" ] || warn "using state tenant '$STATE_TENANT' for MDMS (the service checks the city, then the state)"

# ── 1. pre-flight ────────────────────────────────────────────────────────────
step "1/6 Pre-flight checks"
command -v docker >/dev/null || fail "docker not found"
docker info >/dev/null 2>&1 || fail "cannot talk to Docker (run with sudo or as a docker-group user)"
ok "Docker reachable"

[ -f "$SERVICE_DIR/Dockerfile" ] || fail "service source not found at $SERVICE_DIR"
if ! $SKIP_MDMS; then
  [ -f "$SCHEMA_FILE" ] || fail "schema file not found: $SCHEMA_FILE"
  for f in RAINMAKER-PGR.PiiPatterns.json RAINMAKER-PGR.TriageConfig.json; do
    [ -f "$SEED_DIR/$f" ] || fail "seed file not found: $SEED_DIR/$f"
  done
fi
ok "Repo files present ($REPO_ROOT)"

for c in docker-postgres digit-pgbouncer digit-redpanda egov-mdms-service egov-localization egov-persister; do
  st=$(docker inspect -f '{{.State.Status}}{{if .State.Health}}/{{.State.Health.Status}}{{end}}' "$c" 2>/dev/null || echo missing)
  case "$st" in
    running/healthy|running) ok "$c ($st)" ;;
    *) fail "$c is $st; bring the DIGIT stack up first" ;;
  esac
done

if [ -z "$NETWORK" ]; then
  NETWORK=$(docker inspect digit-pgbouncer --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | tr ' ' '\n' | grep -m1 'egov-network' || true)
fi
[ -n "$NETWORK" ] && docker network inspect "$NETWORK" >/dev/null 2>&1 || fail "DIGIT network not found (pass --network)"
ok "Network $NETWORK"

DB_PASSWORD=$(docker inspect digit-pgbouncer --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^DB_PASSWORD=//p')
[ -n "$DB_PASSWORD" ] || fail "could not read the database password from digit-pgbouncer"
ok "Database password read from digit-pgbouncer (not shown)"

ENV_DIR="$(dirname "$ENV_FILE")"
[ -d "$ENV_DIR" ] || fail "directory for env file does not exist: $ENV_DIR (pass --digit-dir or --env-file)"
if ! $DRY_RUN; then
  if [ -e "$ENV_FILE" ]; then
    [ -w "$ENV_FILE" ] && [ -w "$ENV_DIR" ] || fail "cannot write $ENV_FILE (run with sudo)"
  else
    [ -w "$ENV_DIR" ] || fail "cannot create $ENV_FILE (run with sudo)"
  fi
fi

# ── LLM key ──────────────────────────────────────────────────────────────────
KEY="${LLM_API_KEY:-}"
if $NO_AI; then
  KEY=""
elif [ -n "$LLM_KEY_FILE" ]; then
  [ -r "$LLM_KEY_FILE" ] || fail "cannot read $LLM_KEY_FILE"
  KEY=$(tr -d ' \r\n' < "$LLM_KEY_FILE")
elif [ -z "$KEY" ] && [ -r "$ENV_FILE" ]; then
  KEY=$(sed -n 's/^LLM_API_KEY=//p' "$ENV_FILE")   # upgrade: keep the existing key
  [ -n "$KEY" ] && ok "Keeping the LLM key from $ENV_FILE"
fi
if [ -z "$KEY" ] && ! $NO_AI && ! $YES && [ -t 0 ]; then
  read -r -s -p "   LLM API key (input hidden; empty = rules only): " KEY; echo
fi
[ -n "$KEY" ] && AI_MODE="AI on" || AI_MODE="rules only (no AI)"

LLM_BASE_URL="${LLM_BASE_URL:-https://api.groq.com/openai/v1}"
LLM_MODEL="${LLM_MODEL:-openai/gpt-oss-20b}"
LLM_REASONING_EFFORT="${LLM_REASONING_EFFORT:-low}"

# ── plan ─────────────────────────────────────────────────────────────────────
if [ -n "$IMAGE" ]; then BUILD=false; else BUILD=true; IMAGE=complaint-triage:local; fi
EXISTING=$(docker container inspect -f '{{.Config.Image}} ({{.State.Status}})' "$CONTAINER" 2>/dev/null) || EXISTING=none

step "Plan"
info "Tenant (MDMS):     $STATE_TENANT $($SKIP_MDMS && echo '(skipped)')"
info "Image:             $IMAGE $($BUILD && echo '(build from repo)' || echo '(use as is)')"
info "Existing container: $EXISTING"
info "Network:           $NETWORK"
info "Settings file:     $ENV_FILE"
info "Mode:              $AI_MODE${KEY:+  ->  $LLM_MODEL @ $LLM_BASE_URL}"
info "Model input log:   $($LOG_INPUT && echo on || echo off)"
if [ -n "$KEY" ]; then
  warn "With AI on, the cleaned complaint text (personal details removed) and non-personal"
  info "complaint details are sent to $LLM_BASE_URL. Confirm Data Protection Officer sign-off."
fi
$DRY_RUN && warn "DRY RUN: nothing will be changed"
confirm "Proceed?"

# ── 2. image ─────────────────────────────────────────────────────────────────
step "2/6 Image"
if $BUILD; then
  if $DRY_RUN; then
    info "dry run: would build $IMAGE from $SERVICE_DIR"
    if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
      # No image yet: build a throwaway one so the checks below can run. Removed on exit;
      # nothing in the running stack is touched.
      IMAGE=complaint-triage:dryrun
      trap 'docker image rm -f complaint-triage:dryrun >/dev/null 2>&1 || true' EXIT
      info "building a temporary $IMAGE for the checks (removed afterwards)"
      docker build -q -t "$IMAGE" "$SERVICE_DIR" >/dev/null || fail "image build failed"
      ok "Image builds"
    fi
  else
    docker image inspect "$IMAGE" >/dev/null 2>&1 && docker tag "$IMAGE" complaint-triage:previous && info "previous image kept as complaint-triage:previous"
    docker build -q -t "$IMAGE" "$SERVICE_DIR" >/dev/null || fail "image build failed"
    ok "Built $IMAGE"
  fi
else
  docker image inspect "$IMAGE" >/dev/null 2>&1 || docker pull -q "$IMAGE" >/dev/null || fail "image $IMAGE not available"
  ok "Using $IMAGE"
fi

# In-network reachability (DNS + HTTP) and LLM key check, from the image itself.
docker run --rm --network "$NETWORK" -e KEY="$KEY" -e BASE="$LLM_BASE_URL" -e MODEL="$LLM_MODEL" -e COLOR="$([ -t 1 ] && echo 1)" "$IMAGE" node -e '
  const net = require("node:net");
  const c = (code, t) => (process.env.COLOR ? `\u001b[${code}m${t}\u001b[0m` : t);
  const OK = c(32, "[ OK ]"), FAIL = c(31, "[FAIL]"), WARN = c(33, "[WARN]");
  const tcp = (h, p) => new Promise((r) => { const s = net.connect(p, h); s.setTimeout(4000);
    s.on("connect", () => { s.end(); r(true); }); s.on("error", () => r(false)); s.on("timeout", () => { s.destroy(); r(false); }); });
  (async () => {
    let bad = 0;
    for (const [h, p] of [["postgres", 5432], ["redpanda", 9092], ["egov-mdms-service", 8094], ["egov-localization", 8096]]) {
      const ok = await tcp(h, p); console.log(`   ${ok ? OK : FAIL} reach ${h}:${p} from the DIGIT network`); if (!ok) bad++;
    }
    if (process.env.KEY) {
      try {
        const r = await fetch(process.env.BASE.replace(/\/+$/, "") + "/models", { headers: { Authorization: "Bearer " + process.env.KEY }, signal: AbortSignal.timeout(10000) });
        if (r.status === 401 || r.status === 403) { console.log("   " + FAIL + " LLM key rejected (HTTP " + r.status + ")"); bad++; }
        else if (!r.ok) { console.log("   " + WARN + " LLM provider answered HTTP " + r.status); }
        else {
          const ids = ((await r.json()).data || []).map((m) => m.id);
          if (ids.length && !ids.includes(process.env.MODEL)) { console.log("   " + FAIL + " model " + process.env.MODEL + " not available to this key. Available: " + ids.join(", ")); bad++; }
          else console.log("   " + OK + " LLM key accepted, model " + process.env.MODEL + " available");
        }
      } catch (e) { console.log("   " + FAIL + " cannot reach the LLM provider (" + e.message + "). Outbound internet blocked? Use --no-ai or a reachable LLM_BASE_URL"); bad++; }
    }
    process.exit(bad ? 1 : 0);
  })();' || fail "connectivity check failed (see above)"

# ── 3. MDMS ──────────────────────────────────────────────────────────────────
step "3/6 MDMS (tenant $STATE_TENANT)"
if $SKIP_MDMS; then
  info "skipped (--skip-mdms)"
else
  SEED_ARGS=(--tenant "$STATE_TENANT" --schemas /seed/schema.json
    --only RAINMAKER-PGR.PiiPatterns,RAINMAKER-PGR.TriageConfig
    --data RAINMAKER-PGR.PiiPatterns=/seed/PiiPatterns.json
    --data RAINMAKER-PGR.TriageConfig=/seed/TriageConfig.json)
  $DRY_RUN && SEED_ARGS+=(--dry-run)
  docker run --rm --network "$NETWORK" \
    -e MDMS_USER_UUID="${MDMS_USER_UUID:-}" \
    -v "$SCHEMA_FILE:/seed/schema.json:ro" \
    -v "$SEED_DIR/RAINMAKER-PGR.PiiPatterns.json:/seed/PiiPatterns.json:ro" \
    -v "$SEED_DIR/RAINMAKER-PGR.TriageConfig.json:/seed/TriageConfig.json:ro" \
    "$IMAGE" node scripts/mdms-seed.mjs "${SEED_ARGS[@]}" || fail "MDMS seeding failed (see above)"
  ok "MDMS ready"
fi

# ── 4. settings file ─────────────────────────────────────────────────────────
step "4/6 Settings ($ENV_FILE)"
NEW_ENV=$(cat <<EOF
# complaint-triage settings, written by install-prod.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Rerun the installer to change them. Contains secrets: keep mode 600.
KAFKA_BROKERS=redpanda:9092
DB_HOST=postgres
DB_PORT=5432
DB_NAME=egov
DB_USER=egov
DB_PASSWORD=$DB_PASSWORD
MDMS_HOST=http://egov-mdms-service:8094
LOCALIZATION_HOST=http://egov-localization:8096
LLM_API_KEY=$KEY
LLM_BASE_URL=$LLM_BASE_URL
LLM_MODEL=$LLM_MODEL
LLM_REASONING_EFFORT=$LLM_REASONING_EFFORT
DEFAULT_PRIORITY=${TRIAGE_DEFAULT_PRIORITY:-MEDIUM}
BASE_PRIORITY_JSON=${BASE_PRIORITY_JSON:-}
LOG_MODEL_INPUT=$LOG_INPUT
EOF
)
if $DRY_RUN; then
  info "dry run: would write $ENV_FILE (mode 600)"
else
  [ -f "$ENV_FILE" ] && cp -p "$ENV_FILE" "$ENV_FILE.bak" && info "previous settings kept as $ENV_FILE.bak"
  ( umask 077; printf '%s\n' "$NEW_ENV" > "$ENV_FILE.tmp" ) && mv "$ENV_FILE.tmp" "$ENV_FILE" && chmod 600 "$ENV_FILE"
  ok "Written (mode 600)"
fi

# ── 5. container ─────────────────────────────────────────────────────────────
step "5/6 Container"
if $DRY_RUN; then
  info "dry run: would $( [ "$EXISTING" = none ] && echo start || echo replace ) $CONTAINER on $NETWORK"
  echo; ok "Dry run finished. Nothing was changed."; exit 0
fi
if docker inspect "$CONTAINER" >/dev/null 2>&1; then
  docker rm -f "$CONTAINER" >/dev/null && info "stopped the old container (Kafka offsets are kept; no complaint is skipped)"
fi
docker run -d --name "$CONTAINER" \
  --network "$NETWORK" \
  --restart unless-stopped \
  --env-file "$ENV_FILE" \
  --memory 256m --cpus 0.5 \
  --log-opt max-size=20m --log-opt max-file=5 \
  --label app=complaint-triage --label installed-by=install-prod.sh \
  "$IMAGE" >/dev/null || fail "could not start $CONTAINER"
ok "Started $CONTAINER"

# ── 6. verify ────────────────────────────────────────────────────────────────
step "6/6 Verify"
H=""
for _ in $(seq 1 30); do
  H=$(docker exec "$CONTAINER" wget -qO- http://127.0.0.1:8085/health 2>/dev/null || true)
  case "$H" in *'"status":"UP"'*) break ;; esac
  sleep 3
done
case "$H" in
  *'"status":"UP"'*) ok "Healthy: $H" ;;
  *) docker logs --tail 30 "$CONTAINER" 2>&1 | sed 's/^/          /'; fail "not healthy after 90s (last: ${H:-no answer})" ;;
esac
docker logs "$CONTAINER" 2>&1 | grep -m1 "complaint-triage started" | sed 's/^/          /' || true

echo
ok "complaint-triage is installed."
info "New complaints get additionalDetail.priority (LOW/MEDIUM/HIGH/CRITICAL). Existing complaints are not changed."
info "Logs:       docker logs -f $CONTAINER"
info "Check one:  select servicerequestid, additionaldetails->>'priority' from eg_pgr_service_v2 order by createdtime desc limit 5;"
info "Settings:   MDMS RAINMAKER-PGR.TriageConfig / PiiPatterns (tenant $STATE_TENANT); secrets in $ENV_FILE"
info "Rollback:   docker tag complaint-triage:previous complaint-triage:local && $0 --tenant $TENANT --skip-mdms"
info "Remove:     $0 --uninstall"
