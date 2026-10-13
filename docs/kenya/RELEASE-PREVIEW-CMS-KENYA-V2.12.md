# CMS Kenya V2.12 — Release Documentation (Technical Reference)

**Release:** `v2.12-kenya` — Bonga Nai (Nairobi City County, tenant `nb`) and Bomet Feedback Hub (Bomet County, tenant `bo`)
**Code:** `nairobi-prod` @ `8e6289e86` (13 Oct 2026) · bgrm landing page: `nairobi-prod-bgrm-changes` @ `78444ee4e` · bgrm complaint service: `feat/bomet-uat` @ `6eb6b853c`
**Product baseline:** `egovernments/Citizen-Complaint-Resolution-System` @ `815b2374` (tag `product-base-2026-08-13`)
**Prepared:** 13 Oct 2026. The GitHub release body is [RELEASE-NOTES-CMS-KENYA-V2.12.md](RELEASE-NOTES-CMS-KENYA-V2.12.md); this document is the evidence behind it.

## Contents

1. About this document
2. Deployments and what they run
3. Bonga vs bgrm: live configuration compared
4. Kenya-layer change inventory
5. Changes not in this release
6. `nairobi-prod` vs `nairobi-prod-bgrm-changes`
7. Inherited from the product and CMS Mozambique
8. Configuration delta against the product
9. Testing status
10. Known limitations and open issues
11. Not verified
12. Documentation

---
## 1. About this document

### Sources and method

- **Git:** the fetched refs of `eGov-Global/CMS-KENYA`, with `eGov-Global/CMS-MOZAMBIQUE` and the upstream product as remotes. Commands: `git log`, `git diff`, `git cherry`, `git merge-base`, and code read at `nairobi-prod`.
- **GitHub:** the body of every PR merged into the Kenya line, and the open issues that bear on it.
- **Live counties:** read-only search calls against `bonga.nairobi.go.ke` and `bgrm.bomet.go.ke` on 13 Oct 2026, without signing in. Captured: every MDMS master, the `PGR` workflow, boundaries, labels (`en_IN`, `sw_KE`), the served UI bundle and `globalConfigs.js`. Nothing was written.
- **Tests:** run on a clean checkout of `nairobi-prod` @ `8e6289e86` (§9).

**Live 13 Oct** marks a statement read from the county. **Unverified** means neither the repository nor the live search endpoints could confirm it.

### Lineage

| Step | Ref | Date | What |
|---|---|---|---|
| Product baseline | `815b23747` (`product-base-2026-08-13`) | 13 Aug | The same baseline as CMS Mozambique V2.12 |
| First Kenya change | PR #1 `d92def1d0` | 19 Aug | Bomet landing page on the product |
| Mozambique layer | `35504b797` merges Mozambique `master` @ `df7ca8d08` (`kenya-layer-start`) | 31 Aug | 636 commits, carried in by PRs #4–#9 |
| Product sync | `626864567` (front end) and `2176984d7` (backend, infrastructure, configurator; 905 files) | 16–17 Sep | Upstream product `7ee88f83`, squashed |
| Kenya layer | `kenya-layer-start..nairobi-prod` | 30 Aug – 13 Oct | 220 commits (156 non-merge), PRs #1–#157 |
| Release code | `nairobi-prod` @ `8e6289e86` | 13 Oct | To be merged into `master` |

Layer tags used in §8:
- **[S]** shared pre-fork work (product and Mozambique);
- **[P]** the product sync inside the Kenya range;
- **[K]** Kenya-authored work.

### Volume (product baseline → `nairobi-prod`)

- **In total:** 856 commits (541 non-merge), 1,360 files changed, +167,291 / −38,804 lines.
- **Before the fork:** 636 commits, 332 files.
- **After the fork:** 220 commits, 1,174 files. The product sync alone touches 905 of these files.

---
## 2. Deployments and what they run

| | Bonga Nai | Bomet Feedback Hub |
|---|---|---|
| Address | https://bonga.nairobi.go.ke | https://bgrm.bomet.go.ke |
| Tenant · boundary hierarchy | `nb` · `Nairobi-Hierarchy` | `bo` · `BOMET-Hierarchy` |
| UI branch | `nairobi-prod` | `nairobi-prod-bgrm-changes` |
| Live UI build id (13 Oct) | `111d80717226` | `f5815743da37` |
| Complaint service (pgr-services) | built from `nairobi-prod`; image tag unverified (§11) | built from `feat/bomet-uat`; `egovio/pgr-services:bomet-uat-6eb6b85` per the rollout notes |
| Runtime config | Ansible `host_vars/nairobi.yml` | Ansible `host_vars/bometnew.yml` |

### How the live UI was identified

- Both sites' bundles were downloaded: 57 chunks each.
  - 47 chunks are byte-identical between the counties.
  - The other 10 differ only in minifier import aliases, except the landing-page entry (`AppEntry`) and the chunks it uses.
- Each bundle was then searched for markers of the latest merged work:

| Marker | Change | Bonga | bgrm |
|---|---|---|---|
| `REASSIGNTOGRO`, `CS_REASSIGNTOGRO_DONE_HEADING` | #150, #151 | ✓ | ✓ |
| Withdraw confirmation keys | #146 | ✓ | ✓ |
| `?v=<build id>` on every asset | #148 | ✓ | ✓ |
| County contact e-mail; "0730 047 047" | #153, #155 | ✓ | — |
| `pgrl-top-font`; Inter 800/900 | #154 | ✓ | — |
| `bomet-hero`, `pgrl-arch` (editorial layout) | `nairobi-prod-bgrm-changes` | — | ✓ |

Bonga therefore runs `nairobi-prod` through #155, and bgrm runs `nairobi-prod-bgrm-changes`. #157 (ClamAV) is server-side and off by default.

A byte-for-byte comparison with a local build is not possible: the servers build with their own dependency install, so even third-party chunks differ.

### Runtime configuration (`/digit-ui/globalConfigs.js`)

The two files differ only in:
- `stateTenantId`, `mapTenant`, `loginTenantAllowlist` and `keycloakRealm`;
- `hierarchyType`;
- `mapCenter`: Bonga −1.2864, 36.8172; bgrm −0.7817, 35.3428.

Shared values:
- `PGR_PII_MASKING=false`;
- dashboard metrics on and the analytics kill switch off;
- staff sign in through DIGIT;
- mobile numbers `+254` `^[17][0-9]{8}$` and 5-digit postal codes;
- boundary levels Subcounty → Ward;
- default locale `en`.

---
## 3. Bonga vs bgrm: live configuration compared

Read from both counties on 13 Oct 2026 (read-only searches).

### 3.1 Summary

| | **Bonga Nai** (`nb`) | **Bomet Feedback Hub** (`bo`) |
|---|---|---|
| Coverage | 6 sub-counties, 17 wards: Makadara, Kibra, Kasarani, Embakasi North, Kamukunji, Lang'ata | 5 sub-counties, 25 wards: Sotik, Chepalungu, Bomet East, Bomet Central, Konoin |
| Landing page | Bonga Nai design (`nairobi-prod`) | Bomet page (`nairobi-prod-bgrm-changes`) |
| Complaint service | `nairobi-prod` | `feat/bomet-uat` — identical except the complaint-number option below |
| Complaint numbers | `BNG-2026-125` (no zero padding) | `BFH-2026-000020` (6-digit zero padding; Bomet's requirement asks for 7 digits, issue #45) |
| Where a new complaint goes | The GRO's queue; the GRO assigns a last-mile officer | **Straight to a last-mile officer.** Complaints filed by residents are assigned automatically (best effort) to an officer of the category's department, matched on the complaint's location: ward, then sub-county, county, department-wide. If nobody matches, the complaint stays unassigned. |
| Escalation | 2 levels: Chief Officer → CECM | 3 levels per department: Director → Chief Officer → CECM (Water starts at its Chief Officer) |
| Officer can hand back | Reassign within the department; send back to the GRO | — |
| Withdraw | Before assignment, within 1 day of filing | While with the officer, within 3 days of filing |
| Reopen | Within 3 days; returns to the GRO queue | Within 3 days; returns to a last-mile officer |
| Categories | 21 types, 39 sub-types; deadlines 4–72 hours; no department mapping | 48 types, 94 sub-types; deadlines 1–30 days; Health 46, Water & Sewage 36, Administration 12 |
| Escalation timers per category | — | 91 category overrides (`RAINMAKER-PGR.EscalationConfig`) |
| Inbox visibility | by role | scoped to the officer's jurisdiction, server-side (`RAINMAKER-PGR.InboxVisibilityConfig`) |
| Officer roles | GRO, PGR_LME, DIRECTOR, CHIEF_OFFICER, CECM, CSR … | GRO, PGR_LME, ADMIN_/HEALTH_/WATER_ DIRECTOR · CHIEF_OFFICER · CECM, OMBUDSMAN_OFFICER, CSR … |
| Departments · designations | 16 · 125 | 3 in use (+ 6 sample rows) · 8 |
| Branding | Nairobi emblem, green theme, "Bonga Nai" | Bomet crest, blue theme; tab title "Bomet Feedback" / "Maoni ya Bomet" |
| Languages | English, Kiswahili | English, Kiswahili |
| Behaviour analytics | not configured | Matomo |
| Notification templates | 28, all English (SMS, e-mail, WhatsApp), including SMS escalation notices to the resident | 45 records: 27 English and 18 Hindi (`hi_IN`) leftovers; no escalation template |

### 3.2 Workflow `PGR` (egov-workflow-v2 BusinessService `PGR`, SLA 432000000 ms = 5 days)

| | Bonga (modified 2026-10-12 12:48 UTC) | bgrm (modified 2026-10-09 13:51 UTC) |
|---|---|---|
| APPLY → | PENDINGFORASSIGNMENT (GRO assigns) | **PENDINGATLME** (auto-assigned at create) |
| PENDINGFORASSIGNMENT | ASSIGN, REJECT (GRO); WITHDRAW (CITIZEN, CSR) | ASSIGN, REJECT (GRO, PGR_VIEWER) — not reachable |
| PENDINGATLME | RESOLVE, REJECT, REASSIGN (self-loop), **REASSIGNTOGRO** (PGR_LME); ESCALATE (PGR_LME, SYSTEM) | RESOLVE, REJECT (PGR_LME); **WITHDRAW** (CITIZEN, CSR); ESCALATE (PGR_LME, SYSTEM) |
| ESCALATEDLEVEL1 | RESOLVE/REJECT (CHIEF_OFFICER, PGR_LME); ESCALATE (CHIEF_OFFICER, SYSTEM) | RESOLVE/REJECT/ESCALATE (ADMIN_DIRECTOR, HEALTH_DIRECTOR, WATER_CHIEF_OFFICER, PGR_LME; + SYSTEM) |
| ESCALATEDLEVEL2 | RESOLVE/REJECT (CECM, PGR_LME) — top level | RESOLVE/REJECT/ESCALATE (ADMIN_CHIEF_OFFICER, HEALTH_CHIEF_OFFICER, WATER_CECM, PGR_LME; + SYSTEM) |
| ESCALATEDLEVEL3 | — | RESOLVE/REJECT (ADMIN_CECM, HEALTH_CECM, PGR_LME); ESCALATE self-loop (SYSTEM) |
| REOPEN → | PENDINGFORASSIGNMENT (CITIZEN, CSR, PGR_VIEWER) | PENDINGATLME (CITIZEN, CSR, PGR_VIEWER) |
| RATE | from RESOLVED / REJECTED (CITIZEN, CSR) | same |

### 3.3 MDMS (`RAINMAKER-PGR.UIConstants` and others)

| | Bonga | bgrm |
|---|---|---|
| REOPENSLA | 259200000 ms = 3 days (from last update) | 3 days |
| WITHDRAWSLA | 86400000 ms = **1 day** (from creation) | 259200000 ms = 3 days |
| Complaint number (`common-masters.IdFormat`) | `BNG-[yyyy]-[SEQ_EG_CMSNAIROBI]` | `BFH-[yyyy]-[SEQ_EG_PGRBOMET]` |
| Categories (`ComplaintHierarchy`, 2 levels) | 21 types, 39 sub-types, SLA 4–72 h, department `NA` on every sub-type | 48 types, 94 sub-types, SLA 24–720 h; HEALTH 46, WATER&SEWAGE 36, ADMINISTRATION 12 |
| Per-category escalation (`EscalationConfig`) | — (not present) | maxDepth 3; default 60 h / 18 h / 18 h; 91 overrides — **11 at 2 minutes per level** (test values) |
| `InboxVisibilityConfig` | — | enabled, jurisdiction-scoped, reportee depth 3, server-side |
| `AnalyticsProvider` | — | Matomo `matomo-state`, site 1 (`/matomo/matomo.js` → 200); endpointUrl has a leading TAB |
| Departments | 16 Nairobi departments | 9 (Administration, Health, Water & Sewage + 6 sample: CENTER, DEPT_1/3/5/36/37) |
| Designations | 125 | 8 (incl. sample DESIG_1002/1003) |
| Roles | 28 (CHIEF_OFFICER, CECM, DIRECTOR) | 35 (ADMIN_/HEALTH_/WATER_ DIRECTOR, CHIEF_OFFICER, CECM; OMBUDSMAN_OFFICER) |
| CONFIDENTIAL_COMPLAINT_VIEWER | **absent** | **absent** |
| Role-actions / actions-test | 1108 / 414 | 1473 / 395 |
| Notification templates | 28, all en_IN (SMS 11, EMAIL 9, WHATSAPP 8): APPLY ASSIGN ESCALATE RATE REASSIGN REJECT REOPEN RESOLVE; ESCALATE = SMS to the citizen | 45: 27 en_IN (SMS 10, EMAIL 9, WHATSAPP 8) + 18 hi_IN leftovers; no ESCALATE |
| WhatsApp provider templates | twilio × 7 | twilio × 14 |
| StateInfo | name "Demo"; Nairobi emblem; languages en_IN, sw_KE | name "Demo"; Bomet crest; en_IN, sw_KE |
| Theme primary | #003D1E (green) | #1B85D2 (blue) |
| tenant.tenants contact | `0000000000`, nb@example.com | `0000000000`, bo@example.com |
| Boundaries | Nairobi-Hierarchy: County → 6 sub-counties (Makadara 4, Kibra 5, Kasarani 1, Embakasi North 1, Kamukunji 1, Lang'ata 5 wards) = 17 wards | BOMET-Hierarchy: 5 sub-counties (Sotik, Chepalungu, Bomet East, Bomet Central, Konoin) × 5 = 25 wards |

### 3.4 Access control and assets

| | Bonga | bgrm |
|---|---|---|
| Action 2635 `/pgr-services/v2/request/_chronology` | granted to 12 roles (CITIZEN, CSR, GRO, PGR_LME, PGR_VIEWER, DIRECTOR, CHIEF_OFFICER, CECM, EMPLOYEE, …) | granted to 21 roles (incl. all department tiers, OMBUDSMAN_OFFICER, SUPERVISOR) |
| Actions 2650/2651 (create/update `AnalyticsProvider`) | absent | present (MDMS_ADMIN, SUPERUSER) |
| Sidebar icons, actions 2553 Search / 2554 Create Complaint (#90) | still `PGRIcon` (data fix not applied) | still `PGRIcon` |
| `StateInfo.bannerUrl` | `/digit-ui/nairobi-login-bg.jpg` → 200 image | `/digit-ui/bomet-logo-1.png` → **returns the app page (image missing)** |
| `StateInfo.logoUrl` | `/digit-ui/nairobi-emblem.png` → 200 | `/static-assets/bomet-logo-round.png` → 200 |
| Admin search API `/pgr-services/v2/request/_admin/_search` | no access-control action | no access-control action |

#### 3.4.1 Search policy on action 2008 (`/pgr-services/v2/request/_search`, `resource.complaint`)

Scope axes: department, jurisdiction. Default for roles not listed: department ALL, jurisdiction OWN (both counties).

| Role | Bonga (department / jurisdiction) | bgrm (department / jurisdiction) |
|---|---|---|
| PGR_LME | OWN / OWN | OWN / OWN |
| DIRECTOR, CHIEF_OFFICER, CECM | OWN / OWN | — |
| ADMIN_ / HEALTH_ / WATER_ DIRECTOR, CHIEF_OFFICER, CECM | — | OWN / OWN |
| GRO | ALL / ALL | ALL / OWN |
| CSR | ALL / ALL | ALL / ALL |
| OMBUDSMAN_OFFICER | — | ALL / ALL |
| SUPERVISOR | OWN / ALL | OWN / ALL |
| SUPERUSER | ALL / ALL | (default) |

Field redaction (`onDeny: REDACT`) of `citizen.name`, `citizen.mobileNumber`, `citizen.userName`:
- Bonga: shown to tenant-wide users, the complainant, and staff whose departments and jurisdictions include the complaint's (or who have none recorded).
- bgrm: shown only to tenant-wide users and the complainant. Tenant-wide means the user's most permissive role is ALL on both axes (`PolicyInputBuilder`), which on bgrm is CSR and OMBUDSMAN_OFFICER. Last-mile officers, department tiers and GROs see the fields redacted.

### 3.5 Localization

| | Bonga | bgrm |
|---|---|---|
| Locales | en_IN, sw_KE | en_IN, sw_KE |
| App title (`CORE_APP_TITLE`) | Bonga Nai | Bomet Feedback / Maoni ya Bomet |
| `PGR_LANDING_*` labels | 0 (landing uses built-in text) | 172 en_IN, 171 sw_KE |
| Withdraw / reassign-to-GRO labels | present (en + sw) | present (en + sw) |
| Designation / department labels (en_IN) | 334 / 137 | 208 / 72 |
| `CS_GEOLOCATION_*` labels (#54/#55) | none | none |
| Citizen logout question (`CORE_LOGOUT_WEB_CONFIRMATION_MESSAGE`) | "Are you sure you want to" (incomplete; #72 open) | same |

---
## 4. Kenya-layer change inventory

Everything in `kenya-layer-start..nairobi-prod`: every PR, roll-up and direct commit, with the live configuration it depends on. **County:** *Both* = shared code that affects both counties; *Bonga* or *Bomet* = only that county sees an effect, because of its workflow, data or branding; *Both (code)* = shared code whose effect differs by tenant. Roll-up #40 carried 84 commits into `master`, including the product-sync squash `2176984d7` and `626864567`; #11–#19, #21, #24–#28 and #41–#46 are issues, not PRs.

### 4.1 Bomet line, reached master via roll-up #40 (2026-09-21)

| Ref | Date | Area | County | What changes | Live config it depends on |
|---|---|---|---|---|---|
| `2b62f7007`, `82b0ad29b` | 2026-08-14 | docs | — | Sets CODEOWNERS so protected branches need maintainer review. | none |
| #1 (`d92def1d0`, base develop) | 2026-08-19 | public landing | Bomet (originally) | Adds the public landing page at `/digit-ui/landing`: config-driven sections, privacy page, Bomet copy and logo, theme bridge. On nairobi-prod it was later re-branded for Nairobi (§4.3). Bomet's version comes back only on `nairobi-prod-bgrm-changes` (`bae16acca`). | Optional MDMS `RAINMAKER-PGR.LandingSection`/`LandingPageConfig` rows and `PGR_LANDING_*` labels override the built-in copy. #154 says no such rows existed on nb/bo on 12 Oct. |
| #3 (`35504b797`) | 2026-08-31 | deploy/ops (sync) | — | Merges CMS-MOZAMBIQUE master into `syncwithmoz` (636 commits, all before `kenya-layer-start`). The conflict resolution kept the Bomet landing page. No Kenya feature of its own. | none |
| #4 (`79bf0a3b8`) | 2026-09-02 | citizen UI + routing | Both (code) | **Citizen complaints are assigned automatically at submit** to an officer in the complaint type's department, narrowest area first: ward → sub-county → county → department only. Best effort; it never blocks a submit. Citizen reopen goes back to the previous handler. The map follows the pin and uses a vector street map, with a raster fallback where WebGL is missing (port of CMS-MOZAMBIQUE#50). | `RAINMAKER-PGR.ComplaintHierarchy` department on each leaf type; HRMS department and jurisdiction assignments; workflow roles at the APPLY target state; optional `RAINMAKER-PGR.MapConfig`; browsers must reach `tiles.openfreemap.org`. On **Bonga** every sub-type's department is `NA` (live, 13 Oct), so no officer matches and complaints wait in the GRO queue. |
| #5 (`101262ebf`) | 2026-09-02 | citizen UI + employee UI | Both | Error, maintenance and not-found screens get their own "Go home" button label, a working illustration (the S3 image returned 403) and a layout that fits inside the app shell. Port of CMS-MOZAMBIQUE#53/#54. | Labels `CORE_ERROR_GO_HOME`, `MODULE_NOT_FOUND`, `CORE_UNDER_MAINTENANCE`. |
| #6 (`f38d29e54`) | 2026-09-02 | citizen UI | Both | Fixes a crash on the citizen reopen page (a hook was not registered). | none |
| `82ba44d57` (direct, syncwithmoz) | 2026-09-02 | novu-bridge | Both, wherever novu-bridge runs | Adds the **Bongatech** SMS gateway alongside Ozeki, either through Novu or by direct HTTP. | `NOVU_BRIDGE_SMS_PROVIDER`/`NOVU_BRIDGE_OTP_SMS_PROVIDER`/`NOVU_BRIDGE_DIRECT_SMS_PROVIDER=bongatech`, `NOVU_BRIDGE_SMS_SENDER_ID`, `NOVU_BRIDGE_DIRECT_SMS_BASE_URL`/`_TOKEN`, `NOVU_BRIDGE_DIRECT_CHANNELS`. |
| #8 (`805e45c9f`) | 2026-09-03 | citizen UI + routing | Both (code) | Auto-assignment picks the **last-mile officer (PGR_LME)**, not senior viewers, whenever the workflow has a PGR_LME role. | HRMS PGR_LME holders per department. |
| #7 (`7f013197a`, base develop) | 2026-09-04 | public landing | Bomet | Restyles the Bomet landing: white hero and footer, blue palette, county logo lockup; drops WhatsApp and the privacy link. Superseded on nairobi-prod by the Nairobi re-brand (`32617c679`). | none |
| #9 (`abf6406b6`) | 2026-09-04 | deploy/ops (sync) | — | Merges `syncwithmoz` into `develop` (carries #3–#8). | none |
| #10 (`d10f9a405`, base master) | 2026-09-10 | docs | — | Issue templates and CONTRIBUTING point to CMS-KENYA and project board #17; the Source field becomes PROD/UAT. | none |
| #20 (`e22f3a552`) | 2026-09-15 | employee UI | Both (Bomet roles) | Bomet department-tier roles (HEALTH/WATER/ADMIN × DIRECTOR/CHIEF_OFFICER/CECM) see the Complaints card. The default inbox status list now comes from the live workflow, so escalated complaints appear without ticking a filter. | Role codes in HRMS; workflow BusinessService. |
| #22 (`28eefc9ae`) | 2026-09-15 | citizen UI + employee UI + MDMS/config | Both | Display masking of names and phone numbers moves behind a deploy switch, **off for Kenya**, so timelines show identities in clear. Server-side masking is separate. | globalConfigs `PGR_PII_MASKING` (Ansible `pgr_pii_masking`, default `false`). |
| #23 (`584c07e6c`) | 2026-09-15 | employee UI + localization | Both (Bomet states) | Labels for the escalation states ESCALATEDLEVEL1–3; the "assigned to me / all" choice returns to the legacy inbox filter. | Labels `CS_COMMON_PGR_STATE_ESCALATEDLEVEL1..3`, `CS_COMMON_ESCALATEDLEVEL1..3` (#23 says these were upserted on bgrm). |
| #29 (`3861b8498`) | 2026-09-16 | citizen UI | Both | Citizen complaint details show a named address and County / Sub-County / Ward rows, and no empty "Complaint Location" card for complaints without a pin. Its "no default map pin" part was reversed two days later by `16c6e311f`. | Boundary-name labels (module `rainmaker-boundary-<hierarchy>`); globalConfigs `HIERARCHY_TYPE`. |
| #34 (`eff52826f`) | 2026-09-16 | citizen UI + MDMS/config | Both (code) | Matomo behaviour analytics: complaint funnel events, each wizard step counted as a page view, outcome pages, landing and tutorial pages tracked. Cherry-pick of CMS-MOZAMBIQUE #145. | `common-masters.AnalyticsProvider` MATOMO row; Matomo stack (`docker-compose.matomo.yml`); nginx `/matomo/`. Live 13 Oct: bgrm has the provider row and serves `/matomo/matomo.js`; Bonga has neither. |
| `626864567` + merge `4ad2fc176` (direct, kenya-prod) | 2026-09-16 / 2026-09-18 | citizen UI + employee UI + dashboard | Both | Front-end part of **product sync 2026-09-16** (upstream `7ee88f83`):<br>• "working context" chip in the employee top bar;<br>• inbox visibility tabs;<br>• dashboard refinements (language menu, footer, "updated … ago" stamps, batched analytics queries);<br>• jsPDF security bump.<br>`4ad2fc176` restored six Kenya PGR files that `2176984d7` had overwritten. | `RAINMAKER-PGR.InboxVisibilityConfig` (tabs stay off without it). |
| `2176984d7` (direct, kenya-prod) | 2026-09-17 | backend pgr-services + deploy/ops + MDMS/config | Both | **Product v2.12 backend, infrastructure and configurator sync, squashed** (905 files; the title understates it):<br>• search scoping by policy (department or jurisdiction per role, read from the access-control action record);<br>• capability checks for analytics;<br>• employee working-context API;<br>• Helm and CI validation workflows;<br>• updates to the `ansible/nairobi-mdms` packs;<br>• reopen fallback window cut from 10 days to 72 h (the enforced value is `UIConstants.REOPENSLA`). | `egov.accesscontrol.host`; `PGR_EMPLOYEE_CONTEXT_*_ROLE_CODES`; optional policy on the `/pgr-services/v2/request/_search` record in `ACCESSCONTROL-ACTIONS-TEST`; `PGR_COMPLAIN_IDLE_TIME`. |
| `7eaefc863` | 2026-09-17 | deploy/ops | — | Configurator build fixed after the sync (a duplicate `visibleNavGroups`). | none |
| `d72391231` (direct) | 2026-09-18 | backend pgr-services | Both | Employee department and jurisdiction scope wired into search. The department-name cache keeps serving its last good value during a brief MDMS outage, so an officer's results are not narrowed. | `jurisdictionSubtreeCacheTtlMs` (default 5 min). |
| `5d9420775` | 2026-09-18 | localization | Both | Seeds two labels that showed as raw keys on the employee home. | Upsert `DASHBOARD_CARD_HEADER`, `ULBGRADE_STATE`. |
| `9d97efb41`, `b9f1bfc1e`, `9fe44bc3d`, `b953b2145`, `03f4e4a02`, `f56b19ed4`, `9c34a4449` | 2026-09-18 to 2026-09-21 | employee UI | Both | **New employee header** with a greeting, live clock, hover language menu and a profile card (department, role, location, last login, Edit profile, Logout). The city picker appears only for staff with roles in more than one city. The logo fits the bar. The Ombudsman role gets the Complaints card. | Labels `CORE_TOPBAR_*`. |
| `f19dbd4a0` | 2026-09-18 | MDMS/config | New environments | Seeds an enabled Matomo destination row for fresh Kenya environments. | Matomo siteId 1, goals 1/2, dimensions 1–4. |
| `6bef31ae4` | 2026-09-18 | MDMS/config | Both | `PGR_PII_MASKING=false` declared in the repo's globalConfigs (local and dev builds). | none live (the Ansible template already defaults to false). |
| `adef886be` (cherry-pick) | 2026-09-18 (authored 09-07) | citizen UI + employee UI | Both | A failed request no longer throws the user onto the maintenance page. An expired session goes to the right login page and keeps drafts, language and caches. The citizen wizard checks the session before submitting. | none |
| `30bb121e9`, `763726dcd`, `e4c056c02`, `4dc8c4bea`, `d27899dd8`, `5d732f538`, `117a1ed1f` | 2026-09-18 (authored 09-07/08) | citizen UI + employee UI | Both | If another account signs in in another tab of the same browser, a notice explains what happened (it only informs). One tab's logout no longer wipes another tab's session. Ported from CMS-MOZAMBIQUE (CCSD-2231). | Labels `CORE_SESSION_COLLISION_*` (English fallbacks exist). |
| `16c6e311f` | 2026-09-18 | citizen UI | Both | **The citizen map opens at the tenant centre at street zoom with a pin and coordinates already filled in** (Mozambique behaviour, requested explicitly). A citizen who never touches the map submits the centre point. | `RAINMAKER-PGR.MapConfig` `center`/`defaultZoom`, or globalConfigs `MAP_CENTER` (Ansible `map_center`, required). |
| `fdb91d0ce` | 2026-09-18 | citizen UI + employee UI | Both (Bomet image) | Bomet highlands photo behind both login screens. It is set with `body::before` in `overrides.css` and **is not tenant-scoped**. Tenants with `StateInfo.bannerUrl` show their own photo on top (23 Sep rules in `src/index.css`). | `StateInfo.bannerUrl` on non-Bomet tenants. |
| `4c2bb1f75` | 2026-09-21 | MDMS/config | Bomet | Bundles the Bomet crest at `/digit-ui/brand/bomet-logo-round.png`. | Live 13 Oct: bgrm's `StateInfo.logoUrl` (`/static-assets/bomet-logo-round.png`) returns the crest. |
| `5f947bdeb`, `d82ce0435` | 2026-09-21 | citizen UI + employee UI | Both | Escalated complaints show "Escalated (Level n)" instead of "Open" or a raw key in My Complaints, the inbox, admin search and citizen details. | Labels `CS_COMMON_PGR_STATE_<STATUS>`. |
| `a22a4fe90` | 2026-09-21 | citizen UI | Both | The citizen reopen window reads `UIConstants.REOPENSLA` (it used a master that never existed, with a 1-hour fallback). Superseded by #145. | `UIConstants.REOPENSLA` |
| `fa8b6588a`, `857f76e29`, `98c335803` | 2026-09-21 (authored 09-10/11) | employee UI | Both | Employee "Forgot password" asks for the mobile number with the country code, sends the OTP to it, always resets through the no-login endpoint, and no longer crashes. | `common-masters.MobileNumberValidation` or globalConfigs `CORE_MOBILE_CONFIGS`; labels `CORE_FORGOT_PASSWORD_MOBILE_DESC`, `CORE_FORGOT_MOBILE_PLACEHOLDER`. |
| `8b62a3119`, `ec5a09b0c`, `33a15c186`, `0a247d679`, `b1e2252d1` | 2026-09-21 | deploy/ops | Both (ops) | Fixes that let `ccrs-migrate --matomo` actually install the Matomo stack. | Matomo compose environment variables. |
| `cfe9947f9` | 2026-09-21 | roles/access | New environments | Adds access-control actions 2650 and 2651 (create and update `AnalyticsProvider`) and grants them to SUPERUSER and MDMS_ADMIN, so analytics can be configured. | Live tenants need the actions and role grants added. |
| `3ae0b4e07` | 2026-09-21 | deploy/ops | Bomet UAT | `enable-uat-extras.sh`: one command to enable Matomo and the county logo on the Bomet UAT box. | Script environment variables. |
| `43359302a` | 2026-09-21 | deploy/ops | — | Local stack only: globalConfigs set to tenant `bo` with `BOMET-Hierarchy`. | none (local) |
| #39 (`2c0605e45`, base kenya-prod) | 2026-09-21 | novu-bridge | Both | All SMS goes through Novu (the SmsCountry client added by `2176984d7` is removed). A new consumer sends the user-OTP service's OTP messages through the same pipeline. | user-otp `SMS_TOPIC` → `egov.core.notification.sms.otp`; `NOVU_BRIDGE_USER_OTP_DEFAULT_TENANT_ID` **defaults to `bo`**, so Bonga needs `nb` (unverified). |
| #40 (`84024ea21`) | 2026-09-21 | — | — | Roll-up kenya-prod → master: the rows above. | — |

### 4.2 Roll-up #48 (2026-09-23)

| Ref | Date | Area | County | What changes | Live config |
|---|---|---|---|---|---|
| `98c335803` | 2026-09-21 | employee UI | Both | Forgot-password crash fix (counted with the forgot-password row above). | none |
| `40bdfd420` | 2026-09-22 | employee UI | Both | The inbox "Complaint Subtype" filter lists every sub-type; it was empty. | Labels `COMPLAINT_HIERARCHY.<code>`. |
| `31edfa212` (issue #46) | 2026-09-23 | employee UI | Both | Resolved and rejected complaints appear in the default inbox and search list, so the call centre can reopen them without changing filters. **Nairobi issue #144 (OPEN) asks for the opposite.** | Workflow: RESOLVED and REJECTED must carry actions (REOPEN/RATE). |
| `9305e6239` (issue #27) | 2026-09-23 | citizen UI + employee UI | Both | The timeline names who performed an escalation and shows "Escalated To: <officer>" on its own line. The system actor of automatic escalations is hidden. | Label `CS_MYCOMPLAINTS_ESCALATED_TO`. |
| #48 (`43a974608`) | 2026-09-23 | — | — | Roll-up kenya-prod → master: the rows above. | — |

### 4.3 Nairobi instance: direct commits on nairobi-prod, 2026-09-23

Cherry-picked from the `nairobi` branch (#47, OPEN). Reviewed in PR #49 (OPEN, master ← nairobi-prod).

| Ref | Date | Area | County | What changes | Live config |
|---|---|---|---|---|---|
| `32617c679`, `a12afdb44`, `6235822a1`, `73a535e9c`, `5fef66379`, `7fe1b8b32`, `3cfdc5312`, `5fb9f76bf` | 2026-09-23 | public landing + MDMS/config | Bonga (bundle-wide) | Landing page re-branded and redesigned for Nairobi City County: BRD copy, green and gold palette, photography, motion, six sub-counties and 17 wards. Ships Nairobi `ThemeConfig` and `StateInfo` seeds and `nairobi.yml.example`. **Replaces the Bomet landing in this bundle.** | Live 13 Oct: nb carries the Nairobi `ThemeConfig` (#003D1E) and `StateInfo` (emblem, `nairobi-login-bg.jpg`). |
| `23290a2ca` | 2026-09-23 | citizen UI + MDMS/config | Bonga | The citizen home's Complaints card gets its own banner strip. | `tenant.citymodule` PGR `bannerImage` (nb). |
| `36adae9a4` | 2026-09-23 | public landing | Both | Text on the landing's dark areas stays white even when the tenant's primary button is a light colour. | none |
| `2eece91ef`, `decda4df8`, `a56d006d7`, `cecdf2919`, `6c51e36ab` | 2026-09-23 | citizen UI | Both | Citizen sign-in: the top bar takes the theme colour, and the backdrop fills the screen with no white strips. | ThemeConfig header colour |
| `84c45ada2` | 2026-09-23 | novu-bridge | Bonga (on nairobi-prod only; not on kenya-prod or bomet-uat) | Adds the **Source Code** SMS gateway as a third direct provider. | `NOVU_BRIDGE_DIRECT_SMS_PROVIDER=sourcecode`, `NOVU_BRIDGE_DIRECT_SMS_SERVICE_ID`, base URL, token (api_key), `NOVU_BRIDGE_DIRECT_CHANNELS=SMS`. Which provider is live: unverified. |

### 4.4 nairobi-prod PRs and direct commits, 2026-09-23 to 2026-10-13

| Ref | Date | Area | County | What changes | Live config |
|---|---|---|---|---|---|
| #56 | 2026-09-23 | employee UI | Both (URL only) | Role-tiered employee home at `/digit-ui/employee/home-v2` (oversight, casework, intake, read-only). **Not linked from any menu**: the only reference is the route in core `App.js`, and `/employee` is unchanged. | `PGR_HOME_*` labels are unseeded (English fallbacks); `InboxVisibilityConfig`; dashboard access for the oversight charts. |
| #62 | 2026-09-24 | employee UI + citizen UI | Both | The Reassign picker lists every department's officers, grouped. Citizen Rate and Re-open buttons are readable. The reopen heading falls back to English. | 10 labels (e.g. `CS_REOPEN_DETAILS_LABEL`; #62 says they were applied on cms-pilot). pgr-services refuses an officer from another department (`INVALID_ASSIGNMENT`). Neither county's workflow lets a non-LME role reassign, so the all-departments list does not appear there. |
| #63 | 2026-09-24 | employee UI | Bonga (roles) | home-v2 recognises the bare DIRECTOR, CHIEF_OFFICER and CECM roles, and shows a notice instead of a blank page. The button-colour commit described in its body was not merged here; it landed as #64. | HRMS roles |
| #65 | 2026-09-24 | citizen UI | Both | A citizen reopen is assigned to an officer who can act on the reopened state. Errors show inline, and double submits are blocked. | Label `CS_REOPEN_SUBMIT_ERROR` |
| #71 | 2026-09-24 | public landing | Bonga | Portal renamed "Nai Pepea" → "Bonga Nai" on the landing page and in the tab title. | `PGR_LANDING_*` labels would override it (none on nb). |
| #64 | 2026-09-24 | citizen UI + employee UI | Both | Primary buttons are readable at rest. The citizen logout confirm label is white on green. **The "complete sentence" commit was not merged** (PR #72 is OPEN). | ThemeConfig `--color-button-primary-*` |
| #79 | 2026-09-25 | employee UI | Both | Assign and Reassign use one searchable dropdown that matches names or departments. | Label `CS_COMMON_SEARCH_EMPLOYEE` |
| #80 | 2026-09-25 | employee UI | Both | home-v2 sends the visibility scope, so roles that are not assignees see real counts. | `InboxVisibilityConfig` with `serverSide`; role-actions 4559/4560 lack PGR_VIEWER (per #80). |
| #83 | 2026-09-25 | employee UI | Bonga (roles) | The Complaints card (Search Complaint only) is shown to bare CHIEF_OFFICER, CECM and DIRECTOR users. | HRMS roles; users log in again. |
| #84 | 2026-09-25 | employee UI | Both | The Assign dropdown lists only last-mile officers (PGR_LME), not escalation tiers. | Workflow actors; HRMS PGR_LME. |
| #85 | 2026-09-25 | citizen UI | Both | A citizen reopen returns the complaint to the officer who last held it at Pending-at-LME, if that officer can still act there. | none |
| #86 | 2026-09-25 | citizen UI + employee UI | Both | Clearing the map search keeps the current view instead of zooming out to the county. | none |
| #88 | 2026-09-25 | employee UI | Both | The Assign/Reassign picker hides deactivated employees. | HRMS `isActive` |
| #93 | 2026-09-28 | employee UI + workflow | Bonga | (a) "Take Action only for the assignee": **reverted by #134**. (b) Kept: a last-mile officer who reassigns picks another PGR_LME from **their own department** (any ward), not themselves; the pick is mandatory. | Workflow REASSIGN as a self-loop PENDINGATLME → PENDINGATLME for PGR_LME (live on nb, 13 Oct). |
| #90 | 2026-09-28 | MDMS/config | Both (data) | Distinct sidebar icons for Create and Search Complaint. **Changes seed files only.** | Each live tenant's `ACCESSCONTROL-ACTIONS-TEST` records need `leftIcon` set to `Search` and `Add` by an MDMS_ADMIN. **Not applied on either county** (both still `PGRIcon`, 13 Oct). |
| #95 | 2026-09-29 | citizen UI + employee UI | Both | The optional free-text address is saved in `address.street` on both create forms. **Employee create no longer fails with `INVALID_CASE_RELATED_TO`** (port of #58). Its "any GRO can pick up the queue" part was removed by #134. | none |
| #96 | 2026-09-29 | citizen UI + employee UI | Both | The citizen "Your details" card is hidden where its values would be thrown away (port of #53 / issue #51). A Take Action draft belongs to one complaint and one action (port of #92 / issue #75). | none |
| #103 (`df9aa019d`) | 2026-10-05 | backend pgr-services | Both (bgrm via #133) | **Confidential complaints are masked on the server.** Name, phone, e-mail and address are hidden from everyone who is neither the complainant nor a `CONFIDENTIAL_COMPLAINT_VIEWER`. Searches by person exclude confidential complaints, and notifications and events carry no complainant identity. New **filtered timeline API** `/v2/request/_chronology` (ported from CMS-MOZAMBIQUE): citizens see no officer names, contacts or internal comments, while the closing comment stays. | Deploy pgr-services first; **action 2635 plus role grants** (without them the timeline is empty, and there is no fallback on nairobi-prod); role `CONFIDENTIAL_COMPLAINT_VIEWER` (missing on bo per #133). |
| #103 (`ee3f83a44`) | 2026-10-05 | citizen UI + employee UI | Both | **Mandatory Terms & Conditions consent** on citizen create (saved in `additionalDetail.consents`); "Keep details confidential" always offered; both timelines read the chronology API; **complaint receipt**: offline PDF with Download, Print and Share; complaint type and sub-type pickers sorted A–Z with "Others" last; **manual ESCALATE**: the assignee pick is mandatory and the list offers the tier above. | Labels `PGR_CONSENT_*`, `PGR_EXT_IS_CONFIDENTIAL_HINT`, `PGR_RECEIPT_*`. Workflow ESCALATE grants, live 13 Oct — nb: PENDINGATLME (PGR_LME, SYSTEM), ESCALATEDLEVEL1 (CHIEF_OFFICER, SYSTEM); bo: PENDINGATLME (PGR_LME, SYSTEM), ESCALATEDLEVEL1 (ADMIN_DIRECTOR, HEALTH_DIRECTOR, WATER_CHIEF_OFFICER, PGR_LME, SYSTEM), ESCALATEDLEVEL2 (ADMIN_CHIEF_OFFICER, HEALTH_CHIEF_OFFICER, WATER_CECM, PGR_LME, SYSTEM). `tenant.tenants.contactNumber` is printed on the receipt. |
| #103 (`24a6358a1`) | 2026-10-05 | public landing | Bonga | Emergency helplines section, motion and accessibility pass (contrast, 44 px targets). **The emergency numbers were removed again by #155.** | `LandingSection` helplines row only if the landing is MDMS-driven. |
| #103 (`c16c75208`) | 2026-10-05 | citizen UI + employee UI + deploy/ops | Both | **Lazy loading**: heavy screens, maps and PDF libraries load on demand; the startup download drops from 9.5 MB to 4.55 MB. | Deploy the whole `build/` folder, including `build/chunks/`. |
| #103 (`64e5dee4e`) | 2026-10-05 | localization + roles/access | Both (seeds) | Seeds for the labels above, a helplines landing row, and access-control action 2635 with role grants. | These seeds reach only new tenants; live tenants need upserts and grant scripts. |
| #104 | 2026-10-05 | citizen UI | Both | The optional address field moves to step 1 of the citizen wizard. | none |
| `da6df4be3` (direct) | 2026-10-05 | backend pgr-services | Bonga | **Complaint numbers without zero padding** (BNG-2026-125); padded numbers are still found by search. Opt-in. **Not in `feat/bomet-uat`**, so Bomet keeps padded numbers. | `egov.idgen.pgr.serviceRequestId.strip-sequence-padding=true` (default `false`; the live value is not in the repo; #128 cites BNG-2026-161). |
| #117 | 2026-10-05 | citizen UI | Both | Share hands out the receipt PDF. The OTP **resend** wait is 3:00 (also for the employee change-password OTP). **Emoji rating** replaces stars; the stored value is still 1–5. | Labels `CS_RATING_LABEL_1..5` and receipt share labels. |
| #119 (incl. #120) | 2026-10-05 | citizen UI + employee UI | Both | Review fixes for #117. Share opens a sheet with Open PDF, Email, WhatsApp, SMS and More apps (#120's Copy link was removed later by #129). | 11 `PGR_RECEIPT_SHARE_*` labels |
| #118 | 2026-10-05 | public landing | Bonga | Hero photo of the County customer-service centre. #154 later replaced the hero design. | none |
| #121 | 2026-10-05 | employee UI | Both | Receipt buttons styled on the employee "complaint submitted" page; Open PDF works reliably. | none |
| #125 | 2026-10-07 | employee UI | Both | "Keep details confidential" on the employee create form. | pgr-services with the #103 backend (both have it); label `PGR_EXT_IS_CONFIDENTIAL_LABEL`. |
| #128 | 2026-10-08 | backend pgr-services | Both (bgrm via #133) | **No staff exemption** from confidential masking, including the clerk who filed the complaint. Only the citizen owner and viewer-role holders see the details. | Rebuilt image; viewer role assignments. |
| #129 | 2026-10-08 | citizen UI + employee UI | Both | Share sends the PDF itself. Copy link and the "track here" text are removed. | Labels `PGR_RECEIPT_SHARE_HINT_PDF`, `PGR_RECEIPT_SHARE_ATTACH`. |
| #130 | 2026-10-08 | dashboard | Both | **Dashboard export menu**: Excel (summary plus a sheet per tile), CSV and PDF report, each with context, KPIs and every chart, table and map as data. | `DASHBOARD_EXPORT_*` labels (English fallbacks). |
| #131 | 2026-10-08 | citizen UI + employee UI | Both | The citizen footer sits flush at the bottom. A bundled DIGIT logo is used when the tenant logo is missing or broken. The complaint page refreshes on return to the tab and after a failed, out-of-date action (port of #60). | none |
| #132 | 2026-10-08 | employee UI | Both | Employees are greeted by designation ("Hello, Director"), and the department in the profile menu is translated. | `COMMON_MASTERS_DESIGNATION_<CODE>` and `COMMON_MASTERS_DEPARTMENT_<CODE>` labels (live en_IN: nb 334/137, bo 208/72); HRMS designation. |
| #134 | 2026-10-09 | employee UI | Both | **Take Action is offered by role again**, not only to the assignee (reverts #93's gate and #95's queue exception). The LME reassign picker stays. | none |
| #136 | 2026-10-09 | backend pgr-services | Both (bgrm via `781906447`) | The server enforces **time windows**: REOPEN within `REOPENSLA` of the last update, WITHDRAW within `WITHDRAWSLA` of filing. Configurable per tenant (`UIConstants.actionWindows`), with defaults in properties. | `UIConstants.REOPENSLA`/`WITHDRAWSLA`/`actionWindows`; `PGR_ACTION_WINDOWS_DEFAULTS`, `PGR_COMPLAIN_IDLE_TIME`, `PGR_COMPLAIN_WITHDRAW_TIME` (fallbacks 72 h); migration `V20260930000000` (both counties carry `WITHDRAWSLA` and `actionWindows`, 13 Oct). |
| #140 | 2026-10-09 | citizen UI + employee UI | Both | Browser tab title and favicon follow the tenant instead of the build. **Its pre-boot follow-up `875cf1871` is not merged.** | `CORE_APP_TITLE` per tenant (live: nb "Bonga Nai", bo "Bomet Feedback" / sw "Maoni ya Bomet"); `StateInfo.logoUrl`. |
| #142 | 2026-10-09 | citizen UI + employee UI | Both | Share is a modal dialog. The PDF is prepared when the dialog opens, so sharing works in Safari on Mac and in desktop Chrome. Each channel is prefilled with a complaint summary (never the complainant's name or phone). | Labels `PGR_RECEIPT_SHARE_CLOSE`/`_PREPARING`; `tenant.tenants.contactNumber` (both tenants print `0000000000`). |
| #145 | 2026-10-09 | citizen UI + employee UI | Both | The Reopen button and menu follow the live window (refreshed every minute) and disappear at the deadline. A reopen link opened after the window shows a notice. | `UIConstants.REOPENSLA` (+ `actionWindows`); labels `CS_CANNOT_REOPEN_COMPLAINT_PAST_DEADLINE` etc. |
| #146 | 2026-10-09 | citizen UI + employee UI | Bomet | **Withdraw** through a confirmation popup (optional reason) for citizens, and a confirmation in employee Take Action (comment required). Offered only within `WITHDRAWSLA` and never after a reopen. Live 13 Oct: Bonga has WITHDRAW before assignment (PENDINGFORASSIGNMENT, 1-day window); Bomet at PENDINGATLME (3-day window). | Workflow WITHDRAW → CANCELLED (CITIZEN, CSR) — live on both; `WITHDRAWSLA` nb 1 day, bo 3 days; 10 labels (present on both); `CS_COMMON_PGR_STATE_CANCELLED` wording. |
| #147 | 2026-10-12 | tests | — | End-to-end regression test: a Take Action draft stays with one complaint and one action. | Playwright environment |
| #148 | 2026-10-12 | deploy/ops + citizen UI + employee UI | Both | **After a deploy, open tabs switch to the new build** at the next "hub" screen. Stale labels and MDMS caches are dropped. Ansible rebuilds the UI when `src/` changes. | Ship `build-info.json` with `index.html`; nginx `Cache-Control: no-cache` (Compose and Ansible have it; Helm does not). |
| #150 | 2026-10-12 | employee UI + workflow | Bonga | **"Reassign to GRO"**: a last-mile officer sends the complaint back to the GRO queue, unassigned, with no picker and an optional comment. | Workflow REASSIGNTOGRO PENDINGATLME → PENDINGFORASSIGNMENT (PGR_LME), live on nb; 4 labels; **no SMS template**. |
| #151 | 2026-10-12 | employee UI | Bonga | After Reassign to GRO, a 5-second "Sent back to the GRO" notice, then the inbox. | Labels `CS_REASSIGNTOGRO_DONE_*` |
| #152 | 2026-10-12 | public landing | Bonga | County help lines and contact e-mail added. | none (set in code) |
| #153 | 2026-10-12 | public landing | Bonga | Only the county's new lines (0725 624 489 24/7, 0730 047 047, 020 724 7047) and one e-mail. #152 flagged that the e-mail is a personal Yahoo address. | none |
| #154 | 2026-10-12 | public landing + MDMS/config (configurator) | Bonga | New top of the page from the county's 12 Oct design: utility strip, crest masthead, hero, photo category cards, slogan band. In-page section links fixed. **On bgrm this page showed Nairobi branding**, hence the bgrm branch. | Optional `LandingSection` `tagline` row. |
| #155 | 2026-10-13 | public landing | Bonga | The help-line section becomes one "Call Customer Service" panel. **Police, Ambulance and Fire numbers are removed.** | none |
| #157 (`0c7b3f640`) | 2026-10-13 | filestore/security + deploy/ops + citizen UI | Both (**off by default**) | Optional **ClamAV virus scan of uploads**: infected files are refused and quarantined, and the upload widget shows a clear message. | Ansible `enable_file_scan: true` (default `false`); clamav (about 1.5 GB RAM); MinIO quarantine; OpenBao passwords; nginx `/filestore/` route; labels `CS_FILE_*`. Enabling is tracked in issue #159 (OPEN). |

---

---
## 5. Changes not in this release

PRs outside `nairobi-prod` that matter to the counties

Port check: `git cherry origin/nairobi-prod <branch>` plus manual diffs. Where an equivalent was found, it is named.

| # | Kind / state | Base | Port in nairobi-prod? | Consequence |
|---|---|---|---|---|
| #50 | PR, merged 2026-09-23 | kenya-prod | **No.** Also in feat/bomet-uat and superset #122, which are not the live UI. | The employee **reopen picker is not limited by jurisdiction**. A reopen without a pick only looks for `CMS_SUPERVISOR` in the history (PGRDetails.js lines 39–43), which Bomet doesn't have, so **the complaint is reopened unassigned**. A PGR_LME can still act on it by role after #134, but it is in nobody's "assigned to me" list. Mainly affects Bomet. |
| #51 | **Issue** (closed 2026-09-23) | — | Fixed by PR #53 (kenya-prod) and ported by #96 (`96a02f880`). | None. Fixed on both. |
| #55 | PR, merged 2026-09-23 (fixes issue #54, still OPEN) | kenya-prod | **No.** `utils/geolocationMessages.js` is absent on nairobi-prod. | On both counties, a citizen who denies location permission (or whose phone has no GPS) can see the raw key `CS_GEOLOCATION_ERROR` or `CS_GEOLOCATION_NOT_SUPPORTED`, unless the five `CS_GEOLOCATION_*` labels are seeded. #55 says none were seeded on bo on 23 Sep. |
| #57 | **Issue** (closed 2026-09-24) | — | Fixed by PR #60 and ported by #131 (`ae5fc2c53`; the only difference is the `useRef` import line). | None. |
| #58 | PR, merged 2026-09-24 | kenya-prod | Yes: #95 (`4e05dfca5`), then #104 moved the field to step 1. | None. |
| #59 | PR, merged 2026-09-24 (issue #44 closed) | kenya-prod | **No.** The `/citizen` route on nairobi-prod renders `CitizenHome` without a login redirect. | On both, an anonymous visit to `/digit-ui/citizen` lands on the module home, not directly on the login page. |
| #60 | PR, merged 2026-09-24 | kenya-prod | Yes: #131. | None. |
| #75 | **Issue** (OPEN) | — | Fix PR #92 is OPEN (kenya-prod). Ported by #96 (`01dfa92bc`, `c8138ede5`); regression test #147. | Fixed on both; the issue is still open (housekeeping). |
| #78 | PR, merged 2026-09-25 (issue #77 still OPEN) | kenya-prod | **No.** It is a follow-up to #50. | Only needed if #50 is ported. On nairobi-prod a no-pick employee reopen succeeds but leaves the complaint unassigned (see #50). |
| #81 | PR, merged 2026-09-25 | kenya-prod | **No.** `createComplaintForm.js` on nairobi-prod has no auto-assignment. | **Bomet: complaints filed by the front desk or call centre are not auto-assigned.** They sit at PENDINGATLME, which has no ASSIGN step, so they are in nobody's "assigned to me" list; any PGR_LME can act on them by role. Bonga: staff-filed complaints go to the GRO queue by design. |
| #82 | PR, merged 2026-09-25 | kenya-prod | **No**, and **not needed while #50 is absent**. On nairobi-prod, REJECT and RESOLVE derive no assignee (the history lookup covers only RATE, REASSIGN and REOPEN). | None today. It must travel with #50 if #50 is ported. |
| #97 | PR, merged 2026-09-29; reverted by #100 | kenya-prod | **Equivalent behaviour in #103.** The citizen timeline hides staff whatever the masking switch says (`TimeLineWrapper.js` lines 31–35), and the chronology API strips staff identity on the server. | Live on both, **provided** action 2635 is granted. Citizen e-mail and WhatsApp templates containing `{emp_name}` need an MDMS edit (#97; unverified). |
| #98 | PR, merged 2026-09-29; reverted by #100; kept in #101 and #122 (both OPEN) | kenya-prod | **No.** nairobi-prod has #103's different manual escalation. | Bomet's agreed design is not live: escalation to the **next level only**, the reporting officer pre-selected, **current assignee only**, and the escalation-level bookkeeping written. On bgrm, Escalate appears only if the bo workflow grants ESCALATE to staff roles; it was SYSTEM-only per #98, and no grant is recorded. If granted, the escalation level may drift (possibly related to issue #141, unverified). |
| #99 | PR, merged 2026-09-29; reverted by #100; kept in #101 and #122 | kenya-prod | **No**, and **not needed**: both live pgr-services images allow these channels (`allowed.source` at nairobi-prod `application.properties` line 194; bomet-uat's pgr-services code is otherwise identical). | Matters only for stacks still running the pinned `egovio/pgr-services:2.12-5137119` image. |
| #100 | PR, merged 2026-09-30 | kenya-prod | n/a (a revert) | Affects kenya-prod only, which neither county deploys today. |
| #102 | **Issue** (OPEN) | — | Implemented by PR #103 (merged into nairobi-prod 2026-10-05). Sub-issues #105–#110 and #112–#114 were closed on 8 Oct. | #111 (landing refresh), #115 (Swahili) and #116 (helplines) are still open. #155 removed the emergency helplines that #116 asked for. |
| #122 | PR, OPEN | master | n/a | The Bomet "superset" is not merged. Superset-only items that are therefore live on neither county:<br>• #81 (employee auto-assign) and #50/#78/#82 (reopen picker);<br>• the #98 escalation and its follow-ups;<br>• #55, #59;<br>• `5d429bd08` (**My Complaints fails with WORKFLOW_NOT_FOUND after 10 complaints**);<br>• `35aa73c28` (title before boot);<br>• `072bb4104` ("Withdrawn" label seed);<br>• the chronology fallback (in `b15d97bf4`).<br>Only its Landing folder (at `3f4965e44`) was copied into bgrm-changes. |
| #133 | PR, merged 2026-10-08 | feat/bomet-uat | It is itself a port **from** nairobi-prod: `5cd998fd0` = `df9aa019d` (backend), `5c02a2b20` = `1a848286c`. | Gives bgrm's backend (`bomet-uat-6eb6b85`) the chronology API and confidential masking. Action 2635 is granted on bo (21 roles, live). `CONFIDENTIAL_COMPLAINT_VIEWER` does not exist on bo **or nb** (live, 13 Oct), so no officer in either county can see a confidential complainant. |
| #156 | PR, OPEN | nairobi-prod | n/a | Would revert #154 and #155 on nairobi-prod; its tree equals nairobi-prod at #153 (`d7016c952`). While it stays open, nairobi-prod (Bonga) shows the 12 Oct design. bgrm-changes already contains the same two reverts (identical trees: `f6ead681a` vs `9fdb81ad8`). |
| #158 | PR, merged 2026-10-13 | nairobi-prod-bgrm-changes | Same commit as #157 (`0c7b3f640`). | ClamAV proxy code is on both UI branches. Off unless `enable_file_scan: true`. |

Other open PRs worth knowing about:

| # | Base | Change | Consequence while open |
|---|---|---|---|
| #72 | nairobi-prod | Completes the citizen logout question | The citizen logout dialog reads "Are you sure you want to" (unless the seeded text is a full sentence; unverified). |
| #89 | kenya-prod | Bomet icon seeds | A data fix is needed on bo either way (#89 confirms both records still had `PGRIcon`). |
| #91 | kenya-prod | Hide extended-attribute detail cards (issue #73) | The "Complainant Details" card can show "NA" to directors on Bomet. |
| #87 | nairobi-prod | Citizen-menu theme colours | none listed |
| #101 | kenya-prod | feat/bomet-uat | Draft; the branch is bgrm's backend source. |
| #126 | nairobi-prod | `loc` migration phase | Catches up missing labels; #126 counted 70+ missing keys on nb on 7 Oct. |
| #49 | master | master ← nairobi-prod | Review PR; master is still at #48. |
| #47 | syncwithmoz | `nairobi` branch | Review draft |
| #30, #33, #35, #36, #38 | various | Product-sync PRs | Superseded by the direct commits `626864567` and `2176984d7`. |
| #37 | upgrade-master (merged) | — | Not in nairobi-prod. |

---

---
## 6. `nairobi-prod` vs `nairobi-prod-bgrm-changes`

- **Containment.** `git log origin/nairobi-prod-bgrm-changes..origin/nairobi-prod` lists only `8e6289e86`, the #157 **merge commit**. Its
  single change, `0c7b3f640`, is in bgrm-changes through #158 (`78444ee4e`). So **bgrm-changes contains all of nairobi-prod's content**.
- **Commits only on bgrm-changes:**
  - `ba374fc51`: revert #155;
  - `f6ead681a`: revert #154;
  - `bae16acca`: "bgrm gets its Bomet landing page back";
  - `78444ee4e`: #158.
- **Tree difference (61 files), all landing-related.** The purpose is to give bgrm a Bomet front page while sharing every other change.
  - `products/pgr/src/pages/citizen/Landing/**` matches `feat/kenya-superset@3f4965e44` exactly (empty diff). It brings:
    - the Bomet copy deck in `content.ts`: "Bomet Feedback Hub", "County Government of Bomet", hotline **0746 036 036**, emergency
      helplines **999 / 112** plus the county line, and the Bomet sub-counties;
    - the "editorial" layout (`variants/editorial/*`), with `AppEntry.tsx` passing `layout="editorial"` as the deployment default;
    - Bomet assets added (`bomet-logo.jpg`, `bomet-footer-logo.jpg`, `bomet-hero*.webp`); Nairobi and Bonga assets removed;
    - `config/resolve.ts`, `types.ts` and `sectionRegistry.tsx` for the layout switch; `useCountUp.ts` restored.
  - `configurator/src/admin/landingBuilder/sectionEditorRegistry.tsx` and `schemaDescriptors/landing-section.ts`: #154 reverted.
  - `public/index.html`: #154 reverted (Inter 800/900 weights; scroll-clamp handling of `#hash` links and `digit:user-scroll`).
  - `src/index.css`: animations for the editorial layout; #154's additions reverted.
  - `esbuild.build.js` and `esbuild.dev.js`: `.webp` loader. `tests/landingTopOfPage.test.js` removed.
- **Consequences:**
  - A build from bgrm-changes shows the **Bomet** landing for whatever tenant it serves, and a build from nairobi-prod shows the
    **Nairobi** landing. Each bundle belongs to its own county.
  - Every non-landing change must be merged into both branches, as was done for #157/#158.
  - The emergency numbers (999/112) are still on the Bomet page but gone from the Bonga page (#155).

---

---
## 7. Inherited from the product and CMS Mozambique

Every feature in the CMS Mozambique V2.12 release documents, checked against `nairobi-prod`. Survival is the share of a commit's substantive added lines still present verbatim at `nairobi-prod`. P K N M = present at product-base, `kenya-layer-start`, `nairobi-prod`, Mozambique `master`.

### 7.1 Main table: Mozambique V2.12 features vs Kenya (origin/nairobi-prod)

#### A. Backend: pgr-services (Moz preview §3)

| Mozambique feature | In Kenya code? | Evidence | Enabled / applicable in Kenya? | Notes |
|---|---|---|---|---|
| Department-scoped search (`fe7cab60`) | Yes | `backend/pgr-services/.../service/EmployeeDepartmentScopeService.java` (P- K✓ N✓ M✓). Called at `PGRService.java:181`; re-wired after the product sync by Kenya `d72391231`. 95% of lines survive. | **Off by default.** `pgr.department.scope.roles=` is empty (`application.properties:180`). No compose, Helm or Ansible file in NP sets `PGR_DEPARTMENT_SCOPE_ROLES`. Live env unverified. | NP now also runs the product's policy scoping, `SearchAccessPolicyService` (`PGRService.java:196,215`, from `2176984d7`). |
| Jurisdiction-scoped search incl. boundary subtrees (`9e650397`, `79dae4ef`) | Yes | `EmployeeJurisdictionScopeService.java`, `util/BoundaryUtil.java`, `web/models/EmployeeJurisdiction.java` (all P- K✓ N✓). `79dae4ef` 100% survives. | **Off by default.** `pgr.jurisdiction.scope.roles=` is empty (`application.properties:185`). Live unverified. | Kenya moved the subtree-cache TTL key (`d72391231`). |
| Admin cross-department search API `POST /v2/request/_admin/_search` (`dae9ec08`) | Yes | `web/controllers/AdminComplaintSearchController.java:46`, `AdminComplaintSearchService.java` (96% survives) | **Not granted in either county.** No access-control action for `_admin/_search` is seeded on any ref (DDH `ACCESSCONTROL-ACTIONS-TEST.actions-test.json`, DB dump; moz/master included), and neither `nb` nor `bo` has one (live, 13 Oct). | |
| "Filed on behalf of" `createdBy` filter (`1f9b68a2`) | Yes | `RequestSearchCriteria` `createdBy`; `PGRQueryBuilder` `ser.createdby IN` (100%) | **Available but unused by Kenya.** The generic API stays available; its UI consumer, the reception inbox (C6), is inert in Kenya. | |
| Department search field (`4a6537c3`) | Yes | `RequestSearchCriteria` `department` (86%) | Applicable (generic) | |
| Selective confidential-field visibility `x-no-mask` (`8746bcab`) | Yes | `service/EncryptionDecryptionService.java` `noMaskFields` (100%) | **Inert.** It needs a `ComplaintTemplateType` with x-no-mask fields; the repo seeds are IGE/IGSAE only (`mdmsData-dev/RAINMAKER-PGR/RAINMAKER-PGR.ComplaintTemplateType.json`). | Kenya's own confidentiality is a citizen opt-in with server-side complainant masking (`df9aa019d`, `1a848286c`). It accepts `extendedAttributes` carrying only `isConfidential`, with no template. The backend model (`allowedViewerRoles`, `CONFIDENTIAL_COMPLAINT_VIEWER`) is already in the product (`ComplaintTemplateTypeConfig.java` P✓). |
| Configurable escalation states `pgr.escalation.states` (`718d65b1`) | Yes | `PGRConfiguration` (`@Value pgr.escalation.states`); `application.properties:241` default `PENDINGATLME,PENDINGFORASSIGNMENT` (100%) | **Applicable: Kenya escalates.** Bomet labels ESCALATEDLEVEL1-3 (`203432ac5`). The live Bomet workflow has ESCALATE on PENDINGATLME/ESCALATEDLEVEL3 (`digit-ui-esbuild/products/pgr/src/utils/workflowStates.test.js:9-12,35-37`). No repo config sets `PGR_ESCALATION_STATES` for Kenya, so the live value is unverified. | |
| New intake channels email/inperson/letter/linhaverde (`b2272873`) | Yes | `allowed.source=…,email,inperson,letter,linhaverde` (`application.properties:194`) | **Accepted by the backend.** The employee form always sends one of these codes (C15). | `linhaverde` is Mozambique's hotline. |
| Notification recipient = newest workflow step; terminal transition keeps assignee (`f05c52d5`) | Yes | `NotificationService` `newestTime`; `WorkflowService` `isTargetStateTerminal` (100%) | **Live-relevant:** every REJECT/RESOLVE/RATE goes through it. | Kenya's own follow-up (`5044d5333`, PR #82, "send no assignee on REJECT / RESOLVE") is **not** on NP. |
| Department display three-tier fallback; acting-employee placeholders (`4fa8964c`) | Yes | `NotificationService.getHRMSEmployee` (`resolveComplaintHierarchyDepartment` → `readAdditionalDetailsDepartment` → HRMS, lines 757-764); `putAssignerPlaceholders` (100%) | **Live-relevant on the config-driven path.** `buildPlaceholderValues` → `getHRMSEmployee` (`NotificationService.java:1329-1337`). `local-setup/docker-compose.bomet.yml` sets `PGR_NOTIFICATION_CONFIG_DRIVEN: "true"`. | |
| Deep-link placeholders `{website}`, `{rate_link}`, `{reopen_link}` (`15ec1db5`) | Yes | `NotificationService.java:1256-1276`, used by `processConfigDriven` (`:945`, `:962`) (100%) | **Applicable, but depends on `egov.ui.app.host.map`.** The default is `{"pg":…}` (`application.properties:165`). The playbook rewrites the key to `state_root` (`local-setup/ansible/playbook-deploy.yml:4248-4252`). The Kenya value is unverified. | |
| Sort by last-modified (`1f9b68a2`) | Yes | `RequestSearchCriteria` (lastModifiedTime) | Applicable (generic) | |
| Scope-bypass hardening (`9e650397`) | Yes | `RequestsApiController` scope-flag handling (3 references; P has 0) | Effective only when scoping is on | |
| "0 database migrations" claim | Holds for Kenya | Backend `.sql` set (25 files) is identical across P/K/N; `git diff product-base origin/nairobi-prod` on them is empty | n/a | |

#### B. Backend: novu-bridge (Moz preview §3)

| Mozambique feature | In Kenya code? | Evidence | Enabled / applicable in Kenya? | Notes |
|---|---|---|---|---|
| Direct delivery mode, SMS + SMTP without Novu (`91aded4c`) | Yes (extended) | `service/DirectDeliveryService.java` (93%). `application.properties:81` `novu.bridge.direct.channels` (empty default), `:83` `direct.sms.provider` (default `ozeki`), `:98-106` SMTP. | **This is the code path Kenya's own SMS gateways extend.** Bongatech was added in `82ba44d57` and Source Code in `84c45ada2`. Which mode and gateway each county runs is not in the repo: compose `NOVU_BRIDGE_SMS_PROVIDER: ${…:-}` at `docker-compose.egov-digit.yaml:2538`. Unverified. | |
| Ozeki SMS via Novu, complaint + OTP (`a95f8df2`, `a3be88e5`) | Yes (modified) | `service/provider/OzekiOverridesBuilder.java` present. Kenya replaced the boolean Ozeki switches with `SmsProviderOverridesFactory` (Ozeki or Bongatech) in `82ba44d57`; `a95f8df2` dropped from 91% at KLS to 36% at NP. | **Not used.** Ozeki is selectable but not configured for Kenya in the repo; Kenya's gateways are Bongatech and Source Code. | |
| OTP delivery pipeline (`a3be88e5`) | Yes (extended) | `DispatchPipelineService` OTP path. Kenya added `consumer/UserOtpSmsConsumer.java` (`2631f102c`); Moz's post-fork equivalent is `371ecab7b`. | **Live-relevant for OTP.** `novu.bridge.user-otp.default.tenant.id` defaults to **`bo`** (`application.properties:27`, Kenya `2631f102c`; Moz defaults to `mz`). Bonga (`nb`) would need `NOVU_BRIDGE_USER_OTP_DEFAULT_TENANT_ID`, which no repo config sets. Unverified. | |
| OTP message wording, 10 → 5 minutes (`0ac4b3f0`) | Yes (translated) | `DispatchPipelineService.java:308-309` reads "…It expires in 5 minutes…" in English. Kenya `82ba44d57` translated the Moz Portuguese text. | Applicable | Real OTP lifetime is set by the platform OTP service. |

#### C. Frontend (Moz preview §4, rows 1-21)

| Mozambique feature | In Kenya code? | Evidence | Enabled / applicable in Kenya? | Notes |
|---|---|---|---|---|
| 1. Public landing + privacy + tutorial site (`ccd8b576`, `0737156a`, `0dce489b`, `cec2b6fe`) | Partial | `products/pgr/src/pages/citizen/Landing/` with renderer, config and `PrivacyPolicyPage.tsx`; route `/${contextPath}/landing` at `packages/modules/core/src/App.js:109`. **`TutorialPage.tsx` is absent** (M✓ N-); `cec2b6fe`, `4cfeaa7b7` and `7e9561c24` are not in Kenya. | **Live-relevant as the Bonga Nai landing.** `Landing/AppEntry.tsx:15-50` imports Nairobi/Bonga assets (Kenya commits `32617c679`, `64fd0e0e9`, `3c85ba791`, `2e7c68e9d`). No Mozambique, IGSAE, Maputo or Linha Verde strings remain under `Landing/`. Live 13 Oct: both counties serve `/digit-ui/landing`; bgrm's build comes from `nairobi-prod-bgrm-changes` (Bomet page). | `ccd8b576` dropped from 90% at KLS to 49% at NP (Kenya rebrand). See §1 lineage: landing code arrived via `b590fd6a0` and the `35504b797` merge. `Landing/` exists on origin/master, develop, syncwithmoz, kenya-prod and NP (36+ files). |
| 2. Analytics loader, default-off, PII-scrubbed (`e9a0f0e4`, `4a2e8117`) | Yes (unioned with the product version) | `digit-ui-esbuild/public/analytics.js`, `tests/analytics.shim.test.js` (98%). `626864567` unioned the product shim with Moz behaviour analytics. | **Enabled by data for Kenya:**<ul><li>DDH seed `common-masters.AnalyticsProvider.json` has row `matomo-bomet`, `enabled: true` (`f19dbd4a0`).</li><li>The kill switch defaults to false (`globalConfigs.js.j2:97`).</li><li>On-box Matomo needs `enable_matomo`, which defaults to false (`group_vars/digit.yml:77`). `local-setup/scripts/enable-uat-extras.sh` (`3ae0b4e07`) turns it on, defaulting to `DOMAIN=bgrm.bomet.go.ke`.</li></ul>Live 13 Oct: Matomo provider row and `/matomo/matomo.js` on bgrm; neither on Bonga. | Upstream `7ee88f839` also ships `public/analytics.js`. |
| 3. Admin cross-department search screen + Excel (`a0e18a4b`, `8da74a9e`, `ec222582`) | Yes | `pages/employee/AdminSearch.js`; `Module.js:37`; link at `components/PGRCard.js:57`; Kenya employee home `pages/employee/EmployeeHomeV2/tiers.js:114` (`ADMIN_SEARCH_ROLES = ["SUPERUSER","CMS_ADMIN"]`) | **Not usable in either county:** neither `nb` nor `bo` has an access-control action for `/v2/request/_admin/_search` (live, 13 Oct). CMS_ADMIN is not a Kenya role. | The "N+" count quirk is inherited (`AdminSearch.js:509`). |
| 4. Workflow-driven employee action modals (`772a5986`, `aa500b8d`) | Yes (extended) | `pages/employee/PGRDetails.js`, `components/PGRWorkflowModal.js` (72% / 93%) | **Live-relevant.** Kenya's GRO/LME/escalation workflows render through it. Kenya added REASSIGNTOGRO (`utils/reassignToGro.js`, `b6e1da18a`), action windows (`c6fee0995`) and withdraw (`962aca541`). | |
| 5. History-derived routing: reopen → Supervisor, rate → Case Manager (`adbf2da4`, `4d268d8f`) | Yes (modified) | `utils/workflowAssignee.js`; Kenya `utils/workflowHistory.js`. `ReopenComplaint/AddtionalDetails.js:114-130`: rule 1 keeps CMS_SUPERVISOR, then Kenya rules (last LME at PENDINGATLME, …). | **Live-relevant for Kenya's reopen rules.** The Moz "rate → CMS_CASE_MANAGER" lookup (`Rating/SelectRating.js:148`) finds nobody in Kenya, so rating goes without an assignee. | `adbf2da4` dropped from 83% at KLS to 35% at NP (Kenya `801bff999`, `2163f7ecf`, `d4a4a5453`). |
| 6. Reception-officer inbox + "only my complaints" (`74eac21c`, `46d9081d`) | Yes | `components/OnlyMyComplaintsFilter.js`; `configs/UICustomizations.js:133,1633-1650`; `configs/PGRSearchInboxConfig.js:215-239` | **Inert.** It keys on `CMS_RECEPTION_OFFICER`; Kenya files complaints as `CSR` (`PGRCard.js:54`). | |
| 7. Confidential-complaint masking on details/timeline (`992735af`, `c0c6f30b`) | Yes (gated) | Gate `utils/piiMasking.js:10-19` (Kenya `05d714058`); `TimeLineWrapper.js`, `PGRDetails.js` | **Off for Kenya:** `PGR_PII_MASKING=false` at `globalConfigs.js.j2:61` (default false), `host_vars/_example.yml:160`, `local-setup/nginx/globalConfigs.js:73` (`6bef31ae4`). | Kenya instead masks complainant identity **at the API** for opted-in confidential complaints (`df9aa019d`, `1a848286c`; UI `ee3f83a44`, `4a31fbae1`). Moz V2.12 lists that API masking as its open gap (Known Limitation 2). |
| 8. Attachments everywhere: uploader, video/audio, per-step evidence (`6bf0084a`, `e81431c2`, `721e44c8`) | Yes | `components/PgrFileUpload.js`, `utils/attachmentKind.js` (92-100%) | **Live-relevant** | Kenya added a ClamAV scan proxy (`0c7b3f640`) and filestore security (PR #157, NP head). |
| 9. Citizen create wizard: 3 steps, hierarchy, dynamic fields, drafts, consent (`81054330`, `be6c9eaa`, `22b8e38a`, `a3365a70`) | Yes (extended) | `pages/citizen/Create/CreatePGRFlowV2.tsx` (80-95%) | **Live-relevant** for the steps, hierarchy pickers, drafts and consents. The authority step renders only when `ComplaintRelatedToMap` is seeded (`:128`, `:745`), and dynamic fields need `ComplaintTemplateType`. The repo seeds for both are IGE/IGSAE only, so these are **inert for Kenya** unless seeded live (unverified). | Kenya added the T&C consent (`:229-239`), the address on step 1 (`0c7baffdf`) and auto-assignment at submit (`79bf0a3b8`; stamp `additionalDetail.autoAssignment`, `:2090-2095`). |
| 10. Reopen/rating overhaul: routing data preserved, 72 h window, mandatory reason (`92eaec23`, `2debbcfc`, `8597982d`) | Partial | **Present:**<ul><li>Merge-not-replace: `utils/additionalDetail.js:51`, `AddtionalDetails.js:155-162`, `SelectRating.js:125`.</li><li>Mandatory reason: `AddtionalDetails.js:93`.</li><li>Escalation reset on reopen: `resetEscalation: true`, `:161`.</li></ul>**Absent:** FE fresh-fetch `2debbcfc` (0%) and FE 72 h fallback `8597982d` (0%). | **Live-relevant.** Kenya's window comes from MDMS `UIConstants.REOPENSLA`/`actionWindows` (`a22a4fe90`, `74bbabef3`, `c6fee0995`). The backend fallback is 72 h (`pgr.complain.idle.time=259200000` in `application.properties`). | Kenya stamps the department at create (`autoAssignment`), not at ASSIGN, so the stale-cache scenario `2debbcfc` fixed may differ. Not re-assessed; unverified. Moz's product decision `aafa912b` (rate stale cache) is not in Kenya. |
| 11. Localization mechanics: city overlay, default language honoured, raw-key guards (`3289ac3f`, `e33e801d`, `812b36b8`, `dd746026`, `0466b6d9`) | Yes | 79-100% | Applicable (generic). Kenya's default locale is `en` (`group_vars/digit.yml:150-151`). | |
| 12. Branding: Fala Cidadão name/emblem/favicon; theme colours from config (`954e134d`, `11c372d8`, `9597f0ab`) | **Mechanism yes; Moz branding no** | <ul><li>`954e134d` (MDMS `ThemeConfig` drives colours) 100%. Kenya uses it (`ansible/nairobi-mdms/mdms/common-masters/ThemeConfig.json`, `32617c679`).</li><li>Tab title and favicon follow the tenant (`a95b7e9de`).</li><li>`public/index.html` is generic DIGIT.</li></ul> | **The theme mechanism is live.** However, Moz "Fala Cidadão" strings remain in the DDH **en_IN** seeds: 8 keys in `localisations/en_IN/rainmaker-common.json` (e.g. `MODULE_PGR`, `CS_COMMON_HOME_COMPLAINTS`, `ACTION_TEST_PGR`) and 3 in `rainmaker-pgr.json` (incl. `PGR_LANDING_PRIVACY_PAGE_P1`). They are not in the DB dump (0 matches). | Risk: `docs/migration/ccrs-migrate.cjs` seeds missing `PGR_LANDING_*` keys from this en_IN file (`:224`). Live Kenya messages unverified. |
| 13. Maps: authority tenant, geocode loop guard, safe tooltip (`62335750`, `60c5198c`, `8c1120f9`) | Yes | `components/GeoLocations.js`, `hooks/pgr/useMapConfig.js` (100%) | Applicable | Moz post-fork vector basemap `bb4e2b600` was ported by Kenya (`79bf0a3b8`, `16c6e311f`), 100% of lines present; OpenFreeMap style at `useMapConfig.js:28`. |
| 14. Boundary picker reliability; readable address; postal-code input retired (`da545a8a`, `4aa5aa3b`, `4e2dbb5a`) | Yes | `components/BoundaryComponent.js`. No postal input in `CreateComplaintConfig.js` or `CreatePGRFlowV2.tsx` (comments only). | Applicable | |
| 15. Channel-of-receipt chips on employee create (`6de45287`, `b2272873`) | Yes | `components/ChannelChipsComponent.js:15-18`; always rendered via `configs/CreateComplaintConfig.js:24` | **Rendered for Kenya CSRs.** The hardcoded options include Moz's "Linha Verde" (`PGR_CHANNEL_LINHA_VERDE`). Any Kenya relabel or hide is unverified. | |
| 16. Dashboard breadcrumb + gutter when embedded (`aeea2cd4`) | Yes | 100% | Applicable | Kenya added dashboard export (`706082ffc`). |
| 17. Testing-tenant scoping, `/digit-ui-test` (`d83aa600`, `7423ae44`) | Yes | `utils/testingTenant.js` (94%); configurator `resources/tenants/TestingTenantToggle.tsx`; `playbook-deploy.yml:1437-1535`; `globalConfigs.js.j2:115-123` | **Off by default:** `testing_ui_enabled` defaults to false and is not set in `bomet.yml.example` or `nairobi.yml.example`. | |
| 18. Citizen navigation: single-module sidebar, avatar, logout (`7a1afeeb`, `295b0756`) | Yes | 94-100% | Applicable | |
| 19. Error screens: button wording, image fallback, layout (`20ef8760`, `01446716`) | Ported | Cherry-picks `84d4e5b4e`, `64614e16c`, `6d6b72621`, patch-equivalent per `git cherry` (100%) | Applicable | |
| 20. Login/OTP: m:ss resend countdown, country code, tenant scoping (`8fda161f`, `04ba4806`, `78ccee51`) | Yes (modified) | `packages/modules/core/src/pages/citizen/Login/SelectOtp.js:134` sets `RESEND_COOLDOWN_SECS = 180` (Kenya `dfbb2ba26`; Moz 120). m:ss format kept. Country code passed (`3a33af489`, `20cc8c0b7`). | Applicable (+254) | |
| 21. Performance: request cache, IndexedDB master data, staff-list caching (`ba8a7c27`, `5a096d23`) | Yes; **IndexedDB itself is product** | `ba8a7c27`/`5a096d23` 100%. `packages/libraries/src/services/atoms/Utils/idbCache.js` is P✓ (product `8fd9f8088`). | Applicable | |

#### D. N-level complaint classification hierarchy (Moz preview §5)

| Mozambique feature | In Kenya code? | Evidence | Enabled / applicable in Kenya? | Notes |
|---|---|---|---|---|
| Foundation: N-level `ComplaintHierarchyDefinition`/`ComplaintHierarchy`, one-to-many departments, admin management, guided 2→N migration (`be6c9eaa`) | **Product** | Product twin `019b15946`. `ComplaintTypeDepartments`/`ComplaintHierarchyDefinition` seeds are in product-base. Configurator `api/services/hierarchyMigration.ts`, `components/ComplaintHierarchySetup.tsx` and `resources/complaint-hierarchies/*` are P✓. `docs/migration/complaint-type-2level-to-Nlevel.md` and `operator-runbook.md` are P✓. | **Live:** Kenya routes on the hierarchy department. Live data unverified. | The Moz doc itself says this is product. |
| Routed-department stamping on ASSIGN (`0c1123c8`) | Yes | `pages/employee/PGRDetails.js:473-500` (100%) | **Live where the workflow has ASSIGN** (Bonga's GRO step: `utils/reassignToGro.js:1-2`). Where APPLY goes straight to PENDINGATLME with no ASSIGN step (`CreatePGRFlowV2.tsx:1914-1918`; fixture `utils/autoAssign.test.js:50`), citizen create now stamps `additionalDetail.autoAssignment` (`CreatePGRFlowV2.tsx:2090-2095`). | |
| No-department operation (`394e6136`, `af818c2d`; later `aa500b8d` made ASSIGN assignee mandatory with a message) | Yes | 100% / 36% (superseded by `aa500b8d`, 93%) | **Live on Bonga:** every Bonga sub-type maps to department `NA` (13 Oct). Bomet maps real departments (Health, Water & Sewage, Administration). | |
| Department survives reopen/rate (`92eaec23`, `2debbcfc`) | Partial | See C10 | Live | |
| Department names in notifications (`4fa8964c`) | Yes | See A | Live | |
| Localized hierarchy labels `COMPLAINT_HIERARCHY.*` + city overlay (`23326ca2`, `3289ac3f`) | Yes | 87% / 79% | Applicable; live keys unverified | |
| Leaf-type complaint titles (`d109187b`) | Yes | 100% | Applicable | |
| Hierarchy fetched at the complaint's tenant (`5a096d23`, `9a29c3de`) | Yes | 100% | Applicable | |
| Wizard hierarchy pickers with draft persistence (`a3365a70`) | Yes | 95% | Applicable | |
| Seeding/migration phase in `ccrs-migrate.cjs` (`16b91133`) | Yes | `docs/migration/ccrs-migrate.cjs` (92%) | Tooling; use on `bo`/`nb` unverified | |
| Design record `docs/complaint-hierarchy-withnew-parameters.md` | Yes | K✓ N✓ | Doc | |

#### E. Workflow (Moz preview §6)

| Mozambique feature | In Kenya code? | Evidence | Enabled / applicable in Kenya? | Notes |
|---|---|---|---|---|
| CMS four-tier workflow variant (`bffdce15`, `d37299b4`), selected by `pgr.workflow.variant` | Yes (data + tooling) | `utilities/default-data-handler/src/main/resources/CmsPgrWorkflowConfig.json`; `DataHandlerService.java:64,501` | **Not used.** Kenya workflows (live 13 Oct): Bonga is GRO triage → LME → 2 escalation levels, with REASSIGN, REASSIGNTOGRO and WITHDRAW before assignment; Bomet is APPLY → LME (auto-assigned) → 3 departmental escalation levels, with WITHDRAW at the LME stage. See `reassignToGro.js:1-2`, `workflowStates.test.js:9-12,35-37`, `AddtionalDetails.js:107-122`, `pages/citizen/ComplaintDetails.js:189-215`. | DDH is not a compose service in any ref (product removed it in `03f32d5bc`), so the variant only matters to seeding tools. |
| Production `mz` BusinessService (2026-08-21 REOPEN → REFERRED) | n/a | Moz live data | n/a | |
| Escalation enablement script + runbook (`718d65b1`) | Yes | `local-setup/scripts/enable-escalation.sh`, `docs/pgr-escalation/RUNBOOK.md` | **Not adapted for Kenya.** Moz defaults are untouched (no Kenya commits): `TENANT=mz` (`:68`), `ESCALATE_STATE=INVESTIGATION` (`:74`), and a default admin credential (`:70`, value not reproduced). They must be overridden. | |
| Reopen restarts the escalation clock (`92eaec23`) | Yes | `AddtionalDetails.js:155-162` (`resetEscalation: true`) | Live | |
| Terminal transitions accept an assignee; FE retries rating without one (`f05c52d5`, `43d4c8ac`) | Yes | `SelectRating.js:165-176` | Live | |
| Attachments on every action; mandatory only where the state demands (`6bf0084a`, `7dfa7eb8`) | Yes | 92% / 100% | Live | |

#### F. Configuration and master data (Moz preview §7)

| Mozambique feature | In Kenya code? | Evidence | Enabled / applicable in Kenya? | Notes |
|---|---|---|---|---|
| Masters `ComplaintRelatedToMap`, `ComplaintTemplateType`, `ComplaintExtendedAttributeSchema` | Seeds present; **files and backend handling are product** | `mdmsData-dev/RAINMAKER-PGR.{ComplaintRelatedToMap,ComplaintTemplateType,ComplaintExtendedAttributeSchema}.json` exist in product-base. Moz changed them only slightly (P→K +7/−5, +1/−1, +2: `8cbbbb6be`, `8746bcab`, `21ff33d5`). No Kenya change (K→N empty). | **Inert:** the content is IGE/IGSAE (codes `IGE`, `IGSAE`). | `21ff33d5` (IGSAE off, root-tenant routing) changes data only. |
| Landing masters `LandingSection`, `LandingPageConfig` (`421db133`) | Yes | `mdmsData/RAINMAKER-PGR/RAINMAKER-PGR.Landing{Section,PageConfig}.json`; `schema/rainmaker-pgr-landing.json` | **Live:** Kenya added a helplines row (`64e5dee4e`). | |
| `AnalyticsProvider` (`9fd66cdfc`, `f4d37bbd`) | Yes + Kenya seed | `common-masters.AnalyticsProvider.json` (Kenya `f19dbd4a0`) | Live (enabled row) | Kenya `cfe9947f9` added the missing write actions. |
| Privacy policy module corrected to `commonMDMSConfig.PrivacyPolicy` (`c3e42214`) | Yes | `mdmsData/commonMDMSConfig/commonMDMSConfig.PrivacyPolicy.json` (100%) | Applicable | |
| Tenant banner image (`00ffd59f`, `ba39a55d`) | Yes | `docs/migration/fix-citymodule.sh`; citymodule schema | Applicable (Kenya banner work `23290a2ca`) | |
| New backend settings: scope roles, escalation states, `allowed.source`, boundary-relationship URL, `novu.bridge.*`, `egov.ui.app.host.map` | Yes | pgr-services `application.properties:165,180,185,194,227,241`; novu-bridge `application.properties:57,69,81-106` | **Repo defaults only;** Kenya's live overrides are unverified. | |
| Configurator: JSON/object-table widgets, 7 new schema descriptors | Yes | `configurator/src/admin/schemaDescriptors/` grew from 13 (P) to 20 (K). The added descriptors (`analytics-provider`, `city-module`, `data-security`, `encryption-policy`, `landing-page-config`, `landing-section`, `ui-homepage`) are the same set in N. | Applicable | |

#### G. Roles and permissions (Moz preview §9)

| Mozambique feature | In Kenya code? | Evidence | Enabled / applicable in Kenya? | Notes |
|---|---|---|---|---|
| 13 new roles: CENTRAL_USER, CMS_ADMIN, CMS_CASE_MANAGER, CMS_DASHBOARD_VIEWER, CMS_RECEPTION_OFFICER, CMS_SUPERVISOR, CMS_VIEWER, COMPLAINTS_CREATOR, COMPLAINTS_EDITOR, COMPLAINTS_VIEWER, CONFIDENTIAL_COMPLAINT_VIEWER, DEPARTMENT_USER, DGRO | **Role definitions yes; grants no** | `mdmsData/ACCESSCONTROL-ROLE/ACCESSCONTROL-ROLES.roles.json` has all 13 (35 roles; identical to KLS). `ACCESSCONTROL-ROLEACTIONS.roleactions.json`: KLS has 731 rows incl. grants for 12 of them (e.g. CMS_SUPERVISOR 37, COMPLAINTS_EDITOR 35). **NP has 462 rows with only CMS_SCREENING_OFFICER 38 + CONFIDENTIAL_COMPLAINT_VIEWER 1.** Dropped by the product sync `2176984d7`, which replaced the file with upstream's (upstream `7ee88f839` has only CMS_SCREENING_OFFICER 37). | **Kenya uses its own roles:**<ul><li>GRO, PGR_LME, CSR, DGRO, PGR_VIEWER</li><li>Nairobi's bare CECM/CHIEF_OFFICER/DIRECTOR (`0a9260b17`)</li><li>Bomet's `<DEPT>_{DIRECTOR,CHIEF_OFFICER,CECM}` (`62b0c121f`)</li><li>OMBUDSMAN_OFFICER (`b953b2145`)</li><li>`pgr.employee.context.resolver-role-codes` default `PGR_LME,GRO,DGRO` (`application.properties`)</li></ul>**CONFIDENTIAL_COMPLAINT_VIEWER is live-relevant** as the default viewer role in Kenya's masking (`PGRConstants.java:261`, `ChronologyService.java:73`). | `ccrs-migrate.cjs --cms` reads grants from that DDH file (`:229-230`, `:822`, `:870`). Run from NP, it would register the CMS roles **without** grants. The DB dump has no CMS grants on either line; the Moz runner relies on the DDH file. |
| Layered role model; manual registration of 3 roles; CMS_VIEWER privilege note | n/a | Moz doc §9 | n/a | |

#### H. Localization (Moz preview §8)

| Mozambique feature | In Kenya code? | Evidence | Enabled / applicable in Kenya? | Notes |
|---|---|---|---|---|
| pt_PT first-class: packs, default for `mz`, honoured on first load (`f42ad659`, `21a6f1f2`, `812b36b8`) | Seeds yes | `localisations/pt_PT/` (2 files) | **Not applicable:**<ul><li>Ansible default locale is `en` (`group_vars/digit.yml:151`).</li><li>The Nairobi `StateInfo` seed lists `[en_IN]` only (`ansible/nairobi-mdms/mdms/common-masters/StateInfo.json`).</li><li>The **local-only** `local-setup/nginx/globalConfigs.js:12-13` still says `localeRegion "PT"` / `localeDefault "pt"` (Moz leftover; this file is not deployed, per `43359302a`).</li></ul> | No `sw_KE`/Kiswahili seeds exist in NP. |
| City-level wording overlay (`3289ac3f`, `e33e801d`) | Yes | 79% / 100% | Applicable mechanism | |
| "Fala Cidadão" rebrand of packs (`9597f0ab`) | Present in seeds | 94%; 11 en_IN keys still say "Fala Cidadão" (see C12) | **Unwanted for Kenya.** Seed risk only. | |
| Raw-key / double-translation fixes (`0466b6d9`, `dd746026`, `dac66d9e`) | Yes | 100% / 100% / 70% | Applicable | |
| Translation workbook (Google Sheet) | n/a | External link in the Moz doc | n/a | |

#### I. Integrations and analytics (Moz preview §10)

| Mozambique feature | In Kenya code? | Evidence | Enabled / applicable in Kenya? | Notes |
|---|---|---|---|---|
| Ozeki SMS gateway (`a95f8df2`, `91aded4c`) | Yes (generalised) | See B | **Not configured.** Kenya uses Bongatech (`service/provider/BongatechOverridesBuilder.java`, `82ba44d57`) and Source Code (`84c45ada2`). | |
| SMTP direct email (`91aded4c`) | Yes | novu-bridge `application.properties:98-106` | Off by default | |
| Novu/Twilio WhatsApp | Upstream | Unchanged | Unverified for Kenya | |
| Matomo self-hosted (`1abef50f`) | Yes; also product | `local-setup/docker-compose.matomo.yml` (also in upstream `7ee88f839`); `local-setup/scripts/enable-matomo.sh` arrived via product sync `2176984d7`; `ccrs-migrate --matomo`. Kenya fixes: `8b62a3119`, `ec5a09b0c`, `0a247d679`, `33a15c186`, `b1e2252d1`. | **Default off.** Kenya enables it via `enable-uat-extras.sh` (bgrm defaults); live on bgrm (13 Oct). | |
| PostHog / GA4 / custom destinations (`e9a0f0e4`) | Yes | Shim + editor | Off (no rows except Kenya's Matomo) | |
| Nominatim / CARTO / OpenFreeMap | Product + Moz basemap | Nominatim and CARTO references are in product-base. OpenFreeMap comes from Moz `bb4e2b600`, ported by Kenya `79bf0a3b8` (`useMapConfig.js:28`). | Live | |
| youtube-nocookie tutorial streaming (`cec2b6fe`) | **No** | 0 references in NP; present in moz/master | n/a | |

#### J. Configurator / admin console and Landing Page Builder (Moz preview §7)

| Mozambique feature | In Kenya code? | Evidence | Enabled / applicable in Kenya? | Notes |
|---|---|---|---|---|
| Visual Landing Page Builder (`c2803e7f`) | Yes | `configurator/src/admin/landingBuilder/` (14 files); route `App.tsx:196`; nav `DigitLayout.tsx:92` (90%) | Applicable to the Bonga Nai landing. Kenya-only sections (HelplinesSection, TaglineBand) were added in Kenya. | |
| Analytics destinations editor + own kill switch (`1fd0711e`) | Yes | `admin/analytics/AnalyticsProvidersEditor.tsx` (route `App.tsx:187`), `lib/telemetryGate.ts` (97%) | **Live** (Kenya's Matomo row) | |
| Write-role gating on sensitive masters (`a82a9508`) | Yes | `hooks/useCanWriteResource.ts` (98%) | Applicable | |
| **Role-actions editable from the UI** (`31048d69`, `6135b38f`) | **Regressed** | `configurator/src/App.tsx:159` registers `role-actions` with `list`/`show` only. That is the product version from `2176984d7`; upstream `7ee88f839:App.tsx:158` is the same, while moz/master `App.tsx:145` also has `edit`/`create`. `RoleActionList.tsx`/`RoleActionShow.tsx` still pass `hasCreate`/`hasEdit` (from `6135b38f`). `31048d69` dropped from 100% at KLS to 64% at NP. | **Not available in Kenya.** The Create/Edit buttons probably lead nowhere (browser check not done; unverified). | |
| Testing-tenant checkbox with guard rails (`0cfebb60`) | Yes | `resources/tenants/TenantEdit.tsx:31` (100%) | Present; the entrance itself is off (C17) | |
| Boots in default language; translations propagate on save (`833f759d`, `3d6fc082`) | Yes | 100% / 100% | Applicable | |
| Configurator telemetry kill switch (Moz Known Limitation 6) | Yes (inherited as-is) | `configurator/public/telemetry-config.js` has `kill: false`. The product Sentry DSN and PostHog key are embedded at `configurator/src/main.tsx:17,33` (values not reproduced; P✓). No Kenya build or deploy sets `VITE_CFG_TELEMETRY_KILL` (`git grep` across local-setup, .github, devops: none). | **Telemetry on by default:** an inherited limitation. | |

#### K. Deployment and ops tooling (Moz preview §7, matrix rows 41-45, release notes)

| Mozambique feature | In Kenya code? | Evidence | Enabled / applicable in Kenya? | Notes |
|---|---|---|---|---|
| `ccrs-migrate.cjs` unified idempotent runner (`16b91133`, `852ab0a9`, `1abef50f`) | Yes | `docs/migration/ccrs-migrate.cjs` and siblings (80-92%) | **Tooling.** Kenya fixed its Matomo/install paths (above); whether it was run on `bo`/`nb` is unverified. | The `--cms` phase lacks grants on NP (G). |
| gzip + Cache-Control on `/digit-ui` (`874ec205`) | Yes | `local-setup/ansible/templates/nginx-site.conf.j2`, `local-setup/nginx/digit-ui.conf`, `docs/ops/digit-ui-compression.md`, `docs/migration/enable-gzip.sh` (95%) | Applicable | Kenya added post-deploy cache busting (`eb71852f7`). |
| Password-gated testing entrance, default off (`06ee871e`) | Yes | `playbook-deploy.yml:1437-1535` | Off | `seed-testing-tenant.py` is absent on every ref (dropped by Moz `ad34756f7`). |
| default-data-handler retired; seeds in DB dump (`6e72eed5`, `f4d37bbd`) | Yes; **also product** | No DDH service in the compose files of P, K or N; product did the same in `03f32d5bc` (2026-07-20) | Applicable | |
| Pilot frontend deploy script (`b0d99e14`) | Yes | `local-setup/scripts/deploy-pilot-fe.sh` (84%); default `BRANCH="release-v2.12-moz"` (`:33`) | **Used by Kenya:** `enable-uat-extras.sh:184` calls it with `ui --no-pull`. | |
| HTTPS / Let's Encrypt guide (`938623bd`) | Yes | `docs/enabling-https-with-letsencrypt.md` (100%) | Applicable | |
| Ansible tenant template `stateige.yml.example` (`124678e5`) | Yes | `local-setup/ansible/inventory/host_vars/stateige.yml.example` | **Moz-specific.** It still holds literal sample `bootstrap_secrets` values; Moz replaced them with `<change-me>` in `f7a2eb226`/`fc6c9de99`, which Kenya lacks. Values not reproduced. | |
| Known issue: deploy breaks when default passwords change (Moz §14) | **Inherited** | `local-setup/ansible/playbook-deploy.yml`: 17 lines contain the default bootstrap password literal (KLS 15, moz/master 15) | Applies to Kenya deployments | |

#### L. Security and operations (Moz preview §11 "added on master after the initial documentation")

| Mozambique feature | In Kenya code? | Evidence | Enabled / applicable in Kenya? | Notes |
|---|---|---|---|---|
| Self-contained deep security scanner `security-scan/`, later `security_scan/` (`866a0b69`; follow-ups `9494e8cd`, `960c6574`, `7333bc9d`, `858cdaca`, `9542a1c7`; moz/master later `67dca27b9`, `981c945da`, `0a58572e6`, `3e347b6b7`) | **No** | `security-scan/` and `security_scan/` are absent in NP (`security_scan/` exists in moz/master) | n/a | Kenya keeps the **legacy** CI pipeline that Moz replaced: `.github/workflows/security-scan.yml` (Checkov + KICS + optional Strix; manual trigger; gh-pages dashboard) and `.github/scripts/*` (`bc0ecdac` #13, `844edab5`, Gemini enrichment `e87007b1f` #15 … `8f9a4bc40` #34). No `origin/gh-pages` branch was found among the fetched refs. Whether it has ever been run for Kenya is unverified. |
| Grafana hardening: login required, no anonymous (`d6e5e1e1`) | Equivalent present, **via product** | NP `local-setup/docker-compose.egov-digit.yaml:121-123` and `docker-compose.registry.yml:56-57` have `GF_AUTH_ANONYMOUS_ENABLED: ${GF_ANONYMOUS_ENABLED:-false}`; `templates/digit.env.j2:11`. It came from `2176984d7` (upstream `1bda54261`, `381b365e5`). Product-base and KLS still had anonymous **Admin**. | Applicable (default safe) | The Moz commit itself is not an ancestor. |
| OpenSSF Scorecard, SECURITY.md, Dependabot (`1a175c0cd`, `7cfecaf26`) | **No** | `.github/workflows/scorecard.yml` and `SECURITY.md` are absent in NP | n/a | |

#### M. Fixes and improvements (Moz preview §11)

| Moz fix | In Kenya? | Evidence |
|---|---|---|
| Reopen/rate no longer wipe routed department (+ stale-cache follow-up) | Partial | `92eaec23` yes (100%); `2debbcfc` no (0%) |
| Complaint-details crash; employee-create crash | Yes | `12d0a960` (fix holds: `useMyContext` appears only in a comment at `TimeLineWrapper.js:8`); `57d6b242` 100% |
| Map: geocode loop, ward tooltip escaped, authority-tenant boundaries | Yes | `60c5198c`, `8c1120f9`, `62335750`, each 100% |
| Boundary picker first visit; readable addresses; postal code retired | Yes | `4e2dbb5a` 100%, `4aa5aa3b` 92% |
| Video/audio playback incl. upstream CSS fix | Yes | `e81431c2` 96%, `230cf374` 100% |
| Login double-translate; logout destination | Yes | `0466b6d9`, `295b0756`, both 100% |
| Notification recipient + department resolution | Yes | `f05c52d5`, `4fa8964c`, both 100% |
| MDMS cache in IndexedDB (product) + staff-list caching | Yes | `idbCache.js` P✓; `ba8a7c27` 100% |
| UI bundle gzip + cache headers | Yes | `874ec205` 95% |
| Grafana login required | Equivalent via product | See L |

#### N. Moz Known Limitations (Moz release notes / preview §16): status in Kenya

1. **Default bootstrap password hardcoded in deploy:** inherited (17 lines; see K).
2. **Complainant identity masked only on screen:** Kenya's code closes this at the API for confidential complaints (`df9aa019d`, `1a848286c`; tests `PGRServiceConfidentialComplainantTest.java` are N✓ M-).
3. **Three roles need manual registration:** moot. Kenya does not use them, and NP's DDH grants for them are gone (G).
4. **No templates for AWAITINGINFORMATION/COMMENT:** CMS-specific, n/a.
5. **IGSAE switched off:** n/a (IGE/IGSAE data inert).
6. **Admin search "N+" count:** inherited (`AdminSearch.js:509`).
7. **Configurator telemetry kill switch must be engaged:** inherited, not engaged (J).

---

### 7.2 Mozambique commits after the fork: status in Kenya

There are 94 non-merge commits in `kenya-layer-start..moz/master`; 17 are patch-equivalent in NP (`git cherry`). Survival percentages come from `survival-moz-postfork.txt`.

| Moz item (date) | Moz SHAs | In Kenya? | Evidence |
|---|---|---|---|
| Error-screen fixes (09-02) | `20ef8760a`/`11bf3b547`, `7968f7963`/`de708fea6`, `01446716d`/`94d2d5952` | **Ported** (patch-equal) | `84d4e5b4e`, `64614e16c`, `6d6b72621` (PR #5 `101262ebf`) |
| Session-collision notice (09-07/08) | `fa7b7b456`, `ca983011e`, `7be64daa7`, `f927ada36`, `116a77990`, `e1eb42239` | **Ported** (patch-equal) | `30bb121e9`, `763726dcd`, `e4c056c02`, `4dc8c4bea`, `d27899dd8`, `5d732f538` |
| Classify request failures instead of the error page (09-07) | `2963c39d3` | **Ported** | `adef886be` (same subject; 98% of lines) |
| Behaviour analytics, `_paq` survival, tutorial tracking (09-07/11) | `5ed5480f8`/`655fd37d7`, `45991da6f`/`53fded7dd`, `521e4f872` | **Ported** | `88d00d91f`, `2ef69811d`, `12f0db480` (the tutorial page itself is absent) |
| Employee forgot-password OTP fixes (09-10/11) | `0d578b13c`, `b2ab4777c` | **Ported** | `fa8b6588a`, `857f76e29` (+ Kenya `98c335803`) |
| Stop tracking the node_modules symlink | `d0f66de82`/`ada1bceaf` | **Ported** | `eceaa91e5` |
| Vector basemap + camera framing (08-31) | `bb4e2b600` | **Ported** (100% of lines) | `79bf0a3b8` ("port the vector basemap"), `16c6e311f` |
| Filtered chronology endpoint + hardening + RBAC (09-08…15) | `1346bbb2d`/`29a43e05c`, `80d76849e`/`c6087808f`, `36a01e6f1`/`8a7c7a835`, `4a0e41dae`/`bc4d372bb`, `d9f58a844`+`f7f033094` | **Ported** (82-100%) | `ChronologyService.java` (N✓); `df9aa019d`; grants `64e5dee4e`; UI `/pgr-services/v2/request/_chronology` at `pages/citizen/ComplaintDetails.js:176`, `PGRDetails.js:340` |
| Chronology visibility "CRQ v2" flag-driven citizen PII | `981ef3c64`/`8fd77df36` | **No** (0%) | Kenya has its own masking (`df9aa019d`, `1a848286c`) |
| Citizen timeline: hide internal notes, info requests; CMS step labels | `75a4a9ce1`/`dad1ea85b` (12%), `9090ca596`/`ac3d4de43` (90%), `64d4f612a`/`4ddbf0696` (~42%) | Partial | Kenya filtered timelines `ee3f83a44` |
| Offline citizen receipt + receipt fixes | `a9272ffbe` (73%), `b07b253d5` (69%), `487e91bbd` (33%), `b9b96624e` (10%) | **Ported / reworked** | `components/ReceiptActions.js`, `utils/complaintReceipt.js`, `hooks/pgr/useComplaintReceiptModel.js` (`ee3f83a44`, `945f668eb`, `dfbb2ba26`, `615cdc67f`) |
| user-otp SMS consumer for pass-through (09-09) | `371ecab7b` (98%) | **Equivalent** | `UserOtpSmsConsumer.java` (Kenya `2631f102c`; default tenant `bo`, Moz `mz`) |
| Double-click files the complaint twice (09-07) | `3a299b851` | **No** (0%) | Kenya's citizen button has `loading={submitting}` but `disabled={!stepIsValid}` and no early return (`CreatePGRFlowV2.tsx:2057,2225-2226`). Whether `loading` blocks clicks is unverified. |
| Reopen FRESH fetch; FE 72 h fallback; reopen/rate docs (08-31) | `2debbcfc4`, `8597982d1`, `f7dd51cc1`, `0d5c6b803`, `aafa912b8` | **No** | Kenya uses its own windows (C10) |
| Localize sidebar labels via `CORE_COMMON_*` (08-29) | `19360ef9f` | **No** (0%) | |
| CMS-only: no operator picker when recording the citizen's answer (FC-0002) | `3a97e440c` | No (n/a for Kenya) | |
| Fala Cidadão landing branding, Tutorial page, manual link (08-28…30) | `822b575fe`, `4cfeaa7b7`, `cec2b6fef`, `7e9561c24` | **No** (by design) | Kenya landing is Bonga Nai |
| Mobile app: Flutter WebView under `mobile/` (09-04) | `f50c91a27` | **No** | `mobile/` has 0 files in NP (91 in moz/master) |
| Security scanner + dashboards; legacy-CI fixes (09-02…11) | `5b9563f5d`, `8bc3d3ae3`, `19b5b03df`, `57e28906b`, `866a0b69f`, `9494e8cd4`, `960c65740`, `7333bc9de`, `858cdacad`, `9542a1c7d`, `67dca27b9`, `981c945da`, `0a58572e6`, `3e347b6b7`, `c5f9b897d`, `6e0a1f387` | **No** | §7.1-L |
| OpenSSF Scorecard / hardening (09-10) | `1a175c0cd`, `7cfecaf26` | **No** | |
| Grafana login required (09-07) | `d6e5e1e12` | **Equivalent via product sync** | §7.1-L |
| Password placeholders in `stateige.yml.example` (09-09) | `f7a2eb226`, `fc6c9de99` | **No** | §7.1-K |
| Align backend versions to 2.12.0 (09-09) | `7bf389b2d` | **No** | NP poms: pgr-services `3.0.0`, novu-bridge `1.1.0`; moz/master: `2.12.0` / `2.12.0` |
| Moz release documents (09-04…09) | `b29daec4f` … `e90af9f8a`, `cf5c3867b`, `7e1146ba0`, `f6df25bae` | **No** | `docs/mozambique/` absent in NP; `docs/mozambique-customizations.md` (older) is present |
| Retarget issue tracking to CMS-MOZAMBIQUE | `f12635268` | Kenya equivalent | `1653da46b` (retarget to CMS-KENYA) |
| moz/develop only (09-16 → 10-07): 11 dashboard/analytics fixes | `447cc0251`, `0b267be9b`, `19a0441cc`, `d67c2cd43`, `e226b27a8`, `9617456e4`, `0c0fd6529`, `14b8df682`, `754628020`, `f7daa385a`, `0705295d4` | **No** | `git cherry origin/nairobi-prod moz/develop moz/master`: all `+` |

---

### 7.3 Product → Kenya changes in `product-base..kenya-layer-start` that the Moz docs don't describe

#### 7.3.1 Size and shape

- **Commits:** 636 (385 non-merge), dated 2026-06-20 → 2026-08-30.
- **Diff `product-base-2026-08-13..kenya-layer-start`:** 332 files, +43,827 / −3,099. (The Moz doc's 658 commits / 343 files / +44,876 run to moz/master on 2026-09-03.)
- **Files by area:** frontend (`digit-ui-esbuild`) 131 · configurator 61 · docs 32 · local-setup 26 · utilities/seeders 25 · backend/pgr-services 25 · backend/novu-bridge 15 · .github 13 · tests 2 · other 2.
- **Commits by conventional-commit scope (non-merge):**
  - **Large:** fix(pgr) 123 · feat(pgr) 63 · no-conventional prefix 26
  - **Mid-size:** fix(migration) 12 · fix(l10n) 11 · feat(migration) 10 · feat(analytics) 10 · fix(core) 8 · feat(configurator) 7 · fix(ops) 6 · fix(ui) 5 · fix(analytics) 5 · feat(security) 5
  - **Small:** fix(ddh) 4 · fix(configurator) 4 · fix(citizen) 4 · feat(core) 4 · docs(analytics) 4 · chore(migration) 4 · fix(loc) 3 · feat(pgr-citizen) 3 · feat(novu-bridge) 3 · feat(configurator+pgr) 3 · chore(pgr) 3 · and about 40 scopes with 1-2 commits each.
- **Coverage by the Moz docs:** 115 of the 385 non-merge SHAs are cited directly. Most of the rest are review follow-ups, polish, or cherry-pick twins (the Moz doc §12 counts about 45 cherry-pick pairs).

#### 7.3.2 Notable changes not described in the Moz docs (all still in NP; survival %)

1. **Legacy CI security pipeline evolution.** This is the pipeline Kenya still has; the Moz docs only say it was replaced.
   - Gemini AI triage/verify/summary: `e87007b1f` (#15, 60%), `a37d71add` (#21), `883145d93` (#23), `753f2317b` (#24).
   - Deployment-aware triage + Excel audit workbook: `bf617b420` (#25, 48%).
   - Live-grounded custom rules + Ansible dry-run + dashboard redesign: `7ba1e0bc6` (#29, 95%).
   - P0-P3 palette and Excel: `96ed2b4e0`, `e4682b54c` (#31).
   - CRITICAL→P0 floor: `8f9a4bc40` (#34).
   - Strix: `844edab5`.
2. **Employee create-complaint form additions:**
   - Attachment upload: `430690a9f` (80%).
   - Complainant Address field: `8ddab1998` (50%).
   - Per-category dynamic fields + custom date picker: `a62db6880` (89%).
   - Map pin wired into the payload: `3d29b4db0` (100%).
   - Just-submitted draft not restored: `37953fe46` (100%).
3. **Complaint details:**
   - `extendedAttributes` shown on citizen and employee pages: `af906c561` (80%).
   - Complainant Details card: `bf6a4b49e` (71%).
   - Typed-address / landmark rows: `575fb99af`, `499c25ed9`, `7f085cc30`.
   - Address line without the tenant token: `deb51ed8a`.
4. **Workflow UX:**
   - Employee route-back actions derive the assignee from history: `d0a6bd9d4` (81%).
   - Rate & Close copy + feedback options: `d1ebff88c` (100%).
   - Citizen RATE/REOPEN actions restored on details: `93c66097c` (50%).
   - Reopen reasons, uploads, mandatory details: `065908088` (97%).
   - 5 MB limit on the reopen upload: `291f01f7c` (100%).
   - REJECT modal rejection-reason picker removed: `12a0ef88d`. NP's `PGRDetails.js:50,459` still mentions a `RejectionReasons` dropdown, so current behaviour is unverified.
5. **Boundary and map:**
   - Boundary labels from the tree's tenant: `f36ddfab3` (100%).
   - No mount-time boundary prefetch: `49af0b69b` (100%).
   - Employee boundary picker shows the full tree (jurisdiction gate disabled): `0d66e6d3a` (50%).
   - Geolocate timeout / toast / geocoder country: `97633209d` (87%).
   - **WebView support** (file chooser + geolocation errors): `a52e0b682` (62%). This is the groundwork for the later mobile app.
6. **Platform and form robustness:**
   - Never serialize a RegExp into the native `pattern` attribute: `7dba6a111` (100%).
   - Register `common-masters.FormValidations`: `cdc20c299` (100%).
   - MDMS schema creation tolerates an extraneous `tenantId`: `ce4bacd57` (86%).
   - ASCII-sanitized schema descriptions: `75fe06295` (100%).
   - Duplicate `createdBy` compile fix after merge #1656: `d983f3188`.
7. **Configurator:**
   - Logo goes home + "open portal" link: `390fe5667` (100%).
   - `tenant.citymodule` bannerImage descriptor: `927687b73`.
8. **Citizen shell:**
   - Home banner sizing: `2381c71f8`, `e619f0b6f`.
   - Sidebar avatar shows the uploaded photo: `35cc94246` (100%).
   - Navigation derives the context path (no hardcoded `/digit-ui/`): `2b1b34429` (100%).
9. **Moz design documents carried into Kenya's `docs/`:**
   - PRD/solution design: `docs/superpowers/specs/mozambique-prd/2026-06-22-mozambique-prd-solution-design.md` (`ab8c3a2c`, `02b7ebbe0`).
   - Design notes: hierarchy parameters, department/city master fallback, agency category mapping, encryption/confidentiality, complaint search (`279310456`, `e6b949013`, `56b5cd51d`, `864e3b7ed`, `a8f57e319`).
10. **Moz-only localization and QA batches (pt_PT):** for example `29f9b7f4d`, `d70996b29`, `bf8484e13`, `a8e0767d3`, `df8138fab`. They are in the code but not applicable to Kenya (`en`).
11. **Precursors of documented features:** OTP resend 30→60 s (`e69c50292`, later superseded); the Admin Search v2/v3 design passes; the Landing "IGE alignment" steps A-G (`ef671ee22` … `89ca9e2ef`, overwritten by Kenya's landing).

#### 7.3.3 Outside the range, but it changes the baseline Kenya actually runs on

The product sync to upstream `7ee88f839` (`626864567` + `2176984d7`, 2026-09-16/17) is **not** part of `product-base..kenya-layer-start`. It nonetheless moved Kenya's product layer 760 upstream commits past `815b23747`. Effects relevant to the inherited layer:

- **Lost:** the 12 Moz roles' DDH grants (§7.1-G) and configurator role-action create/edit (§7.1-J).
- **Removed:** the analytics `PrincipalScopeResolver.java`/`AnalyticsScope.java` (deleted in NP).
- **Added:**
  - Product policy-driven search scoping (`policy/SearchAccessPolicyService`)
  - Grafana anonymous-off (§7.1-L)
  - `enable-matomo.sh`
  - Helm/seed parity CI (`.github/workflows/deploy-as-code-validation.yml`, `k8s-seed-dump-sync.yml`, `analytics-seed-parity.yml`)
- **Frontend sync** (per the `626864567` message): inbox visibility tabs (MDMS `RAINMAKER-PGR.InboxVisibilityConfig`, default off) and the TopBar working-context chip.

A Kenya release note that compares against `815b2374` (as Moz did) should attribute these to "product (later sync)", not to the Mozambique layer.

---

---
## 8. Configuration delta against the product

Operator-level changes between the product baseline and `nairobi-prod`: backend settings, migrations, MDMS, workflow, access control, labels, deployment and image tagging. Layer tags are explained in §1.

### 8(a) Backend settings: `backend/*/src/main/resources/application.properties`

Only two services changed between base and nairobi-prod: `backend/pgr-services/src/main/resources/application.properties` (+74/-2) and `backend/novu-bridge/src/main/resources/application.properties` (+65). No property files changed for `digit-config-service`, `digit-user-preferences-service` or `xstate-chatbot` (`git diff --stat` base..np).

#### a.1 pgr-services

| Key (env override) | Default | What it controls | Opt-in? | Layer / commit |
|---|---|---|---|---|
| `egov.idgen.pgr.serviceRequestId.strip-sequence-padding` | `false` | Drops egov-idgen's six-digit zero pad from the trailing sequence of newly generated IDs (`BNG-2026-000125` to `BNG-2026-125`). Search always matches both spellings (`ServiceRequestIdFormat.searchVariants`, `PGRQueryBuilder`). Existing IDs are never rewritten. | **Yes** (off by default; "an existing deployment's numbering cannot change shape on a redeploy", `PGRConfiguration.java`) | [K] `da6df4be3` (2026-10-05). **nairobi-prod only**; absent on `feat/bomet-uat`. No deploy path sets it. The env-var spelling is unverified because the key is camelCase (`serviceRequestId`); Spring's env lookup would most likely accept `EGOV_IDGEN_PGR_SERVICEREQUESTID_STRIP_SEQUENCE_PADDING`. |
| `pgr.action.windows.defaults` (`PGR_ACTION_WINDOWS_DEFAULTS`) | JSON: `REOPEN` uses `windowKey REOPENSLA`, measured from `lastModifiedTime`, fallback `${pgr.complain.idle.time}`, message "Complaint is closed"; `WITHDRAW` uses `windowKey WITHDRAWSLA`, measured from `createdTime`, fallback `${pgr.complain.withdraw.time}` | Deployment-default time limits for workflow actions. Used for any action a tenant's MDMS `actionWindows` does not list, and during an MDMS outage. Fails closed on a bad rule (`INVALID_ACTION_WINDOW_CONFIG`, `MDMSUtils.getActionWindow`). | No (always active; values are fallbacks) | [K] `c6fee0995` (2026-10-09) |
| `pgr.complain.withdraw.time` (`PGR_COMPLAIN_WITHDRAW_TIME`) | `259200000` (72 h) | Withdraw-window fallback measured from filing, used when MDMS has no `WITHDRAWSLA` | No | [K] `c6fee0995` |
| `pgr.complain.idle.time` (`PGR_COMPLAIN_IDLE_TIME`) | `259200000` (was `864000000`, 10 days, at base) | Reopen-window fallback only. The enforced value is MDMS `REOPENSLA`. | No | [P] `2176984d7` |
| `egov.accesscontrol.host` / `egov.accesscontrol.actions.mdms.get.path` | `http://localhost:8080` / `/access/v1/actions/mdms/_get` | Tier-2 policy lookup (ABAC conditions on access-control actions) used by search scoping and analytics capability checks. An unreachable accesscontrol **fails closed** (`policy/AccessControlUnavailableException.java` javadoc). | No | [P] `2176984d7`. Compose sets `EGOV_ACCESSCONTROL_HOST: http://egov-accesscontrol:8090` (`docker-compose.egov-digit.yaml`). The Helm pgr-services chart does **not** set it (its env list has no `EGOV_ACCESSCONTROL_HOST`). |
| `pgr.abac.strict-mode` (code-only, `PGRConfiguration.java:156`) | `false` | `true` makes a missing access-control action or scope policy deny instead of allow (`AccessPolicyRegistry`, `SearchAccessPolicyService`) | Yes | [P] `2176984d7`. Compose sets `PGR_ABAC_STRICT_MODE: "false"` and explains why it stays false. |
| `pgr.employee.context.resolver-role-codes` / `citizen-role-codes` / `admin-role-codes` (`PGR_EMPLOYEE_CONTEXT_*_ROLE_CODES`) | `PGR_LME,GRO,DGRO` / `CITIZEN` / `PGR_ADMIN,SUPERUSER,MDMS_ADMIN,HRMS_ADMIN,STADMIN,SUPERVISOR,PGR_SUPERVISOR` | Display-only "working context" classification served by `POST /pgr-services/v2/employee/_context` (TopBar) | No | [P] `2176984d7` |
| `pgr.jurisdiction.subtree.cache.ttl.ms` | `300000` | Boundary-subtree cache for jurisdiction scoping | No | [S] `79dae4ef0`, moved in [P] |
| `pgr.department.scope.roles` / `pgr.jurisdiction.scope.roles` | empty | Roles restricted to their own HRMS department or jurisdiction on search, count and plainsearch | Yes (empty means unrestricted) | [S] `fe7cab604`, `9e650397b` |
| `pgr.escalation.states` | `PENDINGATLME,PENDINGFORASSIGNMENT` | States scanned by `EscalationScheduler`. Bomet's rollout notes advise adding `ESCALATEDLEVEL1,ESCALATEDLEVEL2` so levels 2–3 escalate (live value not verified). | No | [S] `718d65b16` |
| `allowed.source` | `whatsapp,web,mobile,RB Bot,email,inperson,letter,linhaverde` | Channel-of-receipt codes accepted on `service.source` | No | [S] `b22728730` |
| `egov.boundary.relationship.search.url` | `/boundary-service/boundary-relationships/_search` | Boundary subtree expansion | No | [S] `79dae4ef0` |

**Related, unchanged:** `pgr.notification.mdms.cache.ttl.ms=60000` already existed at base. It is now also the TTL of the per-tenant UIConstants cache that holds the action windows (`MDMSUtils.getUiConstants`), so MDMS edits take effect within about 60 s without a restart.

**Deploy paths:** none of the [K] keys above is set in any compose file, Ansible template or Helm value. They run on their `application.properties` defaults unless an operator adds env vars by hand. Confirmed with `git grep` over `local-setup`, `devops` and `configs`. On `feat/bomet-uat`, `ALLOWED_SOURCE` is set explicitly in every compose file, k8s and Helm (`ad6727607`, `f3b63a4fc`); nairobi-prod has no such env.

#### a.2 novu-bridge

None of these keys exists at base. Layer per key:

| Key (env) | Default | Controls | Layer / commit |
|---|---|---|---|
| `novu.bridge.kafka.user-otp.sms.topic` (`NOVU_BRIDGE_KAFKA_USER_OTP_SMS_TOPIC`) | `egov.core.notification.sms.otp` | New `UserOtpSmsConsumer` that bridges DIGIT `user-otp` SMS into the novu pipeline. Only effective if user-otp's `SMS_TOPIC` points here; compose still sets `SMS_TOPIC: egov.core.notification.sms` (`docker-compose.egov-digit.yaml:1553`). | [K] `2631f102c` (PR #39) |
| `novu.bridge.user-otp.default.tenant.id` (`NOVU_BRIDGE_USER_OTP_DEFAULT_TENANT_ID`) | **`bo`** | Tenant stamped on OTP SMS events and in the subscriber id `tenant:phone`, because user-otp messages carry no tenant. **Bonga must override it to `nb`** (unverified live). | [K] `2631f102c` |
| `novu.bridge.otp.sms.provider` | empty | `ozeki` or `bongatech` attaches that gateway's generic-sms override to OTP triggers through Novu; any other value means Novu's primary integration (`SmsProviderOverridesFactory`) | [S] `a3be88e59` (Ozeki); [K] `82ba44d57` added `bongatech` |
| `novu.bridge.sms.provider` | empty | Same, for PGR complaint SMS | [S] `a95f8df28`; [K] `82ba44d57` |
| `novu.bridge.sms.integration.identifier` | empty | Novu generic-sms integration to pin | [K] `82ba44d57`. Replaces [S] `novu.bridge.ozeki.integration.identifier` (`NOVU_BRIDGE_OZEKI_INTEGRATION_IDENTIFIER`, default `ozeki-sms`). **Renamed, and the default changed to empty.** |
| `novu.bridge.sms.sender.id` | empty | Bongatech sender ID; also Source Code `shortcode` | [K] `82ba44d57` |
| `novu.bridge.direct.channels` (`NOVU_BRIDGE_DIRECT_CHANNELS`) | empty | Channels delivered **without Novu** (`SMS`, `EMAIL`; WhatsApp is never eligible) | [S] `91aded4cd` |
| `novu.bridge.direct.sms.provider` | `ozeki` | Gateway for direct SMS: `ozeki`, `bongatech`, or `sourcecode` (nairobi-prod only) | [K] `82ba44d57`, `84c45ada2` |
| `novu.bridge.direct.sms.base.url` / `.username` / `.password` / `.token` | empty | Direct-gateway endpoint and credentials, shared by all providers | [K] `82ba44d57`. Replaces [S] `novu.bridge.direct.ozeki.base.url/username/password` (env `OZEKI_BASE_URL`, `OZEKI_USERNAME`, `OZEKI_PASSWORD`). **Renamed.** |
| `novu.bridge.direct.sms.service.id` | `0` | Source Code `service_id` | [K] `84c45ada2`. **nairobi-prod only** |
| `novu.bridge.direct.email.from`, `spring.mail.host/port(587)/username/password/properties.mail.smtp.auth(true)/starttls.enable(true)` (`SPRING_MAIL_*`) | empty / as shown | Direct SMTP email, used only if `EMAIL` is listed in `direct.channels` | [S] `91aded4cd` |

Everything is opt-in (empty means existing Novu behaviour) except the user-OTP default tenant, which applies whenever the consumer receives messages.

**History note:** the [P] sync `2176984d7` overwrote these properties with upstream's SmsCountry version. [K] `2631f102c` (PR #39 `fix/novu-bridge-restore-bongatech`) restored the Kenya keys and deleted `SmsCountryClient`. The deploy templates were left on the sync's SmsCountry wiring (see g.2).

#### a.3 Other backend or utility settings

- **`utilities/default-data-handler/src/main/resources/application.properties`** [S]: `default.localization.locale.list` became `en_IN,hi_IN,pt_PT` (`f42ad6594`). The schema list now uses `commonMDMSConfig.PrivacyPolicy` (`82fd6da0f`) and `common-masters.FormValidations` (`cdc20c299`).
- **`pgr.workflow.variant`** (code default `standard`; `cms` selects `CmsPgrWorkflowConfig.json`) [S] `bffdce15e`, in `DataHandlerService.java:63-65`.
- **filestore-scan-proxy** (new Node service, [K] `0c7b3f640`) reads its env directly in `backend/filestore-scan-proxy/server.js`:

  | Env | Default | Notes |
  |---|---|---|
  | `PORT` | 8083 | |
  | `FILESTORE_UPSTREAM` | `http://egov-filestore:8083` | Compose sets `http://kong:8000` |
  | `CLAMD_HOST` / `CLAMD_PORT` | `clamav` / 3310 | |
  | `SCAN_TIMEOUT_MS` | 15000 | |
  | `MAX_BODY_BYTES` | 26 MiB | |
  | `QUARANTINE_BUCKET`, `QUARANTINE_MINIO_URL`, `QUARANTINE_ACCESS_KEY`, `QUARANTINE_SECRET_KEY` | (unset) | Unset bucket means no quarantine |

  Documented in `backend/filestore-scan-proxy/README.md`.

---

### 8(b) Database migrations

#### b.1 Flyway `V*.sql` under `backend/*/src/main/resources/db/**`

**None added or changed** between base and nairobi-prod, and none between nairobi-prod and `feat/bomet-uat`. Checked with `git diff --name-status` over `*.sql`. The latest existing migrations (already in base) are `pgr-services/.../V20260810000000__tenant_business_calendar_grains.sql` and `novu-bridge/.../V20260701000000__extend_dispatch_unique_key.sql`.

Bomet's rollout notes record that the move from `kenya-prod-d723912` to `bomet-uat-6eb6b85` needed no new database migrations.

#### b.2 MDMS data migrations: `local-setup/docker/db-migrations/sql/egov-mdms/`

| File | Layer | Purpose |
|---|---|---|
| `V20260715000000__mapconfig_recode_from_colour_key.sql` | already at base | Re-keys `RAINMAKER-PGR.MapConfig` to `code` |
| `V20260827000000__uiconstants_recode_from_reopensla_key.sql` | [P] `2176984d7` | Re-keys `RAINMAKER-PGR.UIConstants` from `x-unique: ["REOPENSLA"]` to `code = "DEFAULT"` so REOPENSLA becomes editable (the old key produced `400 UNIQUE_KEY_UPDATE_ERR`). Deduplicates records and rewrites the schema in place. **Also moves any tenant still on the old 432000000 (5-day) seed to 259200000 (72 h).** |
| `V20260930000000__uiconstants_add_action_windows.sql` | [K] `c6fee0995` | Adds `WITHDRAWSLA` and `actionWindows` to the UIConstants schema (`additionalProperties:false`; `schema/v1/_update` is HTTP 501, so this can only be done in SQL). Seeds `WITHDRAWSLA: 259200000` on active records that lack it. Deliberately does **not** seed `actionWindows`. Idempotent and guarded. |

How they are applied:
- In the Ansible/compose stack, `db-migrations` is now **built from source** (`./docker/db-migrations`) and runs only `MIGRATION_SERVICES=egov-mdms` with history table `egov_mdms_schema_version` (`local-setup/docker-compose.migrations.yml`, `local-setup/docker/db-migrations/migrate-all.sh:107-114`). Flyway placeholder substitution is off.
- `local-setup/docker/db-migrations/sql/egov-mdms/README.md` still says boxes on the prebuilt `egovio/tilt-demo-db-migrations:latest` image must apply new files **by hand** with `docker exec docker-postgres psql -U egov -d egov < <file>`. That image is still referenced by `docker-compose.registry.yml:566`.
- Both counties already carry `WITHDRAWSLA` and `actionWindows` in `UIConstants` (live, 13 Oct), so `V20260930000000` has been applied on both.

#### b.3 Other hand-applied SQL in docs

- `docs/migration/operator-runbook.md` [P/S] (ServiceDefs to ComplaintHierarchy cut-over): `UPDATE eg_mdms_schema_definition SET definition=jsonb_set(definition,'{x-ref-schema}','[]'::jsonb) WHERE code LIKE 'RAINMAKER-PGR.ComplaintHierarchy%' …`. It is required, and must be re-applied after a data-handler re-seed.
- `docs/migration/validation-log-2026-08-24.md` [P]: `UPDATE eg_mdms_data SET data=jsonb_set(data,'{menuPath}','""') …` from a validation run.

#### b.4 Seed dumps (new installs only)

- `local-setup/db/full-dump.sql` changed in [P] `2176984d7` and [K] `638b50975` (icons). The k8s copy `devops/.../db-seed/files/full-dump.sql.gz` was regenerated in [K] `e0c99fd9b` and is guarded by the new CI `k8s-seed-dump-sync.yml`.
- Kenya-range net effect on the dump: role-action rows +615/−42, action rows +147/−3, `RAINMAKER-PGR.ServiceDefs` rows 35 → 2, `RejectionReasons` +5, and the UIConstants schema re-keyed.
- The **`common-masters.AnalyticsProvider` schema rows were removed from the dump** by `2176984d7` (counts: 0 at base, 3 at kenya-layer-start, 0 at nairobi-prod). `local-setup/scripts/seed-analytics-schema.sh` still claims "fresh compose stacks get the schema … from full-dump.sql", so on a fresh stack the schema must be registered by that script or by `ccrs-migrate.cjs`.
- `performance/dashboard/sql/*` [P] is performance tooling, not migrations.

---

### 8(c) MDMS: schemas and seed data

#### c.1 `RAINMAKER-PGR.UIConstants` and action windows

**Schema** (`utilities/default-data-handler/src/main/resources/schema/RAINMAKER-PGR.json`):
- `required: ["code","REOPENSLA"]` and `x-unique: ["code"]` [P].
- New optional properties `WITHDRAWSLA` (ms) and `actionWindows` [K `c6fee0995`]. Each `actionWindows` item has `action`, `windowKey` or `windowMs`, `measuredFrom` (`createdTime` or `lastModifiedTime`), and optional `message` / `notOwnerMessage`.

**Seed data:**
- `utilities/.../mdmsData-dev/RAINMAKER-PGR/RAINMAKER-PGR.UIConstants.json` [K]: `{code: DEFAULT, REOPENSLA: 259200000, WITHDRAWSLA: 259200000, actionWindows: [REOPEN from lastModifiedTime, WITHDRAW from createdTime]}`.
- `ansible/nairobi-mdms/mdms/RAINMAKER-PGR/UIConstants.json` (11 test or `ke` tenants) [P]: re-keyed to `code: DEFAULT` with `REOPENSLA` 432000000 → 259200000. **It has no `WITHDRAWSLA`**, so the 72 h fallback applies.

**Where the values are read** (`git grep -n "WITHDRAWSLA\|REOPENSLA" origin/nairobi-prod`):
- Backend: `backend/pgr-services/src/main/java/org/egov/pgr/util/MDMSUtils.java` (`getActionWindow`, `getUiConstants`). It reads the **city record first, then the state record**, then the `pgr.action.windows.defaults` rule. Values are cached per requesting tenant for `pgr.notification.mdms.cache.ttl.ms`. Enforcement is in `validator/ServiceRequestValidator.java` (`validateActionWindow`). Constants are in `PGRConstants.java:188`.
- UI:
  - `digit-ui-esbuild/products/pgr/src/utils/actionWindow.js` holds the same default rules, city record first.
  - `products/pgr/src/pages/citizen/ComplaintDetails.js:181-191` and `pages/employee/PGRDetails.js:274` gate Reopen and Withdraw.
  - `products/pgr/src/utils/withdraw.js` handles the Withdraw popup.
  - `packages/modules/pgr/src/hooks/useReopenWindow.js` is the upstream module.
  - `products/pgr/src/components/timelineInstances/{resolved,rejected}.js` show the window in the timeline.
- Configurator: `configurator/src/admin/schemaDescriptors/pgr-ui-constants.ts` exposes **only `code` and `REOPENSLA`**. `WITHDRAWSLA` and `actionWindows` must be edited through the MDMS API or a script.
- Docs: `docs/reopen-window.md`, `backend/pgr-services/README.md:108`, and `devops/.../env.yaml:301-306`.

#### c.2 Access-control masters

Summary only; detail is in section (e).
- `ACCESSCONTROL-ACTIONS-TEST` gains 2635, 2640–2648, 2650 and 2651. Actions 2008 and 2513 gain `resource` policies, and 2553/2554 get new `leftIcon` values.
- `ACCESSCONTROL-ROLEACTIONS` gains grants for those actions and loses all Moz `CMS_*` grants (seed for new tenants: `utilities/.../mdmsData/ACCESSCONTROL-*`).
- The same new actions appear in `ansible/nairobi-mdms/mdms/ACCESSCONTROL-*` for 7 reference tenants (+70 actions, +415 grants in the Kenya range).

#### c.3 Landing page

- Schemas `RAINMAKER-PGR.LandingPageConfig` and `RAINMAKER-PGR.LandingSection` [S] (`schema/rainmaker-pgr-landing.json`).
- [K] `64e5dee4e` (#102) adds a `helplines` section row (order 65, `titleKey PGR_LANDING_HELPLINES_TITLE`) to `mdmsData/RAINMAKER-PGR/RAINMAKER-PGR.LandingSection.json`.
- The **Bonga Nai content** (help lines 0725 624 489 / 0730 047 047 / 020 724 7047, contact email, hero, "Let's Make NAIROBI Work" band) is **bundled UI code** in `products/pgr/src/pages/citizen/Landing/content.ts` and its components, not MDMS (PRs #71 `294b09c3c`, #118, #152–#155). The language menu reads the tenant's `StateInfo.languages` (#154 `3c85ba791`).
- bgrm's landing is the separate UI branch `nairobi-prod-bgrm-changes`. It is an editorial variant with #154/#155 reverted (`f6ead681a`, `ba374fc51`, `bae16acca`) and has **no MDMS, label or config difference** from nairobi-prod (`git diff --name-status`).

#### c.4 Analytics providers

- Schema `common-masters.AnalyticsProvider` [S] `9fd66cdfc` (`local-setup/scripts/analytics-provider-schema.json`, registered by `local-setup/scripts/seed-analytics-schema.sh` or `ccrs-migrate.cjs` phase 2). It is not in the data handler's `default.mdms.schema.create.list`.
- Seed row [K] `f19dbd4a0`, `utilities/.../mdmsData/common-masters/common-masters.AnalyticsProvider.json`:
  - `code: matomo-bomet`, `type: MATOMO`, **`enabled: true`**, `siteId: "1"`.
  - Script and endpoint: `/matomo/matomo.js` and `/matomo/matomo.php`.
  - Goals: `Complaint.Created`=1, `Complaint.Rated`=2.
  - Custom dimensions: tenant, locale, surface, module.
- Write actions 2650/2651 [K] `cfe9947f9`: before this fix, the Configurator's Analytics Providers save returned AccessDenied for every role.
- Ops-only runtime keys (`ANALYTICS_KILL_SWITCH`, `ANALYTICS_SCRIPT_HOSTS`, `ANALYTICS_CUSTOM_ENABLED`) [S] `e9a0f0e43` are covered in g.4.

#### c.5 StateInfo, branding and theme

These apply to reference tenant `ke` only; live `nb`/`bo` are unverified.
- `ansible/nairobi-mdms/mdms/common-masters/StateInfo.json` [K] `32617c679`/`a12afdb44`: name "Kenya" becomes "Nairobi City County". `logoUrl`/`statelogo`/`logoUrlWhite` become `/digit-ui/nairobi-emblem.png`, `bannerUrl` becomes `/digit-ui/nairobi-login-bg.jpg`, and the `ka_IN` language entry is dropped.
- New `common-masters/ThemeConfig.json` [K] `32617c679`: Nairobi green `#003D1E` and gold `#FBE116` palette.
- `tenant/citymodule.json` [K] `23290a2ca`: PGR `bannerImage: /digit-ui/nairobi-home-banner.jpg`.
- The assets live in `digit-ui-esbuild/public/`.
- **Tenant-driven tab title and favicon** [K] `a95b7e9de` (#140):
  - `document.title` comes from label `CORE_APP_TITLE`; live wording per tenant by upsert (bo "Bomet Feedback Hub", nb "Bonga Nai", per the commit message).
  - The favicon comes from `common-masters.StateInfo.logoUrl`.

#### c.6 Complaint hierarchy and other masters

- **No Kenya-specific hierarchy seed in the repo.**
- [P] tooling: `docs/migration/servicedefs-to-complainthierarchy-migration.md`, `docs/migration/validation-log-2026-08-24.md`, and the `ccrs-migrate.cjs` "hierarchy" phase. The dump went from 35 to 2 ServiceDefs rows.
- Kenya UI behaviour depends on live hierarchy data:
  - Citizen-create auto-assignment ([K] `79bf0a3b8`, `3a5abdbea`) matches the `ComplaintHierarchy` leaf **department** against HRMS assignments, walking the boundary path narrowest first. It narrows to `PGR_LME` when the workflow has it.
  - The inbox subtype filter reads `RAINMAKER-PGR.ComplaintHierarchy` (`40bdfd420`).
- New master read by the UI: **`common-masters.Designation`** [K] (TopBar "Hello, <designation>", #132 `8d65727f7`). It uses `COMMON_MASTERS_DESIGNATION_*` and `COMMON_MASTERS_DEPARTMENT_*` labels.
- Schemas added [S]: `RAINMAKER-PGR.ComplaintExtendedAttributeSchema`, `ComplaintRelatedToMap`, `ComplaintTemplateType`, `LandingPageConfig`, `LandingSection`, and `commonMDMSConfig.PrivacyPolicy`; `tenant.citymodule` changed. The data-handler seeds for these are in `mdmsData`/`mdmsData-dev`.
- DSS/dashboard [P]:
  - `local-setup/db/dss-mdms-seed/schemas/dss.{DashboardConfig,DashboardPack,KpiDefinition}.json` and `ansible/nairobi-mdms/mdms/dss/*`.
  - Guarded by the new CI `analytics-seed-parity.yml`.
- `digit-mcp` changes are [P] only (`2176984d7`).

#### c.7 `docs/migration/ccrs-migrate.cjs`

- Added [S] `8ed37d902`. Its 11 phases are auth, schemas, hierarchy, pgr-masters, landing, cms, banner, analytics, matomo, gzip and verify, writing `RAINMAKER-PGR.*` landing/hierarchy masters, `tenant.citymodule`, `common-masters.AnalyticsProvider` and ACCESSCONTROL rows.
- [K] changes are Matomo fixes only (`8b62a3119`, `33a15c186`, `b1e2252d1`, `ec5a09b0c`):
  - The container name is now `digit-matomo` (env `MATOMO_CONTAINER`).
  - `docker compose … --profile matomo`.
  - DB credentials are read from the container env.
  - `EGOV_NETWORK_NAME` hint.

---

### 8(d) Workflow (business services)

**Files in the repo:**

| File | Changed? | Content |
|---|---|---|
| `utilities/default-data-handler/src/main/resources/PgrWorkflowConfig.json` | **unchanged** since base | Standard PGR (see the summary below) |
| `utilities/.../CmsPgrWorkflowConfig.json` | **added [S]** `bffdce15e` | Moz 3-level CMS chain, selected only by `pgr.workflow.variant=cms`. Roles are `CMS_*`: `PENDINGFORASSIGNMENT` → `REFERRED` → `INVESTIGATION` ↔ `INFOFROMCITIZEN` → `RESOLVED`/`REJECTED`. |
| `local-setup/dataloader/templates/PgrWorkflowConfig.json` | moved from `jupyter/` [P] | No content change |
| `ansible/nairobi-mdms/mdms/Workflow/*.json` | **unchanged** | `ke` reference data |

There is **no Kenya, Bonga or Bomet business-service file in the repo**.

**Standard PGR workflow** (`PgrWorkflowConfig.json`, SLA 432000000):

| From state | Action | To state | Roles |
|---|---|---|---|
| (start) | APPLY | PENDINGFORASSIGNMENT | CITIZEN, CSR |
| PENDINGFORASSIGNMENT | ASSIGN | PENDINGATLME | GRO, PGR_VIEWER |
| PENDINGFORASSIGNMENT | REJECT | — | GRO, PGR_VIEWER |
| PENDINGFORASSIGNMENT | ASSIGNEDBYAUTOESCALATION | — | AUTO_ESCALATE |
| PENDINGATLME | RESOLVE | — | PGR_LME, PGR_VIEWER |
| PENDINGATLME | REASSIGN | PENDINGFORREASSIGNMENT | PGR_LME, PGR_VIEWER |
| PENDINGATLME | ESCALATE | PENDINGATSUPERVISOR | — |
| PENDINGATLME | FORWARD | PENDINGATSUPERVISOR | — |
| RESOLVED / REJECTED | REOPEN | PENDINGFORASSIGNMENT | CFC, CITIZEN, CSR, PGR_VIEWER |
| RESOLVED / REJECTED | RATE | CLOSEDAFTER* | — |

`CANCELLED` exists as a terminal state with no action leading to it. **There is no WITHDRAW action.**

**Kenya code that assumes live workflow shapes not present in the repo:**
- **WITHDRAW** [K]: UI `withdraw.js` and the action windows (`c6fee0995`, `962aca541`) need a WITHDRAW transition. Live 13 Oct: bo has PENDINGATLME → CANCELLED and nb has PENDINGFORASSIGNMENT → CANCELLED, both for CITIZEN and CSR.
- **REASSIGNTOGRO** [K] `b6e1da18a`/`4c76fd923` (#150/#151): "Bonga's workflow now lets PGR_LME send a complaint at PENDINGATLME back to PENDINGFORASSIGNMENT with REASSIGNTOGRO". This is a live workflow change, not in the repo.
- **ESCALATEDLEVEL1–3** [K] labels (`203432ac5`) and status display (`5f947bdeb`). Live 13 Oct: Bonga's PGR has PENDINGFORASSIGNMENT, PENDINGATLME, ESCALATEDLEVEL1, ESCALATEDLEVEL2, REJECTED, RESOLVED, CLOSEDAFTERREJECTION, CLOSEDAFTERRESOLUTION and CANCELLED; Bomet's adds ESCALATEDLEVEL3.
- **2-level APPLY → PENDINGATLME with no ASSIGN** (Bomet): the reason for client-side auto-assignment at citizen create (`79bf0a3b8`).

---

### 8(e) Roles and access control

#### e.1 New API actions (default seed `utilities/.../mdmsData/ACCESSCONTROL-ACTIONS-TEST/…json`)

| id | URL | Granted to (default seed) | Layer / commit |
|---|---|---|---|
| **2635** | `/pgr-services/v2/request/_chronology` | CITIZEN, CMS_SCREENING_OFFICER, CONFIDENTIAL_COMPLAINT_VIEWER, CSR, EMPLOYEE, GRO, PGR_LME, PGR_VIEWER, SUPERUSER, WORKFLOW_ADMIN. The Nairobi seed has the same set minus CMS_SCREENING_OFFICER. | [K] `64e5dee4e` (#102); endpoint `df9aa019d` |
| 2640–2644 | `/pgr-services/v2/analytics/{_access,_query,packs,catalog/_search,_schema}` | GRO, PGR_ADMIN, PGR_LME, PGR_SUPERVISOR, PGR_VIEWER, SUPERUSER, SUPERVISOR, TICKET_REPORT_VIEWER | [P] `2176984d7` |
| 2645 | `/pgr-services/v2/analytics/config/_refresh` | LOC_ADMIN, MDMS_ADMIN, SUPERUSER | [P] |
| 2646 | `…/analytics/capabilities/officer` | HRMS_ADMIN, MDMS_ADMIN, PGR_ADMIN, PGR_SUPERVISOR, SUPERUSER, SUPERVISOR | [P] |
| 2647 / 2648 | `…/capabilities/reports` / `reports-extended` | PGR_VIEWER, TICKET_REPORT_VIEWER / TICKET_REPORT_VIEWER | [P] |
| 2650 / 2651 | `/mdms-v2/v2/_create\|_update/common-masters.AnalyticsProvider` | MDMS_ADMIN, SUPERUSER | [K] `cfe9947f9` |

Changed actions:
- **2008** `/pgr-services/v2/request/_search` [P]: new `resource.complaint.scope` (axes department and jurisdiction; GRO and PGR_LME OWN/OWN, SUPERVISOR OWN/ALL, default OWN/OWN). Also field-level REDACT rules on `citizen.mobileNumber`, `citizen.name` and `citizen.userName`.
- **2513** [P]: masters-level conditions (MDMS_ADMIN; SUPERVISOR for `common-masters.Department`).
- **2553/2554** [K] `638b50975` (#66): `leftIcon` `PGRIcon` becomes **`Search`** (Search Complaint) and **`Add`** (Create Complaint). The commit notes "Seed files only reach NEW tenants; the live tenant needs the MDMS update".
- 2565/2566 [S]: citizen `sidebarURL` changed from `/digit-ui/citizen/all-services` to `/digit-ui/citizen/pgr-home`.

Live evidence (13 Oct, read-only search of both counties):
- Action 2635 is granted to 21 roles on `bo` and 12 roles on `nb`.
- `CONFIDENTIAL_COMPLAINT_VIEWER` does not exist on `bo` or `nb`.
- Actions 2650/2651 exist on `bo` only.

#### e.2 New endpoints and their gating

| Endpoint | Gate |
|---|---|
| `/v2/request/_chronology` [K] | Action 2635 |
| `/v2/request/_admin/_search` [S] `dae9ec084` | **No action or grant in any repo seed** (`git grep` finds none). With Kong `ENFORCE_RBAC=true`, it returns 403 unless granted live. The employee-home OVERSIGHT tier uses that grant (`EmployeeHomeV2/tiers.js` header). |
| `/v2/employee/_context` [P] | Kong AUTH_OPTIONAL and the Helm mixed-mode whitelist |
| `/v2/analytics/public/catalog/_search`, `/v2/analytics/public/_options` [P] | Kong AUTH_OPTIONAL, with new rate-limited routes (60/min/IP, 1 MB) |

All mappings are identical on `feat/bomet-uat` (compared `@*Mapping` sets).

#### e.3 Roles

- Role seed (`utilities/.../ACCESSCONTROL-ROLE/ACCESSCONTROL-ROLES.roles.json`): **no role added or removed in the Kenya range**.
- [S] added `CENTRAL_USER`, `CMS_ADMIN`, `CMS_CASE_MANAGER`, `CMS_DASHBOARD_VIEWER`, `CMS_RECEPTION_OFFICER`, `CMS_SUPERVISOR`, `CMS_VIEWER`, `COMPLAINTS_CREATOR`, `COMPLAINTS_EDITOR`, `COMPLAINTS_VIEWER`, `CONFIDENTIAL_COMPLAINT_VIEWER`, `DEPARTMENT_USER` and `DGRO`.
- [P] `2176984d7` **removed every `CMS_*`-family grant** from the role-action seed (37 `CMS_CASE_MANAGER` lines alone). The roles remain without grants. Pairs: 393 at base, 728 at kenya-layer-start, 459 at nairobi-prod; nairobi-prod is base plus 66 new grants.
- UI-hardcoded role codes [K] that must be provisioned through live HRMS (not seeded):
  - `EmployeeHomeV2/tiers.js` CASEWORK: `DIRECTOR`, `CHIEF_OFFICER`, `CECM` (Nairobi bare codes) and `{HEALTH,WATER,ADMIN}_{DIRECTOR,CHIEF_OFFICER,CECM}` (Bomet).
  - OVERSIGHT: `SUPERUSER`, `CMS_ADMIN`, `Ombudsman_Officer`/`OMBUDSMAN_OFFICER`.
  - INTAKE: `CSR`, `CMS_RECEPTION_OFFICER`.
  - Read-only: `PGR_VIEWER`, `TICKET_REPORT_VIEWER`, `CMS_VIEWER`.
  - `PGRCard.js` uses the same `<DEPT>_*` codes.
- Backend: `CONFIDENTIAL_COMPLAINT_VIEWER` (`PGRConstants.ROLE_CONFIDENTIAL_VIEWER`) lifts confidential masking. After [K] `1a848286c` there is **no staff-owner exemption**; only a CITIZEN session counts as the owner.

#### e.4 Gateway enforcement [P]

`local-setup/kong/kong.yml` changes `ENFORCE_UNAUTH` and `ENFORCE_RBAC` from `false` to **`true`** (401 and 403 instead of audit logging). The file documents known gaps: `/common-persist` has no action rows, and PGR_ADMIN is referenced in role-actions but missing from roles. Whether live Kong configs carry this is unverified. Whitelist changes are in g.3.

---

### 8(f) Localization

- **Locales in the repo seeds** (`utilities/default-data-handler/src/main/resources/localisations/`): `default`, `en_IN`, **`pt_PT`** (new [S], `f42ad6594`), and `hi_IN` (dev only). Dashboard seeds `local-setup/db/dss-mdms-seed/l10n/{en_IN,pt_PT}.json`.
- **No `sw_KE` or other Kiswahili messages anywhere in the repo**. `sw_KE` appears only in Configurator examples and tests.
- Counts at base → kenya-layer-start → nairobi-prod:

  | Module | base | kls | np | Kenya range |
  |---|---|---|---|---|
  | en_IN `rainmaker-pgr` | 1078 | 1378 | 1442 | +64 |
  | en_IN `rainmaker-common` | 1629 | 1649 | 1661 | +27, −15 |
  | default `rainmaker-pgr` | 1183 | 1250 | 1315 | +65 |
  | default `rainmaker-common` | 1475 | 1479 | 1485 | +10, −4 |
  | pt_PT `rainmaker-pgr` | 0 | 284 | 290 | +6 |
  | pt_PT `rainmaker-common` | 0 | 59 | 60 | +1 |

**Keys added in the Kenya range** (seeded for new tenants only; live tenants need an upsert):

| Group | Keys | Commit |
|---|---|---|
| Receipt share (32) | `PGR_RECEIPT_*` (DOWNLOAD, PRINT, SHARE, SHARE_VIA/EMAIL/SMS/WHATSAPP/COPY…, NEXT_*, TITLE, SYSTEM_GENERATED…) | [K] `64e5dee4e`, `dfbb2ba26`, `7c589782f`, `945f668eb`, `abe1bd750`, `792faf7e8` |
| Withdraw | `WITHDRAW`, `WITHDRAW_SUCCESSFULLY`, `CS_ACTION_WITHDRAW`, `CS_COMMON_WITHDRAW`, `CS_WITHDRAWING`, `CS_WITHDRAW_{CONFIRM_HEADING,CONFIRM_MESSAGE,FAILED,REASON}`, `WF_PGR_WITHDRAW` | [K] `962aca541` |
| Reassign to GRO | `REASSIGNTOGRO`, `REASSIGNTOGRO_SUCCESSFULLY`, `CS_ACTION_REASSIGNTOGRO`, `CS_REASSIGNTOGRO_DONE_{HEADING,MESSAGE}`, `WF_PGR_REASSIGNTOGRO` | [K] `b6e1da18a`, `4c76fd923` |
| Escalation states | `CS_COMMON_ESCALATEDLEVEL{1,2,3}`, `CS_COMMON_PGR_STATE_ESCALATEDLEVEL{1,2,3}` | [K] `203432ac5` |
| Rating | `CS_RATING_LABEL_1..5` (also pt_PT) | [K] `dfbb2ba26` |
| Consent and confidential | `PGR_CONSENT_{TERMS_LABEL,SECTION_MANDATORY,SECTION_OPTIONAL}`; `PGR_EXT_IS_CONFIDENTIAL_HINT` reworded | [K] `64e5dee4e` |
| Upload scan | `CS_FILE_{VIRUS_DETECTED,NOT_SCANNABLE,SCAN_UNAVAILABLE}` | [K] `0c7b3f640` |
| Reopen | `CS_REOPEN_SUBMIT_ERROR` (en_IN, pt_PT) | [K] `2163f7ecf` |
| `rainmaker-common` | `CORE_APP_TITLE` (`a95b7e9de`); `CORE_TOPBAR_{HELLO,ROLE,DEPARTMENT,LOCATION,LAST_LOGIN}` (`9d97efb41`); `CORE_SESSION_COLLISION_*` ×10 (`117a1ed1f`); `CS_WORKING_CONTEXT*` ×6, `CS_ROLE_CONTEXT_{ADMIN,CITIZEN,RESOLVER}` ([P]); `DASHBOARD_CARD_HEADER`, `ULBGRADE_STATE` (`5d9420775`) | as listed |
| Dashboard export (dss seed, 41 keys in en_IN and pt_PT) | `DASHBOARD_EXPORT_*` (34), `DASHBOARD_COMMON_*` (6), `DASHBOARD_HEADER_*` (1) | [K] `706082ffc` |

Keys removed from the seeds by [P] `2176984d7`:
- en_IN `rainmaker-common`: `CCRS_PRIVACY_*` (8), `CORE_COMMON_BACK_TO_LOGIN`, `CORE_COMMON_PROFILE_PERSONAL_DETAILS`, `CORE_FORGOT_USERNAME_PLACEHOLDER`, `CS_CITIZEN_SIDEBAR_PGR`, `ENGLISH`, `PORTUGUESE`, `USERNAME`.
- default `rainmaker-common`: `ACTION_TEST_NATIONAL_PGR`, `CS_CITIZEN_SIDEBAR_PGR`, `ES_PGR_HEADER_COMPLAINT`, `MODULE_PGR`.
- This affects new tenants only; live tenants keep their stored messages.

**Kenya-specific label files:** none in the repo beyond the shared seeds. Per-tenant wording (for example `CORE_APP_TITLE` = "Bomet Feedback" / "Bonga Nai") and all Kiswahili labels are upserted live.

---

### 8(g) Deployment

#### g.1 Docker Compose (`local-setup/docker-compose*.y*ml`)

| Change | Files | Layer |
|---|---|---|
| **New services `clamav` (`clamav/clamav:1.5.4`), `filestore-scan-proxy` (`${FILESTORE_SCAN_PROXY_IMAGE:-filestore-scan-proxy:local}`, port 18183), `quarantine-init` (`egovio/mc:RELEASE.2024-01-16T16-06-34Z`)**, profile `file-scan`; volume `clamav_data`; `GATUS_PROFILE_FILE_SCAN` in every compose variant | `docker-compose.egov-digit.yaml` (+ Gatus env in `docker-compose.yml`, `.deploy.yaml`, `.registry.yml`, `.db-migrations.yml`) | [K] `0c7b3f640` |
| Proxy env: `FILESTORE_UPSTREAM=http://kong:8000`, `CLAMD_HOST=clamav`, `CLAMD_PORT=3310`, `QUARANTINE_BUCKET=egov-quarantine`, `QUARANTINE_MINIO_URL=http://minio:9000`, `QUARANTINE_ACCESS_KEY=scanproxy`, `QUARANTINE_SECRET_KEY=${MINIO_SCANPROXY_PASSWORD}` | same | [K] |
| quarantine-init: Creates the private bucket `egov-quarantine` with 90-day expiry and the MinIO users `scanproxy` (PutObject only) and `quarantine-reader` (read and list). Needs `MINIO_SCANPROXY_PASSWORD` and `MINIO_QUARANTINE_READER_PASSWORD`. | same | [K] |
| pgr-services: Default image `2.12-beta-96dcf10` → `2.12-5137119`; `EGOV_ACCESSCONTROL_HOST: http://egov-accesscontrol:8090`; `PGR_ABAC_STRICT_MODE: "false"`; `depends_on: egov-accesscontrol`; OTEL exporters overridable | `docker-compose.egov-digit.yaml` | [P] |
| Platform image pins: `egov-accesscontrol` → `${ACCESSCONTROL_IMAGE:-egovio/egov-accesscontrol:abac-changes-cb6a372}`; `egov-user` → `2.12-68f707e`; `mdms-v2` → `maven-jdk21-f3a7c13`; digit-ui, configurator, novu-bridge, config-service and user-preferences → `2.12-5137119`; digit-mcp → `egovio/digit-mcp:2.12-81fc6be`; otp-publisher → `egovio/otp-publisher:2.12-81fc6be`; `*-db` migrators → `2.12-5137119` | all compose variants | [P] |
| `db-migrations` moved out of the base file and now built from source; `jupyter` removed; `postgres-exporter` added to monitoring | `docker-compose.migrations.yml`, `.egov-digit.yaml`, `.monitoring.yml` | [P] |
| Matomo stack `matomo-db` (mariadb:11.4), `matomo` (matomo:5-apache, `127.0.0.1:${MATOMO_PORT:-18081}`), `matomo-archiver`, profile `matomo` | `docker-compose.matomo.yml` | [S] `1abef50f7`; [K] fixes `ec5a09b0c` (external network `${EGOV_NETWORK_NAME:-digit_egov-network}`), `0a247d679` (container names) |
| Bomet overlay (`inbox` STATE_LEVEL `ke`, `PGR_NOTIFICATION_CONFIG_DRIVEN: "true"`) | `docker-compose.bomet.yml` | unchanged since base |

#### g.2 novu-bridge env wiring (mismatch)

- `docker-compose.egov-digit.yaml` (novu-bridge block, [P]) passes `NOVU_BRIDGE_SMS_PROVIDER`, `NOVU_BRIDGE_SMS_SENDER_ID` and `NOVU_BRIDGE_SMSCOUNTRY_{URL,USER,PASSWORD}`, with a comment saying `smscountry` bypasses Novu.
- `local-setup/ansible/templates/digit.env.j2` writes the same variables (host_vars `novu_bridge_sms_provider`, `novu_bridge_sms_sender_id`, `novu_bridge_smscountry_*`).
- The release code **no longer has SmsCountry** (`2631f102c`). `SmsProviderOverridesFactory` accepts only `ozeki` and `bongatech`; any other value means Novu's primary integration.
- **Not wired in any compose file:**
  - `NOVU_BRIDGE_OTP_SMS_PROVIDER` and `NOVU_BRIDGE_SMS_INTEGRATION_IDENTIFIER` (the static test `local-setup/tests/static/deployment-contracts.test.ts:347` asserts the latter is absent).
  - `NOVU_BRIDGE_DIRECT_CHANNELS` and `NOVU_BRIDGE_DIRECT_SMS_*`.
  - `SPRING_MAIL_*`.
  - `NOVU_BRIDGE_USER_OTP_DEFAULT_TENANT_ID` and `NOVU_BRIDGE_KAFKA_USER_OTP_SMS_TOPIC`.
- The compose comment itself warns that an env var absent from the service block "never reaches the container". Bongatech or Source Code direct SMS on the live boxes must therefore come from hand-edited compose (unverified).
- Helm `common-services/novu-bridge/values.yaml` changed only its image tag (`develop-70916ea` → `2.12-5137119`, [P]).

#### g.3 Kong (`local-setup/kong/kong.yml`)

All Kong changes are [P] `2176984d7`:
- `ENFORCE_UNAUTH` and `ENFORCE_RBAC` set to `true`.
- Bundled `prometheus` plugin enabled.
- New routes `pgr-public-analytics-catalog-route` and `pgr-public-analytics-options-route` (POST, 60/min/IP, 1 MB).
- Removed services and routes `/jupyter`, `/grafana` and `/tempo`.
- **AUTH_OPTIONAL whitelist** (exact set diff):

  | Change | Entries |
  |---|---|
  | Added | `/egov-workflow-v2/egov-wf/businessservice/_search`, `/localization/messages/cache-bust`, `/pgr-services/v2/employee/_context`, `/pgr-services/v2/analytics/public/catalog/_search`, `/pgr-services/v2/analytics/public/_options`, `/novu-bridge/novu-adapter/v1/providers`, `…/providers/verify`, `…/providers/test-send` |
  | Removed | `/default-data-handler/tenant/new` |

- Helm `env.yaml` gateway whitelists mirror only the first three additions and the removal. The novu-bridge and public-analytics entries are Kong-only.
- No Kenya-specific Kong change: ClamAV deliberately leaves `kong.yml` untouched.

#### g.4 UI runtime config (`globalConfigs*`)

Every `getConfig` key present at nairobi-prod but not at base, per file. Exact `key === "X"` set diff.

| File | New keys (value) | What the key toggles | Layer / commit |
|---|---|---|---|
| `local-setup/nginx/globalConfigs.js` (local compose stack) | **`PGR_PII_MASKING`** (`false`) | Complainant and employee PII masking in the PGR UI: timeline actor, employee contacts, confidential card. Absent means ON (`products/pgr/src/utils/piiMasking.js`). Display-only; server masking is unaffected. | [K] `6bef31ae4` |
| same | **`HIERARCHY_TYPE`** (`"BOMET-Hierarchy"`) | Boundary hierarchy type for employee boundary queries | [K] `43359302a` |
| same, value changes | `stateTenantId` `ke` → **`bo`** | | [K] `43359302a` |
| same, value changes | Footer logos S3 → `/digit-ui/brand/digit-footer{,-bw}.png` | | [P] `2176984d7` |
| same, value changes | `localeRegion`/`localeDefault` `IN`/`en` → **`PT`/`pt`** (a leftover from Moz; both live counties' files have `localeDefault = "en"`) | | [S] `21a6f1f2e` |
| `digit-ui-esbuild/public/globalConfigs.js` (dev/default copy) | `PGR_PII_MASKING` (`false`) | as above | [K] `6bef31ae4` |
| same | `ANALYTICS_KILL_SWITCH` (`false`) | Hard-disables all analytics when `true` | [S] `e9a0f0e43` |
| same | `ANALYTICS_SCRIPT_HOSTS` (`[]`) | Extra allowed analytics script hosts | [S] `e9a0f0e43` |
| same | `ANALYTICS_CUSTOM_ENABLED` (`false`) | Allows `type: CUSTOM` provider rows | [S] `e9a0f0e43` |
| same, value changes | Footer logos [P]; locale `PT`/`pt` [S] | | |
| `local-setup/ansible/templates/globalConfigs.js.j2` (Ansible, the live path) | `PGR_PII_MASKING` (host_var `pgr_pii_masking`, default **false**) | as above | [K] `05d714058` |
| same | `ANALYTICS_*` ×3 (host_vars `analytics_kill_switch`/`analytics_script_hosts`/`analytics_custom_enabled`) | as above | [S] `e9a0f0e43` |
| same | `TESTING_MODE`, `TESTING_TENANT_ID` (only when `testing_ui_enabled`) | `/testing-ui` entrance | [S] `06ee871e6` |
| `configs/assets/globalConfigsPGR.js`, `local-setup/configs/assets/globalConfigsPGR.js`, `frontend/micro-ui/web/public/globalConfigs.example.js` | none (footer-logo values only) | | [P] |
| **NEW** `devops/deploy-as-code/charts/urban/digit-ui/files/globalConfigs.js.tpl` and `templates/globalconfigs-configmap.yaml` (Helm renders `globalConfigs.js`; no S3 upload) | 34 keys from `values.yaml` `globalConfigs:` | **Lacks `PGR_PII_MASKING`, `ANALYTICS_*` and `TESTING_*`**, so a Helm-rendered config masks PII. Several keys use names the UI does not read: `FOOTER_LOGO_URL`/`FOOTER_BW_LOGO_URL` (UI reads `DIGIT_FOOTER`/`DIGIT_FOOTER_BW`), `ASSET_S3_BUCKET` (`S3BUCKET`), `CONFIG_MODULE_NAME` (`UICONFIG_MODULENAME`), `BOUNDARYTYPE` (`BOUNDARY_TYPE`), `CENTRAL_INSTANCE_ENABLED` (`ENABLE_SINGLEINSTANCE`). `JWT_TOKEN` and `MDMS_V1/V2_CONTEXT_PATH` are also absent. This is a product issue. Both live counties' `globalConfigs.js` are generated by Ansible (`host_vars/nairobi.yml`, `host_vars/bometnew.yml`, per the files' header). | [P] `2176984d7` |

Runtime keys **read by the UI** that are new against base: `PGR_PII_MASKING` [K] (the only new one in the Kenya range), plus `ANALYTICS_*` and `TESTING_*` [S]. Extracted from all `getConfig`/`cfg`/`gc` call sites.

The OTP resend cooldown knob `OTP_RESEND_COOLDOWN_SECS` was added in `dfbb2ba26` and removed again in `7c589782f`. The cooldown is now a constant 180 s (`packages/modules/core/src/pages/citizen/Login/SelectOtp.js:134`), so it is **not configurable**.

#### g.5 nginx

- [K] `0c7b3f640`, `local-setup/ansible/templates/nginx-site.conf.j2`, all inside `{% if enable_file_scan %}`:
  - A `map $request_method $digit_filestore_upstream` sends GET/HEAD to Kong and everything else to the proxy on port 18183.
  - `/filestore/` uses `proxy_pass http://$digit_filestore_upstream`.
  - `location /file-store/egov-quarantine/ { return 403; }`.
- [S] `874ec2057`: `local-setup/nginx/digit-ui.conf` adds gzip and `Cache-Control: no-cache` on `/digit-ui/`. Also `/testing-ui` entrance (`06ee871e6`).
- [P]: `nginx_features.grafana` and `nginx_features.matomo` gating, and the Matomo tracker locations `/matomo/matomo.{js,php}`.
- [K] `eb71852f7` (#148): build id stamped into HTML and `build-info.json`; open tabs reload onto a new build. No nginx change is needed, because `/digit-ui/` is already served `no-cache`.

#### g.6 Helm (`devops/deploy-as-code/charts/environments/env.yaml` and charts)

All Helm changes are [P] `2176984d7`; there is no Kenya-specific Helm change:
- `monitoring:` block (all components off by default).
- `dev-enabled` changed to `"false"`; `citizen-otp-fixed`/`-enabled` commented out (off); `hrms-dev-mode` changed to `"false"`.
- `digit-ui.globalConfigs` rendered by the chart (replaces the S3 `custom-js-injection`).
- `digit-ui-v2.distUrl`.
- ingress-nginx metrics on, PrometheusRule off, ACAO `https://<domain_name>`.
- pgr-services `time-before-closing-complaint` removed, so `PGR_COMPLAIN_IDLE_TIME` is unset and MDMS rules.
- Prometheus and Alertmanager specs restructured; whitelists as in g.3.
- New charts: `backbone-services/matomo`, `core-services/user-bootstrap`, `monitoring/dashboards`, and `digit-mcp` in the helmfile.
- Image tags moved to `2.12-5137119` for pgr-services, novu-bridge, digit-config-service and user-preferences.
- New CI checks: `deploy-as-code-validation.yml` and `check-helm-values-paths.py`.
- **Helm does not carry:** `EGOV_ACCESSCONTROL_HOST` for pgr-services, `PGR_PII_MASKING`, any [K] pgr-services or novu-bridge key, or ClamAV.

#### g.7 Gatus (`local-setup/gatus/config.yaml`, `local-setup/k8s/tools/gatus.yaml`)

| Checks added | Layer |
|---|---|
| **Filestore Scan Proxy** (`http://filestore-scan-proxy:8083/health`, status 200 and `status == ok`) and **ClamAV** (`tcp://clamav:3310`), gated by `GATUS_PROFILE_FILE_SCAN` | [K] `0c7b3f640` |
| Grafana, Loki, OTEL Collector, Prometheus, Tempo, TLS Certificate | [P] |
| Matomo, Matomo DB | [S] |

None removed: 51 checks at base, 59 at nairobi-prod.

#### g.8 Tilt

All [P]:
- pgr-services dev image `multiarch-d448cb7` → `2.12-5137119` (`local-setup/Tiltfile`, `Tiltfile.k8s`).
- Jupyter resources removed.
- An optional `MONITORING=1` k8s monitoring stack.

#### g.9 Ansible (`local-setup/ansible/`)

New inventory keys:
- [K]:
  - `pgr_pii_masking` (default false; `05d714058`).
  - `enable_file_scan` (default false), `filestore_scan_proxy_image`, and `upstream_scan_proxy_port: 18183` (`0c7b3f640`).
  - New example `host_vars/nairobi.yml.example` (`32617c679`): `ke`/`ke.nairobi`, `hierarchy_type: NAIROBI-Hierarchy`, `+254` and `^[17][0-9]{8}$`, postal `^[0-9]{5}$`, `pgr_notification_config_driven: true`. It contains local test secrets; the values are not repeated here.
- [P]: `enable_matomo`, `matomo_auto_install`, `matomo_admin_user`, `upstream_matomo_port: 18081`, `observability_level`, `gatus_slack_webhook_url`, `dashboard_allowed_roles`, `accesscontrol_image`, `digit_ui_image`, `configurator_image`, `egov_user_image`, `mcp_image`, `otp_publisher_image`, `novu_bridge_sms_provider`, `novu_bridge_sms_sender_id`, `novu_bridge_smscountry_*`, `theme_primary_color*` and others.
- [S]: `analytics_kill_switch`, `analytics_script_hosts`, `analytics_custom_enabled`, `testing_ui_enabled`.

`templates/digit.env.j2` new variables:
- [K]: `FILESTORE_SCAN_PROXY_IMAGE`, `GATUS_PROFILE_FILE_SCAN`.
- [P]: `ACCESSCONTROL_IMAGE`, `BOOTSTRAP_USER`/`PASSWORD`, `GATUS_{OBSERVABILITY,PUBLIC_URL,SLACK_WEBHOOK_URL,TLS}`, `GF_ANONYMOUS_ENABLED`, `MATOMO_{PORT,ARCHIVE_INTERVAL}`, `NOVU_BRIDGE_{SMS_PROVIDER,SMS_SENDER_ID,SMSCOUNTRY_*,INTEGRATION_ID_WHATSAPP}`, `OTEL_{TRACES,METRICS}_EXPORTER`.

`playbook-deploy.yml` [K]:
- `0c7b3f640`: file-scan tasks. Builds `filestore-scan-proxy:local` on the box, generates the two MinIO passwords into OpenBao (`minio_scanproxy_password`, `minio_quarantine_reader_password`), starts the profile, and restarts clamav on a `clamd.conf` change.
- `18ac7a543` (#148): the static UI is rebuilt when `src/`, `esbuild.build.js` or `tailwind.config.ts` change.
- `local-setup/scripts/enable-uat-extras.sh` [K] `3ae0b4e07` wraps host_vars, deploy, Matomo, static assets and the frontend re-push for Bomet UAT. Its defaults are `TENANT=bomet` and port 18083.

#### g.10 Which deploy paths carry each new Kenya-relevant setting

| Setting | Compose (`docker-compose.egov-digit.yaml`) | Ansible (`digit.env.j2`/`globalConfigs.js.j2`/host_vars) | Local `nginx/globalConfigs.js` | Helm (`devops/`) | k8s (`local-setup/k8s`) |
|---|---|---|---|---|---|
| `PGR_PII_MASKING=false` | n/a (UI) | yes (`pgr_pii_masking`) | yes | **no** (masks) | n/a |
| ClamAV scan proxy | yes (profile `file-scan`) | yes (`enable_file_scan`) | n/a | no | Gatus check only |
| pgr padding / action-window / withdraw props | no (code defaults) | no | n/a | no | no |
| `EGOV_ACCESSCONTROL_HOST` / `PGR_ABAC_STRICT_MODE` | yes | via compose | n/a | **no** | unverified |
| novu-bridge direct-mode / OTP keys | **no** | **no** | n/a | no | no |
| `ALLOWED_SOURCE` env | no on nairobi-prod; **yes on bomet-uat** | via compose | n/a | bomet-uat only | bomet-uat only |

---

### 8(h) Backend differences: `origin/nairobi-prod` vs `origin/feat/bomet-uat` (under `backend/`)

- **Divergence:** merge-base is `9305e6239` (2026-09-23). Both branches share the sync `2176984d7`, `d72391231` (employee scope services), and action windows, as `c6fee0995` on nairobi-prod and `781906447` on bomet-uat.
- Action windows produce **identical** code and artefacts on both branches (`MDMSUtils.java`, `ActionWindow.java`, `validator/`, the SQL migration, schema and dev seed). Chronology and confidential masking are cherry-picked on bomet-uat as `5cd998fd0` and `5c02a2b20` (PR #133).
- REST mappings are identical on both branches.

| Present on nairobi-prod, **absent on feat/bomet-uat** | Files | Operational meaning |
|---|---|---|
| Complaint-number padding option (`da6df4be3`) | `util/ServiceRequestIdFormat.java`, `EnrichmentService`, `PGRQueryBuilder`, `PGRConfiguration`, property `egov.idgen.pgr.serviceRequestId.strip-sequence-padding=false` | On **bgrm**, pgr-services stores exactly what egov-idgen returns and **searches by exact ID only**. On **Bonga** the default is the same; with the flag on, new IDs drop the zero pad (`BNG-2026-125`) and search matches both forms. Live `common-masters.IdFormat`: nb `BNG-[cy:yyyy]-[SEQ_EG_CMSNAIROBI]`, bo `BFH-[cy:yyyy]-[SEQ_EG_PGRBOMET]`. Bomet numbers are padded to 6 digits (`BFH-2026-000020`, issue #45). |
| Source Code direct-SMS gateway (`84c45ada2`) | novu-bridge `NovuBridgeConfiguration`, `DirectDeliveryService`, property `novu.bridge.direct.sms.service.id` | bomet-uat's novu-bridge supports direct SMS through `ozeki` or `bongatech` only. Which novu-bridge image runs on bgrm is unverified. |
| `backend/filestore-scan-proxy/` (entire service, `0c7b3f640`) | — | A separate image; bomet-uat cannot build it. `nairobi-prod-bgrm-changes` does carry it (merge-base `0c7b3f640`; PR #158). |

Nothing is present on bomet-uat but absent on nairobi-prod under `backend/` (`git diff --stat` shows 9 insertions and 1,864 deletions going np → bu, all removals).

Deploy-config differences, np → bomet-uat:
- bomet-uat adds `ALLOWED_SOURCE` env to every compose, k8s and Helm pgr-services definition.
- bomet-uat lacks ClamAV, `nairobi.yml.example`, `ThemeConfig.json`, the #102 chronology and label seeds, and the #148 playbook fix.

**Known gap on both release backends (verified):** `5d429bd08` "fix(pgr-services): bound and batch the workflow search that enriches a page of complaints" (2026-10-07) is on `origin/feat/kenya-superset` only.
- nairobi-prod's `backend/pgr-services/src/main/java/org/egov/pgr/service/WorkflowService.java` is byte-identical to the pre-fix version, and `feat/bomet-uat` does not contain the commit either.
- Per its commit message, any deployment whose egov-workflow-v2 runs the stock `egov.wf.default.limit` (10) shows a citizen "Couldn't load your complaints" (`WORKFLOW_NOT_FOUND`) from their eleventh complaint on. Raising the workflow service's default page limit is the config-side mitigation; the live values are unverified.

---

### 8(i) Image build and tagging

| Workflow | Builds | Trigger | Tag rule |
|---|---|---|---|
| `.github/workflows/build.yml` | Maven services listed in `build/build-config.yml`: `pgr-services` (+ `pgr-services-db`), `novu-bridge` (+ `-db`), `digit-config-service` (+ `-db`), `digit-user-preferences-service` (+ `-db`), `default-data-handler`, `xstate-chatbot` (+ `-db`). Uses `build/maven/Dockerfile` with `WORK_DIR`. | `workflow_dispatch` (input `pipeline_name`) | `<last path segment of the branch>-<git short sha>`: `BRANCH="${GITHUB_REF##*/}"`. An existing matching tag is reused. Pushes `egovio/<image>:<tag>-amd64` and `-arm64`, then a multi-arch manifest `egovio/<image>:<tag>`. |
| `.github/workflows/spa-build.yml` | `configurator`, `digit-ui-esbuild`, `digit-ui-v2`, `digit-mcp`, `otp-publisher`, **`filestore-scan-proxy`** (added [K] `0c7b3f640`; also in `build/build-config.yml`) | `workflow_dispatch` | `${GITHUB_REF_NAME//\//-}-<short sha>`: slashes become dashes, so `feat/x` becomes `feat-x-…`. Multi-arch manifest. |
| `.github/workflows/release-build.yml` → `build-images.yml` | **All** images in `build/build-config.yml` at the release tag's commit | GitHub **release published**; runs from the default branch `master` (present on `origin/master` `43a974608`) | `egovio/<image>:<release-tag>` (immutable). `build-images.yml` defaults to `develop-<sha8>` when no version tag is given. |
| `nightly-build-develop.yml` | as above | schedule | `develop-<sha8>` |

**Known and derived tags:**
- Recorded in Bomet's rollout notes:
  - **`egovio/pgr-services:bomet-uat-6eb6b85`**, built from `feat/bomet-uat` at `6eb6b853c` (CI run 37767313762) and pinned on bgrm on 2026-10-09.
  - Alternative: `egovio/pgr-services:kenya-superset-031e77b`.
  - Previously running: `egovio/pgr-services:kenya-prod-d723912`.
- Derived from the workflow rules (**not verified on Docker Hub**):
  - pgr-services or novu-bridge built by `build.yml` from nairobi-prod at `8e6289e86` would be tagged **`nairobi-prod-8e6289e`**.
  - filestore-scan-proxy or digit-ui-esbuild built by `spa-build.yml` from nairobi-prod would also be tagged **`nairobi-prod-8e6289e`**.
  - A GitHub release named `X` yields `egovio/<image>:X` for every image.
  - The image actually running Bonga's pgr-services is **unverified**: it is not in the repository or the rollout notes.
- Default image pins in the repo (product 2.12 release build): `egovio/pgr-services:2.12-5137119` and the others in g.1. These are **not** Kenya builds.
- UI delivery: Ansible `digit_ui_mode: static` builds `digit-ui-esbuild` on the box (`host_vars/_example.yml:236-258`), or uses an optional `digit_ui_bundle_image`. bgrm's rollout shipped a prebuilt bundle, so live UI provenance is per build id, not an image tag.

---

---
## 9. Testing status

### Automated suites (run 13 Oct 2026 on a clean checkout of `nairobi-prod` @ `8e6289e86`, Node 20.20.2)

| Suite | Command (from the workspace) | Result |
|---|---|---|
| Frontend shell unit tests | `cd digit-ui-esbuild && npm test` | **192 / 192 pass** |
| Frontend product unit tests | `node --test $(find products -name '*.test.js')` (36 files) | **316 / 316 pass** |
| Production UI build | `npm run build` | **pass** |
| Module-alias check | `npm run check-aliases` | **17 / 17 resolve** |
| Configurator unit tests | `cd configurator && (cd packages/data-provider && npm install && npm run build) && npm ci && npx vitest run` | **228 / 229 pass** (28 / 29 files) |
| Gateway whitelist parity | `python3 .github/scripts/check-gateway-whitelist-parity.py` | **pass** (43 shared; 7 reviewed Kong-only) |
| Flyway ↔ dump alignment | `python3 .github/scripts/check-flyway-dump-alignment.py` | **pass** (13 aligned, 5 baseline-fresh) |
| Gatus coverage | `python3 .github/scripts/check-gatus-coverage.py` | **pass** (94 compose services, 59 endpoints per tier) |
| Playwright integration suite | `npx playwright test --list` | 298 tests in 106 files listed; **not run** (the suite changes tenant data) |
| Java unit tests | `mvn test` per service | **not run** (no JDK on the release machine; they run in the image build) |

**The configurator failure** is `src/admin/validation.postalCode.test.ts`, "full-dump.sql seeds the same FormValidations rows as the DDH seed (no drift)".
- **Cause:** the local database dump and the default seed carry different postal-code patterns (`^[1-9][0-9]{5}$` vs `^[0-9]{5}$`).
- **Scope:** fresh local stacks only. Neither county has a `common-masters.FormValidations` record.

### Recorded CI

| Workflow | Recent result |
|---|---|
| Flyway history-table match · Gatus coverage · DB seed sync · analytics seed parity · deploy-as-code validation | pass at each update of PR #49 (`master` ← `nairobi-prod`) |
| Flyway · Gatus on #157 | pass |
| Gateway whitelist parity | runs only when `kong.yml` or `env.yaml` change; last run 21 Sep on a kenya-prod PR, never on `nairobi-prod`; passes locally (above) |
| #152–#155 | no checks triggered |
| Local Setup CI | **fails**; no completed success in 66 runs since 4 Sep |
| Tilt CI | **fails** on every run since 15 Sep; last passed 4 Sep |

Both failing workflows stop at "Start services": the CI log reads "pull access denied for minio/minio". The minio image reference is identical at the product baseline, `kenya-layer-start` and `nairobi-prod`, so the failure is external and not caused by this release.

### Manual / UAT

The county flows were exercised on the live sites and on a local Bomet stack as each change was made:
- filing and auto-assignment;
- escalation;
- resolve, reopen and rate;
- withdraw;
- receipts and dashboard export.

The checks mostly used real officer accounts rather than an administrator. A formal UAT sign-off is not kept in the repository.

---
## 10. Known limitations and open issues

### 10.1 Known limitations (as in the release notes)

**Not yet in this release**
1. **Bomet: complaints filed by staff are not auto-assigned.** They reach the officer stage without an assignee, so they appear in no one's "assigned to me" list. A last-mile officer of that department whose area covers the complaint can still act on them. The fix (#81) is on `kenya-prod` and has not been brought to `nairobi-prod`.
2. **Bomet: a staff reopen without choosing an officer leaves the complaint unassigned** (#50, with #78 and #82, not brought over).
3. **"My Complaints" fails for a resident with more than 10 complaints** (`WORKFLOW_NOT_FOUND`) unless the workflow service's default page limit has been raised (not verified in either county); the fix (`5d429bd08`) is on neither county's code.
4. Not brought over from `kenya-prod`: readable messages when location access is refused (#55; the `CS_GEOLOCATION_*` labels are also unseeded) and the anonymous `/citizen` → login redirect (#59).

**Configuration to complete in the counties**
5. **No officer can see a confidential complainant** — the `CONFIDENTIAL_COMPLAINT_VIEWER` role does not exist in either county.
6. **Bomet: last-mile officers, department tiers and GROs see complainant names and phone numbers redacted.** Bomet's search policy on action 2008 shows them only to the complainant and to staff whose roles reach every department and area (CSR, OMBUDSMAN_OFFICER). If officers must call complainants back, add the department-and-area clause Bonga uses. This comes from the policy code; not checked on screen.
7. **Bomet: 11 categories still have 2-minute test escalation timers** in `RAINMAKER-PGR.EscalationConfig`: 8 on all three levels and 3 Water categories on levels 1–2. Examples are maternal emergencies, ambulance delays, corruption and water pipes. These complaints escalate at the next scheduler run (every 5 minutes by default). Escalation beyond level 1 runs automatically only if `PGR_ESCALATION_STATES` includes the escalated states (not verified).
8. **Receipts print `0000000000`** as the county's phone; the county e-mail is a placeholder and the `StateInfo` name reads "Demo" (both counties).
9. **No SMS or e-mail** is sent for WITHDRAW (both counties), REASSIGNTOGRO (Bonga) or ESCALATE (Bomet): no notification templates exist.
10. The distinct menu icons for Create and Search Complaint (#90) need an MDMS data update in both counties.
11. Bomet: six sample departments, sample designations and 18 Hindi notification templates remain; the `StateInfo` banner points to a missing image; the analytics endpoint value starts with a tab character.
12. Bonga: novu-bridge's OTP consumer defaults to tenant `bo`; Bonga must set `NOVU_BRIDGE_USER_OTP_DEFAULT_TENANT_ID=nb` (not verified from here).
13. The deploy templates are behind novu-bridge: they still pass the removed `NOVU_BRIDGE_SMSCOUNTRY_*` variables and do not pass the direct-SMS or OTP variables, so those must be set by hand on each server.
14. The configurator edits only `REOPENSLA`; `WITHDRAWSLA` and `actionWindows` are changed through the MDMS API.

**Behaviour to be aware of**
15. The map pin starts at the county centre. If the resident does not move it, the complaint is recorded at the centre.
16. Resolved and rejected complaints show in the default inbox — requested by Bomet; Nairobi's issue #144 asks for the opposite.
17. The citizen logout question reads "Are you sure you want to" (fix #72 not merged); the browser tab shows "DIGIT" until the county's labels load.
18. Video uploads over about 3.9 MB fail on Bonga (likely a web-server limit, issue #137). Re-sending an OTP does not invalidate the earlier one (#135, closed without a fix).
19. Manual escalation does not record the escalation-level bookkeeping that automatic escalation uses; this may explain the wrong level reported in issue #141.
20. The workflow definitions for `nb` and `bo` are not versioned in the repository.

**Inherited from CMS Mozambique V2.12**
21. Several deploy steps still use the default bootstrap password, so changing the bootstrap secrets breaks a full deploy (CMS Mozambique Known Limitation 1).
22. The staff filing form offers Mozambique's "Green Line" (Linha Verde) channel. Kenya's call-centre complaints have no channel of their own.
23. The product sync removed the role-action grants of the Mozambique CMS roles from the seed, and the configurator's role-action create/edit screens (the buttons remain). Kenya does not use those roles.
24. The configurator's telemetry is on by default (`kill: false`). Operator scripts keep Mozambique defaults (`enable-escalation.sh`: `TENANT=mz`; `deploy-pilot-fe.sh`: `release-v2.12-moz`).

### 10.2 Open issues that bear on shipped changes

| Issue | State | Relation to shipped changes |
|---|---|---|
| #144 | OPEN | Resolved and rejected shown in the inbox by default; conflicts with `31edfa212`. |
| #143 | OPEN | Reopen past SLA; #145 addresses it. |
| #141 | OPEN | Auto-escalation level number wrong after a manual escalation (product issue CCRS#2142). The nairobi-prod manual escalate does not write the level keys that #98 wrote. |
| #138 | OPEN | Share receipt; #142 says "Fixes #138". |
| #139 | OPEN | Share panel cosmetics. |
| #137 | OPEN | Video upload 413 at 3.9 MB on Bonga (nginx limit). |
| #149 | OPEN | Dropdown auto-scroll. |
| #127 | OPEN | "Send back to GRO"; implemented by #150/#151. |
| #124 | OPEN | Designation greeting; implemented by #132. |
| #116 | OPEN | Emergency helplines; added by #103, removed on Bonga by #155. |
| #115 | OPEN | Swahili support |
| #111 | OPEN | Landing refresh; #154 |
| #54 | OPEN | Geolocation raw keys; #55 is not ported. |
| #45 | OPEN | Bomet 7-digit case numbers |
| #66 | OPEN | Sidebar icons; data fix |
| #67 | OPEN | 5 MB photo cap |
| #68 | OPEN | Declaration of truthfulness. Only the T&C consent shows on Kenya tenants; the truthfulness and data-processing consents appear only with a category dispatcher (`CreatePGRFlowV2.tsx` lines 228–241). |
| #73 | OPEN | #91 still open |
| #74 | OPEN | Call-centre complaints are not auto-escalated. Possibly related to unassigned staff-filed complaints on Bomet (#81 absent); unverified. |
| #75 | OPEN | Fixed via #96. |
| #77 | OPEN | #78 is kenya-prod only. |
| #159 | OPEN | ClamAV enablement |

---

---
## 11. Not verified

1. **Container images on both servers.** Bonga's pgr-services and novu-bridge images, and bgrm's novu-bridge image, were not read from the boxes.
2. **novu-bridge settings in each county:**
   - the SMS gateway (Bongatech, Source Code or Novu's primary);
   - `NOVU_BRIDGE_USER_OTP_DEFAULT_TENANT_ID` (Bonga needs `nb`);
   - user-otp's `SMS_TOPIC`;
   - the direct-mode variables.
3. Whether the live gateways run with Kong `ENFORCE_UNAUTH` / `ENFORCE_RBAC = true`.
4. **The workflow service's default page limit** (`egov.wf.default.limit`). It decides whether a resident with more than 10 complaints hits `WORKFLOW_NOT_FOUND`.
5. **pgr-services escalation states** (`PGR_ESCALATION_STATES`) on bgrm. Automatic escalation beyond level 1 needs `ESCALATEDLEVEL1,ESCALATEDLEVEL2` added.
6. **The environment variable behind Bonga's unpadded complaint numbers.** The property is evidently on, because Bonga's numbers are unpadded.
7. **Filing twice on a double click.** Whether this can happen without Mozambique's double-submit guard (`3a299b851`) was not tested.
8. **The configurator's role-action Create/Edit buttons** after the product sync removed their routes (not browser-checked).
9. **Bomet's redaction rule on screen.** The policy code (`PolicyInputBuilder`: tenant-wide means no department and no area restriction) says last-mile officers, department tiers and GROs on Bomet see complainant names and phone numbers redacted (§3.4.1). Not checked on an officer's screen.

---
## 12. Documentation

- [Release notes (GitHub release body)](RELEASE-NOTES-CMS-KENYA-V2.12.md)
- [CMS Mozambique V2.12 release](https://github.com/eGov-Global/CMS-MOZAMBIQUE/releases/tag/v2.12-mozambique) and its [technical reference](https://github.com/eGov-Global/CMS-MOZAMBIQUE/blob/master/docs/mozambique/RELEASE-PREVIEW-CMS-MOZ-V2.12.md)
- [Bomet onboarding runbook](../../local-setup/ansible/runbooks/03-bomet-onboarding.md)
- [County host_vars templates](../../local-setup/ansible/inventory/host_vars/)
- [Reopen window](../reopen-window.md)
- [Migration runner guide](../migration/README.md)
- [Escalation runbook](../pgr-escalation/RUNBOOK.md)
- [Analytics setup](../analytics-guide/)
- [ClamAV scan proxy](../../backend/filestore-scan-proxy/README.md)
