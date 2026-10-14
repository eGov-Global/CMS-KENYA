// Upload load generator: N multipart uploads at concurrency C against one URL.
// usage: node load.mjs <url> <concurrency> <requests> <file>[:weight] [<file>[:weight] ...]
// Prints one JSON line: latency percentiles, throughput, status counts.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const [url, cStr, nStr, ...specs] = process.argv.slice(2);
const C = Number(cStr), N = Number(nStr);
const files = specs.map((s) => {
  const [path, w] = s.split(':');
  const type = { png: 'image/png', zip: 'application/zip', txt: 'text/plain', pdf: 'application/pdf' }[path.split('.').pop()] || 'application/octet-stream';
  return { name: basename(path), buf: readFileSync(path), weight: Number(w || 1), type };
});
const total = files.reduce((a, f) => a + f.weight, 0);
// Deterministic mix: request i gets file by weighted round-robin.
const pick = (i) => {
  let x = i % total;
  for (const f of files) { if (x < f.weight) return f; x -= f.weight; }
};

const results = [];
let next = 0;
async function worker() {
  while (true) {
    const i = next++;
    if (i >= N) return;
    const f = pick(i);
    const fd = new FormData();
    fd.append('tenantId', 'ke');
    fd.append('module', 'PGR');
    fd.append('file', new Blob([f.buf], { type: f.type }), f.name);
    const t0 = performance.now();
    let status = 0;
    try {
      const res = await fetch(url, { method: 'POST', body: fd });
      status = res.status;
      await res.arrayBuffer();
    } catch { status = -1; }
    results.push({ ms: performance.now() - t0, status, file: f.name, bytes: f.buf.length });
  }
}

const start = performance.now();
await Promise.all(Array.from({ length: C }, worker));
const wall = (performance.now() - start) / 1000;

const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.ceil((p / 100) * arr.length) - 1)];
const lat = results.map((r) => r.ms).sort((a, b) => a - b);
const statuses = {};
for (const r of results) statuses[r.status] = (statuses[r.status] || 0) + 1;
const bytes = results.reduce((a, r) => a + r.bytes, 0);
const r1 = (x) => Math.round(x);
console.log(JSON.stringify({
  url, concurrency: C, requests: N, files: files.map((f) => `${f.name}x${f.weight}`).join('+'),
  wall_s: +wall.toFixed(2), rps: +(N / wall).toFixed(2), mb_per_s: +(bytes / 1e6 / wall).toFixed(2),
  statuses,
  lat_ms: { min: r1(lat[0]), p50: r1(pct(lat, 50)), p90: r1(pct(lat, 90)), p95: r1(pct(lat, 95)), p99: r1(pct(lat, 99)), max: r1(lat.at(-1)), mean: r1(lat.reduce((a, b) => a + b, 0) / lat.length) },
}));
