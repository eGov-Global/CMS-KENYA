<!-- ============================================================
PASTE-READY GITHUB RELEASE
Tag:            v2.12-kenya
Release title:  CMS Kenya V2.12 — Bonga Nai (Nairobi City County) & Bomet Feedback Hub (Bomet County)
Target:         master, AFTER nairobi-prod has been merged into it.
                Code described: nairobi-prod @ 8e6289e86 (2026-10-13).
                bgrm's landing page lives on nairobi-prod-bgrm-changes @ 78444ee4e,
                which is NOT merged into master (see "Landing pages" below).
Live state:     read from bonga.nairobi.go.ke and bgrm.bomet.go.ke on 2026-10-13
                (read-only searches; evidence in RELEASE-PREVIEW-CMS-KENYA-V2.12.md).
                The Documentation links resolve once docs/kenya/ is on master.
Everything below this comment block is the release body — paste as-is.
============================================================ -->

**First official release of the CMS Kenya product line — Bonga Nai (Nairobi City County) and Bomet Feedback Hub (Bomet County).**

Repository: `eGov-Global/CMS-KENYA`
Product baseline: DIGIT Complaint Management System (`egovernments/Citizen-Complaint-Resolution-System` @ `815b2374`) — the same baseline as CMS Mozambique V2.12.
Lineage: product → CMS Mozambique → CMS Kenya. Kenya started on the product (PR #1, 19 Aug 2026) and merged Mozambique `master` @ `df7ca8d08` (30 Aug, tag `kenya-layer-start`) on 31 Aug.
This release describes the code on `nairobi-prod` @ `8e6289e86` (13 Oct 2026) and the configuration live in both counties on that date.

## Release Overview

CMS Kenya is the Kenyan implementation of the DIGIT Complaint Management System. Residents file and follow complaints in English or Kiswahili, on the web, from any device. County officers route, escalate and resolve them through each county's own workflow. County leadership follows performance on a dashboard and can export it.

One code line serves two counties:

| | **Bonga Nai** | **Bomet Feedback Hub** |
|---|---|---|
| County | Nairobi City County | Bomet County |
| Address | https://bonga.nairobi.go.ke | https://bgrm.bomet.go.ke |
| Tenant | `nb` | `bo` |
| Resident & staff application | `nairobi-prod` | `nairobi-prod-bgrm-changes`: the same application code, built separately |
| Public landing page | `nairobi-prod` | `nairobi-prod-bgrm-changes` |
| Complaint service (pgr-services) | `nairobi-prod` | `feat/bomet-uat` |

> **Landing pages were separated at the last moment.** `nairobi-prod`'s landing page has been Nairobi's since 23 Sep. When bgrm's UI moved to `nairobi-prod` on 9 Oct, its front page therefore showed Nairobi branding, and the Bonga Nai redesign (#154, #155) made it more visible. On 13 Oct bgrm's UI moved to its own branch, `nairobi-prod-bgrm-changes`. That branch is `nairobi-prod` plus one change: it brings back the Bomet landing page bgrm had before 9 Oct. The change spans 61 files: the landing page, its styles, an image loader in the build and the configurator's landing editor. Everything else is identical, and every non-landing change is merged into both branches (as #157 and #158 were). When `nairobi-prod` is merged into `master`, `master` carries the **Bonga Nai** landing page; bgrm keeps building from its branch until the landing page can be chosen per county by configuration.

---

## What's Included

### For residents
- **A public website for each county**, reachable without signing in (the site root opens it):
  - **Bonga Nai** — the county's 12 Oct design (utility strip, county crest masthead, hero, photo category cards, slogan band) and a single "Call Customer Service" panel: 0725 624 489 (24/7), 0730 047 047 and 020 724 7047, with a contact e-mail supplied by the county in the footer (#152–#155).
  - **Bomet Feedback Hub** — the Bomet page with its own wording, sub-counties and help lines (`nairobi-prod-bgrm-changes`); its text is configurable through 172 `PGR_LANDING_*` labels.
- **Filing a complaint**
  - **Terms & Conditions consent** is required before submitting and is stored with the complaint (#103).
  - **"Keep my details confidential"** is offered on every complaint (#103).
  - An optional **address** field on the first screen; what the resident types is saved and shown to the officer (#95, #104).
  - Complaint types and sub-types are listed **A–Z, with "Others" last** (#103).
  - The **map** opens at the county centre at street level with a pin the resident can move; it uses a vector street map with a fallback for older phones, and clearing a search keeps the current view (#4, #86, kenya-prod 18 Sep).
  - Questions whose answers could not be saved (name, address and e-mail on the first screen) are no longer asked (#96).
- **After filing**
  - **Complaint receipt** — an official PDF generated in the browser: Download, Print and Share on the confirmation and complaint pages. Share opens a dialog (Open PDF, E-mail, WhatsApp, SMS, More apps) and shares the PDF itself on phones. The prefilled message never contains the complainant's name or phone number (#103, #117, #119, #121, #129, #142).
  - **Progress timeline** without officers' names, phone numbers or internal comments (#103).
  - Escalated complaints show **"Escalated (Level n)"**, and the location reads as **County / Sub-County / Ward** names (#29, kenya-prod 21 Sep).
  - **Rating with five faces** instead of stars; earlier ratings are kept (#117).
  - **Reopen** within the county's window — 3 days after the last update in both counties. The button disappears when the window closes, even on a page left open (#136, #145).
  - **Withdraw** a complaint that is no longer needed, after a short confirmation with an optional reason — Bonga: within 1 day, before it is assigned; Bomet: within 3 days, while it is with the officer; never after a reopen (#146).
- **Everyday use**
  - The application downloads **less than half as much** at start-up (4.55 MB instead of 9.5 MB) — heavy screens, maps and PDF tools load only when needed (#103).
  - The browser tab shows the county's name and icon (#140).
  - After an update, open pages switch to the new version on their own (#148).
  - A brief network failure no longer drops the user onto the maintenance page; an expired session goes to the login page and keeps drafts; a notice explains when another account signs in from another tab.
  - The one-time password (OTP) can be re-sent after **3 minutes** (#117).

### For county officers and staff
- **Confidential complaints protected on the server** — the complainant's name, phone, e-mail and address are hidden from every officer, including the clerk who filed the complaint, unless the officer holds the `CONFIDENTIAL_COMPLAINT_VIEWER` role. Searches by person leave confidential complaints out, and staff notifications and domain events carry no complainant identity (#103, #128). The staff filing form offers "Keep details confidential" too (#125).
- **Manual escalation** — an officer passes a complaint to the next level and chooses the officer there (#103). Bonga: last-mile officer → Chief Officer → CECM. Bomet: last-mile officer → department Director → Chief Officer → CECM.
- **Bonga routing tools** — a last-mile officer can **reassign** a complaint to another last-mile officer of the same department (any ward) (#93), or **send it back to the GRO** queue, unassigned, with an optional comment (#150, #151).
- **Assign picker** — one searchable list matching names or departments; only last-mile officers; deactivated staff hidden (#79, #84, #88).
- **Take Action** is offered by role, not only to the assignee (#134). A half-filled action stays with its own complaint and action (#96, #147). The complaint page refreshes when the officer returns to the tab and after an action fails because the complaint changed (#131).
- **Withdraw on a resident's behalf** (front desk, call centre) with a confirmation and a required comment (#146). **Reopen** appears in Take Action only while the window is open (#145).
- **Filing on a resident's behalf** no longer fails with `INVALID_CASE_RELATED_TO`, and the optional address is saved (#95).
- **Inbox** — resolved and rejected complaints in the default list so the call centre can reopen them; the sub-type filter lists every sub-type; escalated statuses appear without ticking a filter, labelled Escalated Level 1–3; the timeline names the officer who escalated (#20, #23, kenya-prod 22–23 Sep).
- **New staff header** — greeting by designation ("Hello, Director"), live clock, language menu, profile card (department, role, location, last login); the city picker appears only for staff working in more than one city (kenya-prod 18–21 Sep, #132).
- The **Complaints card** is shown to Directors, Chief Officers, CECMs, Bomet's department tiers and the Ombudsman (#20, #83, kenya-prod 18 Sep).
- **Forgot password** sends the code to the mobile number entered with its country code, and no longer crashes (kenya-prod 10–21 Sep).
- Receipt buttons on the staff "complaint submitted" page (#121); working error, maintenance and not-found screens (#5).

### For county leadership
- **Dashboard export** — Excel (a summary plus a sheet per tile), CSV or a PDF report, each with the filters used, the KPIs against the previous period, and every chart, table and map as data (#130).
- Dashboard refinements from the product: language menu, "updated … ago" stamps, faster batched queries.
- **Behaviour analytics (Bomet)** — Matomo records the complaint funnel (each form step, submission outcome, landing pages) with personal data scrubbed (#34).

### For administrators & operators
- **Time windows enforced by the server** — REOPEN within `REOPENSLA` of the last update and WITHDRAW within `WITHDRAWSLA` of filing, set per county in `RAINMAKER-PGR.UIConstants` (#136).
- **Role-filtered timeline API** `/pgr-services/v2/request/_chronology` (access-control action 2635) (#103).
- **Complaint numbers without zero padding** (`BNG-2026-125`), opt-in; padded numbers are still found by search (`da6df4be3`; on for Bonga).
- **Virus scanning of uploads** with ClamAV — infected files are refused and quarantined, and the resident sees a clear message. Off by default (`enable_file_scan: true`, about 1.5 GB RAM) (#157, #158).
- **New builds reach open browsers** — a build id on every asset and a `build-info.json` the app checks; Ansible rebuilds the UI when its source changes (#148). The servers already send `Cache-Control: no-cache`.
- **SMS** — complaint SMS go through novu-bridge. The Bongatech gateway (direct or through Novu) and the Source Code gateway (direct only, `nairobi-prod`) are available alongside Ozeki, and SmsCountry was removed. OTP SMS can go through novu-bridge too, once user-otp's `SMS_TOPIC` points at its OTP topic; no deploy file sets that (#39, `82ba44d57`, `84c45ada2`).
- **PII display-masking switch** (`pgr_pii_masking` → `PGR_PII_MASKING`) in the runtime settings Ansible generates from each county's `host_vars`; off for Kenya (#22).
- **Product v2.12 sync** — policy-driven search scoping by department and jurisdiction, the employee working-context API, inbox visibility tabs, analytics capability checks, Helm and CI validation.

### Inherited from the product and CMS Mozambique

Kenya merged CMS Mozambique's `master` (as of 30 Aug 2026) on 31 Aug, and later synced the product to upstream `7ee88f83` (16 Sep 2026). In use in both counties:
- The **3-step resident form**: category pickers, drafts that survive a refresh, consent capture. Attachments (photo, video, audio) when filing and on every workflow action, played in the browser.
- **Action screens built from each county's workflow.** Reopen and rating keep the complaint's routing data; a reopen needs a reason and restarts the escalation clock.
- **Complaint categories as data** (`ComplaintHierarchy`, product); Kenya uses two levels.
- **Notifications** to the newest workflow step, with department names, acting-officer and deep-link placeholders. novu-bridge **direct delivery**, which Kenya extended with its own SMS gateways, and the OTP pipeline.
- The **analytics framework**: off by default, personal data scrubbed, with a destinations editor and Matomo provisioning.
- The **landing-page renderer** and the configurator's visual **Landing Page Builder**; theme colours from MDMS.
- Configurable escalation states; map, boundary-picker and translation fixes; master data cached in the browser (IndexedDB); compressed, always-revalidated UI delivery.
- From the product sync: policy-driven search scoping (configured in both counties, see below), RBAC enforcement in the shipped Kong configuration, Grafana login required, Helm and seed parity checks in CI.

Present but switched off or unused in Kenya:
- Mozambique's role-list search scoping (`pgr.department.scope.roles` and `pgr.jurisdiction.scope.roles` are empty); both counties scope search through the policy on access-control action 2008 instead;
- on-screen PII masking (`PGR_PII_MASKING=false`);
- the password-gated testing entrance;
- the reception-officer inbox and the four-tier CMS workflow and roles;
- the authority picker and per-authority questions (seeded for Mozambique only);
- the Portuguese language packs;
- the Ozeki SMS gateway;
- the admin cross-department search screen (neither county has an access-control action for its API).

Not carried over from Mozambique:
- the mobile app;
- the tutorial page;
- the self-contained security scanner and OpenSSF Scorecard (Kenya keeps the CI security pipeline);
- the reopen fresh-fetch fix;
- the double-submit guard on filing.

---

## Bonga vs bgrm — what differs

Both counties run the same resident and staff application code. They differ in the landing page, the build of the complaint service, and their configuration. Read from the live sites on 13 Oct 2026.

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

---

## Configuration, MDMS & workflow changes

Workflow and most MDMS records are live data: they are applied to each county's database, not shipped in the code. The state below is what each county runs on 13 Oct 2026.

### Bonga Nai (`nb`)
- **Workflow `PGR`** (last changed 12 Oct): APPLY → GRO queue → last-mile officer → Escalated Level 1 (Chief Officer) → Level 2 (CECM). It differs from the product's standard PGR workflow by:
  - escalation states with manual ESCALATE for the last-mile officer and the Chief Officer;
  - REASSIGN within the officer stage, to an officer of the same department (#93);
  - REASSIGNTOGRO (#150);
  - WITHDRAW before assignment (CITIZEN, CSR).
- **Who sees which complaints** (search policy on access-control action 2008):
  - Last-mile officers, Directors, Chief Officers and CECMs see their **own department and jurisdiction**.
  - GROs and front-desk staff (CSR) see **all** complaints.
  - Complainant names and phone numbers are redacted for staff outside the complaint's department or jurisdiction.
- **`RAINMAKER-PGR.UIConstants`**: `REOPENSLA` 3 days (from the last update), `WITHDRAWSLA` 1 day (from filing), `actionWindows` for REOPEN and WITHDRAW.
- **Categories** (`RAINMAKER-PGR.ComplaintHierarchy`): 21 types / 39 sub-types, including the new type **Others** (72 hours).
- **Complaint numbers** (`common-masters.IdFormat`): `BNG-[year]-[sequence]`, unpadded.
- **Branding**: Nairobi `ThemeConfig` (green) and `StateInfo` (emblem, login photo).
- **Access control**: timeline action 2635 granted to 12 roles.
- **Labels**: app title "Bonga Nai"; designation and department names; receipt, share, withdraw and reassign-to-GRO labels; the Kiswahili audit labels (Oct 2026).

### Bomet Feedback Hub (`bo`)
- **Workflow `PGR`** (last changed 9 Oct): APPLY → last-mile officer (auto-assigned) → Escalated Level 1 (department Director; Water: Chief Officer) → Level 2 (Chief Officer; Water: CECM) → Level 3 (CECM). It differs from the product's standard PGR workflow by:
  - APPLY going straight to the officer;
  - three departmental escalation levels, with manual ESCALATE for the officer and each tier;
  - WITHDRAW while the complaint is with the officer (CITIZEN, CSR).
- **Who sees which complaints** (search policy on action 2008):
  - Department tiers and last-mile officers see their **own department and jurisdiction**.
  - GROs see all departments in their own jurisdiction.
  - Front-desk staff (CSR) and the Ombudsman see **all** complaints.
  - Complainant names and phone numbers are shown only to the complainant and to staff whose roles reach every department and every area (CSR, OMBUDSMAN_OFFICER). Last-mile officers, department tiers and GROs see them redacted.
- **`RAINMAKER-PGR.UIConstants`**: `REOPENSLA` 3 days, `WITHDRAWSLA` 3 days, `actionWindows`.
- **`RAINMAKER-PGR.EscalationConfig`**: up to 3 levels, default 60 h / 18 h / 18 h, 91 per-category overrides.
- **`RAINMAKER-PGR.InboxVisibilityConfig`**: jurisdiction-scoped, server-side, reportee depth 3.
- **`common-masters.AnalyticsProvider`**: Matomo, site 1.
- **Categories**: 48 types / 94 sub-types (142 records), each mapped to Health, Water & Sewage or Administration.
- **Complaint numbers**: `BFH-[year]-[sequence]`, zero padded to 6 digits.
- **Access control**: timeline action 2635 granted to 21 roles; analytics actions 2650/2651 (MDMS_ADMIN, SUPERUSER).
- **Labels**: app title "Bomet Feedback" / "Maoni ya Bomet"; 172 landing-page labels; designation and department names; withdraw labels; the Kiswahili audit labels (Oct 2026).

### New settings introduced by this release

Everything below is **opt-in or a fallback** unless stated. None of the Kenya-added pgr-services keys (padding, action windows, withdraw window) is set by any deploy file; Compose sets `EGOV_ACCESSCONTROL_HOST` and `PGR_ABAC_STRICT_MODE`.

| Setting | Where | Default | What it does |
|---|---|---|---|
| `egov.idgen.pgr.serviceRequestId.strip-sequence-padding` | pgr-services | `false` | Complaint numbers without the zero pad (`BNG-2026-125`); search finds both forms. **`nairobi-prod` only** — not in bgrm's `feat/bomet-uat` build. |
| `PGR_ACTION_WINDOWS_DEFAULTS`, `PGR_COMPLAIN_WITHDRAW_TIME`, `PGR_COMPLAIN_IDLE_TIME` | pgr-services | 72 h each | Fallback REOPEN/WITHDRAW windows, used only when the county's `UIConstants` has no value (the reopen fallback dropped from 10 days to 72 h). |
| `EGOV_ACCESSCONTROL_HOST`, `PGR_ABAC_STRICT_MODE` | pgr-services | compose: `egov-accesscontrol:8090`, `false` | Policy lookup for department/jurisdiction search scoping (product sync). Fails closed if access control is unreachable. |
| `NOVU_BRIDGE_USER_OTP_DEFAULT_TENANT_ID` | novu-bridge | **`bo`** | Tenant stamped on OTP SMS. **Bonga must set `nb`.** |
| `NOVU_BRIDGE_DIRECT_SMS_PROVIDER` (`ozeki` · `bongatech` · `sourcecode`), `NOVU_BRIDGE_DIRECT_SMS_BASE_URL` / `_USERNAME` / `_PASSWORD` / `_TOKEN`, `NOVU_BRIDGE_DIRECT_SMS_SERVICE_ID` (Source Code), `NOVU_BRIDGE_SMS_SENDER_ID`, `NOVU_BRIDGE_SMS_INTEGRATION_IDENTIFIER` | novu-bridge | provider `ozeki`; service id `0`; others empty | Direct SMS gateways, used for the channels listed in `NOVU_BRIDGE_DIRECT_CHANNELS` (inherited). **Renamed:** `OZEKI_*` became `NOVU_BRIDGE_DIRECT_SMS_*`, and `NOVU_BRIDGE_OZEKI_INTEGRATION_IDENTIFIER` (default `ozeki-sms`) became `NOVU_BRIDGE_SMS_INTEGRATION_IDENTIFIER` (default empty). `sourcecode` exists only on `nairobi-prod`. |
| `NOVU_BRIDGE_KAFKA_USER_OTP_SMS_TOPIC` | novu-bridge | `egov.core.notification.sms.otp` | OTPs through novu-bridge — effective only when user-otp's `SMS_TOPIC` points to it. |
| `PGR_PII_MASKING` (host_var `pgr_pii_masking`) | UI runtime config | `false` (Ansible) | Display masking of names and phones in the staff UI. **An absent key means masking on.** Server-side confidential masking is separate. |
| `enable_file_scan`, `filestore_scan_proxy_image`, `upstream_scan_proxy_port` (18183) | Ansible | `false` | ClamAV upload scanning: adds `clamav`, `filestore-scan-proxy` and `quarantine-init`, a 90-day `egov-quarantine` bucket, two OpenBao passwords and two Gatus checks. Compose/Ansible only. |

**MDMS schema and data migrations** (no new Flyway migrations in any backend service):
- `V20260827000000__uiconstants_recode_from_reopensla_key.sql` (product) — re-keys `RAINMAKER-PGR.UIConstants` to `code = DEFAULT` so `REOPENSLA` becomes editable, and moves the old 5-day seed to 72 h.
- `V20260930000000__uiconstants_add_action_windows.sql` (Kenya) — adds `WITHDRAWSLA` and `actionWindows` to the schema. It must run as SQL (the schema update API returns 501). Both counties already carry the new fields.

**Access-control actions** — new: 2635 (timeline), 2640–2648 (analytics, product), 2650/2651 (`AnalyticsProvider` writes). Changed: 2008 complaint search gains a department/jurisdiction scope policy and field redaction (product); 2553/2554 get distinct menu icons (#90; not yet applied in either county).

**Gateway (Kong)** — the product sync switches `ENFORCE_UNAUTH` and `ENFORCE_RBAC` from audit to **enforced** (401/403), and adds to the sign-in-optional list: workflow business-service search, localization cache-bust, employee working context, the public analytics endpoints and the novu provider endpoints.

**Labels** — 64 `rainmaker-pgr`, 27 `rainmaker-common` and 41 dashboard-export English keys are seeded for **new** tenants; existing counties receive them by upsert. Kiswahili exists only as live data: the repository has no `sw_KE` messages.

**Workflow** — the repository's standard PGR workflow is unchanged. Each county's workflow (WITHDRAW, REASSIGNTOGRO, ESCALATEDLEVEL1–3, Bomet's APPLY straight to the officer) exists only in that county's database.

---

## Changes by Area (summary)

| Area | Highlights |
|---|---|
| **Backend (pgr-services)** | Server-side confidential masking with no staff exemption · role-filtered timeline API · REOPEN/WITHDRAW time windows · optional unpadded complaint numbers · policy-driven search scoping (product sync) · department-name cache that survives a brief MDMS outage |
| **Backend (novu-bridge)** | Bongatech and Source Code SMS gateways · OTP consumer (needs user-otp's `SMS_TOPIC`) · SmsCountry removed |
| **File uploads** | Optional ClamAV scanning proxy with quarantine (off by default) |
| **Frontend (residents)** | County landing pages · consent and confidentiality at filing · offline PDF receipt and share dialog · face rating · live reopen and withdraw windows · faster start-up · tab title per county |
| **Frontend (staff)** | Manual escalation · reassign and send back to GRO (Bonga) · searchable assign picker · Take Action by role · new header with designation greeting · inbox defaults for escalated, resolved and rejected complaints |
| **Dashboard** | Export to Excel, CSV and PDF |
| **Workflow** | Bonga: GRO-led 2-level escalation, reassign, reassign-to-GRO, withdraw · Bomet: auto-assigned 3-level departmental escalation, withdraw |
| **Configuration / MDMS** | `UIConstants` action windows · `EscalationConfig`, `InboxVisibilityConfig`, `AnalyticsProvider` (Bomet) · county categories, numbering, branding |
| **Roles & access** | County officer tiers · timeline action 2635 · analytics write actions (Bomet) |
| **Localization** | English and Kiswahili on both counties · county app titles · Bomet landing text |
| **Deployment** | Per-county Ansible host_vars · new-build pickup · ClamAV option · Matomo provisioning fixes |

---

## Testing / UAT

Automated suites, run on 13 Oct 2026 against `nairobi-prod` @ `8e6289e86`:

| Suite | Result |
|---|---|
| Frontend shell unit tests | **192 / 192 pass** |
| Frontend product unit tests (36 files) | **316 / 316 pass** |
| Production UI build · module-alias check | **pass** · **17 / 17 aliases resolve** |
| Configurator unit tests | **228 / 229 pass** — the failure is a seed mismatch: the local database dump and the default seed hold different postal-code patterns (5 vs 6 digits). It affects fresh local stacks only; neither county has a `FormValidations` record. |
| CI parity guards (gateway whitelist, Flyway ↔ dump, Gatus coverage) | **3 / 3 pass** |
| Playwright integration suite | 298 tests in 106 files listed; **not run** — the suite changes tenant data and was not pointed at the live counties |
| Java unit tests (pgr-services, novu-bridge) | **not run locally** (no JDK on the release machine); they run during the image build |

Recorded CI:
- On PR #49 (`master` ← `nairobi-prod`), the Flyway, Gatus, DB-seed, analytics-seed and deploy-as-code checks pass at each update.
- On #157, Flyway and Gatus pass.
- The gateway-whitelist check runs only when gateway files change and has not run for `nairobi-prod`; it passes locally (above).
- #152–#155 triggered no checks.
- **Local Setup CI and Tilt CI fail:** `minio/minio` can no longer be pulled in CI (Tilt CI last passed on 4 Sep). The image reference is unchanged since the product baseline, so the failure is external and not caused by this release.

Manual / UAT: the county flows were exercised on the live sites and on a local Bomet stack as each change was made — filing, auto-assignment, escalation, resolve / reopen / rate, withdraw, receipts, dashboard export — mostly with real officer accounts rather than an administrator. A formal UAT sign-off is not kept in the repository.

---

## Known Limitations

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

---

## Upgrade / Deployment Notes

- **Two UI builds.** Build Bonga from `nairobi-prod` and bgrm from `nairobi-prod-bgrm-changes`. Merge every change outside the landing page into both branches.
- **Merging into `master`.** `master` will carry the Bonga Nai landing page; tag this release on `master` after the merge. bgrm's landing branch stays separate.
- **Order.** Deploy pgr-services before the UI: the UI's timeline needs the chronology API, and the server enforces the action windows the UI displays. Grant action 2635 to every role that opens a complaint, or the timeline is empty (done in both counties).
- **Caches.** Workflow definitions are cached for about 15 minutes (an `_update` call refreshes them; a direct database edit does not). Role permissions are cached for about 15 minutes. After a label upsert, clear the localization cache, or the UI serves stale text.
- **Virus scanning.** To enable ClamAV, set `enable_file_scan: true` in the county's host_vars and allow about 1.5 GB of extra memory (issue #159).
- **Database.** The MDMS migration `V20260930000000` (action windows in `UIConstants`) runs as SQL on each MDMS database; both counties already have it. No backend service adds a Flyway migration.
- **Per-county settings** live in Ansible `host_vars` (templates: `nairobi.yml.example`, `bomet.yml.example`). Bomet onboarding: `local-setup/ansible/runbooks/03-bomet-onboarding.md`. Kenya deploys with Ansible/Compose; the Helm chart's UI config lacks `PGR_PII_MASKING` and would mask names.
- **Publishing this release builds images.** `release-build.yml` builds every service at the tagged commit and pushes `egovio/<image>:v2.12-kenya` to Docker Hub. Those become the images to pin. bgrm's pgr-services can then move from `bomet-uat-6eb6b85` to the release build: the code is the same, plus the padding option, which stays off unless set. The release's UI image carries the Bonga Nai landing page, so bgrm keeps its own UI build.

---

## Container Image Inventory

> **To complete before tagging:** record the images running in each county, as CMS Mozambique V2.12 did. On each server, run `docker ps --format '{{.Names}}\t{{.Image}}' | sort`.

Known on 13 Oct 2026:

| Component | Bonga Nai | Bomet Feedback Hub |
|---|---|---|
| Resident & staff UI | static build of `nairobi-prod`, build id `111d80717226` | static build of `nairobi-prod-bgrm-changes`, build id `f5815743da37` |
| pgr-services | built from `nairobi-prod` (tag to record) | `egovio/pgr-services:bomet-uat-6eb6b85` (per the rollout notes) |
| Other services | to record | to record |

---

## Documentation

- [Release audit / evidence document](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/RELEASE-PREVIEW-CMS-KENYA-V2.12.md) — full product-baseline comparison, PR inventory and live-configuration capture behind these notes
- [County release note](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/COUNTY-RELEASE-NOTE-CMS-KENYA-V2.12.md) — plain-language summary for Nairobi City County and Bomet County officials
- [CMS Mozambique V2.12 release](https://github.com/eGov-Global/CMS-MOZAMBIQUE/releases/tag/v2.12-mozambique) — the line this release builds on
- [Bomet onboarding runbook](https://github.com/eGov-Global/CMS-KENYA/blob/master/local-setup/ansible/runbooks/03-bomet-onboarding.md)
- [County host_vars templates](https://github.com/eGov-Global/CMS-KENYA/tree/master/local-setup/ansible/inventory/host_vars)
- [Migration runner guide](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/migration/README.md)
- [Escalation runbook](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/pgr-escalation/RUNBOOK.md)
- [Analytics setup](https://github.com/eGov-Global/CMS-KENYA/tree/master/docs/analytics-guide)

<!-- ============================================================
END OF RELEASE BODY

When nairobi-prod has been merged into master:

1. Tag the merge commit on master:
     git tag -a v2.12-kenya <MASTER_MERGE_SHA> -m "CMS Kenya V2.12 - Bonga Nai (Nairobi) and Bomet Feedback Hub (Bomet)"
     git push origin v2.12-kenya

2. Create the GitHub release with this body:
     gh release create v2.12-kenya \
       --repo eGov-Global/CMS-KENYA \
       --title "CMS Kenya V2.12 — Bonga Nai (Nairobi City County) & Bomet Feedback Hub (Bomet County)" \
       --notes-file docs/kenya/RELEASE-NOTES-CMS-KENYA-V2.12.md
   (strip these HTML comment blocks first, or paste the body in the web UI)
   NOTE: publishing the release triggers .github/workflows/release-build.yml, which
   builds EVERY image in build/build-config.yml at the tagged commit and pushes
   egovio/<image>:v2.12-kenya to Docker Hub (immutable tags). Save it as a draft
   first if the images should not be built yet.

3. Optionally tag bgrm's landing branch for traceability:
     git tag -a v2.12-kenya-bgrm-landing origin/nairobi-prod-bgrm-changes -m "bgrm landing page for CMS Kenya V2.12"

Full evidence & internal detail: RELEASE-PREVIEW-CMS-KENYA-V2.12.md (this folder)
============================================================ -->
