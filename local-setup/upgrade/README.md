# Tenant upgrade driver

Generic form of the per-box upgrade runbooks, ported from CMS-MOZAMBIQUE
(proven on the ige box) with config retention added for Kenya. Runs **on the
DIGIT server**, against `$DIGIT_DIR` and the local docker daemon. Every tenant
name, path, container name, port and credential comes from a config file, so
the same script serves any tenant.

```bash
cd local-setup/upgrade
cp upgrade.conf.example upgrade.conf.<tenant>
$EDITOR upgrade.conf.<tenant>          # TENANT is the only required value

./upgrade.sh --config upgrade.conf.<tenant> --dry-run   # see the plan
./upgrade.sh --config upgrade.conf.<tenant>             # gated run
```

Run it from a checkout of **the release you are deploying** (your merged
branch): step 5 compares the box against it and step 7 deploys it.

## Steps

| # | Step | Changes the box? |
|---|---|---|
| 1 | preflight — tools, paths, password, **host_vars traps** (`digit_dir`, `*_image` pins, state tenant, `docker_data_root`, `digit_ui_v2_repo`, `secrets_path`, `locale_default`, Novu key, `bootstrap_password`) | no |
| 2 | safety check — Postgres location, OpenBao key unseals, `secrets_path` matches `.env`, failed migrations | no |
| 3 | drain — every Kafka consumer group at zero lag | no |
| 4 | backup — dumps, config tarballs, named **and anonymous** volume copies, then restart and **wait until an admin login works** | **stops the stack** |
| 5 | config snapshot — record the box's own config changes against the release | no (writes into the backup dir) |
| 6 | escalation check — scheduler off in `docker-compose.<tenant>.yml`, no active legacy PGR escalation rows (migration guide 1.5, 1.6) | no |
| 7 | deploy — `ansible/deploy.sh <tenant>` | **restarts everything** |
| 8 | config restore — put back what the deploy dropped, restart Kong/Gatus | **writes `$DIGIT_DIR`** |
| 9 | post-deploy — session refresh, health, one-shot jobs, schema, 403s **since the deploy** | writes session only |
| 10 | smoke — wrong OTP refused, 401 without login, pages, virus-scan upload | uploads one test file |
| — | `--rollback DIR` — restore a step-4 backup and start the previous stack | **overwrites all data** |

Steps 4, 7, 8 and `--rollback` ask first. `--yes` answers for you; without
it a non-tty is a hard stop. `--dry-run` never asks and changes nothing.

Not here, unlike the Mozambique driver: the access-control sync, the bootstrap
role and the dashboard tier move. Those were for Mozambique's beta box. Bomet
runs v2.12, whose gateway already makes the same permission checks
(`docs/2.12/migration-guide-v2.12-to-v2.12.1.md` has no access-control step).

## Keeping the box's config (steps 5 and 8)

The deploy rsyncs the release's `local-setup/` dirs (kong, gatus, scripts, db,
…) over `$DIGIT_DIR` and re-renders `.env`, `nginx/globalConfigs.js` and
`nginx/digit-ui.conf` from host_vars. Edits made on the box are lost. Step 5
sorts every config file into:

| Class | Meaning | Step 8 |
|---|---|---|
| `KEEP` local-only | not in the release (e.g. `docker-compose.file-scan.yml`) | restored verbatim if the deploy removed it |
| `EDIT` edited | differs from the release | 3-way merged onto the new file; conflicts saved under `config-retain/conflicts/`, **never applied** |
| `TMPL` templated | rendered from host_vars | never restored (the next deploy would undo it) — move the change into host_vars |
| upstream | differs only because the release moved on | nothing to do |

The merge needs `CONFIG_BASE_REF`, the commit the box was last deployed from;
without it edits are only reported, apart from files in `RETAIN_VERBATIM`.
`.env` is compared by key **name** only: step 8 lists keys that disappeared,
and values are never printed or copied.

Everything is kept in `<backup>/config-retain/`: `box/` (the files as they
were), `diffs/` (each against the release), `merged/`, `conflicts/`.

## Flags

```
--config FILE     settings (see upgrade.conf.example)
--yes, -y         don't ask at the gated steps
--dry-run         print what would happen, change nothing
--from-step N     resume after a failure (with --backup-dir to keep the same backup)
--backup-dir DIR  reuse a backup directory from an earlier run
--rollback DIR    restore a step-4 backup and start the previous stack
--only N          run a single step
--list-steps
```

Resuming after step 5 needs the same `--backup-dir`: step 8 reads the snapshot
from it.

## Configuration

Precedence is **config file > environment > built-in default**: keys left
commented out in the file can be set from the environment for a one-off run:

```bash
PUBLIC_URL=https://bgrm.bomet.go.ke ./upgrade.sh --config upgrade.conf.bomet
```

`TENANT` is the ansible tenant (the `host_vars/<name>.yml` stem).
`STATE_TENANT` is the MDMS state tenant; it defaults to host_vars
`state_tenant_id` (bomet deploys tenant `bomet`, state tenant `bo`).

`host_vars/<tenant>.yml` is gitignored, so copy the box's file into
`local-setup/ansible/inventory/host_vars/` before running.

### Credentials

The admin password is never read from the config file by default. Either
export it, or point at a `0600` file:

```bash
printf '%s' 'the-password' > ~/.digit-admin-password
chmod 600 ~/.digit-admin-password
# ADMIN_PASSWORD_FILE=~/.digit-admin-password in the config
```

At upgrade time this is still the pre-rotation password, because the deploy has
to log in as ADMIN before `bootstrap_password` is set in host_vars.

## What it deliberately does not do

Reported as follow-ups at the end rather than silently skipped:

- **Choosing or merging the release.** Step 1 only warns that uncommitted files
  will be deployed; which commit you deploy is yours to decide.
- **The escalation migration** — needs per-tenant MDMS decisions. See
  `docs/2.12/migration-guide-v2.12-to-v2.12.1.md` step 6a.
- **Credential rotation** — ADMIN's password, `bootstrap_password`, Novu and
  gateway secrets.
- **Resolving config conflicts** — step 8 leaves them for you.
- **Restore what the backup does not hold:** web roots under `/var/www`, the
  host firewall (`ufw`), packages the deploy installed. `--rollback` lists them.

## Multi-node

Single node per run. For a load-balanced environment, run it on one node first,
then on the rest with `--from-step 7` so the one-time DB and MDMS work in steps
4–6 is not repeated. Config under `$DIGIT_DIR` must end up identical on every
node.

## Layout

```
upgrade.sh                 driver
upgrade.conf.example       documented settings template
upgrade.conf.bomet         local Bomet box (/opt/digit-bomet)
lib/safety_check.sh        pre/post health probe
lib/backup.sh              dumps, config tarballs, named + anonymous volume copies
lib/config_retain.sh       snapshot/restore of the box's own config changes
lib/refresh_session.py     force ADMIN's token to be re-issued
lib/digit_api.py           shared login helpers (stdlib only)
lib/smoke_upload.py        clean + EICAR upload through the virus-scan path
tenant/bomet/              Bomet's hand-made box config moved into repo form (README inside)
```
