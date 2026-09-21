#!/usr/bin/env bash
# =============================================================================
# enable-uat-extras.sh
#
# One command for the Kenya UAT follow-ups that otherwise need six manual
# steps in a specific order, two of which exist only to repair what an earlier
# step destroys:
#
#   1. host_vars    enable_matomo / nginx_features.matomo / upstream_matomo_port
#   2. deploy.sh    regenerates the nginx vhost (adds the /matomo/ blocks)
#                   -- and RECREATES CONTAINERS + WIPES the hand-added
#                      /static-assets/ location, hence steps 4 and 5
#   3. matomo       enable-matomo.sh: start + headless install
#   4. static-assets  re-insert the nginx location (not in the ansible
#                     template yet -- see the NOTE at the bottom) + seed the
#                     county crest
#   5. frontend     re-push the UI bundle that step 2 reverted
#   6. verify       assert every endpoint by STATUS **and CONTENT-TYPE**
#
# Why content-type matters: a missing static file under /digit-ui/ returns the
# SPA's index.html with HTTP 200, and a missing nginx route returns Kong's JSON
# 404. Both look "fine" if you only check the status code. Every check here
# asserts the type too.
#
# Idempotent: re-running is safe. Each step detects work already done and skips.
#
# Usage:
#   ./enable-uat-extras.sh                     # all steps
#   ./enable-uat-extras.sh --dry-run           # print, change nothing
#   ./enable-uat-extras.sh --only verify       # one step
#   ./enable-uat-extras.sh --skip matomo       # everything except matomo
# =============================================================================
set -euo pipefail

REPO="${REPO:-$HOME/CMS-KENYA}"
TENANT="${TENANT:-bomet}"
DOMAIN="${DOMAIN:-bgrm.bomet.go.ke}"
MATOMO_PORT="${MATOMO_PORT:-18083}"
MATOMO_ADMIN_PASSWORD="${MATOMO_ADMIN_PASSWORD:-eGov@123}"
SITE="${SITE:-/etc/nginx/sites-enabled/localhost}"
STATIC_DIR="${STATIC_DIR:-/opt/digit/static-assets}"
LOGO="${LOGO:-bomet-logo-round.png}"

DRY_RUN=false; ONLY=""; SKIP=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --only) ONLY="$2"; shift ;;
    --skip) SKIP="$2"; shift ;;
    -h|--help) sed -n '2,33p' "$0" | sed 's/^# \?//'; exit 0 ;;
    *) echo "unknown arg: $1 (try --help)" >&2; exit 1 ;;
  esac
  shift
done

if [ -t 1 ]; then B=$'\033[1;36m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; O=$'\033[0m'
else B=""; G=""; Y=""; R=""; O=""; fi
hdr()  { printf '\n%s==> %s%s\n' "$B" "$1" "$O"; }
ok()   { printf '    %sOK%s   %s\n' "$G" "$O" "$1"; }
warn() { printf '    %sWARN%s %s\n' "$Y" "$O" "$1"; }
bad()  { printf '    %sFAIL%s %s\n' "$R" "$O" "$1" >&2; }
run()  { if $DRY_RUN; then printf '    would run: %s\n' "$*"; else "$@"; fi; }

wanted() {
  [ -n "$ONLY" ] && { [ "$ONLY" = "$1" ] && return 0 || return 1; }
  case ",$SKIP," in *",$1,"*) return 1 ;; esac
  return 0
}

# --- preflight ---------------------------------------------------------------
[ -d "$REPO" ] || { bad "repo not found: $REPO  (pass REPO=/path)"; exit 1; }
HV="$REPO/local-setup/ansible/inventory/host_vars/$TENANT.yml"
[ -f "$HV" ] || { bad "host_vars not found: $HV  (pass TENANT=<name>)"; exit 1; }

# ── 1. host_vars ─────────────────────────────────────────────────────────────
if wanted hostvars; then
  hdr "1/6  host_vars: matomo flags in $TENANT.yml"
  if grep -qE '^enable_matomo:\s*true' "$HV" \
     && grep -qE "^upstream_matomo_port:\s*$MATOMO_PORT" "$HV" \
     && sed -n '/^nginx_features:/,/^[^ #]/p' "$HV" | grep -qE '^\s+matomo:\s*true'; then
    ok "already set"
  elif $DRY_RUN; then
    printf '    would set enable_matomo/upstream_matomo_port/nginx_features.matomo\n'
  else
    cp "$HV" "$HV.bak.$(date +%s)"
    python3 - "$HV" "$MATOMO_PORT" <<'PY'
import re, sys
p, port = sys.argv[1], sys.argv[2]
s = open(p).read()
def scalar(src, k, v):
    pat = re.compile(rf"^{k}\s*:.*$", re.M)
    return pat.sub(f"{k}: {v}", src) if pat.search(src) else src.rstrip("\n") + f"\n{k}: {v}\n"
s = scalar(s, "enable_matomo", "true")
s = scalar(s, "upstream_matomo_port", port)
# nginx_features is a MAP: set the key inside it, never append a second block
# (a duplicate top-level key silently discards the first one's flags).
m = re.search(r"^nginx_features:\s*$", s, re.M)
if not m:
    s = s.rstrip("\n") + "\nnginx_features:\n  matomo: true\n"
else:
    start = m.end(); end = len(s)
    nxt = re.search(r"^(?!\s|#|$).*$", s[start:], re.M)
    if nxt: end = start + nxt.start()
    body = s[start:end]
    if re.search(r"^\s+matomo\s*:", body, re.M):
        body = re.sub(r"^(\s+)matomo\s*:.*$", r"\1matomo: true", body, flags=re.M)
    else:
        body = "\n  matomo: true" + body
    s = s[:start] + body + s[end:]
open(p, "w").write(s)
PY
    ok "updated (backup alongside)"
  fi
fi

# ── 2. ansible deploy ────────────────────────────────────────────────────────
if wanted deploy; then
  hdr "2/6  deploy.sh $TENANT  (regenerates nginx; recreates containers)"
  run bash -c "cd '$REPO/local-setup/ansible' && ./deploy.sh '$TENANT'"
  ok "deploy finished"
fi

# ── 3. matomo ────────────────────────────────────────────────────────────────
if wanted matomo; then
  hdr "3/6  enable-matomo.sh (port $MATOMO_PORT)"
  if [ ! -x "$REPO/local-setup/scripts/enable-matomo.sh" ]; then
    warn "enable-matomo.sh missing — is this checkout on kenya-prod?"
  else
    run env MATOMO_PORT="$MATOMO_PORT" MATOMO_ADMIN_PASSWORD="$MATOMO_ADMIN_PASSWORD" \
        bash -c "cd '$REPO/local-setup/scripts' && ./enable-matomo.sh"
    ok "matomo step finished"
  fi
fi

# ── 4. static assets ─────────────────────────────────────────────────────────
if wanted static; then
  hdr "4/6  /static-assets/ nginx location + county crest"
  run mkdir -p "$STATIC_DIR"
  SRC="$REPO/digit-ui-esbuild/public/brand/$LOGO"
  if [ -f "$SRC" ]; then
    run cp "$SRC" "$STATIC_DIR/"
    ok "seeded $LOGO"
  else
    warn "logo not in repo: $SRC"
  fi

  if [ ! -f "$SITE" ]; then
    warn "nginx site file not found: $SITE (pass SITE=/path)"
  elif grep -q "/static-assets/" "$SITE"; then
    ok "nginx location already present"
  elif $DRY_RUN; then
    printf '    would insert location /static-assets/ into %s\n' "$SITE"
  else
    cp "$SITE" "$SITE.bak.$(date +%s)"
    python3 - "$SITE" "$STATIC_DIR" <<'PY'
import sys
p, d = sys.argv[1], sys.argv[2]
s = open(p).read()
block = f'''
  location /static-assets/ {{
    alias {d}/;
    add_header Cache-Control "public, max-age=604800" always;
    try_files $uri =404;
  }}
'''
i = s.index("{", s.index("server"))
open(p, "w").write(s[:i+1] + block + s[i+1:])
PY
    if nginx -t >/dev/null 2>&1; then
      run systemctl reload nginx
      ok "nginx location inserted + reloaded"
    else
      bad "nginx -t failed; restoring backup"
      cp "$(ls -t "$SITE".bak.* | head -1)" "$SITE"
      nginx -t || true
      exit 1
    fi
  fi
fi

# ── 5. frontend ──────────────────────────────────────────────────────────────
if wanted frontend; then
  hdr "5/6  re-push the UI bundle (step 2 recreates the container)"
  run env REPO="$REPO" bash "$REPO/local-setup/scripts/deploy-pilot-fe.sh" ui --no-pull
  ok "frontend pushed"
fi

# ── 6. verify ────────────────────────────────────────────────────────────────
if wanted verify; then
  hdr "6/6  verify"
  fails=0
  check() { # url  expected-content-type-substring
    local url="https://$DOMAIN$1" want="$2" out code ctype
    out=$(curl -s -o /dev/null -w '%{http_code} %{content_type}' --max-time 20 "$url" || echo "000 -")
    code=${out%% *}; ctype=${out#* }
    if [ "$code" = "200" ] && [[ "$ctype" == *"$want"* ]]; then
      ok "$1  ($code $ctype)"
    else
      # A 200 text/html under /digit-ui/ is the SPA fallback, not the file.
      bad "$1  got '$code $ctype', wanted 200 */$want"
      fails=$((fails+1))
    fi
  }
  check /static-assets/$LOGO             image
  check /digit-ui/brand/$LOGO            image
  check /digit-ui/index.js               javascript
  check /matomo/matomo.js                javascript
  if [ "$fails" -eq 0 ]; then
    printf '\n%sAll checks passed.%s\n' "$G" "$O"
  else
    printf '\n%s%d check(s) failed.%s\n' "$R" "$fails" "$O"
  fi

  cat <<EOF

Remaining manual step:
  Configurator -> Tenant -> $TENANT -> logo
  set it to a path that passed above, e.g.  /static-assets/$LOGO
  (root-relative, so it survives a hostname change)

Matomo admin:  user 'admin', the password passed to this script.
  The admin UI is not proxied by design — reach it over an SSH tunnel:
  ssh -L $MATOMO_PORT:127.0.0.1:$MATOMO_PORT <this-host>  then http://127.0.0.1:$MATOMO_PORT
EOF
fi

# NOTE: step 4 re-inserts the /static-assets/ location because that path is not
# in local-setup/ansible/templates/nginx-site.conf.j2 — unlike /brand/ and
# /matomo/, which are flag-gated there. Until it is templated, EVERY ./deploy.sh
# erases it and the county logo 404s again. Templating it behind an
# nginx_features.static_assets flag would delete steps 4 and 5 from this script.
