# Upload load test (filestore-scan-proxy)

Compares uploads **without** scanning (direct to Kong) and **with** scanning
(nginx → proxy → clamd → Kong). Run on the server under test; needs node ≥ 20,
python3 and docker access. Every run stores real files in MinIO `egov-rainmaker`
(and EICAR copies in `egov-quarantine`) — use a test environment.

```sh
python3 gen-files.py
K=http://127.0.0.1:18000/filestore/v1/files      # baseline, no scan
S=http://localhost/filestore/v1/files            # through nginx + scanner
bash run.sh scan-mix-c20 $S 20 200 img-100k.png:5 img-1m.png:3 img-5m.png:1 eicar.txt:1
bash run.sh base-mix-c20 $K 20 200 img-100k.png:5 img-1m.png:3 img-5m.png:1
```

`run.sh <label> <url> <concurrency> <requests> <file[:weight]>...` prints one JSON
line: status counts, req/s, MB/s, latency p50/p90/p95/p99/max, peak CPU/memory of
clamav/proxy/filestore/kong/minio, and the proxy's own scan time (`scanMs`).
Never send `eicar.txt` to the baseline URL — it would be stored unscanned.
