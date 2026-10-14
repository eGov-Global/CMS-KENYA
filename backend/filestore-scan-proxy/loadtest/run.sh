#!/usr/bin/env bash
# Runs one scenario: samples docker stats while load.mjs runs, then pulls the
# proxy's own scan times (scanMs) for the same window from its logs.
# usage: run.sh <label> <url> <concurrency> <requests> <files...>
set -uo pipefail
D=$(cd "$(dirname "$0")" && pwd)
LABEL=$1; URL=$2; C=$3; N=$4; shift 4
SINCE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
STATS="$D/stats-$LABEL.txt"; : > "$STATS"
( while true; do docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' \
    digit-clamav filestore-scan-proxy egov-filestore kong-gateway digit-minio >> "$STATS" 2>/dev/null; done ) &
SAMPLER=$!
OUT=$(node "$D/load.mjs" "$URL" "$C" "$N" "$@")
kill $SAMPLER 2>/dev/null; wait $SAMPLER 2>/dev/null
PEAK=$(python3 - "$STATS" <<'EOF'
import sys, re, json
peak = {}
unit = {'B':1/2**20,'KiB':1/1024,'MiB':1,'GiB':1024}
for line in open(sys.argv[1]):
    p = line.split()
    if len(p) < 3: continue
    name, cpu = p[0], float(p[1].rstrip('%') or 0)
    m = re.match(r'([\d.]+)(\w+)', p[2]); mem = float(m.group(1)) * unit.get(m.group(2), 1) if m else 0
    c, mm = peak.get(name, (0, 0)); peak[name] = (max(c, cpu), max(mm, mem))
print(json.dumps({k.replace('filestore-scan-proxy','proxy').replace('digit-','').replace('egov-','').replace('kong-gateway','kong'): {'cpu%': round(v[0]), 'mem_mb': round(v[1])} for k, v in peak.items()}))
EOF
)
SCAN=$(docker logs --since "$SINCE" filestore-scan-proxy 2>&1 | python3 -c "
import sys, json
ms = sorted(json.loads(l)['scanMs'] for l in sys.stdin if '\"upload_clean\"' in l)
v = sum(1 for _ in [])
if ms:
    p = lambda q: ms[min(len(ms)-1, max(0, int(round(q/100*len(ms)))-1))]
    print(json.dumps({'n': len(ms), 'p50': p(50), 'p95': p(95), 'max': ms[-1]}))
else: print('null')")
echo "{\"label\":\"$LABEL\",\"result\":$OUT,\"peak\":$PEAK,\"proxy_scan_ms\":$SCAN}"
