#!/usr/bin/env bash
# Turn the box's current direct-SMS / mail settings (.env) into host_vars lines,
# so the next deploy renders the same .env. Values are written to a 0600 file
# and never printed.
#
#   ./env-to-host-vars.sh [/opt/digit-bomet/.env] [out.yml]
#
# Then paste out.yml into local-setup/ansible/inventory/host_vars/bomet.yml.
set -euo pipefail
ENV_FILE="${1:-/opt/digit-bomet/.env}"
OUT="${2:-$PWD/bomet-host-vars.additions.yml}"
[ -r "$ENV_FILE" ] || { echo "cannot read $ENV_FILE" >&2; exit 1; }

KEYS="NOVU_BRIDGE_DIRECT_CHANNELS NOVU_BRIDGE_DIRECT_SMS_PROVIDER NOVU_BRIDGE_DIRECT_SMS_BASE_URL
NOVU_BRIDGE_DIRECT_SMS_USERNAME NOVU_BRIDGE_DIRECT_SMS_PASSWORD NOVU_BRIDGE_DIRECT_SMS_TOKEN
NOVU_BRIDGE_DIRECT_EMAIL_FROM SPRING_MAIL_HOST SPRING_MAIL_PORT SPRING_MAIL_USERNAME
SPRING_MAIL_PASSWORD SPRING_MAIL_SMTP_AUTH SPRING_MAIL_SMTP_STARTTLS"

umask 077
{
  echo "# Direct SMS + mail for novu-bridge, from $ENV_FILE ($(date +%F))."
  echo "# Rendered into .env by templates/digit.env.j2 (bomet snippet)."
  for k in $KEYS; do
    line="$(grep -E "^$k=" "$ENV_FILE" | tail -1 || true)"
    v="${line#*=}"
    # YAML single-quoted scalar: double any single quote.
    printf "%s: '%s'\n" "$(echo "$k" | tr 'A-Z' 'a-z')" "${v//\'/\'\'}"
    [ -n "$line" ] || echo "  missing in .env: $k" >&2
  done
} > "$OUT"
chmod 600 "$OUT"
echo "wrote $(grep -c ': ' "$OUT") keys to $OUT (mode 600) — values not shown"
