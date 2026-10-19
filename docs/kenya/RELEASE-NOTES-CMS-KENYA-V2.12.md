<!-- ============================================================
PASTE-READY GITHUB RELEASE
Tag:            v2.12-kenya
Release title:  CMS Kenya V2.12 — Bonga Nai (Nairobi City County) & Bomet Feedback Hub (Bomet County)
Target:         master, AFTER nairobi-prod has been merged into it.
                Code described: nairobi-prod @ 32a56d27d (2026-10-13); tests ran at
                8e6289e86. After the described code, nairobi-prod gained 723b680d7
                (2026-10-14, server backup script).
                bgrm's landing page lives on nairobi-prod-bgrm-changes @ 78444ee4e,
                which is NOT merged into master (see "How the two counties differ"
                and "Compatibility and upgrade notes" below). That branch lacks three
                nairobi-prod commits: 8e6289e86 (the #157 merge commit; its content
                reached bgrm through #158), 32a56d27d (load-test suite) and 723b680d7
                (backup script). The landing-page files remain the intended difference.
Live state:     read from bonga.nairobi.go.ke and bgrm.bomet.go.ke on 2026-10-13;
                escalation timers (RAINMAKER-PGR.EscalationConfig) re-read on
                2026-10-19 (read-only searches; evidence in
                RELEASE-PREVIEW-CMS-KENYA-V2.12.md).
                The Documentation links resolve once docs/kenya/ is on master.
Everything below this comment block is the release body — paste as-is.
============================================================ -->

**First official release of CMS Kenya V2.12, built on CMS V2.12, for Bonga Nai (Nairobi City County) and Bomet Feedback Hub (Bomet County).**

It adds confidential complaints, an official PDF application, server-enforced time limits for reopen and withdraw, manual escalation and dashboard export, together with security fixes, optional virus scanning of uploads and a fix for the browser's "quota exceeded" storage error. It changes what residents, county officers and county leadership see, and what the operators who run the two sites deploy and configure.

**CMS Kenya V2.12:** [Release preview and evidence](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/RELEASE-PREVIEW-CMS-KENYA-V2.12.md) · **Release notes** (this page) · [County release note](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/COUNTY-RELEASE-NOTE-CMS-KENYA-V2.12.md)

Repository: `eGov-Global/CMS-KENYA`\
Built on: **CMS V2.12**, the DIGIT Complaint Management System (`egovernments/Citizen-Complaint-Resolution-System`)

## Documentation

Links to this release's documents, the support package and the scan-proxy README point at `master` and resolve once those files reach it: these documents through PR #160 and the support package through PR #163 (both into `nairobi-prod`), then PR #49 (`nairobi-prod` into `master`).

### This release

- [Release notes](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/RELEASE-NOTES-CMS-KENYA-V2.12.md) — this document
- [County release note](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/COUNTY-RELEASE-NOTE-CMS-KENYA-V2.12.md) — plain-language summary for Nairobi City County and Bomet County officials
- [Release preview and evidence](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/RELEASE-PREVIEW-CMS-KENYA-V2.12.md) — full comparison with CMS V2.12, PR inventory, live-configuration capture and open issues by priority

### Training videos

- [Training videos (Google Drive)](https://drive.google.com/drive/folders/1QiImno9XX1cxhgQtSXCFc0TS7GU6FUDG?usp=sharing) — the public home of the 22 narrated parts with subtitles: the complaint workflow end to end, then security and confidentiality. The folder holds 11 of the 22 parts today; the other 11 and a PDF copy of the support package are being added.
- [Training video player](https://claude.ai/artifact/872R5UhyNE99wWhFfd2QPR) — all 22 parts with chapters and a clickable narration script (eGov staff only)

### Support package (`docs/kenya/support/`)

For the eGov support desk (L1), platform operators and county IT (L2) and engineering (L3). Under review in pull request #163.

| Document | What it answers |
|---|---|
| [Package overview](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/support/README.md) | Who it is for, how to read the VERIFIED / RECOMMENDATION tags, rules for handling data |
| [1. Support matrix](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/support/01-support-matrix.md) | Which level owns each issue type, what L1 checks first, when to escalate; who can act at each status; time windows |
| [2. Video catalogue](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/support/02-video-catalogue.md) | Which training video to watch, by level |
| [3. Storyboards and narration](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/support/03-storyboards-narration.md) | Scene-by-scene storyboards and English narration scripts |
| [4. Troubleshooting guide](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/support/04-troubleshooting.md) | Symptoms with screenshots, and what each on-screen message means |
| [5. Procedures](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/support/05-procedures.md) | Step-by-step L1, L2 and L3 procedures with verification and escalation |
| [6. Knowledge-transfer guide](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/support/06-knowledge-transfer.md) | A five-session plan to bring a new support engineer up to speed |
| [7. Traceability matrix](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/support/07-traceability-matrix.md) | Each release change → test evidence → video → procedure |
| [Screen gallery](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/support/screenshots/README.md) | Every captured screen, by journey |
| [One-page version](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/support/support-package.html) | All seven parts on one page with the screenshots (download and open in a browser; a PDF copy is being added to the Drive folder) |

### Operations handbook (CMS V2.12, applies to both counties)

- [Operations handbook overview](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/2.12/operations/README.md) — severities, how a problem moves from L1 to L2, monitoring links
- [L1 first response](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/2.12/operations/l1-first-response.md) and [L2 diagnosis](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/2.12/operations/l2-diagnosis.md)
- [Known issues](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/2.12/operations/known-issues.md), [incident report template](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/2.12/operations/incident-report.md) and [cheat sheet](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/2.12/operations/cheatsheet.md)
- [Who sees which complaints (jurisdiction access control)](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/2.12/jurisdiction-access-control.md)
- [Reopen window](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/reopen-window.md) — how the reopen time limit is set and enforced
- [Dashboard configuration](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/2.12/dashboard/dashboard-configuration.md) and [notifications set-up](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/2.12/notifications/README.md)
- [CMS V2.12 release notes](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/2.12/release-notes-v2.12.md) — what the base product changed

### Deployment and configuration

- [Bomet onboarding runbook](https://github.com/eGov-Global/CMS-KENYA/blob/master/local-setup/ansible/runbooks/03-bomet-onboarding.md)
- [County host_vars templates](https://github.com/eGov-Global/CMS-KENYA/tree/master/local-setup/ansible/inventory/host_vars)
- [Migration runner guide](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/migration/README.md)
- [Escalation runbook](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/pgr-escalation/RUNBOOK.md)
- [Virus scanning of uploads](https://github.com/eGov-Global/CMS-KENYA/blob/master/backend/filestore-scan-proxy/README.md) — enabling ClamAV and reading the quarantine
- [Analytics setup](https://github.com/eGov-Global/CMS-KENYA/tree/master/docs/analytics-guide)

## Release overview

CMS Kenya V2.12 is the Kenyan implementation of CMS V2.12, the DIGIT Complaint Management System. Residents file and follow complaints in English or Kiswahili, on the web, from any device. County officers route, escalate and resolve them through each county's own workflow. County leadership follows performance on a dashboard and can export it.

One code line serves two counties:

| | **Bonga Nai** | **Bomet Feedback Hub** |
|---|---|---|
| County | Nairobi City County | Bomet County |
| Address | [bonga.nairobi.go.ke](https://bonga.nairobi.go.ke/digit-ui/landing) | [bgrm.bomet.go.ke](https://bgrm.bomet.go.ke/digit-ui/landing) |
| Tenant | `nb` | `bo` |
| Resident & staff application | `nairobi-prod` | `nairobi-prod-bgrm-changes`: the same application code, built separately |
| Public website (landing page) | `nairobi-prod` | `nairobi-prod-bgrm-changes` |
| Complaint service (pgr-services) | `nairobi-prod` | `feat/bomet-uat` |

In the technical sections, "bgrm" means the Bomet Feedback Hub site (bgrm.bomet.go.ke).

---

## Highlights

- **Security fixes.** Confidential complainants masked by the server, a role-filtered resident timeline and server-enforced time limits; from CMS V2.12, gateway enforcement, policy-based complaint search and a jsPDF fix. The CMS V2.12 request-validation fix for pgr-services is not yet taken. Read: [Security fixes](#security-fixes) · Watch: [part S4](#training-videos-and-support-package)
- **Virus scanning of uploads (file scan).** Optional scanning of every upload with the ClamAV antivirus engine, a 90-day quarantine, and refusal when the scanner is down; off in both counties for now. Read: [File scan: virus scanning of uploads](#file-scan-virus-scanning-of-uploads) · Watch: [part S3](#training-videos-and-support-package)
- **The "quota exceeded" browser-storage error is fixed.** Master data is cached in the browser's larger store (IndexedDB), a full store no longer breaks the page, and caches are dropped after each deploy. Read: [Browser storage limit ("quota exceeded")](#browser-storage-limit-quota-exceeded)
- **UI enhancements from CMS V2.12.** A refreshed dashboard, the working-context chip and inbox visibility tabs for staff, and photo, document and video attachments that play in the page. Read: [Contributed by CMS V2.12](#contributed-by-cms-v212) · Watch: [part 08](https://drive.google.com/file/d/1cPtgHFF9mG8jZGD2mTHDQvIgtpRhsrQV/view)
- **Confidential complaints.** "Keep details confidential" on the resident and staff forms; the server then hides the complainant's name and contact details from officers. Read: [Security fixes](#security-fixes) · Watch: [part S1](#training-videos-and-support-package)
- **Official PDF application.** Generated in the browser, with Download, Print and Share on the confirmation and complaint pages. It prints the complainant's name and phone number as the person opening it may see them; the message sent with a shared PDF never carries them. Read: [For residents](#for-residents) · Watch: [part 06b](#training-videos-and-support-package)
- **Time limits for reopen and withdraw.** Reopen within 3 days of the last update in both counties; withdraw within 1 day and before assignment on Bonga Nai, within 3 days on Bomet; the server enforces both. Read: [For residents](#for-residents) · Watch: [part 06](https://drive.google.com/file/d/1RTcpg1XcTALHbSIseqY7uNgyA1EpOcrb/view)
- **Manual escalation and reassign.** Officers escalate a complaint to the next level and pick the officer there; on Bonga Nai they can also reassign within the department or send a complaint back to the Grievance Routing Officer (GRO). Read: [For county officers and staff](#for-county-officers-and-staff) · Watch: [part 04](https://drive.google.com/file/d/1tvKw4p4HR3tefqVYnNFvf6W-X4398MAn/view)
- **Dashboard export.** Excel, CSV or a PDF report, each with the filters used and the key performance indicators (KPIs) against the previous period. Read: [For county leadership](#for-county-leadership) · Watch: [part 08](https://drive.google.com/file/d/1cPtgHFF9mG8jZGD2mTHDQvIgtpRhsrQV/view)
- **Faster start-up.** The start-up download is more than halved, from 9.5 MB to 4.55 MB (figure from PR #103, not re-measured). Read: [Session and browser handling](#session-and-browser-handling)

---

## What's new

### For residents

- **A public website (landing page) for each county**, reachable without signing in (the site root opens it):
  - **Bonga Nai** — the county's 12 Oct design (utility strip, county crest masthead, hero, photo category cards, slogan band) and a single "Call Customer Service" panel: 0725 624 489 (24/7), 0730 047 047 and 020 724 7047, with a contact e-mail address in the footer (renamed from Nai Pepea, #71).
  - **Bomet Feedback Hub** — the Bomet page with its own wording, sub-counties and help lines (`nairobi-prod-bgrm-changes`).
- **Filing a complaint**
  - **Terms and conditions consent** is required before submitting and is stored with the complaint (#103).
  - **"Keep details confidential"** is offered on every complaint (#103).
  - An optional **address** field on the first screen; what the resident types is saved and shown to the officer (#95).
  - Complaint types and sub-types are listed **A–Z, with "Others" last** (#103).
  - The **map** opens at the county centre at street level with a pin the resident can move. It uses a vector street map with a fallback for older phones, and clearing a search keeps the current view (#4, `16c6e311f`, #86).
  - **Attachments:** photos, documents and videos, up to 5 files of 5 MB each; videos play in the page. Details: [Contributed by CMS V2.12](#contributed-by-cms-v212).
- **After filing**
  - **Official PDF application**, generated in the browser, with Download and Print on the confirmation and complaint pages. Share opens a dialog (Open PDF, E-mail, WhatsApp, SMS on touch screens, and "More apps" where the browser can share) and, where the browser can share files, hands the PDF itself to the device's share sheet. The PDF prints the resident's own name and phone number, so sharing it shares them too; the prefilled message that goes with it never contains them (#103, #142). Details: [Session and browser handling](#session-and-browser-handling).
  - **Progress timeline** without officers' names, phone numbers or internal comments (#103).
  - Escalated complaints show **"Escalated (Level n)"**, and the location reads as **County / Sub-County / Ward** names (#29).
  - **Rating with five faces** instead of stars; earlier ratings are kept (#117).
  - **Reopen** within 3 days of the last update, in both counties. The button disappears when the time limit passes, even on a page left open (#145). A reopened complaint goes back to an officer who can act on it, and the reopen form shows errors inline and blocks a double submit.
  - **Withdraw** a complaint that is no longer needed, after a short confirmation with an optional reason: on Bonga Nai within 1 day of filing and before it is assigned; on Bomet within 3 days of filing, while it is with the officer; never after a reopen (#146). The status then reads "Withdrawn".
- **Everyday use**
  - The application downloads **less than half as much** at start-up (4.55 MB instead of 9.5 MB): heavy screens, maps and PDF tools load only when needed (#103).
  - The browser tab shows the county's name and icon (#140).
  - After an update, open pages switch to the new version on their own (#148).
  - A brief network failure no longer drops the user onto the maintenance page; an expired session goes to the sign-in page and keeps drafts; a notice explains when another account signs in from another tab.
  - The one-time code (OTP) can be re-sent after **3 minutes** (#117).
  - **Sign-in screens:** the top bar takes the county colour; the backdrop fills the screen on every device, with no white strips; Bomet's highland landscape shows behind both sign-in screens.
  - On Bonga Nai, the **Complaints card** on the resident home has its own banner strip instead of reusing the sign-in photo.

### For county officers and staff

- **Confidential complaints protected on the server** — the complainant's name, phone, e-mail and address are hidden from every officer, including the one who filed the complaint, unless the officer holds the `CONFIDENTIAL_COMPLAINT_VIEWER` role, which no county has yet ([limitation 6](#configuration-to-complete-in-the-counties)). Searches by person leave confidential complaints out, and staff notifications and domain events carry no complainant identity (#103).
- The staff filing form offers **"Keep details confidential"** too (#125).
- **Manual escalation** — an officer passes a complaint to the next level and chooses the officer there (#103). Bonga Nai: last-mile officer (role code PGR_LME) → Chief Officer → CECM (County Executive Committee Member). Bomet: last-mile officer → department Director → Chief Officer → CECM; for Water, last-mile officer → Chief Officer → CECM.
- **Reassign within the department (Bonga Nai)** — a last-mile officer can reassign a complaint to another last-mile officer of the same department, in any ward (#93).
- **Reassign to GRO (Bonga Nai)** — a last-mile officer can send a complaint back to the GRO's queue, unassigned, with an optional comment (#150).
- **Assign picker** — one searchable list matching names or departments; only last-mile officers; deactivated staff hidden (#79).
- **Take Action** is offered by role, not only to the assignee (#134). A half-filled action stays with its own complaint and action. The complaint page refreshes when the officer returns to the tab and after an action fails because the complaint changed.
- **Withdraw on a resident's behalf** — the front desk / call centre (role code CSR) withdraws with a confirmation and a required comment (#146). **Reopen** appears in Take Action only within the time limit.
- **Inbox** — resolved and rejected complaints are in the default list, so the call centre can reopen them; the sub-type filter lists every sub-type; escalated statuses appear without ticking a filter, labelled "Escalated (Level n)"; the timeline names the officer who escalated (#20).
- **New staff header** — greeting by designation ("Hello, Director"), live clock, language menu, profile card (department, role, location, last sign-in), from `9d97efb41` to `9c34a4449` (18–21 Sep); the city picker appears only for staff working in more than one city (#132).
- The **Complaints card** is shown to Directors, Chief Officers, CECMs, Bomet's department tiers and the Ombudsman (#20).
- **Forgot password** sends the code to the mobile number entered with its country code, and no longer crashes.
- **PDF application buttons** on the staff "complaint submitted" page (#121).

### For county leadership

- **Dashboard export** — Excel (a summary plus a sheet per tile), CSV or a PDF report, each with the filters used, the KPIs against the previous period, and every chart, table and map as data (#130).
- **Dashboard refinements from CMS V2.12:** language menu, "updated … ago" stamps, faster batched queries.
- **Behaviour analytics (Matomo, self-hosted), Bomet only** — records the complaint funnel (each form step, submission outcome, landing pages) with personal data scrubbed (#34).

### For administrators and operators

- **Time limits enforced by the server** — Reopen within `REOPENSLA` of the last update and Withdraw within `WITHDRAWSLA` of filing, set per county in `RAINMAKER-PGR.UIConstants` (#136).
- **Role-filtered timeline API** `/pgr-services/v2/request/_chronology` (access-control action 2635) (#103).
- **Auto-assignment at filing** — a complaint filed by a resident is assigned, best effort, to a last-mile officer of the category's department, matched on the complaint's location: ward, then sub-county, county, department-wide. If nobody matches, it stays unassigned. It takes effect on Bomet, whose workflow sends new complaints straight to the officer (#4).
- **Complaint numbers without zero padding** (`BNG-2026-125`), opt-in; padded numbers are still found by search (`da6df4be3`). Evidently on for Bonga Nai: its live complaint numbers are unpadded.
- **Virus scanning of uploads** with ClamAV — infected files are refused and quarantined, and the resident sees a clear message. Off by default; turned on per county with `enable_file_scan: true` (#157). Memory to budget: [Compatibility and upgrade notes](#compatibility-and-upgrade-notes).
- **New builds reach open browsers** — a build id on every asset and a `build-info.json` the app checks; Ansible rebuilds the UI when its source changes (#148). The Ansible nginx template and the Compose setup already send `Cache-Control: no-cache`.
- **SMS** — complaint SMS go through novu-bridge, the notification service. The Bongatech gateway (direct or through Novu) and the Source Code gateway (direct only, `nairobi-prod`) are available alongside Ozeki, and SmsCountry was removed (#39). OTP SMS can go through novu-bridge too, once user-otp's `SMS_TOPIC` points at its OTP topic; no deploy file sets that.
- **Display masking of personal details (PII)** — the switch `pgr_pii_masking` → `PGR_PII_MASKING` in the runtime settings Ansible generates from each county's `host_vars`; off for Kenya (#22).
- **Bomet landing text from labels** — the Bomet page's wording comes from 172 `PGR_LANDING_*` labels, so it can be edited without a new build.
- **Department scope in search** — staff department and jurisdiction scope is wired into search. The department-name cache keeps serving its last good value during a brief outage of MDMS (the configuration store), so an officer's results are not narrowed (`d72391231`).
- **Deployment tooling** — a Nairobi Ansible `host_vars` template (`nairobi.yml.example`; Bomet's comes from CMS V2.12), file-scan tasks, and Matomo provisioning fixes.
- **CMS V2.12 update (16 Sep)** — policy-driven search scoping by department and jurisdiction, the working-context API for staff, inbox visibility tabs, analytics capability checks, and Helm and continuous integration (CI) validation.

---

## In detail

### Security fixes

#### Made for Kenya

- **Confidential complainants are masked by the server** (#103, #128). For a confidential complaint, the name, phone, e-mail and address are replaced for every officer, including the front-desk officer who filed it, unless the officer holds `CONFIDENTIAL_COMPLAINT_VIEWER`. Searches by person leave confidential complaints out, and staff notifications and domain events carry no complainant identity.
- **The resident's timeline comes from a role-filtered API** (`/pgr-services/v2/request/_chronology`, access-control action 2635; #103). Officer names, contacts and internal comments are removed on the server, not only hidden in the page.
- **The message sent with a shared PDF application never contains the complainant's name or phone number** (#129, #142). The PDF itself prints them as the person opening it may see them: in full on the resident's own copy, and masked when staff without the confidential-viewer role open a confidential complaint (the server masks them before the browser draws the PDF). Share hands over the PDF itself, so a resident who shares it also shares their own name and number.
- **Time limits are enforced by the server** (#136). Reopen and Withdraw are refused outside the county's time limit even when the API is called directly, and a malformed rule fails closed (`INVALID_ACTION_WINDOW_CONFIG`).
- **Uploads are scanned for viruses** when scanning is switched on (#157); see [File scan: virus scanning of uploads](#file-scan-virus-scanning-of-uploads).
- **Landing-page links** that come from configuration are sanitised before they become navigation (PR #1).

#### From CMS V2.12 (in this release)

- **The gateway enforces access instead of only logging it.** Kong's `ENFORCE_UNAUTH` and `ENFORCE_RBAC` change from audit mode to enforced: a protected API called without a session gets 401, and a call without the role gets 403. This is the shipped configuration; the live gateways were not inspected.
- **Policy-based complaint search** (access-control action 2008). Results are scoped by department and jurisdiction per role, the complainant's name and phone are redacted outside that scope, and the check fails closed when access control cannot be reached. Both counties' policies are described under [Configuration, MDMS and workflow changes](#configuration-mdms-and-workflow-changes).
- **jsPDF upgraded from 2.5.1 to 4.2.1**, which fixes a published security vulnerability (CVE). It is the PDF library the UI uses for the PDF application and reports.
- **Platform defaults:**
  - Grafana no longer allows anonymous access.
  - The Helm values turn off dev mode, the fixed OTP and the dev mode of the staff directory (HRMS).
  - The public analytics endpoints are rate-limited (60 requests per minute per IP, 1 MB per request).

#### Earlier CMS V2.12 fixes

- the map's ward tooltip is HTML-escaped, against cross-site scripting (XSS);
- the search scope flags cannot be used to bypass scoping;
- analytics scripts load only from allow-listed hosts, with personal data scrubbed and a kill switch.

#### CMS V2.12 security fixes not yet in this release

The Kenya sync of 16 Sep took the front end and part of the backend; the September hardening of pgr-services was not taken:

- **Request validation is not enforced in pgr-services.** It still pins Hibernate Validator 6.0.16 (javax) under Spring Boot 3.2.2, the setup CMS V2.12 diagnosed as silently disabling every `@Valid`, `@NotNull`, `@Size` and `@Pattern` check. CMS V2.12 fixed it on 15 Sep (`b0fad2383`), followed by validation of the complainant object (`4b373f5c9`) and `@SafeHtml` on the rest of the request graph (`9df954273`).
- PostgreSQL driver 42.7.11 and removal of the unused jsoup (`687c6e8c6`).
- The code-base security scan workflow, the CodeQL clean-ups, and the micro-UI lockfile clean-up of 109 Dependabot alerts.

Recommendation: take these in the next CMS V2.12 sync (see [limitation 4](#not-yet-in-this-release)).

### File scan: virus scanning of uploads

Added by #157 (Bonga Nai's branch) and #158 (bgrm's branch); off by default.

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
  - Files refused only because they could not be checked are not kept, so residents' data is not stored without reason.
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
    - plan the memory: about 1.5 GB for ClamAV, plus up to 1 GB for the upload proxy under heavy load — budget about 2.5 GB.

### Browser storage limit ("quota exceeded")

Browsers allow a site only about 5 MB of `localStorage`. The platform kept master data there (MDMS responses, the complaint hierarchy), and on tenants with large configurations the browser threw `QuotaExceededError` and the page failed. This release carries the fix and Kenya's follow-ups:

- **Large master data moved to IndexedDB** (CMS V2.12 fix `8fd9f8088`): MDMS and complaint-hierarchy responses are cached in IndexedDB, which has a far larger allowance.
- **No crash on a full store.** `Digit.Storage` no longer throws when the browser refuses a write: it skips persisting, and the value is fetched again on the next load. Old MDMS entries left in `localStorage` are removed once on the first load to reclaim space.
- **Quota-guarded drafts:** the resident's half-filled complaint is kept in session storage for 24 hours.
- **Non-critical state is written best-effort:** language choice, dashboard layout and badge counts are skipped quietly when storage is full or in private mode.
- **Caches are dropped after a deploy** (#148). Each MDMS entry is tagged with the build that wrote it, and the first load of a new build drops the cached label bundles and complaint-type cache. Old-shape data therefore never survives an update, and storage does not fill up across releases.

### Session and browser handling

- **Two accounts in one browser** (from CMS V2.12, Sep 2026). The active session is per tab, but the platform stored the signed-in user in shared `localStorage`.
  - Previously, one tab's session expiry could sign out a different user working in another tab. A shared key is now removed only when it belongs to the dead session.
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
- **Sharing the PDF application** (#142). In this build, Share opens a dialog on every device, phones and computers alike:
  - The dialog offers Open PDF, E-mail, WhatsApp, SMS (on touch screens) and "More apps" (where the browser can share).
  - Where the browser can hand a file to another app (Safari on Mac and iOS, Chrome on Android), every tile opens the device's own share sheet with the PDF itself. Elsewhere, the tile opens the app with a prefilled message, and the same tap downloads the PDF for the user to attach.
  - The PDF is prepared when the share dialog opens, so Share, Open PDF and Download run inside the user's tap; a refused share falls back to a download.
  - Opening the PDF uses a ready-made file instead of navigating a blank pop-up.
  - The prefilled message carries the complaint's details (number, status, category, filing date, address, description, and the help line when one is set), never the complainant's name or phone number. The PDF itself carries the resident's own name and number, so sharing it shares them (see [Security fixes](#security-fixes)).
  - Not in this build: PR #162 (open) shows Share only in the mobile view (768 px and narrower) and removes "More apps", because sharing from computers stayed unreliable (Safari on Mac, issue #138), and PR #161 (open) adds the staff top-bar emblem fallback and shortens long designations.
- **Faster first load on slow links** (#103): screens, maps and PDF tools load on demand, which halves the start-up download (9.5 MB to 4.55 MB).
- **County identity in the tab** (#140): the browser tab shows the county's name and icon.
- **Staff passwords** (Sep 2026): forgot-password sends the code to the mobile number typed with its country code, always resets through the no-login endpoint, and no longer crashes.
- **Error, maintenance and not-found screens** (#5): each shows its own button label, a working image and a proper layout.

### Contributed by CMS V2.12

#### Screenshots and videos on complaints

- **Attachments when filing.** Residents and staff can attach photos and screenshots, PDF, Word and Excel files, and videos (mp4, mov, avi, mkv and webm) when filing a complaint, up to 5 files of 5 MB each. Attachments can also be added on workflow actions, and the reopen form takes them too. These are the types the code accepts; the live servers' accepted-format list was not read, and issue #25 (open) reports Word files refused on Bomet.
- **Accepted types match the file server.** The accepted list matches what the filestore allows in the shipped configuration, except that the picker offers every image type while the file server takes JPEG and PNG only. Audio is no longer offered, because the server rejects it.
- **Videos play in the browser.** Video attachments, and audio files already stored, play with full-screen controls instead of appearing as broken images. The timeline shows a thumbnail, and attachments display at a uniform size.
- **Since #157,** every attachment passes the virus scan when scanning is on.

#### UI enhancements picked from CMS V2.12 (16 Sep 2026 update)

- **Dashboard:**
  - refreshed header, filter bar, footer and KPI tiles, plus an "add KPI" menu;
  - an "updated … ago" stamp on each card, and a language menu;
  - batched, sequential analytics queries for faster loading, with a stricter public-dashboard boundary;
  - clearer line and stacked-bar charts.
- **Staff top bar:** a working-context chip showing the officer's role context, with sidebar and language-selection updates. Kenya added the designation greeting and profile card on top.
- **Theme handling:** the header logo switches to the light version when a county paints its header dark, and theme colours are derived per county. Images fall back cleanly when a logo or picture fails to load, except the logo in the staff top bar, whose fallback is PR #161 (open; see [Session and browser handling](#session-and-browser-handling)).
- **Inbox visibility tabs:** they replace the old "assigned to me / all" choice when `RAINMAKER-PGR.InboxVisibilityConfig` is set. They are on in Bomet and off on Bonga Nai.
- **Timeline:** the resolved and rejected steps show the reopen time limit.
- **Platform components:** the shared design-system CSS was refreshed, along with the footer brand assets.

---

## Included from CMS V2.12

CMS Kenya V2.12 includes CMS V2.12 and its 16 Sep 2026 update (`7ee88f83`). In use in both counties:

- The **3-step resident form**: category pickers, drafts that survive a refresh, consent capture. Attachments (photos, documents and video; not audio) when filing and on every workflow action, played in the browser.
- **Action screens built from each county's workflow.** Reopen and rating keep the complaint's routing data; a reopen needs a reason and restarts the escalation clock.
- **Complaint categories as data** (`ComplaintHierarchy`); Kenya uses two levels.
- **Notifications** to the newest workflow step, with department names, acting-officer and deep-link placeholders. novu-bridge **direct delivery**, which Kenya extended with its own SMS gateways, and the OTP pipeline.
- The **analytics framework**: off by default, personal data scrubbed, with a destinations editor and Matomo provisioning.
- The **landing-page renderer** and the configurator's visual **Landing Page Builder**; theme colours from MDMS.
- Configurable escalation states; map, boundary-picker and translation fixes; master data cached in the browser (IndexedDB); compressed, always-revalidated UI delivery.
- From the 16 Sep update: policy-driven search scoping (configured in both counties; see [Configuration, MDMS and workflow changes](#configuration-mdms-and-workflow-changes)), role-based access checks (RBAC) enforced in the shipped Kong configuration, Grafana sign-in required, Helm and seed parity checks in CI.

Present but switched off, unused or not released in Kenya:

- role-list search scoping (`pgr.department.scope.roles` and `pgr.jurisdiction.scope.roles` are empty); both counties scope search through the policy on access-control action 2008 instead;
- on-screen masking of personal details (`PGR_PII_MASKING=false`);
- the password-gated testing entrance;
- the reception-officer inbox and the four-tier CMS workflow and roles;
- the authority picker and per-authority questions (no Kenya data);
- the Portuguese language packs;
- the Ozeki SMS gateway;
- the admin cross-department search screen (neither county has an access-control action for its API);
- the role-tiered staff home at `/digit-ui/employee/home-v2` (oversight, casework, intake, read-only), which Kenya added (#56, #63, #80): it is present and reachable by URL, but not linked from the menu and not released.

Not included from CMS V2.12:

- the mobile app;
- the tutorial page;
- the self-contained security scanner and OpenSSF Scorecard (Kenya keeps the CI security pipeline);
- the reopen fresh-fetch fix;
- the double-submit guard on filing.

## Fixes and improvements

Smaller fixes not listed above, all in this release:

- **The resident's reopen page no longer crashes** (a hook was not registered) (#6).
- **Readable buttons:**
  - primary buttons are readable at rest in each county's colours;
  - the resident's Rate and Re-open buttons are readable;
  - the reopen heading falls back to English when its label is missing (#62, #63, #64).
- **Questions whose answers could not be saved** (name, address and e-mail on the first screen) are no longer asked (#96).
- **Filing on a resident's behalf** no longer fails with `INVALID_CASE_RELATED_TO`, and the optional address is saved (#95).
- **Landing page:**
  - text on dark areas stays white even when a county's buttons are light;
  - the Bomet landing page was restyled with a white hero and footer, a blue palette and the county logo lockup (#7).
- **Labels:** two staff-home labels that showed as raw keys are seeded.
- **Resident pages:** the footer sits flush at the bottom, and a bundled DIGIT mark replaces a missing county logo in the header (#131).
- **Tests:** a new end-to-end test keeps a Take Action draft with its own complaint (#147).

---

## How the two counties differ

Read from the live sites on 13 Oct 2026; the escalation timers were re-read on 19 Oct.

| | **Bonga Nai** (`nb`) | **Bomet Feedback Hub** (`bo`) |
|---|---|---|
| Routing of a new complaint | The GRO's queue; the GRO assigns a last-mile officer. An officer can send a complaint back to the GRO. | Straight to a last-mile officer: complaints filed by residents are assigned automatically (best effort) by department and location; unassigned if nobody matches (#4, #8). |
| Escalation chain | 2 levels: Chief Officer → CECM | 3 levels per department: Director → Chief Officer → CECM (Water starts at its Chief Officer) |
| Escalation timers | 2, 4 and 6 minutes per level, test values ([finding 1](#support-preparation-findings-and-follow-ups)); no per-category settings | 60 h, 18 h and 18 h per level; 91 per-category settings, 11 of them at 2 minutes ([limitation 8](#configuration-to-complete-in-the-counties)) |
| Withdraw | Before assignment, within 1 day of filing | While with the officer, within 3 days of filing |
| Reopen | Within 3 days of the last update; returns to the GRO queue | Within 3 days of the last update; returns to a last-mile officer |
| Categories | 21 types, 39 sub-types; deadlines 4–72 hours; no department mapping | 48 types, 94 sub-types; deadlines 1–30 days; Health 46, Water & Sewage 36, Administration 12 |
| Complaint numbers | `BNG-2026-125` (no zero padding) | `BFH-2026-000020` (6-digit zero padding; Bomet's requirement asks for 7 digits, issue #45) |
| Public website (landing page) | Bonga Nai design (`nairobi-prod`) | Bomet page (`nairobi-prod-bgrm-changes`) |
| Languages | English, Kiswahili | English, Kiswahili |
| Behaviour analytics | not configured | Matomo |

Both counties run the same resident and staff application, built twice: Bonga Nai's from `nairobi-prod` and bgrm's from `nairobi-prod-bgrm-changes`, whose intended difference is the Bomet landing page. Every application change outside the landing page is merged into both branches; two later tooling commits, the load-test suite (`32a56d27d`) and the backup script (`723b680d7`), are on `nairobi-prod` only. bgrm keeps its own build until the landing page can be chosen per county by configuration.

The full comparison (coverage, officer roles, departments and designations, branding, inbox visibility, notification templates) and the history of the two landing pages are in [section 3 of the release preview and evidence](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/RELEASE-PREVIEW-CMS-KENYA-V2.12.md#3-bonga-vs-bgrm-live-configuration-compared).

---

## Configuration, MDMS and workflow changes

Workflow and most MDMS records are live data: they are applied to each county's database, not shipped in the code. The state below is what each county runs on 13 Oct 2026; the escalation timers were read on 19 Oct.

Codes in CAPITALS are workflow states, actions and role codes as stored; the screens show names instead, for example "Reassign to GRO" for `REASSIGNTOGRO`.

### Bonga Nai (`nb`)

- **Workflow `PGR`** (last changed 12 Oct): APPLY → GRO queue → last-mile officer → Escalated (Level 1), Chief Officer → Escalated (Level 2), CECM. It differs from the standard CMS V2.12 PGR workflow by:
  - escalation states with manual ESCALATE for the last-mile officer and the Chief Officer;
  - REASSIGN within the officer stage, to an officer of the same department (#93);
  - REASSIGNTOGRO (#150);
  - WITHDRAW before assignment (CITIZEN, CSR).
- **Who sees which complaints** (search policy on access-control action 2008):
  - Last-mile officers, Directors, Chief Officers and CECMs see their **own department and jurisdiction**.
  - GROs and front-desk staff (CSR) see **all** complaints.
  - Complainant names and phone numbers are redacted for staff outside the complaint's department or jurisdiction.
- **`RAINMAKER-PGR.UIConstants`**: `REOPENSLA` 3 days (from the last update), `WITHDRAWSLA` 1 day (from filing), `actionWindows` for REOPEN and WITHDRAW.
- **`RAINMAKER-PGR.EscalationConfig`** (read 19 Oct): one record, up to 3 levels, default timers 2, 4 and 6 minutes, no per-category settings; created 24 Sep, last changed 30 Sep. The 13 Oct capture did not read this schema.
- **Categories** (`RAINMAKER-PGR.ComplaintHierarchy`): 21 types / 39 sub-types, including the new type **Others** (72 hours).
- **Complaint numbers** (`common-masters.IdFormat`): `BNG-[year]-[sequence]`, unpadded.
- **Branding**: Nairobi `ThemeConfig` (green) and `StateInfo` (emblem, sign-in photo).
- **Access control**: timeline action 2635 granted to 12 roles.
- **Labels**: app title "Bonga Nai"; designation and department names; PDF application, share, withdraw and Reassign to GRO labels; the Kiswahili audit labels (Oct 2026).

### Bomet Feedback Hub (`bo`)

- **Workflow `PGR`** (last changed 9 Oct): APPLY → last-mile officer (auto-assigned) → Escalated (Level 1), department Director (Water: Chief Officer) → Escalated (Level 2), Chief Officer (Water: CECM) → Escalated (Level 3), CECM. It differs from the standard CMS V2.12 PGR workflow by:
  - APPLY going straight to the officer;
  - three departmental escalation levels, with manual ESCALATE for the officer and each tier;
  - WITHDRAW while the complaint is with the officer (CITIZEN, CSR).
- **Who sees which complaints** (search policy on action 2008):
  - Department tiers and last-mile officers see their **own department and jurisdiction**.
  - GROs see all departments in their own jurisdiction.
  - Front-desk staff (CSR) and the Ombudsman see **all** complaints.
  - Complainant names and phone numbers are shown only to the complainant and to staff whose roles reach every department and every area (CSR, OMBUDSMAN_OFFICER). Last-mile officers, department tiers and GROs see them redacted.
- **`RAINMAKER-PGR.UIConstants`**: `REOPENSLA` 3 days (from the last update), `WITHDRAWSLA` 3 days (from filing), `actionWindows`.
- **`RAINMAKER-PGR.EscalationConfig`** (read 19 Oct): up to 3 levels, default 60 h / 18 h / 18 h, 91 per-category overrides, 11 of them at 2 minutes ([limitation 8](#configuration-to-complete-in-the-counties)); created 17 Sep, last changed 28 Sep.
- **`RAINMAKER-PGR.InboxVisibilityConfig`**: jurisdiction-scoped, server-side, reportee depth 3.
- **`common-masters.AnalyticsProvider`**: Matomo, site 1.
- **Categories**: 48 types / 94 sub-types (142 records), each mapped to Health, Water & Sewage or Administration.
- **Complaint numbers**: `BFH-[year]-[sequence]`, zero padded to 6 digits.
- **Access control**: timeline action 2635 granted to 21 roles; analytics actions 2650/2651 (MDMS_ADMIN, SUPERUSER).
- **Labels**: app title "Bomet Feedback" / "Maoni ya Bomet"; 172 landing-page labels; designation and department names; withdraw labels; the Kiswahili audit labels (Oct 2026).

### New settings introduced by this release

Everything below is **opt-in or a fallback** unless stated. No deploy file sets the Kenya-added pgr-services keys (padding, action windows, withdraw window); Compose sets `EGOV_ACCESSCONTROL_HOST` and `PGR_ABAC_STRICT_MODE`.

| Setting | Where | Default | What it does |
|---|---|---|---|
| `egov.idgen.pgr.serviceRequestId.strip-sequence-padding` | pgr-services | `false` | Complaint numbers without the zero pad (`BNG-2026-125`); search finds both forms. **`nairobi-prod` only** — not in bgrm's `feat/bomet-uat` build. |
| `PGR_ACTION_WINDOWS_DEFAULTS`, `PGR_COMPLAIN_WITHDRAW_TIME`, `PGR_COMPLAIN_IDLE_TIME` | pgr-services | 72 h each | Fallback REOPEN/WITHDRAW windows, used only when the county's `UIConstants` has no value (the reopen fallback dropped from 10 days to 72 h). |
| `EGOV_ACCESSCONTROL_HOST`, `PGR_ABAC_STRICT_MODE` | pgr-services | compose: `egov-accesscontrol:8090`, `false` | Policy lookup for department/jurisdiction search scoping (CMS V2.12). Fails closed if access control is unreachable. |
| `NOVU_BRIDGE_USER_OTP_DEFAULT_TENANT_ID` | novu-bridge | **`bo`** | Tenant stamped on OTP SMS. **Bonga Nai must set `nb`.** |
| `NOVU_BRIDGE_DIRECT_SMS_PROVIDER` (`ozeki` · `bongatech` · `sourcecode`), the other `NOVU_BRIDGE_DIRECT_SMS_*` keys (`_BASE_URL`, `_USERNAME`, `_PASSWORD`, `_TOKEN`, and `_SERVICE_ID` for Source Code), and `NOVU_BRIDGE_SMS_*` (sender id, integration identifier) | novu-bridge | provider `ozeki`; service id `0`; others empty | Direct SMS gateways, used for the channels listed in `NOVU_BRIDGE_DIRECT_CHANNELS` (inherited). `sourcecode` exists only on `nairobi-prod`. Renamed variables: see [Compatibility and upgrade notes](#compatibility-and-upgrade-notes). |
| `NOVU_BRIDGE_KAFKA_USER_OTP_SMS_TOPIC` | novu-bridge | `egov.core.notification.sms.otp` | OTPs through novu-bridge — effective only when user-otp's `SMS_TOPIC` points to it. |
| `PGR_PII_MASKING` (host_var `pgr_pii_masking`) | UI runtime config | `false` (Ansible) | Display masking of names and phones in the staff UI. **An absent key means masking on.** Server-side confidential masking is separate. |
| `enable_file_scan`, `filestore_scan_proxy_image`, `upstream_scan_proxy_port` (18183) | Ansible | `false` | ClamAV upload scanning: adds `clamav`, `filestore-scan-proxy` and `quarantine-init`, a 90-day `egov-quarantine` bucket, two OpenBao passwords and two Gatus checks. Compose/Ansible only. |

Every novu-bridge key, with its property name and default, is listed in [section 8 of the release preview and evidence](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/RELEASE-PREVIEW-CMS-KENYA-V2.12.md#8-configuration-changes-against-cms-v212).

**MDMS schema and data migrations** (no new Flyway migrations in any backend service):

- `V20260827000000__uiconstants_recode_from_reopensla_key.sql` (CMS V2.12) — re-keys `RAINMAKER-PGR.UIConstants` to `code = DEFAULT` so `REOPENSLA` becomes editable, and moves the old 5-day seed to 72 h.
- `V20260930000000__uiconstants_add_action_windows.sql` (Kenya) — adds `WITHDRAWSLA` and `actionWindows` to the schema. It must run as SQL (the schema update API returns 501). Both counties already carry the new fields.

**Access-control actions** — new: 2635 (timeline), 2640–2648 (analytics, CMS V2.12), 2650/2651 (`AnalyticsProvider` writes). Changed: 2008 complaint search gains a department/jurisdiction scope policy and field redaction (CMS V2.12); 2553/2554 get distinct menu icons (#90; not yet applied in either county).

**Gateway (Kong)** — the CMS V2.12 update switches `ENFORCE_UNAUTH` and `ENFORCE_RBAC` from audit to **enforced** (401/403), and adds to the sign-in-optional list: workflow business-service search, localization cache-bust, the staff working-context endpoint, the public analytics endpoints and the novu provider endpoints.

**Labels** — 64 `rainmaker-pgr`, 27 `rainmaker-common` and 41 dashboard-export English keys are seeded for **new** tenants; existing counties receive them by upsert. Kiswahili exists only as live data: the repository has no `sw_KE` messages.

**Workflow** — the repository's standard PGR workflow is unchanged. Each county's workflow (WITHDRAW, REASSIGNTOGRO, ESCALATEDLEVEL1–3, Bomet's APPLY straight to the officer) exists only in that county's database.

---

## Compatibility and upgrade notes

Changes that need attention on an existing set-up:

- **Gateway enforcement.** In the shipped configuration, Kong's `ENFORCE_UNAUTH` and `ENFORCE_RBAC` enforce instead of only logging: a protected API called without a session gets 401, and a call without the role gets 403. The sign-in-optional list changes too (see [Configuration, MDMS and workflow changes](#configuration-mdms-and-workflow-changes)). The live gateways were not inspected.
- **Renamed novu-bridge variables.** `OZEKI_*` became `NOVU_BRIDGE_DIRECT_SMS_*`, and `NOVU_BRIDGE_OZEKI_INTEGRATION_IDENTIFIER` (default `ozeki-sms`) became `NOVU_BRIDGE_SMS_INTEGRATION_IDENTIFIER` (default empty).
- **SmsCountry removed.** novu-bridge no longer has the SmsCountry gateway, but the deploy templates still pass the removed `NOVU_BRIDGE_SMSCOUNTRY_*` variables and do not pass the direct-SMS or OTP variables; set those by hand on each server ([limitation 14](#configuration-to-complete-in-the-counties)).
- **OTP default tenant.** novu-bridge stamps OTP SMS with tenant `bo` unless `NOVU_BRIDGE_USER_OTP_DEFAULT_TENANT_ID` is set, so Bonga Nai must set `nb` ([limitation 13](#configuration-to-complete-in-the-counties)). OTP SMS reach novu-bridge only once user-otp's `SMS_TOPIC` points at its OTP topic.
- **Two UI builds.** Build Bonga Nai from `nairobi-prod` and bgrm from `nairobi-prod-bgrm-changes`, and merge every change outside the landing page into both branches. Today `nairobi-prod-bgrm-changes` lacks three `nairobi-prod` commits: `8e6289e86` (the #157 merge commit; its content reached bgrm through #158), `32a56d27d` (the load-test suite) and the server backup script described below. The landing-page files remain the intended difference.
- **Merging into `master`.** `master` will carry the Bonga Nai landing page; tag this release on `master` after the merge. bgrm's landing branch stays separate.

Deploying:

- **Order.** Deploy pgr-services before the UI: the UI's timeline needs the chronology API, and the server enforces the time limits the UI displays. Grant action 2635 to every role that opens a complaint, or the timeline is empty (done in both counties).
- **Caches.** Workflow definitions are cached for about 15 minutes (an `_update` call refreshes them; a direct database edit does not). Role permissions are cached for about 15 minutes. After a label upsert, clear the localization cache, or the UI serves stale text.
- **Database.** The MDMS migration `V20260930000000` (action windows in `UIConstants`) runs automatically through the `db-migrations` service on Ansible and Compose deploys; servers still on the prebuilt `egovio/tilt-demo-db-migrations` image need it applied by hand ([preview §8](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/RELEASE-PREVIEW-CMS-KENYA-V2.12.md#8-configuration-changes-against-cms-v212), b.2). Both counties already have it. No backend service adds a Flyway migration.
- **Virus scanning.** To enable ClamAV, set `enable_file_scan: true` in the county's `host_vars` (issue #159). Memory: about 1.5 GB for ClamAV, plus up to 1 GB for the upload proxy under heavy load — budget about 2.5 GB.
- **Per-county settings** live in Ansible `host_vars`. The repository holds the templates `host_vars/nairobi.yml.example` and `host_vars/bomet.yml.example`; the servers' own files are `nairobi.yml` and `bometnew.yml` (named in the header of each site's served `globalConfigs.js`). Bomet onboarding: `local-setup/ansible/runbooks/03-bomet-onboarding.md`.
- **Map centre in the Nairobi template.** `host_vars/nairobi.yml.example` carries Bomet's map centre (-0.7817, 35.3428); Bonga Nai's live centre is (-1.2864, 36.8172). Set it when onboarding from that template.
- **Helm.** Kenya deploys with Ansible and Compose; the Helm chart's UI config lacks `PGR_PII_MASKING` and would mask names.
- **Publishing this release builds images.** `release-build.yml` builds every image in `build/build-config.yml` at the tagged commit, including `novu-bridge-endpoint` and the legacy `digit-ui` (frontend/micro-ui) image, and pushes `egovio/<image>:v2.12-kenya` to Docker Hub. Those become the images to pin. bgrm's pgr-services can then move from `bomet-uat-6eb6b85` to the release build: the code is the same, plus the padding option, which stays off unless set. The release's UI image carries the Bonga Nai landing page, so bgrm keeps its own UI build.
- **To complete before tagging:** record the images running in each county, with `docker ps --format '{{.Names}}\t{{.Image}}' | sort` on each server. The tags on the servers are not verified; the placeholder table is in [section 2 of the release preview and evidence](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/RELEASE-PREVIEW-CMS-KENYA-V2.12.md#2-deployments-and-what-they-run).
- **Server backup script.** `723b680d7` (14 Oct, after the described code) adds `local-setup/scripts/backup-server.sh`: application files, PostgreSQL and MongoDB dumps, checksums. Each backup writes its own restore notes (`RESTORE.md`) next to the dumps; there is no separate restore guide in the repository.

---

## Testing

Automated suites, run on 13 Oct 2026 against `nairobi-prod` @ `8e6289e86`. The described code, `32a56d27d`, adds only the scan proxy's load-test suite on top (results under [File scan: virus scanning of uploads](#file-scan-virus-scanning-of-uploads)).

| Suite | Result |
|---|---|
| Frontend shell unit tests | **192 / 192 pass** |
| Frontend PGR and dashboard unit tests (36 files) | **316 / 316 pass** |
| Production UI build · module-alias check | **pass** · **17 / 17 aliases resolve** |
| Configurator unit tests | **228 / 229 pass** — the failure is a seed mismatch: the local database dump and the default seed hold different postal-code patterns (5 vs 6 digits). It affects fresh local stacks only; neither county has a `FormValidations` record. |
| CI parity guards (gateway whitelist, Flyway ↔ dump, Gatus coverage) | **3 / 3 pass** |
| Playwright integration suite | 298 tests in 106 files listed; **not run** — the suite changes tenant data and was not pointed at the live counties |
| Java unit tests (pgr-services, novu-bridge) | **not run locally** (no JDK on the release machine); they run during the image build |

Recorded CI: on PR #49 (`nairobi-prod` → `master`, head `723b680d7`) 9 checks pass and 3 fail (read 19 Oct):

- "Config combination + infra contracts" — 1 of 13 contract tests fails (`static/infra-contracts.test.ts:62`: a service list now includes `db-migrations`, which the test does not expect), a repository-side failure;
- "test" (Local Setup CI) — the `minio/mc` image can no longer be pulled;
- "tilt-test" (Tilt CI) — the `minio/minio` image can no longer be pulled.

The two image pulls are external; the contract test needs a repository fix. The passing checks include the Flyway, Gatus, DB-seed, analytics-seed and deploy-as-code checks. On #157, Flyway and Gatus pass. The gateway-whitelist check runs only when gateway files change and has not run for `nairobi-prod`; it passes locally (above). #152–#155 triggered no checks.

Manual testing and user acceptance testing (UAT): the county flows were exercised on the live sites and on a local Bomet stack as each change was made — filing, auto-assignment, escalation, resolve, reopen and rate, withdraw, the PDF application and dashboard export. Most of it used real officer accounts rather than an administrator. A formal UAT sign-off is not kept in the repository. The full record is in [section 9 of the release preview and evidence](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/RELEASE-PREVIEW-CMS-KENYA-V2.12.md#9-testing-status).

---

## Known Limitations

### Not yet in this release

1. **Bomet: complaints filed by staff are not auto-assigned.** They reach the officer stage without an assignee, so they appear in no one's "assigned to me" list. A last-mile officer of that department whose area covers the complaint can still act on them. The fix (#81) is on `kenya-prod` among its commits after 23 Sep, which are not in this release, and has not been brought to `nairobi-prod`.
2. **Bomet: a staff reopen without choosing an officer leaves the complaint unassigned** (#50, with #78 and #82, not brought over).
3. **"My Complaints" fails for a resident with more than 10 complaints** (`WORKFLOW_NOT_FOUND`) unless the workflow service's default page limit has been raised (not verified in either county); the fix (`5d429bd08`) is on neither county's code.
4. **Request validation is not enforced in pgr-services.** It still pins Hibernate Validator 6.0.16 (javax) under Spring Boot 3.2.2, the setup CMS V2.12 found silently disables `@Valid`, `@NotNull`, `@Size` and `@Pattern`. CMS V2.12's fix (`b0fad2383`) was not taken by the Kenya sync; see [Security fixes](#security-fixes). (Diagnosis taken from the CMS V2.12 commit; not probed at runtime here.)
5. Not brought over from `kenya-prod`: readable messages when location access is refused (#55; the `CS_GEOLOCATION_*` labels are also unseeded) and the redirect of an anonymous visit to `/citizen` to the sign-in page (#59).

### Configuration to complete in the counties

6. **No officer can see a confidential complainant** — the `CONFIDENTIAL_COMPLAINT_VIEWER` role does not exist in either county.
7. **Bomet: last-mile officers, department tiers and GROs see complainant names and phone numbers redacted.** Bomet's search policy on action 2008 shows them only to the complainant and to staff whose roles reach every department and area (CSR, OMBUDSMAN_OFFICER). If officers must call complainants back, add the department-and-area clause Bonga Nai uses. This comes from the policy code; not checked on screen.
8. **Bomet: 11 categories still have 2-minute test escalation timers** in `RAINMAKER-PGR.EscalationConfig`: 8 on all three levels and 3 Water categories on levels 1–2. Examples are maternal emergencies, ambulance delays, corruption and water pipes. These complaints escalate at the next scheduler run (every 5 minutes by default). Escalation beyond level 1 runs automatically only if `PGR_ESCALATION_STATES` includes the escalated states (not verified).
9. **The PDF application prints `0000000000`** as the county's phone; the county e-mail is a placeholder and the `StateInfo` name reads "Demo" (both counties).
10. **No SMS or e-mail** is sent for Withdraw (both counties), Reassign to GRO (Bonga Nai) or Escalate (Bomet): no notification templates exist.
11. The distinct menu icons for Create and Search Complaint (#90) need an MDMS data update in both counties.
12. Bomet: six sample departments, sample designations and 18 Hindi notification templates remain; the `StateInfo` banner points to a missing image; the analytics endpoint value starts with a tab character.
13. Bonga Nai: novu-bridge's OTP consumer defaults to tenant `bo`; Bonga Nai must set `NOVU_BRIDGE_USER_OTP_DEFAULT_TENANT_ID=nb` (not verified from here).
14. The deploy templates are behind novu-bridge: they still pass the removed `NOVU_BRIDGE_SMSCOUNTRY_*` variables and do not pass the direct-SMS or OTP variables, so those must be set by hand on each server.
15. The configurator edits only `REOPENSLA`; `WITHDRAWSLA` and `actionWindows` are changed through the MDMS API.

### Behaviour to be aware of

16. The map pin starts at the county centre. If the resident does not move it, the complaint is recorded at the centre.
17. Resolved and rejected complaints show in the default inbox — requested by Bomet; Nairobi's issue #144 asks for the opposite.
18. The resident's sign-out question reads "Are you sure you want to" (fix #72 not merged); the browser tab shows "DIGIT" until the county's labels load.
19. Video uploads over about 3.9 MB fail on Bonga Nai (likely a web-server limit, issue #137). Re-sending an OTP does not invalidate the earlier one (#135, closed on 9 Oct).
20. Manual escalation does not record the escalation-level bookkeeping that automatic escalation uses; this may explain the wrong level reported in issue #141.
21. The workflow definitions for `nb` and `bo` are not versioned in the repository.

### Inherited from CMS V2.12

22. Several deploy steps still use the default bootstrap password, so changing the bootstrap secrets breaks a full deploy.
23. The staff filing form offers a "Green Line" channel that Kenya does not use, and Kenya's call-centre complaints have no channel of their own.
24. The 16 Sep CMS V2.12 update removed the role-action grants of the `CMS_*` officer roles from the seed, and the configurator's role-action create/edit screens (the buttons remain). Kenya does not use those roles.
25. The configurator's telemetry is on by default (`kill: false`). Operator scripts keep defaults from another deployment (`enable-escalation.sh` tenant and state, `deploy-pilot-fe.sh` branch); set them before use.

---

## Training videos and support package

The video walkthrough follows Bonga Nai's workflow. On Bomet Feedback Hub, complaints filed by residents are assigned automatically to a last-mile officer of the department, so there is no GRO step; "Reassign to GRO" exists on Bonga Nai only; withdraw is allowed for 3 days (Bonga Nai: 1 day, before assignment); and escalation runs through the department's Director, Chief Officer and CECM (Water: Chief Officer, then CECM).

A narrated walkthrough of the whole complaint workflow comes with this release, together with a support package for the teams who run the two sites. The videos are 22 parts, 33 min 47 s in total, each with English narration (text-to-speech) and subtitles: the complaint workflow end to end (18 parts, 27 min 14 s), then security and confidentiality (4 parts, 6 min 33 s). They were recorded on cms-pilot (the test twin of Bonga Nai) with fictional test users, so the screens are the real CMS Kenya V2.12 screens; any other person's name is hidden and phone numbers are masked.

The [Google Drive folder](https://drive.google.com/drive/folders/1QiImno9XX1cxhgQtSXCFc0TS7GU6FUDG?usp=sharing) is the public home of the videos: open `1-videos` to play a part in the browser; `2-support-documents` holds an earlier draft of the support package (14 Oct); the current version is in pull request #163. The folder holds 11 of the 22 parts today; the other 11 and a PDF copy of the support package are being added. Parts without a link in the table are among those being added. The [training video player](https://claude.ai/artifact/872R5UhyNE99wWhFfd2QPR) has all 22 parts with chapters, subtitles and the narration script; it is for eGov staff only.

| Part | Title | Length | What you learn | Related change | Watch |
|---|---|---|---|---|---|
| 00 | The complaint workflow, end to end | 0:46 | The roles, and the path a complaint takes from filing to closure | — | [Part 00 on Drive](https://drive.google.com/file/d/10Bx1mr0iim0QsSckY0uh58s-H6vwf1-2/view) |
| 00b | Bonga Nai, the county's complaints website | 1:14 | Open the site without signing in; Report an Issue; Track a Complaint; help lines and categories | [For residents](#for-residents) | — |
| 01 | A resident reports a problem | 2:20 | Sign in with a phone number and a one-time code, no national ID needed; file in three steps; the complaint number appears at once and arrives by SMS | [For residents](#for-residents) | [Part 01 on Drive](https://drive.google.com/file/d/1E491DQuasfLP71Voj3G4FAa7tEA__tro/view) |
| 02 | The front desk files a complaint for a caller | 1:31 | Staff enter the resident's phone number and name, the category, the location and a description; the resident still gets the complaint number by SMS | [For county officers and staff](#for-county-officers-and-staff) | [Part 02 on Drive](https://drive.google.com/file/d/1htTgwZtjEwi0h3sth2QTFLFAVHdzezn0/view) |
| 02b | Signing in, the staff header, and signing out | 1:37 | Privacy policy at sign-in; the staff header (designation, time, language menu, profile card); Forgot Password; switching to Kiswahili; signing out | [For county officers and staff](#for-county-officers-and-staff) | — |
| 03 | The GRO checks and assigns new complaints | 2:52 | New complaints wait as Pending for assignment; assign to a last-mile officer or reject with a reason; on Bomet this step is automatic | [For county officers and staff](#for-county-officers-and-staff) | [Part 03 on Drive](https://drive.google.com/file/d/1Q4KzvacI9G53HbXSriyhZ_kgCBhOHsPZ/view) |
| 03b | The front desk withdraws a complaint for a caller | 1:06 | Withdraw on a resident's behalf; Bonga Nai's 1-day limit before assignment; a reason is required and recorded | [For county officers and staff](#for-county-officers-and-staff) | — |
| 03c | The GRO rejects a complaint the county cannot act on | 1:26 | Reject needs a reason the resident reads; a rejected complaint can still be rated, or reopened within 3 days of the last update | [For residents](#for-residents) | — |
| 04 | The last-mile officer works the complaints | 2:07 | Resolve when the work is done; Escalate when a decision is needed higher up | [For county officers and staff](#for-county-officers-and-staff) | [Part 04 on Drive](https://drive.google.com/file/d/1tvKw4p4HR3tefqVYnNFvf6W-X4398MAn/view) |
| 04b | The officer sends a complaint back to the GRO | 1:00 | Return a complaint that belongs to another department to the GRO's queue, with a note (Bonga Nai only) | [For county officers and staff](#for-county-officers-and-staff) | [Part 04b on Drive](https://drive.google.com/file/d/13yyc01d2GyKFZ2BWctzkKws5oyXvr1Ai/view) |
| 04c | The officer hands a complaint to a colleague | 1:24 | Reassign to another last-mile officer of the same department, in any ward | [For county officers and staff](#for-county-officers-and-staff) | — |
| 05 | The Chief Officer decides the escalated complaint | 1:04 | At Level 1: resolve, reject or escalate to the CECM | [For county officers and staff](#for-county-officers-and-staff) | [Part 05 on Drive](https://drive.google.com/file/d/1MioX4zeKG6EK6hU_0tXF0h_pblzGMCji/view) |
| 05b | Escalation to the CECM (Level 2) | 1:40 | Level 2 is the CECM, the last level on Bonga Nai | [For county officers and staff](#for-county-officers-and-staff) | — |
| 06 | The resident follows up | 2:54 | Rate to close; Reopen within 3 days of the last update; Withdraw (Bonga Nai: 1 day, before assignment; Bomet: 3 days) | [For residents](#for-residents) | [Part 06 on Drive](https://drive.google.com/file/d/1RTcpg1XcTALHbSIseqY7uNgyA1EpOcrb/view) |
| 06b | A resident on a phone: a photo, the PDF application and Share | 1:34 | Attach a photo; download or share the PDF application | [Session and browser handling](#session-and-browser-handling) | — |
| 07 | Back in the GRO's queue | 1:16 | Returned and reopened complaints wait as Pending for assignment; a complaint nobody acts on before its deadline escalates automatically | [How the two counties differ](#how-the-two-counties-differ) | [Part 07 on Drive](https://drive.google.com/file/d/1va2bjpyTdphBJ85bpt7RIJqGd4Gf17vH/view) |
| 08 | Dashboard and export | 0:51 | Volumes, on-time resolution and escalations by sub-county, ward and category; export to Excel, CSV or PDF | [For county leadership](#for-county-leadership) | [Part 08 on Drive](https://drive.google.com/file/d/1cPtgHFF9mG8jZGD2mTHDQvIgtpRhsrQV/view) |
| 09 | Summary: where each complaint ended up | 0:32 | The outcome of each complaint in the walkthrough | — | [Part 09 on Drive](https://drive.google.com/file/d/1acjUsftiAPrNnKQ-iCKmzMaeIzvXj5BE/view) |
| S1 | Confidential complaints | 2:24 | The confidentiality option; the server hides the complainant from every officer; the resident's timeline hides officers' details | [Security fixes](#security-fixes) | — |
| S2 | Safe sign-in and sessions | 1:34 | Wrong codes refused; resend after 3 minutes; the notice when another account signs in; clear screens for unknown addresses | [Session and browser handling](#session-and-browser-handling) | — |
| S3 | Safe uploads | 1:24 | Accepted types; 5 files of 5 MB; virus scanning and quarantine, available but off in both counties for now | [File scan: virus scanning of uploads](#file-scan-virus-scanning-of-uploads) | — |
| S4 | Rules the server enforces | 1:11 | Time limits enforced by the server; actions offered by role; every step kept in the timeline; the notification log | [Security fixes](#security-fixes) | — |

The support package, also as a single page (`support-package.html`), and the other documents for this release are listed under [Documentation](#documentation).

## Support preparation: findings and follow-ups

Preparing the training videos and the support package (14–15 Oct 2026) meant running every workflow end to end on cms-pilot and reading both live sites. This section records what was changed on the test environment, what was found, and what still needs a decision.

### Changes made on cms-pilot (test environment only)

| Change | Why | Rollback |
|---|---|---|
| Label cache refreshed and 15 labels added in English and Kiswahili (for example *Withdraw*, *Rate*, *Escalate Complaint*, *Reassign to GRO*) | Take Action menus, dialog titles and the resident's timeline showed raw keys such as `WITHDRAW` and `CS_ACTION_ESCALATE`. Bonga Nai already had these labels. | Previous values saved in the QA kit |
| Complaint sub-types set to department "NA", as on Bonga Nai | A resident's reopen failed with `INVALID_ASSIGNMENT` on cms-pilot, where sub-types carried departments; Bonga Nai's do not | Before-state of all 58 records saved in the QA kit |
| Seven fictional test accounts created (resident, front desk, GRO, two last-mile officers, Chief Officer and CECM for Finance) | The earlier test officers were deactivated; the videos needed one account per role | Deactivate through HRMS |
| 33 test complaints filed and worked through (`CMS-2026-47` to `CMS-2026-79`) | Recording the videos | Test data; no action needed |

### Findings

1. **Escalation timers are test values.** `RAINMAKER-PGR.EscalationConfig` sets 2, 4 and 6 minutes per level on Bonga Nai (record created 24 Sep, last changed 30 Sep; read 19 Oct), and 2, 3 and 4 minutes on cms-pilot.
   - Site: Bonga Nai (live).
   - Impact: if the escalation job runs on Bonga Nai, complaints escalate within minutes of assignment. On cms-pilot a complaint escalated automatically about 2 minutes after it was assigned.
   - Owner: County and L2. Status: needs the County's intended times; whether the job runs on Bonga Nai is not verified.
2. **Reopen picks an assignee automatically (the GRO), and the server checks that assignee's department against the complaint's.**
   - Site: both.
   - Impact: it works today on Bonga Nai only because its sub-types have no department. If departments are mapped on Bonga Nai, residents' reopens will fail with `INVALID_ASSIGNMENT`.
   - Owner: L3. Status: open; a reopen that returns to the GRO queue should not send an assignee.
3. **A refused upload shows the file server's raw message with a typo:** *"Inalvid input provided for file : exe, please upload any of the allowed formats…"*
   - Site: both (same file-server image).
   - Impact: residents see a misspelt, technical message.
   - Owner: L3. Status: open.
4. **Labels for the newer actions were missing on cms-pilot** (see the first change above).
   - Site: cms-pilot.
   - Impact: raw keys on screen during testing.
   - Owner: L2. Status: fixed on cms-pilot; present on Bonga Nai.
5. **The cms-pilot test officers used in September were deactivated, and cms-pilot sends real, paid SMS.**
   - Site: cms-pilot.
   - Impact: testing needs current accounts, and test runs cost SMS credits.
   - Owner: L2. Status: use the agreed test numbers only.

### Follow-ups

1. **Before the training videos are shared outside eGov:** review the cms-pilot test environment's sign-in settings and test accounts, or deactivate the test accounts once the videos are final. The videos show the test environment's sign-in screens.
2. **Counties:** confirm the intended escalation times for Nairobi (finding 1) and Bomet (11 categories still on 2-minute test values; [limitation 8](#configuration-to-complete-in-the-counties)).
3. **Engineering:** findings 2 and 3.
4. **Drive folder:** it holds 11 of the 22 parts today; the other 11 and a PDF copy of the support package are being added. The walkthrough page cannot be shared publicly (the eGov workspace does not allow public links for it), so the Drive folder is the public route for the videos.

---

**CMS Kenya V2.12:** [Release preview and evidence](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/RELEASE-PREVIEW-CMS-KENYA-V2.12.md) · **Release notes** (this page) · [County release note](https://github.com/eGov-Global/CMS-KENYA/blob/master/docs/kenya/COUNTY-RELEASE-NOTE-CMS-KENYA-V2.12.md)

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
   builds EVERY image in build/build-config.yml at the tagged commit (including
   novu-bridge-endpoint and the legacy frontend/micro-ui digit-ui image) and pushes
   egovio/<image>:v2.12-kenya to Docker Hub (immutable tags). Save it as a draft
   first if the images should not be built yet.

3. Optionally tag bgrm's landing branch for traceability:
     git tag -a v2.12-kenya-bgrm-landing origin/nairobi-prod-bgrm-changes -m "bgrm landing page for CMS Kenya V2.12"
   (that branch lacks three nairobi-prod commits; see the header comment.)

Before tagging, record the container images running on both servers (see
"Compatibility and upgrade notes"); the placeholder table is in section 2 of
RELEASE-PREVIEW-CMS-KENYA-V2.12.md.

Release preview and evidence: RELEASE-PREVIEW-CMS-KENYA-V2.12.md (this folder)
============================================================ -->
