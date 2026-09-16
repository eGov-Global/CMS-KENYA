# Conflict Management & Watchlist

Baseline (2026-09-16 analysis): merging `upstream/master` (`7ee88f83`) into the Kenya
line produced **64 real conflicts**. Health metric = conflict count per sync.
Targets: <10 after the structural cleanup phase; steady-state near-zero outside the
keep-fork list below.

## Keep-fork watchlist (manual port + browser QA on EVERY sync — never overwrite)

| File | Why divergent | Product side risk |
|---|---|---|
| `digit-ui-esbuild/products/pgr/src/pages/citizen/Create/CreatePGRFlowV2.tsx` | Kenya/Moz near-rewrite (3-step wizard, dynamic fields, consents, auto-assign) — +1264/−325 vs product's +38 | A past product→country merge of this file shipped a prod crash (`bd20dce0`). Manual port only. |
| `digit-ui-esbuild/products/pgr/src/pages/employee/PGRDetails.js` | Complainant card, masking switch, action-modal rework (24 commits) | Product escalation/action changes land in the same regions |
| `digit-ui-esbuild/products/pgr/src/components/GeoLocations.js` | Vector basemap, camera, brand pin (14 commits) | Product has correctness fixes (abort/race/pin-leak) that must be TAKEN each sync |
| `packages/modules/core/src/pages/employee/Login/login.js` | Moz portal header + card geometry (to become theme tokens) | Product actively themes pre-auth screens |
| `digit-ui-esbuild/products/pgr/src/configs/UICustomizations.js` | Inbox preProcess (statuses, createdBy scoping) | Until `OPEN_STATES` moves to MDMS |
| `public/vendor/overrides.css` | Until split into `country-overrides.css` | Product added +1379 lines here |

## Known verdicts from the baseline analysis (first sync)

**Take product verbatim:** `public/analytics.js` + its test (Kenya's copy is the same
feature cherry-picked earlier, minus 3 product fixes) · `TopBar.js` (product fixed the
same photo bug better) · `MDMSUtils.java` (superset; re-apply one `x-no-mask` line) ·
`pom.xml` (CVE + bean-validation fix) · everything under `devops/` · full-dump.sql ·
gatus configs · configurator analytics editor files.

**True-merge (mechanical):** `PGRConfiguration.java` (union; de-dup boundary URL) ·
novu-bridge `NovuBridgeConfiguration`/`application.properties` (disjoint unions) ·
`applyTheme.js` (both additive at the same anchor — check `injectV2Bridge` callers) ·
`RequestsApiController.java` (one line) · `package.json` (union) + regenerate lockfile.

**Semantic — requires a recorded product decision first (do NOT resolve by git
preference):**
1. **Escalation**: product = assigned-only + MDMS `EscalationConfig`; Kenya =
   `ESCALATEDLEVEL1-3` state ladder + `pgr.escalation.states`. Same lines of
   `EscalationScheduler.java`. Blocks pgr-services resolution.
2. **Row scoping**: product = MDMS ABAC policy engine; Kenya = role-property
   dept/jurisdiction scoping. Take product engine, re-validate Bomet behavior,
   re-point `AdminComplaintSearchService`.
3. **novu-bridge**: three SMS gateways (product SMSCountry, Kenya Ozeki+Bongatech+
   direct mode) collide on one constructor. **All must survive** — unify via the
   provider-overrides factory and upstream it.

## Structural fixes that permanently remove conflict classes

| Fix | Kills |
|---|---|
| Split `country-overrides.css` (loads after product's `overrides.css`) | The highest-churn CSS collision (35 vs 10 commits) |
| `OPEN_STATES` → MDMS `InboxVisibilityConfig` | The `UICustomizations.js` conflict class |
| Basemap/pin/zoom → MDMS `MapConfig` | Most of the `GeoLocations.js` delta |
| OTP cooldown → config; login card geometry → theme token | Two subtree edits |
| Delete `bomet-logo.jpg` source import (MDMS override exists) | The only hardcoded country asset |
| Activate `Customizations.PGR` for detail rows | Part of the `PGRDetails.js` delta |
| Upstream the ~14 generic subtree fixes | Most of `packages/modules/**` divergence |

## Traps

- **`packages/modules/pgr/**` is DEAD** — esbuild aliases every PGR import to
  `products/pgr` (`esbuild.build.js`). Product commits there merge cleanly and do
  nothing; they must be hand-ported to `products/pgr`. CI warns on changes there.
- **Duplicate independent fixes** merge cleanly but double behavior (e.g. both sides
  wiring geoLocation into the create payload). The conflict report can't see these —
  the classification pass must.
