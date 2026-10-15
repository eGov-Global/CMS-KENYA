<!-- ============================================================
PASTE-READY GITHUB RELEASE
Tag:            v2.12-kenya
Release title:  CMS Kenya V2.12 — Bonga Nai (Nairobi City County) & Bomet Feedback Hub (Bomet County)
Target:         master, AFTER nairobi-prod has been merged into it.
                Code described: nairobi-prod @ 32a56d27d (2026-10-13); tests ran at
                8e6289e86 — the only later commit adds the scan proxy's load-test tooling.
                bgrm's landing page lives on nairobi-prod-bgrm-changes @ 78444ee4e,
                which is NOT merged into master (see "Landing pages" below).
Live state:     read from bonga.nairobi.go.ke and bgrm.bomet.go.ke on 2026-10-13
                (read-only searches; evidence in RELEASE-PREVIEW-CMS-KENYA-V2.12.md).
                The Documentation links resolve once docs/kenya/ is on master.
Everything below this comment block is the release body — paste as-is.
============================================================ -->

**First official release of CMS Kenya V2.12, built on CMS V2.12, for Bonga Nai (Nairobi City County) and Bomet Feedback Hub (Bomet County).**

Repository: `eGov-Global/CMS-KENYA`
Built on: **CMS V2.12**, the DIGIT Complaint Management System (`egovernments/Citizen-Complaint-Resolution-System`; baseline `815b2374`, updated on 16 Sep 2026 to `7ee88f83`).
This release describes the code on `nairobi-prod` @ `32a56d27d` (13 Oct 2026) and the configuration live in both counties on that date.

## Release Overview

CMS Kenya is the Kenyan implementation of CMS V2.12, the DIGIT Complaint Management System. Residents file and follow complaints in English or Kiswahili, on the web, from any device. County officers route, escalate and resolve them through each county's own workflow. County leadership follows performance on a dashboard and can export it.

One code line serves two counties:

| | **Bonga Nai** | **Bomet Feedback Hub** |
|---|---|---|
| County | Nairobi City County | Bomet County |
| Address | https://bonga.nairobi.go.ke | https://bgrm.bomet.go.ke |
| Tenant | `nb` | `bo` |
| Resident & staff application | `nairobi-prod` | `nairobi-prod-bgrm-changes`: the same application code, built separately |
| Public landing page | `nairobi-prod` | `nairobi-prod-bgrm-changes` |
| Complaint service (pgr-services) | `nairobi-prod` | `feat/bomet-uat` |

---

## Highlights

- **Security fixes.**
  - Confidential complainants are masked by the server, the resident timeline comes from a role-filtered API, and REOPEN/WITHDRAW windows are enforced server-side.
  - From CMS V2.12: gateway enforcement (`ENFORCE_UNAUTH` / `ENFORCE_RBAC`), policy-based complaint search and the jsPDF CVE fix.
  - The CMS V2.12 pgr-services hardening not yet taken is listed too. See "In detail › Security fixes".
- **File scan changes.** Optional ClamAV scanning of every upload, with a 90-day quarantine, clear messages for the uploader, and refusal rather than pass-through when the scanner is down (#157, #158). Load-tested:
  - every infected file blocked;
  - no clean file wrongly blocked;
  - no slowdown up to 50 parallel uploads.
- **Quota exceeded limit.** The browser's `QuotaExceededError` is fixed:
  - master data is cached in IndexedDB instead of the 5 MB `localStorage`;
  - a full store no longer crashes the page;
  - caches are dropped after every deploy (#148).
- **UI enhancements picked from CMS V2.12.**
  - **Dashboard:** refreshed header, filters, KPI tiles, "updated … ago" stamps and batched queries.
  - **Staff screens:** the working-context chip in the top bar, logo and colour handling for dark headers, and inbox visibility tabs.
  - **Attachments:** photos, screenshots and videos that play in the browser.
- **For residents and staff:**
  - a public website for each county;
  - consent and a confidentiality option when filing;
  - an official PDF application of the complaint (Download and Print; Share on phones);
  - start-up download more than halved;
  - manual escalation;
  - live reopen and withdraw windows;
  - dashboard export to Excel, CSV and PDF;
  - English and Kiswahili.

---

## What's Included

### For residents
- **A public website for each county**, reachable without signing in (the site root opens it):
  - **Bonga Nai** — the county's 12 Oct design (utility strip, county crest masthead, hero, photo category cards, slogan band) and a single "Call Customer Service" panel: 0725 624 489 (24/7), 0730 047 047 and 020 724 7047, with a contact e-mail supplied by the county in the footer (renamed from Nai Pepea, #71; #152–#155).
  - **Bomet Feedback Hub** — the Bomet page with its own wording, sub-counties and help lines (`nairobi-prod-bgrm-changes`); its text is configurable through 172 `PGR_LANDING_*` labels.
- **Filing a complaint**
  - **Terms & Conditions consent** is required before submitting and is stored with the complaint (#103).
  - **"Keep my details confidential"** is offered on every complaint (#103).
  - An optional **address** field on the first screen; what the resident types is saved and shown to the officer (#95, #104).
  - Complaint types and sub-types are listed **A–Z, with "Others" last** (#103).
  - The **map** opens at the county centre at street level with a pin the resident can move; it uses a vector street map with a fallback for older phones, and clearing a search keeps the current view (#4, #86, kenya-prod 18 Sep).
  - Questions whose answers could not be saved (name, address and e-mail on the first screen) are no longer asked (#96).
- **After filing**
  - **Complaint PDF application** — an official PDF generated in the browser: Download and Print on the confirmation and complaint pages. **Share appears in the mobile view only** (768 px and narrower): it opens a dialog (Open PDF, E-mail, WhatsApp, SMS) and hands the PDF itself to the phone's share sheet. Computers, including Mac, get Download and Print. The prefilled message never contains the complainant's name or phone number (#103, #117, #119, #120, #121, #129, #142, #162).
  - **Progress timeline** without officers' names, phone numbers or internal comments (#103).
  - Escalated complaints show **"Escalated (Level n)"**, and the location reads as **County / Sub-County / Ward** names (#29, kenya-prod 21 Sep).
  - **Rating with five faces** instead of stars; earlier ratings are kept (#117).
  - **Reopen** within the county's window — 3 days after the last update in both counties. The button disappears when the window closes, even on a page left open (#136, #145). A reopened complaint goes back to an officer who can act on it, and the reopen form shows errors inline and blocks a double submit (#65, #85).
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
- PDF application buttons on the staff "complaint submitted" page (#121); working error, maintenance and not-found screens (#5).
- **Top bar** — when the county logo fails to load, the county's bundled emblem shows instead, and a long designation is shortened so the language and profile menus, with Logout, stay on screen (#161).
- **Role-tiered staff home** at `/digit-ui/employee/home-v2` (oversight, casework, intake, read-only), recognising both counties' officer roles and showing real counts. It is reachable by URL and not yet linked from the menu (#56, #63, #80).

### For county leadership
- **Dashboard export** — Excel (a summary plus a sheet per tile), CSV or a PDF report, each with the filters used, the KPIs against the previous period, and every chart, table and map as data (#130).
- Dashboard refinements from CMS V2.12: language menu, "updated … ago" stamps, faster batched queries.
- **Behaviour analytics (Bomet)** — Matomo records the complaint funnel (each form step, submission outcome, landing pages) with personal data scrubbed (#34).

### For administrators & operators
- **Time windows enforced by the server** — REOPEN within `REOPENSLA` of the last update and WITHDRAW within `WITHDRAWSLA` of filing, set per county in `RAINMAKER-PGR.UIConstants` (#136).
- **Role-filtered timeline API** `/pgr-services/v2/request/_chronology` (access-control action 2635) (#103).
- **Complaint numbers without zero padding** (`BNG-2026-125`), opt-in; padded numbers are still found by search (`da6df4be3`; on for Bonga).
- **Virus scanning of uploads** with ClamAV — infected files are refused and quarantined, and the resident sees a clear message. Off by default (`enable_file_scan: true`, about 1.5 GB RAM) (#157, #158).
- **New builds reach open browsers** — a build id on every asset and a `build-info.json` the app checks; Ansible rebuilds the UI when its source changes (#148). The servers already send `Cache-Control: no-cache`.
- **SMS** — complaint SMS go through novu-bridge. The Bongatech gateway (direct or through Novu) and the Source Code gateway (direct only, `nairobi-prod`) are available alongside Ozeki, and SmsCountry was removed. OTP SMS can go through novu-bridge too, once user-otp's `SMS_TOPIC` points at its OTP topic; no deploy file sets that (#39, `82ba44d57`, `84c45ada2`).
- **PII display-masking switch** (`pgr_pii_masking` → `PGR_PII_MASKING`) in the runtime settings Ansible generates from each county's `host_vars`; off for Kenya (#22).
- **CMS V2.12 update (16 Sep)** — policy-driven search scoping by department and jurisdiction, the employee working-context API, inbox visibility tabs, analytics capability checks, Helm and CI validation.

### Included from CMS V2.12

CMS Kenya includes CMS V2.12 and its 16 Sep 2026 update (`7ee88f83`). In use in both counties:
- The **3-step resident form**: category pickers, drafts that survive a refresh, consent capture. Attachments (photo, video, audio) when filing and on every workflow action, played in the browser.
- **Action screens built from each county's workflow.** Reopen and rating keep the complaint's routing data; a reopen needs a reason and restarts the escalation clock.
- **Complaint categories as data** (`ComplaintHierarchy`); Kenya uses two levels.
- **Notifications** to the newest workflow step, with department names, acting-officer and deep-link placeholders. novu-bridge **direct delivery**, which Kenya extended with its own SMS gateways, and the OTP pipeline.
- The **analytics framework**: off by default, personal data scrubbed, with a destinations editor and Matomo provisioning.
- The **landing-page renderer** and the configurator's visual **Landing Page Builder**; theme colours from MDMS.
- Configurable escalation states; map, boundary-picker and translation fixes; master data cached in the browser (IndexedDB); compressed, always-revalidated UI delivery.
- From the 16 Sep update: policy-driven search scoping (configured in both counties, see below), RBAC enforcement in the shipped Kong configuration, Grafana login required, Helm and seed parity checks in CI.

Present but switched off or unused in Kenya:
- role-list search scoping (`pgr.department.scope.roles` and `pgr.jurisdiction.scope.roles` are empty); both counties scope search through the policy on access-control action 2008 instead;
- on-screen PII masking (`PGR_PII_MASKING=false`);
- the password-gated testing entrance;
- the reception-officer inbox and the four-tier CMS workflow and roles;
- the authority picker and per-authority questions (no Kenya data);
- the Portuguese language packs;
- the Ozeki SMS gateway;
- the admin cross-department search screen (neither county has an access-control action for its API).

Not included from CMS V2.12:
- the mobile app;
- the tutorial page;
- the self-contained security scanner and OpenSSF Scorecard (Kenya keeps the CI security pipeline);
- the reopen fresh-fetch fix;
- the double-submit guard on filing.

## In detail

### Security fixes

**Made for Kenya**
- **Confidential complainants are masked by the server** (#103, #128). For a confidential complaint, the name, phone, e-mail and address are replaced for every officer, including the clerk who filed it, unless the officer holds `CONFIDENTIAL_COMPLAINT_VIEWER`. Searches by person leave confidential complaints out, and staff notifications and domain events carry no complainant identity.
- **The resident's timeline comes from a role-filtered API** (`/pgr-services/v2/request/_chronology`, access-control action 2635; #103). Officer names, contacts and internal comments are removed on the server, not only hidden in the page.
- **The PDF application and share messages never contain the complainant's name or phone number** (#129, #142).
- **Time limits are enforced by the server** (#136). REOPEN and WITHDRAW are refused outside the county's window even when the API is called directly, and a malformed window rule fails closed (`INVALID_ACTION_WINDOW_CONFIG`).
- **Uploads are scanned for viruses** (#157); see "File scan" below.
- **Landing-page links** that come from configuration are sanitised before they become navigation (PR #1).

**From CMS V2.12** (in this release)
- **The gateway enforces access instead of only logging it.** Kong's `ENFORCE_UNAUTH` and `ENFORCE_RBAC` change from audit mode to enforced: a protected API called without a session gets 401, and a call without the role gets 403. This is the shipped configuration; the live gateways were not inspected.
- **Policy-based complaint search** (access-control action 2008). Results are scoped by department and jurisdiction per role, the complainant's name and phone are redacted outside that scope, and the check fails closed when access control cannot be reached. Both counties' policies are described under "Configuration".
- **jsPDF upgraded from 2.5.1 to 4.2.1** (CVE fix). It is the PDF library the UI uses for the complaint PDF and reports.
- **Platform defaults:**
  - Grafana no longer allows anonymous access.
  - The Helm values turn off dev mode, the fixed OTP and HRMS dev mode.
  - The public analytics endpoints are rate-limited (60 requests per minute per IP, 1 MB per request).

**Earlier CMS V2.12 fixes:**
- the map's ward tooltip is HTML-escaped (XSS);
- the search scope flags cannot be used to bypass scoping;
- analytics scripts load only from allow-listed hosts, with personal data scrubbed and a kill switch.

**CMS V2.12 security fixes not yet in this release.** The Kenya sync of 16 Sep took the front end and part of the backend; the September hardening of pgr-services was not taken:
- **Request validation is not enforced in pgr-services.** It still pins Hibernate Validator 6.0.16 (javax) under Spring Boot 3.2.2, the setup CMS V2.12 diagnosed as silently disabling every `@Valid`, `@NotNull`, `@Size` and `@Pattern` check. CMS V2.12 fixed it on 15 Sep (`b0fad2383`), followed by validation of the complainant object (`4b373f5c9`) and `@SafeHtml` on the rest of the request graph (`9df954273`).
- PostgreSQL driver 42.7.11 and removal of the unused jsoup (`687c6e8c6`).
- The code-base security scan workflow, the CodeQL clean-ups, and the micro-UI lockfile clean-up of 109 Dependabot alerts.

We recommend taking these in the next CMS V2.12 sync.

### File scan: virus scanning of uploads

Added by #157 (Bonga's branch) and #158 (bgrm's branch); off by default.

- **How it works:**
  - nginx sends every upload (non-GET `/filestore/`) to a new service, `filestore-scan-proxy`.
  - The proxy reads the whole upload and has ClamAV (`clamav/clamav:1.5.4`) scan each file.
  - Only clean uploads are forwarded to the filestore. Downloads (GET) are unchanged.
- **What the uploader sees.** The upload widget shows a clear message for each outcome:

  | Outcome | Response | Message |
  |---|---|---|
  | Clean | upload continues | — |
  | Infected | `400 VIRUS_DETECTED` | "This file failed a security scan" |
  | Encrypted or too complex to check | `400 FILE_NOT_SCANNABLE` | asks for another file |
  | Scanner down | `503 SCAN_UNAVAILABLE` | "temporarily unavailable"; the upload is refused, never passed unscanned |
  | Unreadable upload | `400 INVALID_UPLOAD` | upload rejected |
  | Over 26 MiB | `413 FILE_TOO_LARGE` | upload rejected |

- **Quarantine.** An infected file is kept in a private MinIO bucket, `egov-quarantine`, for 90 days, with its signature, SHA-256, tenant, module and client IP recorded. The bucket is closed to the web (nginx returns 403).
  - Files refused only because they could not be checked are not kept, so citizen data isn't stored without reason.
  - A quarantine failure never changes the verdict.
- **Operations:**
  - **Turn it on per county** with `enable_file_scan: true` in its Ansible `host_vars`. The playbook builds the proxy and generates two MinIO passwords into OpenBao.
  - **Services and monitoring:** it starts the `clamav`, `filestore-scan-proxy` (port 18183) and `quarantine-init` services, and adds two Gatus health checks.
  - **Deploy paths and status:** Compose and Ansible only (no Helm chart). Enabling in the counties is tracked in issue #159.
- **Load test** (`backend/filestore-scan-proxy/loadtest/`, 13 Oct, 8 CPU / 16 GB, 2,250 uploads):
  - **Accuracy:** every infected test file (90) was blocked and quarantined; no clean file was wrongly blocked, and the scanner never failed.
  - **Up to 50 parallel uploads:** scanning causes no noticeable slowdown.
  - **100 parallel:** it adds about 0.7 s at the median.
  - **The weak point is `egov-filestore`, not the scanner.** A burst of 100 × 5 MB uploads ran it out of Java heap: 41 failures without scanning, 5 with.
  - **Recommendations:**
    - raise the filestore heap to at least 1 GB;
    - cap concurrent uploads at the proxy (for example 20);
    - budget about 1.5 GB of RAM for ClamAV and up to 1 GB for the proxy.

### Browser storage limit ("quota exceeded")

Browsers allow a site only about 5 MB of `localStorage`. The platform kept master data there (MDMS responses, the complaint hierarchy), and on tenants with large configurations the browser threw `QuotaExceededError` and the page failed. This release carries the fix and Kenya's follow-ups:
- **Large master data moved to IndexedDB** (CMS V2.12 fix `8fd9f8088`): MDMS and complaint-hierarchy responses are cached in IndexedDB, which has a far larger allowance.
- **No crash on a full store.** `Digit.Storage` no longer throws when the browser refuses a write: it skips persisting, and the value is fetched again on the next load. Old MDMS entries left in `localStorage` are removed once on the first load to reclaim space.
- **Quota-guarded drafts:** the resident's half-filled complaint is kept in session storage for 24 hours.
- **Non-critical state is written best-effort:** language choice, dashboard layout and badge counts are skipped quietly when storage is full or in private mode.
- **Caches are dropped after a deploy** (#148). Each MDMS entry is tagged with the build that wrote it, and the first load of a new build drops the cached label bundles and complaint-type cache. Old-shape data therefore never survives an update, and storage does not fill up across releases.

### Session and browser handling

- **Two accounts in one browser** (from CMS V2.12, Sep 2026). The active session is per tab, but the platform stored the logged-in user in shared `localStorage`.
  - Previously, one tab's session expiry could log out a different user working in another tab. A shared key is now removed only when it belongs to the dead session.
  - When a second officer signs in at a shared desk, the older tab shows a notice naming that account. It confirms that the officer's own work is intact and explains that refreshing may switch accounts.
  - The notice only informs: nothing is signed out or reloaded, so a half-filled complaint is never lost.
- **Expired sessions and failed requests** (Sep 2026). Failures are now classified by HTTP status and error code, no longer by matching message text:
  - **401 or an auth error code:** the user goes to the right sign-in page (resident or staff) and returns afterwards. Only the sign-in keys are cleared; cached labels, master data, language and drafts survive.
  - **Any other failure:** returned to the screen, which shows an inline error. A transient error no longer throws the user onto the maintenance page mid-submit, which used to cause duplicate complaints.
  - **Checked before submitting:** the resident's form checks the session first, so an expired session is caught before the long form is sent.
- **After a deploy, open tabs move to the new build** (#148).
  - The build id is stamped into the page and into `build-info.json`.
  - An open tab re-checks the id on load, on return to the tab and every 5 minutes. It reloads at the next hub screen (home, inbox, complaint list or details, dashboard, landing), never inside a form, and at most once in 10 minutes.
  - Ansible rebuilds the UI whenever its source changes.
- **Up-to-date complaint pages** (#131). The page refreshes when the officer returns to the tab, and after an action fails because the complaint changed meanwhile.
- **No carried-over notes** (#96). A Take Action draft belongs to one complaint and one action. An end-to-end test keeps it that way (#147).
- **Sharing the PDF application from phones** (#142, #162):
  - Share appears in the mobile view only. On computers, sharing was unreliable (issue #138, Safari on Mac), so computers get Download and Print.
  - "More apps" was removed: on a phone every tile already opens the device's own share sheet, which lists every app.
  - The PDF is prepared when the share dialog opens, so Share, Open PDF and Download run inside the user's tap; a refused share falls back to a download.
  - Opening the PDF uses a ready-made file instead of navigating a blank pop-up.
- **Faster first load on slow links** (#103): screens, maps and PDF tools load on demand, which halves the start-up download (9.5 MB to 4.55 MB).
- **County identity in the tab** (#140): the browser tab shows the county's name and icon.
- **Staff passwords** (Sep 2026): forgot-password sends the code to the mobile number typed with its country code, always resets through the no-login endpoint, and no longer crashes.

### Contributed by CMS V2.12

#### Screenshots and videos on complaints
- **Attachments when filing.** Residents and staff can attach photos and screenshots, PDF, Word and Excel files, and videos when filing a complaint:
  - accepted video formats: mp4, mov, avi, mkv and webm;
  - up to 5 files of 5 MB each.
  - Attachments can also be added on workflow actions, and the reopen form takes them too.
- **Accepted types match the file server.** The accepted list matches what the filestore really allows. Audio is no longer offered, because the server rejects it.
- **Videos play in the browser.** Video and audio attachments play with full-screen controls instead of appearing as broken images. The timeline shows a thumbnail, and attachments display at a uniform size.
- **Since #157,** every attachment passes the virus scan when scanning is on.

#### UI enhancements picked from CMS V2.12 (16 Sep 2026 update)
- **Dashboard:**
  - refreshed header, filter bar, footer and KPI tiles, plus an "add KPI" menu;
  - an "updated … ago" stamp on each card, and a language menu;
  - batched, sequential analytics queries for faster loading, with a stricter public-dashboard boundary;
  - clearer line and stacked-bar charts.
- **Staff top bar:** a working-context chip showing the officer's role context, with sidebar and language-selection updates. Kenya added the designation greeting and profile card on top.
- **Theme handling:** the header logo switches to the light version when a county paints its header dark, and theme colours are derived per county. Images fall back cleanly when a logo or picture fails to load.
- **Inbox visibility tabs:** they replace the old "assigned to me / all" choice when `RAINMAKER-PGR.InboxVisibilityConfig` is set. They are on in Bomet and off in Nairobi.
- **Timeline:** the resolved and rejected steps show the reopen window.
- **Platform components:** the shared design-system CSS was refreshed, along with the footer brand assets.

---

## Bonga vs bgrm — what differs

Both counties run the same resident and staff application code. They differ in the landing page, the build of the complaint service, and their configuration. Read from the live sites on 13 Oct 2026.

| | **Bonga Nai** (`nb`) | **Bomet Feedback Hub** (`bo`) |
|---|---|---|
| Coverage | 6 sub-counties, 17 wards: Makadara, Kibra, Kasarani, Embakasi North, Kamukunji, Lang'ata | 5 sub-counties, 25 wards: Sotik, Chepalungu, Bomet East, Bomet Central, Konoin |
| Landing page | Bonga Nai design (`nairobi-prod`) | Bomet page (`nairobi-prod-bgrm-changes`) |
| Complaint service | `nairobi-prod` | `feat/bomet-uat` — identical except the complaint-number option below |
| Complaint numbers | `BNG-2026-125` (no zero padding) | `BFH-2026-000020` (6-digit zero padding; Bomet's requirement asks for 7 digits, issue #45) |
| Where a new complaint goes | The GRO's queue; the GRO assigns a last-mile officer | **Straight to a last-mile officer.** Complaints filed by residents are assigned automatically (best effort) to a last-mile officer of the category's department, matched on the complaint's location: ward, then sub-county, county, department-wide. If nobody matches, the complaint stays unassigned (#4, #8). |
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

### Landing pages

The landing pages were separated at the last moment. `nairobi-prod`'s landing page has been Nairobi's since 23 Sep. When bgrm's UI moved to `nairobi-prod` on 9 Oct, its front page therefore showed Nairobi branding, and the Bonga Nai redesign (#154, #155) made it more visible. On 13 Oct bgrm's UI moved to its own branch, `nairobi-prod-bgrm-changes`. That branch is `nairobi-prod` plus one change: it brings back the Bomet landing page bgrm had before 9 Oct. The change spans 61 files: the landing page, its styles, an image loader in the build and the configurator's landing editor. Everything else is identical, and every non-landing change is merged into both branches (as #157 and #158 were). When `nairobi-prod` is merged into `master`, `master` carries the **Bonga Nai** landing page; bgrm keeps building from its branch until the landing page can be chosen per county by configuration.

---

## Configuration, MDMS & workflow changes

Workflow and most MDMS records are live data: they are applied to each county's database, not shipped in the code. The state below is what each county runs on 13 Oct 2026.

### Bonga Nai (`nb`)
- **Workflow `PGR`** (last changed 12 Oct): APPLY → GRO queue → last-mile officer → Escalated Level 1 (Chief Officer) → Level 2 (CECM). It differs from the standard CMS V2.12 PGR workflow by:
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
- **Workflow `PGR`** (last changed 9 Oct): APPLY → last-mile officer (auto-assigned) → Escalated Level 1 (department Director; Water: Chief Officer) → Level 2 (Chief Officer; Water: CECM) → Level 3 (CECM). It differs from the standard CMS V2.12 PGR workflow by:
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
| `EGOV_ACCESSCONTROL_HOST`, `PGR_ABAC_STRICT_MODE` | pgr-services | compose: `egov-accesscontrol:8090`, `false` | Policy lookup for department/jurisdiction search scoping (CMS V2.12). Fails closed if access control is unreachable. |
| `NOVU_BRIDGE_USER_OTP_DEFAULT_TENANT_ID` | novu-bridge | **`bo`** | Tenant stamped on OTP SMS. **Bonga must set `nb`.** |
| `NOVU_BRIDGE_DIRECT_SMS_PROVIDER` (`ozeki` · `bongatech` · `sourcecode`), `NOVU_BRIDGE_DIRECT_SMS_BASE_URL` / `_USERNAME` / `_PASSWORD` / `_TOKEN`, `NOVU_BRIDGE_DIRECT_SMS_SERVICE_ID` (Source Code), `NOVU_BRIDGE_SMS_SENDER_ID`, `NOVU_BRIDGE_SMS_INTEGRATION_IDENTIFIER` | novu-bridge | provider `ozeki`; service id `0`; others empty | Direct SMS gateways, used for the channels listed in `NOVU_BRIDGE_DIRECT_CHANNELS` (inherited). **Renamed:** `OZEKI_*` became `NOVU_BRIDGE_DIRECT_SMS_*`, and `NOVU_BRIDGE_OZEKI_INTEGRATION_IDENTIFIER` (default `ozeki-sms`) became `NOVU_BRIDGE_SMS_INTEGRATION_IDENTIFIER` (default empty). `sourcecode` exists only on `nairobi-prod`. |
| `NOVU_BRIDGE_KAFKA_USER_OTP_SMS_TOPIC` | novu-bridge | `egov.core.notification.sms.otp` | OTPs through novu-bridge — effective only when user-otp's `SMS_TOPIC` points to it. |
| `PGR_PII_MASKING` (host_var `pgr_pii_masking`) | UI runtime config | `false` (Ansible) | Display masking of names and phones in the staff UI. **An absent key means masking on.** Server-side confidential masking is separate. |
| `enable_file_scan`, `filestore_scan_proxy_image`, `upstream_scan_proxy_port` (18183) | Ansible | `false` | ClamAV upload scanning: adds `clamav`, `filestore-scan-proxy` and `quarantine-init`, a 90-day `egov-quarantine` bucket, two OpenBao passwords and two Gatus checks. Compose/Ansible only. |

**MDMS schema and data migrations** (no new Flyway migrations in any backend service):
- `V20260827000000__uiconstants_recode_from_reopensla_key.sql` (CMS V2.12) — re-keys `RAINMAKER-PGR.UIConstants` to `code = DEFAULT` so `REOPENSLA` becomes editable, and moves the old 5-day seed to 72 h.
- `V20260930000000__uiconstants_add_action_windows.sql` (Kenya) — adds `WITHDRAWSLA` and `actionWindows` to the schema. It must run as SQL (the schema update API returns 501). Both counties already carry the new fields.

**Access-control actions** — new: 2635 (timeline), 2640–2648 (analytics, CMS V2.12), 2650/2651 (`AnalyticsProvider` writes). Changed: 2008 complaint search gains a department/jurisdiction scope policy and field redaction (CMS V2.12); 2553/2554 get distinct menu icons (#90; not yet applied in either county).

**Gateway (Kong)** — the CMS V2.12 update switches `ENFORCE_UNAUTH` and `ENFORCE_RBAC` from audit to **enforced** (401/403), and adds to the sign-in-optional list: workflow business-service search, localization cache-bust, employee working context, the public analytics endpoints and the novu provider endpoints.

**Labels** — 64 `rainmaker-pgr`, 27 `rainmaker-common` and 41 dashboard-export English keys are seeded for **new** tenants; existing counties receive them by upsert. Kiswahili exists only as live data: the repository has no `sw_KE` messages.

**Workflow** — the repository's standard PGR workflow is unchanged. Each county's workflow (WITHDRAW, REASSIGNTOGRO, ESCALATEDLEVEL1–3, Bomet's APPLY straight to the officer) exists only in that county's database.

---

## Changes by Area (summary)

| Area | Highlights |
|---|---|
| **Backend (pgr-services)** | Server-side confidential masking with no staff exemption · role-filtered timeline API · REOPEN/WITHDRAW time windows · optional unpadded complaint numbers · policy-driven search scoping (CMS V2.12) · department-name cache that survives a brief MDMS outage |
| **Backend (novu-bridge)** | Bongatech and Source Code SMS gateways · OTP consumer (needs user-otp's `SMS_TOPIC`) · SmsCountry removed |
| **File uploads** | Optional ClamAV scanning proxy with quarantine (off by default) |
| **Security** | Server-side confidential masking · role-filtered timeline · server-enforced time limits · upload virus scan · gateway enforcement and policy-based search (CMS V2.12) · jsPDF CVE fix · CMS V2.12's pgr-services validation fix still to take |
| **Browser & session** | Storage-quota fix (IndexedDB; no crash on a full store) · safe cross-tab sessions · expired-session handling · new-build pickup after deploys · Share on phones only |
| **From CMS V2.12** | Photo, screenshot and video attachments that play in the browser · dashboard, top-bar, theme and inbox-tab enhancements |
| **Frontend (residents)** | County landing pages · consent and confidentiality at filing · PDF application with Share on phones · face rating · live reopen and withdraw windows · faster start-up · tab title per county |
| **Frontend (staff)** | Manual escalation · reassign and send back to GRO (Bonga) · searchable assign picker · Take Action by role · new header with designation greeting, logo fallback and long-title fix · inbox defaults for escalated, resolved and rejected complaints |
| **Dashboard** | Export to Excel, CSV and PDF |
| **Workflow** | Bonga: GRO-led 2-level escalation, reassign, reassign-to-GRO, withdraw · Bomet: auto-assigned 3-level departmental escalation, withdraw |
| **Configuration / MDMS** | `UIConstants` action windows · `EscalationConfig`, `InboxVisibilityConfig`, `AnalyticsProvider` (Bomet) · county categories, numbering, branding |
| **Roles & access** | County officer tiers · timeline action 2635 · analytics write actions (Bomet) |
| **Localization** | English and Kiswahili on both counties · county app titles · Bomet landing text |
| **Deployment** | Per-county Ansible host_vars · new-build pickup · ClamAV option · Matomo provisioning fixes |

---

## Fixes and Improvements

Smaller fixes not listed above, all in this release:
- **The citizen reopen page no longer crashes** (a hook was not registered) (#6).
- **Readable buttons:**
  - primary buttons are readable at rest in each county's colours;
  - the citizen Rate and Re-open buttons are readable;
  - the reopen heading falls back to English when its label is missing (#62, #63, #64).
- **Sign-in screens** (kenya-prod 18–23 Sep):
  - the top bar takes the county colour;
  - the backdrop fills the screen on every device, with no white strips;
  - Bomet's highland landscape shows behind both sign-in screens.
- **The citizen home's Complaints card** has its own banner strip instead of reusing the sign-in photo (Nairobi).
- **Landing page:**
  - text on dark areas stays white even when a county's buttons are light;
  - the Bomet landing page was restyled with a white hero and footer, a blue palette and the county logo lockup (#7).
- **Labels:** two staff-home labels that showed as raw keys are seeded.
- **The citizen footer** sits flush at the bottom, and a bundled DIGIT mark replaces a missing county logo in the citizen header (#131).
- **Tests:** a new end-to-end test keeps a Take Action draft with its own complaint (#147).

---

## Testing / UAT

Automated suites, run on 13 Oct 2026 against `nairobi-prod` @ `8e6289e86`. The only later commit, `32a56d27d`, adds the scan proxy's load-test tooling (results under "File scan").

| Suite | Result |
|---|---|
| Frontend shell unit tests | **192 / 192 pass** |
| Frontend PGR and dashboard unit tests (36 files) | **316 / 316 pass** |
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
- **Local Setup CI and Tilt CI fail:** `minio/minio` can no longer be pulled in CI (Tilt CI last passed on 4 Sep). The image reference is unchanged since the CMS V2.12 baseline, so the failure is external and not caused by this release.

Manual / UAT: the county flows were exercised on the live sites and on a local Bomet stack as each change was made — filing, auto-assignment, escalation, resolve / reopen / rate, withdraw, the PDF application, dashboard export — mostly with real officer accounts rather than an administrator. A formal UAT sign-off is not kept in the repository.

---

## Known Limitations

**Not yet in this release**
1. **Bomet: complaints filed by staff are not auto-assigned.** They reach the officer stage without an assignee, so they appear in no one's "assigned to me" list. A last-mile officer of that department whose area covers the complaint can still act on them. The fix (#81) is on `kenya-prod` and has not been brought to `nairobi-prod`.
2. **Bomet: a staff reopen without choosing an officer leaves the complaint unassigned** (#50, with #78 and #82, not brought over).
3. **"My Complaints" fails for a resident with more than 10 complaints** (`WORKFLOW_NOT_FOUND`) unless the workflow service's default page limit has been raised (not verified in either county); the fix (`5d429bd08`) is on neither county's code.
4. **Request validation is not enforced in pgr-services.** It still pins Hibernate Validator 6.0.16 (javax) under Spring Boot 3.2.2, the setup CMS V2.12 found silently disables `@Valid`, `@NotNull`, `@Size` and `@Pattern`. CMS V2.12's fix (`b0fad2383`) was not taken by the Kenya sync; see "Security fixes". (Diagnosis taken from the CMS V2.12 commit; not probed at runtime here.)
5. Not brought over from `kenya-prod`: readable messages when location access is refused (#55; the `CS_GEOLOCATION_*` labels are also unseeded) and the anonymous `/citizen` → login redirect (#59).

**Configuration to complete in the counties**
6. **No officer can see a confidential complainant** — the `CONFIDENTIAL_COMPLAINT_VIEWER` role does not exist in either county.
7. **Bomet: last-mile officers, department tiers and GROs see complainant names and phone numbers redacted.** Bomet's search policy on action 2008 shows them only to the complainant and to staff whose roles reach every department and area (CSR, OMBUDSMAN_OFFICER). If officers must call complainants back, add the department-and-area clause Bonga uses. This comes from the policy code; not checked on screen.
8. **Bomet: 11 categories still have 2-minute test escalation timers** in `RAINMAKER-PGR.EscalationConfig`: 8 on all three levels and 3 Water categories on levels 1–2. Examples are maternal emergencies, ambulance delays, corruption and water pipes. These complaints escalate at the next scheduler run (every 5 minutes by default). Escalation beyond level 1 runs automatically only if `PGR_ESCALATION_STATES` includes the escalated states (not verified).
9. **The PDF application prints `0000000000`** as the county's phone; the county e-mail is a placeholder and the `StateInfo` name reads "Demo" (both counties).
10. **No SMS or e-mail** is sent for WITHDRAW (both counties), REASSIGNTOGRO (Bonga) or ESCALATE (Bomet): no notification templates exist.
11. The distinct menu icons for Create and Search Complaint (#90) need an MDMS data update in both counties.
12. Bomet: six sample departments, sample designations and 18 Hindi notification templates remain; the `StateInfo` banner points to a missing image; the analytics endpoint value starts with a tab character.
13. Bonga: novu-bridge's OTP consumer defaults to tenant `bo`; Bonga must set `NOVU_BRIDGE_USER_OTP_DEFAULT_TENANT_ID=nb` (not verified from here).
14. The deploy templates are behind novu-bridge: they still pass the removed `NOVU_BRIDGE_SMSCOUNTRY_*` variables and do not pass the direct-SMS or OTP variables, so those must be set by hand on each server.
15. The configurator edits only `REOPENSLA`; `WITHDRAWSLA` and `actionWindows` are changed through the MDMS API.

**Behaviour to be aware of**
16. The map pin starts at the county centre. If the resident does not move it, the complaint is recorded at the centre.
17. Resolved and rejected complaints show in the default inbox — requested by Bomet; Nairobi's issue #144 asks for the opposite.
18. The citizen logout question reads "Are you sure you want to" (fix #72 not merged); the browser tab shows "DIGIT" until the county's labels load.
19. Video uploads over about 3.9 MB fail on Bonga (likely a web-server limit, issue #137). Re-sending an OTP does not invalidate the earlier one (#135, closed without a fix).
20. Manual escalation does not record the escalation-level bookkeeping that automatic escalation uses; this may explain the wrong level reported in issue #141.
21. The workflow definitions for `nb` and `bo` are not versioned in the repository.

**Inherited from CMS V2.12**
22. Several deploy steps still use the default bootstrap password, so changing the bootstrap secrets breaks a full deploy.
23. The staff filing form offers a "Green Line" channel that Kenya does not use, and Kenya's call-centre complaints have no channel of their own.
24. The 16 Sep CMS V2.12 update removed the role-action grants of the `CMS_*` officer roles from the seed, and the configurator's role-action create/edit screens (the buttons remain). Kenya does not use those roles.
25. The configurator's telemetry is on by default (`kill: false`). Operator scripts keep defaults from another deployment (`enable-escalation.sh` tenant and state, `deploy-pilot-fe.sh` branch); set them before use.

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

> **To complete before tagging:** record the images running in each county. On each server, run `docker ps --format '{{.Names}}\t{{.Image}}' | sort`.

Known on 13 Oct 2026:

| Component | Bonga Nai | Bomet Feedback Hub |
|---|---|---|
| Resident & staff UI | static build of `nairobi-prod`, build id `111d80717226` | static build of `nairobi-prod-bgrm-changes`, build id `f5815743da37` |
| pgr-services | built from `nairobi-prod` (tag to record) | `egovio/pgr-services:bomet-uat-6eb6b85` (per the rollout notes) |
| Other services | to record | to record |

---

## Training videos and support package

A narrated video walkthrough of the whole complaint workflow comes with this release, together with a support package for the teams who run the two sites.

**Videos** — 22 short parts, about 33 minutes in total, each with English narration and subtitles: the complaint workflow end to end, then the security and confidentiality features. They were recorded on cms-pilot (the test twin of Bonga Nai) with fictional test users, so the screens are the real CMS Kenya V2.12 screens; any other person's name is hidden and phone numbers are masked.

| Part | What it shows |
|---|---|
| 00 | Introduction: the roles and the path a complaint takes |
| 00b | The public website: Report an Issue, Track a Complaint, help lines |
| 01 | A resident signs in with a one-time code and files a complaint in three steps |
| 02 | The front desk files a complaint on a caller's behalf |
| 02b | Staff sign-in (privacy consent, forgot password), the staff header and profile card, switching to Kiswahili, logout |
| 03 | The GRO checks new complaints and assigns them to a last-mile officer |
| 03b | The front desk withdraws a complaint for a caller (reason required) |
| 03c | The GRO rejects a complaint with a reason, and what the resident then sees |
| 04 | The last-mile officer resolves one complaint and escalates another |
| 04b | The officer sends a complaint that belongs to another department back to the GRO (Bonga only) |
| 04c | The officer re-assigns a complaint to a colleague in the same department |
| 05 | The Chief Officer resolves the escalated complaint |
| 05b | Escalation to level 2: the Chief Officer escalates to the CECM, who resolves it |
| 06 | The resident rates one complaint, reopens one and withdraws a duplicate |
| 06b | A resident on a phone: a photo attached, the PDF application downloaded, Share |
| 07 | Back in the GRO's queue, and a complaint escalated automatically after its deadline |
| 08 | The leadership dashboard and export to Excel, CSV or PDF |
| 09 | Summary: where each complaint ended up |
| S1 | Confidential complaints: identity hidden from every officer by the server; the resident's timeline without officer names or internal notes |
| S2 | Safe sign-in and sessions: a wrong one-time code, the resend timer, the "another account signed in" notice, the not-found screen |
| S3 | Safe uploads: size, type and number limits; virus scanning and quarantine (off on both counties) |
| S4 | Rules the server enforces: time windows, role-based actions, the timeline as audit trail, the notification log |

The walkthrough follows Bonga Nai. On Bomet there is no GRO step (complaints go straight to the department officer), no "send back to GRO", three escalation levels, and a 3-day withdraw period.

**Support package** — for the eGov support desk (L1), platform operators (L2) and engineering (L3): a support matrix (who owns which issue and when to escalate), a video catalogue, storyboards and narration scripts, a troubleshooting guide with on-screen messages, step-by-step procedures, a knowledge-transfer plan, and a traceability matrix from each release change to its evidence. It is in the repository under `docs/kenya/support/` (pull request #163); `support-package.html` shows all seven parts on one page, and a PDF copy is in the shared folder.

**Where to find them:** [CMS Kenya V2.12 – videos and support documents (Google Drive)](https://drive.google.com/drive/folders/1QiImno9XX1cxhgQtSXCFc0TS7GU6FUDG?usp=sharing). Open `1-videos` to play any part in the browser; `2-support-documents` holds the support package and its PDF.

## Support preparation: findings and follow-ups (14–15 Oct 2026)

Preparing the training videos and the support package meant running every workflow end to end on cms-pilot and reading both live sites. This section records what was changed on the test environment, what was found, and what still needs a decision.

### Changes made on cms-pilot (test environment only)

| Change | Why | Rollback |
|---|---|---|
| Label cache refreshed and 15 labels added in English and Kiswahili (for example *Withdraw*, *Rate*, *Escalate Complaint*, *Reassign to GRO*) | Take Action menus, dialog titles and the resident's timeline showed raw keys such as `WITHDRAW` and `CS_ACTION_ESCALATE`. Bonga already had these labels. | Previous values saved in the QA kit |
| Complaint sub-types set to department "NA", as on Bonga | A resident's reopen failed with `INVALID_ASSIGNMENT` on cms-pilot, where sub-types carried departments; Bonga's do not | Before-state of all 58 records saved in the QA kit |
| Seven fictional test accounts created (resident, front desk, GRO, two last-mile officers, Chief Officer and CECM for Finance) | The earlier test officers were deactivated; the videos needed one account per role | Deactivate through HRMS |
| 33 test complaints filed and worked through (`CMS-2026-47` to `CMS-2026-79`) | Recording the videos | Test data; no action needed |

### Findings

| # | Finding | Site | Impact | Owner | Status |
|---|---|---|---|---|---|
| 1 | Escalation timers are test values: `RAINMAKER-PGR.EscalationConfig` sets 2, 4 and 6 minutes per level on Bonga (2, 3 and 4 on cms-pilot) | Bonga live | If the escalation job runs on Bonga, complaints escalate within minutes of assignment. On cms-pilot a complaint escalated automatically about 2 minutes after it was assigned | County + L2 | Needs the county's intended times; whether the job runs on Bonga is not verified |
| 2 | Reopen picks an assignee automatically (the GRO) and the server checks that assignee's department against the complaint's | Both | Works today on Bonga only because its sub-types have no department. If departments are mapped on Bonga, residents' reopens will fail with `INVALID_ASSIGNMENT` | L3 | Open: a reopen that returns to the GRO queue should not send an assignee |
| 3 | A refused upload shows the file server's raw message with a typo: *"Inalvid input provided for file : exe, please upload any of the allowed formats…"* | Both (same file-server image) | Residents see a misspelt, technical message | L3 | Open |
| 4 | Labels for the newer actions were missing on cms-pilot (see the first change above) | cms-pilot | Raw keys on screen during testing | L2 | Fixed on cms-pilot; present on Bonga |
| 5 | The cms-pilot test officers used in September were deactivated, and cms-pilot sends real, paid SMS | cms-pilot | Testing needs current accounts, and test runs cost SMS credits | L2 | Use the agreed test numbers only |

### Follow-ups

1. **Before the training videos are shared outside eGov:** harden the cms-pilot test environment (account credentials and one-time-code settings), or deactivate the test accounts once the videos are final. The videos show the test environment's sign-in screens.
2. **Counties:** confirm the intended escalation times for Nairobi (finding 1), alongside the Bomet request under *What we need from the Counties*.
3. **Engineering:** findings 2 and 3.
4. **Public sharing of the walkthrough page:** the eGov workspace does not allow public links for it; the shared Drive folder is the public route for the videos.

## Documentation

- [Training videos (Google Drive)](https://drive.google.com/drive/folders/1QiImno9XX1cxhgQtSXCFc0TS7GU6FUDG?usp=sharing) — 22 narrated parts with subtitles: the complaint workflow end to end, then security and confidentiality; also holds the support package as a PDF
- [Training video player](https://claude.ai/artifact/872R5UhyNE99wWhFfd2QPR) — the same 22 parts with chapters and a clickable narration script (eGov staff only)
- [Support package](https://github.com/eGov-Global/CMS-KENYA/tree/master/docs/kenya/support) — L1/L2/L3 support matrix, procedures, troubleshooting, training video scripts and traceability
- [Release audit / evidence document](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/RELEASE-PREVIEW-CMS-KENYA-V2.12.md) — full comparison with CMS V2.12, PR inventory and live-configuration capture behind these notes
- [County release note](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/COUNTY-RELEASE-NOTE-CMS-KENYA-V2.12.md) — plain-language summary for Nairobi City County and Bomet County officials
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
