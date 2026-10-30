# Bomet config in the repo (v2.12 → v2.12.1)

On the v2.12 box, Bomet's settings were edited by hand under `/opt/digit`.
`deploy.sh` overwrites that folder, so every redeploy would drop them. They now
live in the repo and in host_vars, as Mozambique did with
`docker-compose.ige.yml`, so `deploy.sh` reproduces the box every time.

Source of the box's settings: the production backup
`backup_10.10.10.246_20261026_143945` (identical to the local test copy in
`/opt/digit-bomet`).

## 1. Compose overlay: `local-setup/docker-compose.bomet.yml` (applied)

The branch's file plus the flags set by hand on the box:

| Service | Flags |
|---|---|
| egov-user | `EGOV_OTP_HOST`, `CITIZEN_REGISTRATION_WITHLOGIN_ENABLED`, `OTP_VALIDATION_REGISTER_MANDATORY`, `CITIZEN_LOGIN_PASSWORD_OTP_FIXED_ENABLED: false` |
| egov-enc-service | `STATE_LEVEL_TENANT_ID: bo` |
| egov-filestore | `ALLOWED_FORMATS_MAP` (docx as zip) |
| pgr-services | `ALLOWED_SOURCE`, `PGR_STATELEVEL_TENANTID`, `EGOV_INTERNAL_MICROSERVICE_USER_UUID`, `PGR_ESCALATION_STATES`, `…STRIP_SEQUENCE_PADDING` |
| novu-bridge | direct SMS (Ozeki) and SMTP mail, read from `.env` |

`PGR_ESCALATION_ENABLED` is `"false"`. Migration guide step 1.5
(`docs/2.12/migration-guide-v2.12-to-v2.12.1.md`) requires it off until step
6a is done, and upgrade step 6 refuses `"true"`. After 6a, set it to `"true"`
and redeploy (guide step 6b).

## 2. Direct SMS and mail credentials (applied)

`ansible/templates/digit.env.j2` renders `NOVU_BRIDGE_DIRECT_*` and
`SPRING_MAIL_*` (outside the `enable_novu` block) from host_vars. The values
live only in `bomet.yml` (gitignored), under "Direct SMS + e-mail", copied from
production's `.env` with `env-to-host-vars.sh`. If production changes a
credential, update it in `bomet.yml`. Upgrade preflight compares the two
(values never printed) and stops on any difference.

## 3. host_vars: `local-setup/ansible/inventory/host_vars/bomet.yml` (applied)

Values for production (`/opt/digit`, Postgres on the named volume
`digit_postgres_data`):

| Key | Value | Why |
|---|---|---|
| `digit_dir` | unset (default `/opt/digit`) | production's stack folder |
| `db_fast_path` + `db_fast_path_ack_data_wipe` | `true` + `true` | data is on `digit_postgres_data` (guide step 1.4); nothing is wiped |
| `enable_otp_services` | `true` | the box runs egov-otp and user-otp; `false` turns the fixed OTP on |
| `enable_novu` | `false` | Bomet uses no Novu server |
| `enable_notifications_direct` | `true` | novu-bridge in direct mode with digit-config-service and digit-user-preferences-service |
| `enable_file_scan` | `true` | replaces the hand-made `docker-compose.file-scan.yml` |
| `digit_ui_v2_repo` | commented out | builds from this repo; `/opt/digit-ui-v2` is not a git clone |
| `pgr_services_image`, `novu_bridge_image` | **set to your new build tags** | the old tags would win over the release |

The local test copy differs: it runs from `/opt/digit-bomet` with Postgres
data in an anonymous volume, so it needs `digit_dir: /opt/digit-bomet` and
`db_fast_path: false`. Never deploy it with the production values.

## 4. Kenya pieces the v2.12.1 merge (`e6dc613c`) dropped (restored)

Restored from `e139976c`, the commit production runs:

| File | Restored |
|---|---|
| `ansible/playbook-deploy.yml` | `file-scan` and `notifications-direct` in `compose_profiles` (the second one is new: no playbook had it); "Resolve filestore-scan-proxy image tag"; OpenBao quarantine MinIO password tasks; "ClamAV — restart when clamd.conf changed" |
| `ansible/templates/nginx-site.conf.j2` | the `map $request_method $digit_filestore_upstream` block (uploads go through the scan proxy) |
| `ansible/inventory/group_vars/digit.yml` | `upstream_scan_proxy_port: 18183` |
| `ansible/templates/digit.env.j2` | `FILESTORE_SCAN_PROXY_IMAGE` |
| `gatus/config.yaml`, `k8s/tools/gatus.yaml` | Filestore Scan Proxy and ClamAV health checks |

Kept by the merge: `pgr_pii_masking` in `globalConfigs.js.j2`, the
notifications-direct and file-scan services in `docker-compose.egov-digit.yaml`.

## 5. Escalation: keep Bomet's own (decided 2026-10-28)

Bomet keeps its level-state workflow (`PENDINGATLME → ESCALATEDLEVEL1 → 2 → 3`,
per-department role lists) and its HRMS reporting lines as they are. Not done,
on purpose: the standard 2.12.1 self-loop workflow, moving complaints out of
`ESCALATEDLEVEL*`, and adding "reports to" where it is missing. Bomet's v2.12
build also escalated only to the HRMS "reports to" and skipped when there was
none, so that is unchanged.

Two things v2.12.1 needs so this keeps working:

1. **States to escalate from.** v2.12.1 no longer reads
   `PGR_ESCALATION_STATES`; `docker-compose.bomet.yml` now also sets
   `PGR_ESCALATION_ELIGIBLE_STATUSES` to the same four states.
2. **Timings.** Bomet's `EscalationConfig` stores each level's own wait.
   v2.12.1 reads ladders as cumulative complaint age and ignores any that do
   not increase, which is all 92 of them. After the deploy, run
   `escalation-keep-bomet.sql` (instructions inside): it rewrites each ladder to
   its running total, backs up the old row, and is safe to re-run. Tested on
   the local copy of production data, rolled back.

One difference cannot be kept without a code change: v2.12 measured each
level from the complaint's last change, v2.12.1 measures from its creation. A
complaint nobody touches escalates at the same moments; one that was updated
in between now escalates earlier than before.

Then turn `PGR_ESCALATION_ENABLED` back to `"true"` and redeploy (guide step 6b).

## 6. Demo StateInfo copied by the deploy (found in the local test, 2026-10-28)

The deploy's MCP tenant bootstrap copies `pg` masters that `bo` lacks by uid.
It added `common-masters.StateInfo` `Demo.pg` next to Bomet's `Demo.bo`; MDMS
returns `Demo.pg` first and the UI takes `StateInfo[0]`, so the portal would
show the DIGIT demo logo, name and languages. Upgrade step 9 now detects
StateInfo records whose `code` is not the state tenant and switches them off
(asks first; data kept). Tested on the local production copy.

## 7. Not yet driven by the repo

- **Leftover Novu-server containers on production**: `novu-mongo`,
  `novu-bridge-endpoint` and `otp-publisher` (profile `notifications`) still
  run, but nothing uses them in direct mode: Kong routes `/user-otp` to
  `user-otp`, and novu-bridge sends SMS and mail itself. The deploy leaves them
  alone. After the upgrade passes its smoke tests, stop them (the Mongo volume
  is kept, so this can be undone with `docker start`):

  ```bash
  docker stop novu-mongo novu-bridge-endpoint otp-publisher
  docker update --restart=no novu-mongo novu-bridge-endpoint otp-publisher
  ```

- **Kong OTP mock**: the v2.12.1 `kong/kong.yml` still ships the
  request-termination mock on `/user-otp` and `/otp`, and no switch removes it.
  Bomet deleted it by hand. Until a playbook switch exists, upgrade step 8
  merges the deletion back (tested clean), and step 10 fails if a wrong OTP is
  accepted.
- **`kong/auth-enrichment.lua`, `notification-seed/`, l10n JSON, edits under
  `scripts/`**: carried by upgrade steps 5 and 8. Commit any you want kept for
  good.
