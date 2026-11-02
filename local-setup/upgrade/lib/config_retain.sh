#!/usr/bin/env bash
# Carry a box's hand-made config changes across a deploy.
#
#   config_retain.sh snapshot <digit_dir> <repo> <out_dir>           # before the deploy, read-only
#   config_retain.sh restore  <digit_dir> <repo> <out_dir> [--apply] # after the deploy
#
# The deploy rsyncs the release's local-setup/ dirs over <digit_dir> (kong,
# gatus, scripts, db, ...) and re-renders .env, nginx/globalConfigs.js and
# nginx/digit-ui.conf from host_vars. Both silently drop edits made on the box.
# snapshot sorts every config file in <digit_dir> against the release about to
# be deployed; restore puts back what the deploy dropped:
#
#   local-only  not in the release           -> restored verbatim if the deploy removed it
#   edited      differs from the release     -> 3-way merged onto the new file
#                                               (needs CONFIG_BASE_REF); conflicts are
#                                               written aside, never applied
#   templated   rendered from host_vars      -> never restored (the next deploy would
#                                               undo it): move the change into host_vars
#   upstream    differs only because the release moved on (equals CONFIG_BASE_REF)
#
# CONFIG_BASE_REF is the commit the box was last deployed from. Without it an
# edit cannot be told apart from an older release, so edited files are only
# reported (diffs saved), except those listed in RETAIN_VERBATIM.
#
# .env is compared by key NAME only; values are never printed or copied.
set -euo pipefail
MODE="${1:?snapshot|restore}"; DIR="${2:?digit dir}"; REPO="${3:?repo}"; OUT="${4:?out dir}"
APPLY=0; [ "${5:-}" = "--apply" ] && APPLY=1
REL="$REPO/local-setup"
BASE="${CONFIG_BASE_REF:-}"
: "${RETAIN_SCAN:=docker-compose.*.yml docker-compose.*.yaml kong nginx gatus otel keycloak configs scripts seeds db docker clamav notification-seed dataloader}"
: "${RETAIN_TEMPLATED:=.env nginx/globalConfigs.js nginx/digit-ui.conf configurator-runtime/config.js}"
: "${RETAIN_VERBATIM:=}"
: "${RETAIN_IGNORE:=*.bak* *.jar *.sql *.sql.gz *.tgz *.progress *.pinned */node_modules/*}"

in_list() { local x; for x in $2; do [ "$1" = "$x" ] && return 0; done; return 1; }
ignored() { local p; for p in $RETAIN_IGNORE; do case "$1" in $p) return 0 ;; esac; done; return 1; }
base_show() { git -C "$REPO" show "$BASE:local-setup/$1" 2>/dev/null; }
env_keys() { [ -f "$1" ] && grep -oE '^[A-Za-z_][A-Za-z0-9_]*=' "$1" | tr -d '=' | sort -u; }
# Single-file bind mounts (kong.yml, ...) keep the old inode if the file is
# replaced; truncate-and-write keeps it, so the container sees the change.
write_inplace() { cat "$1" > "$2"; }

if [ -n "$BASE" ] && ! git -C "$REPO" rev-parse -q --verify "$BASE^{commit}" >/dev/null; then
  echo "FAIL  CONFIG_BASE_REF $BASE is not a commit in $REPO"; exit 1
fi

snapshot() {
  rm -rf "$OUT"; mkdir -p "$OUT/box" "$OUT/diffs"
  : > "$OUT/manifest.tsv"
  local f r cls n=0 e
  (cd "$DIR" && for e in $RETAIN_SCAN; do [ -e "$e" ] && find "$e" -type f; done; for e in $RETAIN_TEMPLATED; do [ -f "$e" ] && echo "$e"; done; true) \
    | sed 's#^\./##' | sort -u > "$OUT/.files"
  while IFS= read -r f; do
    ignored "$f" && continue
    [ "$f" = ".env" ] && continue
    grep -Iq . "$DIR/$f" 2>/dev/null || continue          # binary or empty
    r="$REL/$f"
    if in_list "$f" "$RETAIN_TEMPLATED"; then
      cls=templated
    elif [ ! -f "$r" ]; then
      cls=local-only
    elif cmp -s "$DIR/$f" "$r"; then
      continue
    elif [ -n "$BASE" ] && base_show "$f" | cmp -s - "$DIR/$f"; then
      cls=upstream
    else
      cls=edited
    fi
    mkdir -p "$OUT/box/$(dirname "$f")" "$OUT/diffs/$(dirname "$f")"
    cp -p "$DIR/$f" "$OUT/box/$f"
    if [ -f "$r" ]; then diff -u "$r" "$DIR/$f" > "$OUT/diffs/$f.diff" || true; fi
    if [ "$cls" = edited ] && [ -n "$BASE" ]; then
      mkdir -p "$OUT/base/$(dirname "$f")"
      base_show "$f" > "$OUT/base/$f" || : > "$OUT/base/$f"
    fi
    printf '%s\t%s\n' "$cls" "$f" >> "$OUT/manifest.tsv"; n=$((n + 1))
  done < "$OUT/.files"
  rm -f "$OUT/.files"
  env_keys "$DIR/.env" > "$OUT/env-keys.before" || true
  printf '%s\n' "${BASE:-}" > "$OUT/base-ref"

  local c
  for c in edited local-only templated upstream; do
    printf '%-11s %s\n' "$c" "$(awk -F'\t' -v c="$c" '$1 == c' "$OUT/manifest.tsv" | wc -l)"
  done
  echo
  while IFS=$'\t' read -r cls f; do
    case "$cls" in
      edited)     [ -n "$BASE" ] && echo "EDIT  $f  (3-way merged after the deploy)" \
                    || { in_list "$f" "$RETAIN_VERBATIM" && echo "EDIT  $f  (restored verbatim: RETAIN_VERBATIM)" \
                         || echo "EDIT  $f  (REPORT ONLY - set CONFIG_BASE_REF to merge it)"; } ;;
      local-only) echo "KEEP  $f  (not in the release)" ;;
      templated)  echo "TMPL  $f  (re-rendered from host_vars - carry the change in host_vars)" ;;
    esac
  done < "$OUT/manifest.tsv"
  echo
  echo "RESULT: $n file(s) recorded in $OUT (diffs/ shows each against the release)"
}

restore() {
  [ -f "$OUT/manifest.tsv" ] || { echo "FAIL  no snapshot in $OUT - run the snapshot step first"; exit 1; }
  local snapbase; snapbase="$(cat "$OUT/base-ref" 2>/dev/null || true)"
  [ -n "$BASE" ] || BASE="$snapbase"
  mkdir -p "$OUT/merged" "$OUT/conflicts"
  local cls f cur applied=0 conflicts=0 lost=0 kept=0 rc
  : > "$OUT/applied.txt"
  while IFS=$'\t' read -r cls f; do
    cur="$DIR/$f"
    if [ -f "$cur" ] && cmp -s "$OUT/box/$f" "$cur"; then kept=$((kept + 1)); continue; fi
    case "$cls" in
      upstream) ;;
      local-only)
        if [ -f "$cur" ]; then
          echo "WARN  $f  is local-only but now differs - left as is (box copy: $OUT/box/$f)"
        elif [ "$APPLY" = 1 ]; then
          mkdir -p "$(dirname "$cur")"; cp -p "$OUT/box/$f" "$cur"; echo "$f" >> "$OUT/applied.txt"
          echo "OK    $f  restored"; applied=$((applied + 1))
        else echo "PLAN  $f  restore (removed by the deploy)"; applied=$((applied + 1)); fi ;;
      templated)
        echo "LOST  $f  re-rendered from host_vars and differs - check $OUT/box/$f for hand edits to carry in host_vars"; lost=$((lost + 1)) ;;
      edited)
        if [ ! -f "$cur" ]; then
          echo "LOST  $f  no longer in the release - box version: $OUT/box/$f"; lost=$((lost + 1))
        elif in_list "$f" "$RETAIN_VERBATIM"; then
          if [ "$APPLY" = 1 ]; then write_inplace "$OUT/box/$f" "$cur"; echo "$f" >> "$OUT/applied.txt"; echo "OK    $f  restored verbatim"
          else echo "PLAN  $f  restore verbatim (RETAIN_VERBATIM)"; fi
          applied=$((applied + 1))
        elif [ -n "$BASE" ] && [ -f "$OUT/base/$f" ]; then
          mkdir -p "$OUT/merged/$(dirname "$f")"
          set +e
          git merge-file -p -L box -L "$BASE" -L release \
            "$OUT/box/$f" "$OUT/base/$f" "$cur" > "$OUT/merged/$f"
          rc=$?
          set -e
          if [ "$rc" = 0 ]; then
            if cmp -s "$OUT/merged/$f" "$cur"; then kept=$((kept + 1))
            elif [ "$APPLY" = 1 ]; then write_inplace "$OUT/merged/$f" "$cur"; echo "$f" >> "$OUT/applied.txt"; echo "OK    $f  box edits merged onto the release"; applied=$((applied + 1))
            else echo "PLAN  $f  merge box edits onto the release (clean)"; applied=$((applied + 1)); fi
          else
            mkdir -p "$OUT/conflicts/$(dirname "$f")"; mv "$OUT/merged/$f" "$OUT/conflicts/$f"
            echo "CONF  $f  $rc conflict(s) - resolve $OUT/conflicts/$f, then copy it over $cur"; conflicts=$((conflicts + 1))
          fi
        else
          echo "LOST  $f  edit dropped (no CONFIG_BASE_REF to merge with) - see $OUT/diffs/$f.diff"; lost=$((lost + 1))
        fi ;;
    esac
  done < "$OUT/manifest.tsv"

  local gone
  gone="$(comm -23 "$OUT/env-keys.before" <(env_keys "$DIR/.env") 2>/dev/null || true)"
  if [ -n "$gone" ]; then
    echo "LOST  .env keys no longer set (names only): $(echo $gone)"; lost=$((lost + 1))
  else echo "OK    .env still sets every key it set before"; fi

  echo
  echo "RESULT: $applied $([ "$APPLY" = 1 ] && echo applied || echo to apply), $conflicts conflict(s), $lost lost, $kept unchanged"
}

"$MODE"
