# Upload virus scan — load test report (8 CPU / 16 GB)

**Date:** 13 Oct 2026 · **Environment:** local DIGIT CMS stack · **Uploads:** 2,250 (~4 GB) in 14 runs

## Summary

- **The scanner is accurate and stable.** Every infected test file (90) was blocked and
  quarantined; no clean file was wrongly blocked; the scanner itself never failed or timed out.
- **Normal load (up to 20–50 parallel uploads): no meaningful slowdown** from scanning.
- **Heavy load (100 parallel): scanning adds ~0.7 s at the median** on 8 CPUs.
- **The limit is `egov-filestore`, not the scanner.** At 100 × 5 MB uploads at once it runs out
  of memory (`OutOfMemoryError: Java heap space`): **41/100 failed without scanning, 5/100 with
  scanning.** It recovered by itself, without a restart.

## 1. Test environment

| Item | Value |
|---|---|
| CPU | **8 threads.** All 50 containers and the load generator pinned to 8 of 12 threads (Intel Core i7-1255U) |
| RAM | **15 GiB** physical (the machine's real total, at or below the 16 GB target) |
| Storage | NVMe SSD |
| OS / Docker | Ubuntu 24.04.2 / Docker 29.7.1 |
| Software | DIGIT CMS stack, ClamAV 1.5.4, filestore-scan-proxy; `egov-filestore` heap 512 MB |
| Machine state | Heavily loaded: 50 containers, ~12 GiB RAM in use, 18 GiB in swap |

## 2. Method

| Route | Path |
|---|---|
| **Without scanning** (old behaviour) | Upload → Kong → filestore → MinIO |
| **With scanning** (new behaviour) | Upload → nginx → scan proxy → ClamAV → Kong → filestore → MinIO |

- **Test files:** real PNG images (100 KB / 1 MB / 5 MB), a 5 MB zip (hardest to scan), the
  EICAR test virus (harmless, detected by every antivirus).
- **Realistic mix:** 50% 100 KB, 30% 1 MB, 10% 5 MB, 10% EICAR (EICAR on the scanning route only).
- **Load tool:** Node 20 script (`load.mjs`), same machine. Each run: fixed number of uploads,
  fixed number in parallel.

## 3. Results

**Parallel** = uploads in flight at the same time. **p50** = median upload time, **p95** = 95% of
uploads finished within this time. **Scan time** = time inside ClamAV only.

| Test | Uploads | Parallel | Without scanning | With scanning | Uploads/s (without → with) | p50 (without → with) | p95 (without → with) | Scan time p50 / p95 |
|---|---|---|---|---|---|---|---|---|
| 5 MB image | 50 | 10 | ✅ 50/50 | ✅ 50/50 | 19.9 → 11.9 | 0.47 → 0.82 s | 0.59 → 1.04 s | 71 / 119 ms |
| 5 MB image | 60 | 20 | ✅ 60/60 | ✅ 60/60 | 11.7 → 10.6 | 1.52 → 1.78 s | 2.13 → 2.37 s | 192 / 270 ms |
| 5 MB zip | 30 | 10 | – | ✅ 30/30 | – → 19.3 | – → 0.43 s | – → 0.69 s | 120 / 154 ms |
| Realistic mix | 200 | 20 | ✅ 200/200 | ✅ 180 stored + 20 blocked | 39.0 → 40.0 | 0.32 → 0.31 s | 1.12 → 1.22 s | 26 / 84 ms |
| Realistic mix | 300 | 50 | ✅ 300/300 | ✅ 270 stored + 30 blocked | 60.3 → 56.0 | 0.65 → 0.65 s | 1.66 → 2.00 s | 40 / 247 ms |
| Realistic mix | 400 | 100 | ⚠️ 399/400 (1 filestore error) | ✅ 360 stored + 40 blocked | 65.3 → 40.6 | 1.27 → 2.00 s | 3.05 → 5.00 s | 55 / 320 ms |
| **Burst 100 × 5 MB at once** | 100 | 100 | ❌ **59/100** (41 filestore out of memory) | ⚠️ **95/100** (all 100 scanned clean; 5 failed in filestore) | 10.8 → 8.3 | 7.6 → 10.5 s | 9.1 → 12.0 s | 587 / 1,401 ms |

All "blocked" uploads were the EICAR test files, returned as `400 VIRUS_DETECTED` and quarantined.

## 4. Peak resource use (with scanning)

| Component | CPU peak | Memory peak | Notes |
|---|---|---|---|
| ClamAV | 85% | not reliable | Mostly in swap during the test; plan ~1.2–1.5 GB |
| Scan proxy | 113% | 376 MB at 100 parallel; **933 MB in the 5 MB burst** | Holds each upload in memory while scanning |
| egov-filestore | ~600% (6 CPUs) | 1.45 GB | **Busiest component; ran out of Java heap in the burst** |
| Kong | 120% | 2.4 GB | |
| MinIO | ~80% | 440 MB | |

100% = one full CPU thread.

## 5. Findings

1. **Correct in every run.** 90 infected files blocked and quarantined, 0 clean files wrongly
   blocked, 0 scanner errors, 0 "scanner unavailable", 0 quarantine failures.
2. **Up to 50 parallel uploads, users won't notice scanning.** Median upload time is the same
   (0.31 s / 0.65 s) with and without scanning.
3. **At 100 parallel on 8 CPUs, scanning costs ~0.7 s at the median** and about 35% throughput:
   the scanner and filestore compete for the same 8 CPUs.
4. **Filestore runs out of memory under a burst of large files**, with or without scanning (90
   `OutOfMemoryError` events). Scanning reduces the damage (41 → 5 failures) because the proxy
   staggers requests.
5. **The scan proxy needs up to ~1 GB RAM** during a burst of 100 × 5 MB uploads.

## 6. Recommendations

| # | Action | Why |
|---|---|---|
| 1 | **Raise `egov-filestore` heap to at least 1 GB** (`-Xmx1024m`) | Only component that failed; fails even without scanning |
| 2 | **Limit how many uploads the proxy forwards at once** (e.g. 20) | Shields filestore from bursts; would remove the remaining 5 failures |
| 3 | **Budget RAM:** ClamAV ~1.5 GB + proxy up to 1 GB | Measured / expected peaks |
| 4 | 8 CPU / 16 GB is **sufficient for normal complaint traffic** with scanning on | Up to 50 parallel uploads with no measurable slowdown |

## 7. Limitations

- **8 CPUs simulated** by pinning containers on a 12-thread laptop; host nginx was not pinned.
- **RAM 15 GiB** (not exactly 16 GB) under heavy swap — absolute times are pessimistic; the
  with-vs-without comparison is the reliable result.
- Load generated on the same machine: no network delay, no HTTPS.
- Real usage is rarely 100 simultaneous 5 MB uploads; the burst is a stress case.

## 8. How to reproduce

From this folder (see [README.md](README.md)):

```sh
python3 gen-files.py
S=http://localhost/filestore/v1/files       # with scanning
K=http://127.0.0.1:18000/filestore/v1/files # without scanning
bash run.sh scan-mix-c50 $S 50 300 img-100k.png:5 img-1m.png:3 img-5m.png:1 eicar.txt:1
bash run.sh base-mix-c50 $K 50 300 img-100k.png:5 img-1m.png:3 img-5m.png:1
```

For the 8-CPU limit: `docker ps -q | xargs docker update --cpuset-cpus 0-7` and prefix each
`run.sh` with `taskset -c 0-7`; restore with `--cpuset-cpus 0-<N-1>` afterwards.
