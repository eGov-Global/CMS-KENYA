# CCRS migrations — unified runner

Recommended entry point: one idempotent script that covers every migration
(the individual legacy scripts below still exist and work; the runner
supersedes them for day-to-day use):

```bash
node docs/migration/ccrs-migrate.cjs --host http://<gateway> --tenant mz [--pass '<admin-pass>'] \
     [--banner-url https://.../logo.png] [--gzip] [--nginx-conf /etc/nginx/...]
```

- **Continue-on-error**: a failing phase records its ERROR CODE + remediation
  and the run moves on; the final summary table shows every phase.
- **Idempotent**: completed work is detected and skipped — re-run any time,
  including after fixing a single failed phase.
- **Dry-run**: `--dry-run` prints the plan (the old preflight), zero writes.
- **Scoping**: `--phases schemas,landing` runs a subset; `--report out.json`
  writes a machine-readable result; `--cms` opts into the CMS workflow phase;
  `--gzip` opts into the nginx gzip phase; `--banner-url <url>` lets the
  banner phase fill the PGR city-module banner (only when empty).
- Exit code = number of phases needing attention (0 = clean).

| Phase | What it covers | Equivalent legacy script |
|---|---|---|
| auth | login / token | (inline in every script) |
| schemas | all RAINMAKER-PGR + Landing MDMS schemas | `install-schemas.cjs` |
| hierarchy | 2-level → N-level complaint hierarchy (preserve/derive) | `migrate.cjs`, `preflight-dryrun.cjs` (= `--dry-run`), `run-data-migration.sh` |
| pgr-masters | RelatedToMap / TemplateType / ExtAttrSchema seeds | `seed-pgr-masters.cjs`, `seed-data.cjs` |
| landing | landing sections + page config + PGR_LANDING_* keys | `landing-config/seed-landing-config.sh` |
| loc | catch an existing tenant up with the `localisations/<locale>/<module>.json` seeds (opt-in `--loc`) | hand-written `_upsert` calls after every deploy |
| cms | CMS roles / actions / grants / workflow (opt-in `--cms`) | `seed-pgr-masters.cjs CMS=1` |
| banner | tenant.citymodule schema + rows + PGR bannerImage | `fix-citymodule.sh` (API-doable part) |
| gzip | /digit-ui gzip + Cache-Control verify/apply (opt-in `--gzip`) | `docs/ops/digit-ui-compression.md` manual steps |
| verify | consolidated v1 read-back | (manual SQL in `run-data-migration.sh`) |

### banner (default pipeline)

- Registers `tenant.citymodule` from the DDH seed when absent (definition
  includes `bannerImage`). When the schema exists **without** `bannerImage`
  it reports `CITYMODULE_SCHEMA_DRIFT` with remediation → run
  `fix-citymodule.sh` ON the box (MDMS has no schema-update API; the runner
  never touches the DB).
- Creates *missing* city-module rows only (Workbench/PGR/HRMS from the seed);
  existing rows are never touched.
- `--banner-url <url>` (env `BANNER_URL`) fills the PGR row's `bannerImage`
  **only when empty** — an existing value is never overwritten (a differing
  value is reported).

### gzip (opt-in: `--gzip`)

- Always probes `<host>/digit-ui/index.js` with `Accept-Encoding: gzip`
  (the runbook's own verify) — reports `OK` when `content-encoding: gzip`
  comes back, so it doubles as a remote post-deploy check.
- When gzip is NOT active **and the script runs on the serving box** (config
  auto-discovered under `/etc/nginx`, or passed via `--nginx-conf`):
  timestamped backup → inserts the runbook's gzip + `Cache-Control: no-cache`
  block inside the **serving** `/digit-ui` location (redirect stubs like
  `location = /digit-ui { return 302 ... }` are skipped; proxy-mode locations
  also get `proxy_set_header Accept-Encoding ""`) → `nginx -t` with automatic
  rollback on failure → reload → re-probe.
- Anywhere else: `PARTIAL` with remediation → `docs/ops/digit-ui-compression.md`
  (ansible boxes: `cd local-setup/ansible && ./deploy.sh <host> --tags nginx`).

### loc (opt-in: `--loc`)

A fresh tenant gets its localisation from the MCP bootstrap, but keys added to
the seeds later never reach a live tenant by themselves — the UI shows the raw
key (`PGR_RECEIPT_TITLE`) until someone upserts it by hand. This phase closes
that gap from the seeds in the checkout, for `--locale` (default `en_IN`):

- Per module (`--loc-modules`, default `rainmaker-pgr,rainmaker-common`): reads
  `utilities/default-data-handler/src/main/resources/localisations/<locale>/<module>.json`,
  searches the tenant, and **adds only the keys it lacks**. Texts the tenant
  already has are never touched — operators reword messages per tenant.
- `--loc-update KEY1,KEY2` is the **only overwrite path**: those keys' live
  text is replaced by the seed's (use it for a seed fix that must reach a
  tenant, e.g. a stale hint). A key not in any seed is reported
  (`LOC_UPDATE_UNKNOWN_KEY`), never silently skipped.
- `PGR_LANDING_*` is never sent here — the landing phase owns those keys, and
  on forks whose landing copy lives in code, seeding them would override it.
- A failed live search plans nothing for that module (it is never mistaken for
  an empty tenant). `--dry-run` prints the per-module plan.
- Ends with the localisation `cache-bust`; if a box still serves raw keys,
  evict its cache: `docker exec digit-redis redis-cli DEL computedMessages messages`.

```bash
# see the plan
node docs/migration/ccrs-migrate.cjs --host https://<gateway> --tenant nb --user ADMIN --pass '…' \
     --only loc --loc-update PGR_EXT_IS_CONFIDENTIAL_HINT --dry-run
# apply
node docs/migration/ccrs-migrate.cjs --host https://<gateway> --tenant nb --user ADMIN --pass '…' \
     --only loc --loc-update PGR_EXT_IS_CONFIDENTIAL_HINT
```

Seed data stays in `docs/migration/seed/` and the DDH resources tree — the
runner reads them from the checkout it lives in.

Known environment quirks the runner handles or surfaces with remediation:
async schema persist (202 + verify-after), the `x-ref-schema []→{}` bug
(strip-on-create + SQL hint on hit), silently-dropped schema creates on old
images (verify-after + DB-insert hint), non-ASCII schema descriptions
(sanitised), one-locale-per-call localization upserts.

The hierarchy cutover REMAINS lockstep and human-checkpointed — see
`operator-runbook.md` §8 for the deploy/retire ordering after data migration.
