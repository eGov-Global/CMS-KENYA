# Product → Kenya Synchronization Runbook

How CCRS Product changes enter CMS-KENYA. This is a **continuous, routine process** —
never a big-bang migration.

## Repository governance

| Remote | URL | Role |
|---|---|---|
| `origin` | eGov-Global/CMS-KENYA | Kenya repository |
| `upstream` | egovernments/Citizen-Complaint-Resolution-System | **the only permanent upstream** |
| `moz` | eGov-Global/CMS-MOZAMBIQUE | historical sibling — reference and explicit cherry-picks (`git cherry-pick -x`) ONLY; never wholesale merges |

## Branches and tags

| Ref | Meaning |
|---|---|
| `upstream-product` | Fast-forward-only mirror of `upstream/master`. **Never** carries a Kenya commit; never customized; updated only by ff. |
| integration branch | Where product syncs land. Currently `syncwithmoz`; target name after consolidation: `main`. |
| `product-sync/<date>` | Working branch for one synchronization (conflict resolution happens here). |
| `kenya-feature/*`, `kenya-fix/*` | Kenya work. |
| `release/*` | UAT/production stabilization. |
| tag `product-base-2026-08-13` | `815b2374` — last product revision fully contained in the Kenya line at analysis time. |
| tag `moz-snapshot-2026-09-15` | `0d5e7a4a` — Moz master when the layer analysis was done. |
| tag `kenya-layer-start` | `df7ca8d0` — where Kenya-only commits begin; `kenya-layer-start..<integration>` = the Kenya layer. |

## The synchronization procedure

Automation (`.github/workflows/product-sync.yml`, weekly + manual dispatch) performs
steps 1–4 and opens/updates the sync PR. Humans own everything after.

1. **Fetch** `upstream`; **fast-forward** `upstream-product` and push it.
2. **Detect** new commits: `upstream-product` vs `product-sync.json.commit`.
3. **Report**: dry-run merge into the integration branch → conflict list, commit count,
   watchlist hits — posted on the PR.
4. **PR**: head `upstream-product`, base = integration branch, title
   `[PRODUCT-SYNC] Sync product <sha> (<date>)`.
5. **Classify** every change per [PRODUCT-CHANGE-ADOPTION.md](PRODUCT-CHANGE-ADOPTION.md);
   record decisions in `decisions/<date>.md`.
6. **Resolve** on a local `product-sync/<date>` branch. Use
   [CONFLICT-MANAGEMENT.md](CONFLICT-MANAGEMENT.md) verdicts; keep-fork files are
   manually ported, never overwritten.
7. **Merge commit** (never rebase, never reset): `[PRODUCT-SYNC] Sync product <sha> (<date>)`.
   Update `product-sync.json` in the same commit.
8. **Test**: lint → unit (`node --test` in digit-ui-esbuild + backend via CI `build.yml`)
   → builds (esbuild + configurator) → parity guards → Playwright smoke → Kenya
   regression (see decisions template §Testing).
9. **UAT** on the pilot, then **production** — always human-approved, never automated.

## Hard rules

- Never `git reset --hard` toward upstream on any branch containing Kenya work.
- Never force-push shared branches; never rewrite public history.
- Never hand-copy random product files — every product change arrives through a
  traceable merge or an explicit `cherry-pick -x`.
- Never hand-merge lockfiles: union `package.json`, regenerate the lockfile, build, test.
- A sync PR must never be merged with unreviewed changes to keep-fork files.

## Rollback

A sync is one merge commit on the integration branch:
`git revert -m 1 <sync-merge-sha>`, restore the previous `product-sync.json`, redeploy
the previous release tag. Anchor tags make every layer recoverable.

## Which product revision is deployed?

`product-sync.json` on the deployed ref answers it. Verify against the served bundle
if in doubt (deploy scripts print HEAD at build time).
