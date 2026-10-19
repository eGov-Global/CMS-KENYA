# CMS Kenya V2.12 — release preview and evidence

CMS Kenya V2.12 is the first official release of the Kenyan implementation of CMS V2.12, the DIGIT Complaint Management System, in which residents file complaints and county officers route, escalate and resolve them. One code line serves two live sites, Bonga Nai (Nairobi City County) and the Bomet Feedback Hub (Bomet County); in the technical text below, **bgrm** means the Bomet Feedback Hub site (bgrm.bomet.go.ke).

**CMS Kenya V2.12:** **Release preview and evidence** (this page) · [Release notes](RELEASE-NOTES-CMS-KENYA-V2.12.md) · [County release note](COUNTY-RELEASE-NOTE-CMS-KENYA-V2.12.md)

**Prepared:** 13 Oct 2026; updated 19 Oct 2026\
**Release:** `v2.12-kenya` — Bonga Nai (Nairobi City County, tenant `nb`) and Bomet Feedback Hub (Bomet County, tenant `bo`)\
**Code:** `nairobi-prod` @ `32a56d27d` (13 Oct 2026; tests ran at `8e6289e86`, and `32a56d27d` adds the scan proxy's load-test tooling; `723b680d7`, a server backup script of 14 Oct, came after the described code) · bgrm landing page: `nairobi-prod-bgrm-changes` @ `78444ee4e` · bgrm complaint service: `feat/bomet-uat` @ `6eb6b853c`\
**Built on:** CMS V2.12 (`egovernments/Citizen-Complaint-Resolution-System`; baseline `815b23747`, tag `product-base-2026-08-13`; updated on 16 Sep 2026 to `7ee88f83`)

## Who should read what

This page is the entry point to the release and the evidence behind the other two documents.

- **County administrators, operational teams and supervisors:** the [county release note](COUNTY-RELEASE-NOTE-CMS-KENYA-V2.12.md) explains in plain language what changes for residents, staff and leadership, and how the two counties differ.
- **Release managers and reviewers:** the [release notes](RELEASE-NOTES-CMS-KENYA-V2.12.md) are the complete statement of what changed, what to know before deploying and what is not yet done. They are also the GitHub release body.
- **Operators, the support desk and engineers:** the evidence below, above all [§2 on deployments](#2-deployments-and-what-they-run), [§3 on each county's live configuration](#3-bonga-vs-bgrm-live-configuration-compared), [§8 on configuration changes](#8-configuration-changes-against-cms-v212) and [§11 on what is not verified](#11-not-verified). The support package for L1 (eGov support desk), L2 (platform operators, county IT) and L3 (engineering) is on the `nairobi-prod` branch ([support package](https://github.com/eGov-Global/CMS-KENYA/blob/nairobi-prod/docs/kenya/support/README.md), merged in #163); it cites §11 of this page (including §11.9) and the release notes' known limitations by number.

## Themes and highest-value changes

Each theme says what changed, then where it is explained (Read), where its evidence is on this page (Evidence) and which training video shows it (Watch).

### Privacy and confidential complaints

- A resident, or the front desk / call centre (role code CSR) filing for one, can tick "Keep details confidential". The server then hides the complainant's name, phone, e-mail and address from every officer without the `CONFIDENTIAL_COMPLAINT_VIEWER` role, which neither county has created yet ([limitation 6](RELEASE-NOTES-CMS-KENYA-V2.12.md#configuration-to-complete-in-the-counties)).
- The resident's timeline comes from a role-filtered API, without officers' names, contacts or internal comments.
- The PDF application prints the complainant's name and phone number as the person opening it may see them: in full on the resident's own copy, masked when staff without that role open a confidential complaint.
- The message sent with a shared PDF never contains them, but Share hands over the PDF itself, so a resident who shares it also shares their own name and number.

Read: [release notes › Security fixes](RELEASE-NOTES-CMS-KENYA-V2.12.md#security-fixes) · Evidence: [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) (#103, #125, #128), [§3.4](#34-access-control-and-assets) · Watch: [part S1](https://drive.google.com/file/d/1Fw_NS3mzY1ba9_A1Hrb8qHvn2GnF_L7g/view)

### Security and virus scanning

- Uploads can be scanned for viruses with ClamAV: infected files are refused and quarantined for 90 days, and while the scanner is down uploads are refused, never passed unscanned.
- Scanning is off in both counties until it is switched on (issue #159). Memory: about 1.5 GB for ClamAV, plus up to 1 GB for the upload proxy under heavy load — budget about 2.5 GB.
- From CMS V2.12 come gateway enforcement in the shipped configuration, policy-based search, safer platform defaults and a jsPDF fix for a published security vulnerability (CVE). Its pgr-services validation hardening is not yet taken ([limitation 4](RELEASE-NOTES-CMS-KENYA-V2.12.md#not-yet-in-this-release)).

Read: [release notes › File scan: virus scanning of uploads](RELEASE-NOTES-CMS-KENYA-V2.12.md#file-scan-virus-scanning-of-uploads) and [› Security fixes](RELEASE-NOTES-CMS-KENYA-V2.12.md#security-fixes) · Evidence: [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) (#157), [§8(g)](#8g-deployment), [§9](#9-testing-status) (load test), [§13](#13-topic-index-security-file-scan-storage-quota-sessions-cms-v212-contributions) · Watch: [part S3](https://drive.google.com/file/d/1DIulFX4i8MsSOArLyUTpxDetx_GHIHAV/view)

### Time limits and workflow tools

- The server enforces the time limits, even when the API is called directly: reopen within 3 days of the last update in both counties; withdraw within 1 day of filing and before assignment on Bonga Nai, or within 3 days of filing on the Bomet Feedback Hub — also by the front desk for a resident.
- Officers can escalate by hand to the tier above.
- On Bonga Nai a last-mile officer (role code PGR_LME) can also reassign a complaint within the department, or return it to the Grievance Routing Officer (GRO) with Reassign to GRO.

Read: [release notes › For county officers and staff](RELEASE-NOTES-CMS-KENYA-V2.12.md#for-county-officers-and-staff) · Evidence: [§3.2](#32-workflow-pgr-egov-workflow-v2-businessservice-pgr-sla-432000000-ms--5-days), [§3.3](#33-mdms-rainmaker-pgruiconstants-and-others), [§8(c) c.1](#c1-rainmaker-pgruiconstants-and-action-windows) · Watch: [part 04](https://drive.google.com/file/d/1tvKw4p4HR3tefqVYnNFvf6W-X4398MAn/view), [part 06](https://drive.google.com/file/d/1RTcpg1XcTALHbSIseqY7uNgyA1EpOcrb/view)

### The resident's experience and the PDF application

- Each county has its own public website (landing page), open without signing in.
- Filing takes three steps, with consent to the terms, an optional typed address, A–Z category pickers, a movable map pin and up to 5 attachments of 5 MB each (photos, documents or videos).
- The resident then gets an official PDF application to download, print or share. In this build Share opens a dialog on every device and hands over the PDF itself (#142); pull request #162, still open, would show Share in the mobile view only.
- Ratings use five faces instead of stars.

Read: [release notes › For residents](RELEASE-NOTES-CMS-KENYA-V2.12.md#for-residents) and [› Session and browser handling](RELEASE-NOTES-CMS-KENYA-V2.12.md#session-and-browser-handling) · Evidence: [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) (#103 to #146), [§5](#5-changes-not-in-this-release) (#162), [§6](#6-nairobi-prod-vs-nairobi-prod-bgrm-changes) · Watch: [part 01](https://drive.google.com/file/d/1E491DQuasfLP71Voj3G4FAa7tEA__tro/view), [part 06b](https://drive.google.com/file/d/1dsruzhJnpqcfio9Qk6FoZgU54Cd-BWFB/view)

### Browser reliability

- The "quota exceeded" error (browser storage) is fixed: master data is cached in IndexedDB instead of the 5 MB `localStorage`, a full store no longer stops the page, and caches are dropped after every deploy.
- Open tabs move to a new build at the next hub screen; an expired session goes to the right sign-in page and keeps drafts; a notice explains when another account signs in from another tab.
- The start-up download is about half what it was (a figure from PR #103, not re-measured).

Read: [release notes › Browser storage limit ("quota exceeded")](RELEASE-NOTES-CMS-KENYA-V2.12.md#browser-storage-limit-quota-exceeded) and [› Session and browser handling](RELEASE-NOTES-CMS-KENYA-V2.12.md#session-and-browser-handling) · Evidence: [§13](#13-topic-index-security-file-scan-storage-quota-sessions-cms-v212-contributions), [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) (#148) · Watch: [part S2](https://drive.google.com/file/d/1K96xgi77NXEZACDoh2qcvQIRMgVib9vp/view)

### Dashboard and export for leadership

County leadership can export the dashboard as an Excel workbook (a summary plus a sheet per tile), a CSV file or a PDF report, each with the filters used and the key figures against the previous period. The dashboard also has CMS V2.12's refreshed header, filters, key-figure tiles and "updated … ago" stamps. The Bomet Feedback Hub records behaviour analytics (Matomo, self-hosted) with personal details removed.

Read: [release notes › For county leadership](RELEASE-NOTES-CMS-KENYA-V2.12.md#for-county-leadership) · Evidence: [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) (#130), [§7](#7-included-from-cms-v212) · Watch: [part 08](https://drive.google.com/file/d/1cPtgHFF9mG8jZGD2mTHDQvIgtpRhsrQV/view)

## Feature highlights

One row per change: where it is explained, where its evidence is on this page, and the training video that shows it. A video link opens the part in Google Drive where it is uploaded; the others lead to the release notes' list of parts.

| Change | County | Explained in | Evidence here | Video |
|---|---|---|---|---|
| Confidential complaints: the option on both forms, masking by the server | Both | [Security fixes](RELEASE-NOTES-CMS-KENYA-V2.12.md#security-fixes) | [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) #103, #125, #128; [§8(e)](#8e-roles-and-access-control) | [S1](https://drive.google.com/file/d/1Fw_NS3mzY1ba9_A1Hrb8qHvn2GnF_L7g/view) |
| Resident's timeline without officers' identity (role-filtered API) | Both | [Security fixes](RELEASE-NOTES-CMS-KENYA-V2.12.md#security-fixes) | [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) #103; [§3.4](#34-access-control-and-assets) | [S1](https://drive.google.com/file/d/1Fw_NS3mzY1ba9_A1Hrb8qHvn2GnF_L7g/view) |
| Official PDF application: Download, Print and Share (Share on every device in this build) | Both | [Session and browser handling](RELEASE-NOTES-CMS-KENYA-V2.12.md#session-and-browser-handling) | [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) #117 to #142; [§5](#5-changes-not-in-this-release) #162, open | [06b](https://drive.google.com/file/d/1dsruzhJnpqcfio9Qk6FoZgU54Cd-BWFB/view) |
| Reopen and withdraw within the county's time limits | Both; limits differ | [For residents](RELEASE-NOTES-CMS-KENYA-V2.12.md#for-residents) | [§3.3](#33-mdms-rainmaker-pgruiconstants-and-others); [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) #145, #146 | [06](https://drive.google.com/file/d/1RTcpg1XcTALHbSIseqY7uNgyA1EpOcrb/view) |
| Time limits enforced by the server | Both | [Security fixes](RELEASE-NOTES-CMS-KENYA-V2.12.md#security-fixes) | [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) #136; [§8(c) c.1](#c1-rainmaker-pgruiconstants-and-action-windows) | [S4](https://drive.google.com/file/d/1zgXfSbMKo792FFbnP5leTbFPJSvX1T3g/view) |
| Manual escalation to the tier above | Both | [For county officers and staff](RELEASE-NOTES-CMS-KENYA-V2.12.md#for-county-officers-and-staff) | [§3.2](#32-workflow-pgr-egov-workflow-v2-businessservice-pgr-sla-432000000-ms--5-days); [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) #103 | [04](https://drive.google.com/file/d/1tvKw4p4HR3tefqVYnNFvf6W-X4398MAn/view), [05](https://drive.google.com/file/d/1MioX4zeKG6EK6hU_0tXF0h_pblzGMCji/view) |
| Reassign within the department; Reassign to GRO | Bonga Nai | [For county officers and staff](RELEASE-NOTES-CMS-KENYA-V2.12.md#for-county-officers-and-staff) | [§3.2](#32-workflow-pgr-egov-workflow-v2-businessservice-pgr-sla-432000000-ms--5-days); [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) #93, #150, #151 | [04b](https://drive.google.com/file/d/13yyc01d2GyKFZ2BWctzkKws5oyXvr1Ai/view) |
| Automatic assignment at filing | Bomet Feedback Hub | [How the two counties differ](RELEASE-NOTES-CMS-KENYA-V2.12.md#how-the-two-counties-differ) | [§3.1](#31-summary); [§4.1](#41-bomet-line-reached-master-via-roll-up-40-2026-09-21) #4, #8 | [03](https://drive.google.com/file/d/1Q4KzvacI9G53HbXSriyhZ_kgCBhOHsPZ/view) |
| Escalation timers | Both; values differ | [How the two counties differ](RELEASE-NOTES-CMS-KENYA-V2.12.md#how-the-two-counties-differ) | [§3.1](#31-summary), [§3.3](#33-mdms-rainmaker-pgruiconstants-and-others) | [07](https://drive.google.com/file/d/1va2bjpyTdphBJ85bpt7RIJqGd4Gf17vH/view) |
| Dashboard export to Excel, CSV and PDF | Both | [For county leadership](RELEASE-NOTES-CMS-KENYA-V2.12.md#for-county-leadership) | [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) #130 | [08](https://drive.google.com/file/d/1cPtgHFF9mG8jZGD2mTHDQvIgtpRhsrQV/view) |
| Virus scanning of uploads, off until switched on | Both | [File scan: virus scanning of uploads](RELEASE-NOTES-CMS-KENYA-V2.12.md#file-scan-virus-scanning-of-uploads) | [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) #157; [§8(g)](#8g-deployment) | [S3](https://drive.google.com/file/d/1DIulFX4i8MsSOArLyUTpxDetx_GHIHAV/view) |
| Gateway enforcement and policy-based search, from CMS V2.12 | Both, as shipped | [Security fixes](RELEASE-NOTES-CMS-KENYA-V2.12.md#security-fixes) | [§8(e) e.4](#e4-gateway-enforcement-p); [§3.4.1](#341-search-policy-on-action-2008-pgr-servicesv2request_search-resourcecomplaint) | — |
| CMS V2.12 pgr-services hardening, not yet taken | Both | [Security fixes](RELEASE-NOTES-CMS-KENYA-V2.12.md#security-fixes); [limitation 4](RELEASE-NOTES-CMS-KENYA-V2.12.md#not-yet-in-this-release) | [§13](#13-topic-index-security-file-scan-storage-quota-sessions-cms-v212-contributions) | — |
| "Quota exceeded" error (browser storage) fixed | Both | [Browser storage limit ("quota exceeded")](RELEASE-NOTES-CMS-KENYA-V2.12.md#browser-storage-limit-quota-exceeded) | [§13](#13-topic-index-security-file-scan-storage-quota-sessions-cms-v212-contributions) | — |
| Sessions, sign-in and new builds in open tabs | Both | [Session and browser handling](RELEASE-NOTES-CMS-KENYA-V2.12.md#session-and-browser-handling) | [§4.1](#41-bomet-line-reached-master-via-roll-up-40-2026-09-21) `adef886be`; [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) #148 | [S2](https://drive.google.com/file/d/1K96xgi77NXEZACDoh2qcvQIRMgVib9vp/view) |
| Start-up download about halved | Both | [Session and browser handling](RELEASE-NOTES-CMS-KENYA-V2.12.md#session-and-browser-handling) | [§4.4](#44-nairobi-prod-prs-and-direct-commits-2026-09-23-to-2026-10-13) #103 (`c16c75208`) | — |
| Public website per county | Both, different pages | [For residents](RELEASE-NOTES-CMS-KENYA-V2.12.md#for-residents) | [§3, Landing pages](#landing-pages); [§6](#6-nairobi-prod-vs-nairobi-prod-bgrm-changes) | [00b](https://drive.google.com/file/d/19TLE6p4_G8GLTrSYyDWBvg4A6hQOMrCg/view) |
| UI enhancements from CMS V2.12: dashboard, staff top bar, inbox tabs, attachments | Both; inbox tabs on Bomet only | [Contributed by CMS V2.12](RELEASE-NOTES-CMS-KENYA-V2.12.md#contributed-by-cms-v212) | [§7](#7-included-from-cms-v212); [§13](#13-topic-index-security-file-scan-storage-quota-sessions-cms-v212-contributions) | [08](https://drive.google.com/file/d/1cPtgHFF9mG8jZGD2mTHDQvIgtpRhsrQV/view) |
| English and Kiswahili | Both | [How the two counties differ](RELEASE-NOTES-CMS-KENYA-V2.12.md#how-the-two-counties-differ) | [§3.5](#35-localization) | [02b](https://drive.google.com/file/d/1jZ6jkw8MKf661jVsD7OINtwoKvzzM8IP/view) |

## Training videos

The [training videos in Google Drive](https://drive.google.com/drive/folders/1QiImno9XX1cxhgQtSXCFc0TS7GU6FUDG) are open to anyone with the link. The folder holds all 22 parts, and a PDF copy of the support package. eGov staff can also use the [video player with chapters and the narration script](https://claude.ai/artifact/872R5UhyNE99wWhFfd2QPR) (eGov staff only).

The 22 parts have English narration (text-to-speech) and subtitles. Each runs 32 s to 2 min 54 s, 33 min 47 s in total:

- the complaint workflow, end to end: 18 parts, 27 min 14 s;
- privacy and security: 4 parts, 6 min 33 s.

The walkthrough follows Bonga Nai's workflow. On the Bomet Feedback Hub, complaints filed by residents are assigned to the department's officer automatically at filing (there is no GRO step), Reassign to GRO does not exist, withdraw is allowed for 3 days (Bonga Nai: 1 day, before assignment), and escalation runs through the department's Director, Chief Officer and CECM (County Executive Committee Member); in Water it runs from the Chief Officer to the CECM. The parts were recorded on cms-pilot (the test twin of Bonga Nai) with fictional test users; other people's names are hidden and phone numbers are masked.

Start with three parts:

- [Part 00, The complaint workflow, end to end](https://drive.google.com/file/d/10Bx1mr0iim0QsSckY0uh58s-H6vwf1-2/view) (0:46): the roles and the path of a complaint.
- [Part 06b, A resident on a phone: a photo, the PDF application and Share](https://drive.google.com/file/d/1dsruzhJnpqcfio9Qk6FoZgU54Cd-BWFB/view) (1:34).
- [Part S1, Confidential complaints](https://drive.google.com/file/d/1Fw_NS3mzY1ba9_A1Hrb8qHvn2GnF_L7g/view) (2:24).

Every part, with its length and the change it shows, is listed in the [release notes › Training videos and support package](RELEASE-NOTES-CMS-KENYA-V2.12.md#training-videos-and-support-package). Which parts each role should watch is in the [county release note › Training videos](COUNTY-RELEASE-NOTE-CMS-KENYA-V2.12.md#training-videos).

## Contents of the evidence

The numbered sections below are the evidence; the support package cites them by number. **Live 13 Oct** marks a statement read from a county's live site on 13 Oct 2026, "read 19 Oct" a re-check on 19 Oct, and **Unverified** a statement that neither the repository nor the live sites could confirm. Codes in capitals are stored workflow states, actions and role codes. Abbreviations: GRO (Grievance Routing Officer), CSR (front desk / call centre), PGR_LME (last-mile officer), CECM (County Executive Committee Member), MDMS (the configuration store), HRMS (the staff directory), PII (personal details), RBAC (role-based access checks), ABAC (policy-based access checks), SLA (time limit), OTP (one-time code), CVE (a published security vulnerability), UAT (user acceptance testing), CI (automated checks).

1. [About this document](#1-about-this-document): sources, method, lineage and volume of the release.
2. [Deployments and what they run](#2-deployments-and-what-they-run): which code and build each site runs, and the container images to record before tagging.
3. [Bonga vs bgrm: live configuration compared](#3-bonga-vs-bgrm-live-configuration-compared): how the two counties differ in workflow, time limits, categories, access, escalation timers and labels.
4. [Kenya-layer change inventory](#4-kenya-layer-change-inventory): every pull request and commit in the release, with the live configuration it depends on.
5. [Changes not in this release](#5-changes-not-in-this-release): work merged elsewhere or still open, and what that means for each county.
6. [`nairobi-prod` vs `nairobi-prod-bgrm-changes`](#6-nairobi-prod-vs-nairobi-prod-bgrm-changes): why the two sites build from different UI branches, and what differs.
7. [Included from CMS V2.12](#7-included-from-cms-v212): which CMS V2.12 features are in use, switched off or left out.
8. [Configuration changes against CMS V2.12](#8-configuration-changes-against-cms-v212): settings, migrations, configuration-store data, workflow, roles, labels, deployment and image tags.
9. [Testing status](#9-testing-status): what was tested, what CI shows and what was not run.
10. [Known limitations and open issues](#10-known-limitations-and-open-issues): where the limitations are listed, and how the open GitHub issues relate to the release.
11. [Not verified](#11-not-verified): what neither the repository nor the live sites could confirm.
12. [Documentation](#12-documentation): where the full documentation list is, and the files the evidence relies on.
13. [Topic index: security, file scan, storage quota, sessions, CMS V2.12 contributions](#13-topic-index-security-file-scan-storage-quota-sessions-cms-v212-contributions): the evidence behind the release notes' "In detail" section.

---

## 1. About this document

### Sources and method

- **Git:** the fetched refs of `eGov-Global/CMS-KENYA`, with the upstream CMS V2.12 repository as a remote. Commands: `git log`, `git diff`, `git cherry`, `git merge-base`, and code read at `nairobi-prod`.
- **GitHub:** the body of every PR merged into the Kenya line, and the open issues that bear on it.
- **Live counties:** read-only search calls against `bonga.nairobi.go.ke` and `bgrm.bomet.go.ke` on 13 Oct 2026, without signing in. Captured: every MDMS master, the `PGR` workflow, boundaries, labels (`en_IN`, `sw_KE`), the served UI bundle and `globalConfigs.js`. Nothing was written.
- **Tests:** run on a clean checkout of `nairobi-prod` @ `8e6289e86` (§9).

**Live 13 Oct** marks a statement read from the county. **Unverified** means neither the repository nor the live search endpoints could confirm it.

### Lineage

| Step | Ref | Date | What |
|---|---|---|---|
| CMS V2.12 baseline | `815b23747` (`product-base-2026-08-13`) | 13 Aug | CMS V2.12 |
| First Kenya change | PR #1 `d92def1d0` | 19 Aug | Bomet landing page on CMS V2.12 |
| CMS V2.12 line merged | `35504b797` merges `df7ca8d08` (`kenya-layer-start`) | 31 Aug | 636 commits, carried in by PRs #4–#9 |
| CMS V2.12 update | `626864567` (front end) and `2176984d7` (backend, infrastructure, configurator; 905 files) | 16–17 Sep | Upstream `7ee88f83`, squashed |
| Kenya layer | `kenya-layer-start..nairobi-prod`, counted at `32a56d27d` | 30 Aug – 13 Oct | 221 commits (157 non-merge), PRs #1–#157 |
| Release code | `nairobi-prod` @ `32a56d27d` | 13 Oct | To be merged into `master` |

Layer tags used in §8:

- **[S]** CMS V2.12 work before the fork;
- **[P]** the 16 Sep CMS V2.12 update inside the Kenya range;
- **[K]** Kenya-authored work.

### Volume (CMS V2.12 baseline → `nairobi-prod`)

Counted at `32a56d27d`, the described code.

- **In total:** 857 commits (542 non-merge), 1,365 files changed, +167,530 / −38,804 lines.
- **Before the fork:** 636 commits, 332 files.
- **After the fork:** 221 commits, 1,179 files. The CMS V2.12 update alone touches 905 of these files.

---

## 2. Deployments and what they run

| | Bonga Nai | Bomet Feedback Hub |
|---|---|---|
| Address | [bonga.nairobi.go.ke](https://bonga.nairobi.go.ke/digit-ui/landing) | [bgrm.bomet.go.ke](https://bgrm.bomet.go.ke/digit-ui/landing) |
| Tenant · boundary hierarchy | `nb` · `Nairobi-Hierarchy` | `bo` · `BOMET-Hierarchy` |
| UI branch | `nairobi-prod` | `nairobi-prod-bgrm-changes` |
| Live UI build id (13 Oct) | `111d80717226` | `f5815743da37` |
| Complaint service (pgr-services) | built from `nairobi-prod`; image tag unverified (§11) | built from `feat/bomet-uat`; `egovio/pgr-services:bomet-uat-6eb6b85` per the rollout notes |
| Runtime config | Ansible `host_vars/nairobi.yml` on the server, as named in the served `globalConfigs.js` header (repository template: `host_vars/nairobi.yml.example`) | Ansible `host_vars/bometnew.yml` on the server, from the same header (repository template: `host_vars/bomet.yml.example`) |

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

### Container image inventory (to record before tagging)

> **To complete before tagging:** record the images running in each county. On each server, run `docker ps --format '{{.Names}}\t{{.Image}}' | sort`.

Known on 13 Oct 2026:

| Component | Bonga Nai | Bomet Feedback Hub |
|---|---|---|
| Resident & staff UI | static build of `nairobi-prod`, build id `111d80717226` | static build of `nairobi-prod-bgrm-changes`, build id `f5815743da37` |
| pgr-services | built from `nairobi-prod` (tag to record) | `egovio/pgr-services:bomet-uat-6eb6b85` (per the rollout notes) |
| Other services | to record | to record |

After the described code, `nairobi-prod` gained `723b680d7` (14 Oct). It adds `local-setup/scripts/backup-server.sh`, which backs up a server over SSH: the application files (`/opt/digit`), a PostgreSQL dump, a MongoDB dump and checksums. Each backup folder gets short generated restore notes (`RESTORE.md`); there is no restore guide in the repository yet.

---

## 3. Bonga vs bgrm: live configuration compared

Read from both counties on 13 Oct 2026 (read-only searches). Rows marked "read 19 Oct" were read again on 19 Oct.

### 3.1 Summary

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
| Reopen | Within 3 days of the last update; returns to the GRO queue | Within 3 days of the last update; returns to a last-mile officer |
| Categories | 21 types, 39 sub-types; deadlines 4–72 hours; no department mapping | 48 types, 94 sub-types; deadlines 1–30 days; Health 46, Water & Sewage 36, Administration 12 |
| Escalation timers (`RAINMAKER-PGR.EscalationConfig`, read 19 Oct) | One record: up to 3 levels, default timers 2, 4 and 6 minutes, no per-category settings | Up to 3 levels, default timers 60 h / 18 h / 18 h, 91 per-category settings, 11 of them at 2 minutes |
| Inbox visibility | by role | scoped to the officer's jurisdiction, server-side (`RAINMAKER-PGR.InboxVisibilityConfig`) |
| Officer roles | GRO, PGR_LME, DIRECTOR, CHIEF_OFFICER, CECM, CSR … | GRO, PGR_LME, ADMIN_/HEALTH_/WATER_ DIRECTOR · CHIEF_OFFICER · CECM, OMBUDSMAN_OFFICER, CSR … |
| Departments · designations | 16 · 125 | 3 in use (+ 6 sample rows) · 8 |
| Branding | Nairobi emblem, green theme, "Bonga Nai" | Bomet crest, blue theme; tab title "Bomet Feedback" / "Maoni ya Bomet" |
| Languages | English, Kiswahili | English, Kiswahili |
| Behaviour analytics | not configured | Matomo |
| Notification templates | 28, all English (SMS, e-mail, WhatsApp), including SMS escalation notices to the resident | 45 records: 27 English and 18 Hindi (`hi_IN`) leftovers; no escalation template |

### Landing pages

The landing pages were separated at the last moment. `nairobi-prod`'s landing page has been Nairobi's since 23 Sep. When bgrm's UI moved to `nairobi-prod` on 9 Oct, its front page therefore showed Nairobi branding, and the Bonga Nai redesign (#154, #155) made it more visible. On 13 Oct bgrm's UI moved to its own branch, `nairobi-prod-bgrm-changes`. That branch is `nairobi-prod` plus one change: it brings back the Bomet landing page bgrm had before 9 Oct. The change spans 61 files: the landing page, its styles, an image loader in the build and the configurator's landing editor. Everything else was identical on 13 Oct, and every non-landing application change is merged into both branches (as #157 and #158 were); two later tooling commits, the load-test suite (`32a56d27d`) and the backup script (`723b680d7`), are on `nairobi-prod` only (§6). When `nairobi-prod` is merged into `master`, `master` carries the **Bonga Nai** landing page; bgrm keeps building from its branch until the landing page can be chosen per county by configuration.

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
| Per-category escalation (`EscalationConfig`) | One record, read 19 Oct (the 13 Oct capture did not read this schema): up to 3 levels; default 2, 4 and 6 minutes; no per-category overrides; created 24 Sep, last changed 30 Sep | maxDepth 3; default 60 h / 18 h / 18 h; 91 overrides — **11 at 2 minutes** (8 on all three levels, 3 on levels 1–2; test values); created 17 Sep, last changed 28 Sep (read 19 Oct) |
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
| tenant.tenants contact | `0000000000`, `nb@example.com` | `0000000000`, `bo@example.com` |
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

Everything in `kenya-layer-start..nairobi-prod`: every PR, roll-up and direct commit, with the live configuration it depends on. **County:** *Both* = shared code that affects both counties; *Bonga* or *Bomet* = only that county sees an effect, because of its workflow, data or branding; *Both (code)* = shared code whose effect differs by tenant. Roll-up #40 carried 84 Kenya-layer commits into `master` (720 in the merge, including the CMS V2.12 line), among them the CMS V2.12 update squash `2176984d7` and `626864567`; #11–#19, #21, #24–#28 and #41–#46 are issues, not PRs.

### 4.1 Bomet line, reached master via roll-up #40 (2026-09-21)

| Ref | Date | Area | County | What changes | Live config it depends on |
|---|---|---|---|---|---|
| `2b62f7007`, `82b0ad29b` | 2026-08-14 | docs | — | Sets CODEOWNERS so protected branches need maintainer review. | none |
| #1 (`d92def1d0`, base develop) | 2026-08-19 | public landing | Bomet (originally) | Adds the public landing page at `/digit-ui/landing`: config-driven sections, privacy page, Bomet copy and logo, theme bridge. On nairobi-prod it was later re-branded for Nairobi (§4.3). Bomet's version comes back only on `nairobi-prod-bgrm-changes` (`bae16acca`). | Optional MDMS `RAINMAKER-PGR.LandingSection`/`LandingPageConfig` rows and `PGR_LANDING_*` labels override the built-in copy. #154 says no such rows existed on nb/bo on 12 Oct. |
| #3 (`35504b797`) | 2026-08-31 | deploy/ops (sync) | — | Merges the CMS V2.12 line into the sync branch (636 commits, all before `kenya-layer-start`). The conflict resolution kept the Bomet landing page. No Kenya feature of its own. | none |
| #4 (`79bf0a3b8`) | 2026-09-02 | citizen UI + routing | Both (code) | **Citizen complaints are assigned automatically at submit** to an officer in the complaint type's department, narrowest area first: ward → sub-county → county → department only. Best effort; it never blocks a submit. Reopen routing and the map: note a. | `RAINMAKER-PGR.ComplaintHierarchy` department on each leaf type; HRMS department and jurisdiction assignments; more in note a. On **Bonga** every sub-type's department is `NA` (live, 13 Oct), so no officer matches and complaints wait in the GRO queue. |
| #5 (`101262ebf`) | 2026-09-02 | citizen UI + employee UI | Both | Error, maintenance and not-found screens get their own "Go home" button label, a working illustration (the S3 image returned 403) and a layout that fits inside the app shell. From CMS V2.12. | Labels `CORE_ERROR_GO_HOME`, `MODULE_NOT_FOUND`, `CORE_UNDER_MAINTENANCE`. |
| #6 (`f38d29e54`) | 2026-09-02 | citizen UI | Both | Fixes a crash on the citizen reopen page (a hook was not registered). | none |
| `82ba44d57` (direct, sync branch) | 2026-09-02 | novu-bridge | Both, wherever novu-bridge runs | Adds the **Bongatech** SMS gateway alongside Ozeki, either through Novu or by direct HTTP. | `NOVU_BRIDGE_SMS_PROVIDER`/`NOVU_BRIDGE_OTP_SMS_PROVIDER`/`NOVU_BRIDGE_DIRECT_SMS_PROVIDER=bongatech`, `NOVU_BRIDGE_SMS_SENDER_ID`, `NOVU_BRIDGE_DIRECT_SMS_BASE_URL`/`_TOKEN`, `NOVU_BRIDGE_DIRECT_CHANNELS`. |
| #8 (`805e45c9f`) | 2026-09-03 | citizen UI + routing | Both (code) | Auto-assignment picks the **last-mile officer (PGR_LME)**, not senior viewers, whenever the workflow has a PGR_LME role. | HRMS PGR_LME holders per department. |
| #7 (`7f013197a`, base develop) | 2026-09-04 | public landing | Bomet | Restyles the Bomet landing: white hero and footer, blue palette, county logo lockup; drops WhatsApp and the privacy link. Superseded on nairobi-prod by the Nairobi re-brand (`32617c679`). | none |
| #9 (`abf6406b6`) | 2026-09-04 | deploy/ops (sync) | — | Merges the sync branch into `develop` (carries #3–#8). | none |
| #10 (`d10f9a405`, base master) | 2026-09-10 | docs | — | Issue templates and CONTRIBUTING point to CMS-KENYA and project board #17; the Source field becomes PROD/UAT. | none |
| #20 (`e22f3a552`) | 2026-09-15 | employee UI | Both (Bomet roles) | Bomet department-tier roles (HEALTH/WATER/ADMIN × DIRECTOR/CHIEF_OFFICER/CECM) see the Complaints card. The default inbox status list now comes from the live workflow, so escalated complaints appear without ticking a filter. | Role codes in HRMS; workflow BusinessService. |
| #22 (`28eefc9ae`) | 2026-09-15 | citizen UI + employee UI + MDMS/config | Both | Display masking of names and phone numbers moves behind a deploy switch, **off for Kenya**, so timelines show identities in clear. Server-side masking is separate. | globalConfigs `PGR_PII_MASKING` (Ansible `pgr_pii_masking`, default `false`). |
| #23 (`584c07e6c`) | 2026-09-15 | employee UI + localization | Both (Bomet states) | Labels for the escalation states ESCALATEDLEVEL1–3; the "assigned to me / all" choice returns to the legacy inbox filter. | Labels `CS_COMMON_PGR_STATE_ESCALATEDLEVEL1..3`, `CS_COMMON_ESCALATEDLEVEL1..3` (#23 says these were upserted on bgrm). |
| #29 (`3861b8498`) | 2026-09-16 | citizen UI | Both | Citizen complaint details show a named address and County / Sub-County / Ward rows, and no empty "Complaint Location" card for complaints without a pin. Its "no default map pin" part was reversed two days later by `16c6e311f`. | Boundary-name labels (module `rainmaker-boundary-<hierarchy>`); globalConfigs `HIERARCHY_TYPE`. |
| #34 (`eff52826f`) | 2026-09-16 | citizen UI + MDMS/config | Both (code) | Matomo behaviour analytics: complaint funnel events, each wizard step counted as a page view, outcome pages, landing and tutorial pages tracked. Cherry-picked from CMS V2.12. | `common-masters.AnalyticsProvider` MATOMO row; Matomo stack (`docker-compose.matomo.yml`); nginx `/matomo/`. Live 13 Oct: bgrm has the provider row and serves `/matomo/matomo.js`; Bonga has neither. |
| `626864567` + merge `4ad2fc176` (direct, kenya-prod) | 2026-09-16 / 2026-09-18 | citizen UI + employee UI + dashboard | Both | Front-end part of the **CMS V2.12 update of 2026-09-16** (upstream `7ee88f83`):<br>• "working context" chip in the employee top bar;<br>• inbox visibility tabs;<br>• dashboard refinements (language menu, footer, "updated … ago" stamps, batched analytics queries);<br>• jsPDF security bump.<br>`4ad2fc176` restored six Kenya PGR files that `2176984d7` had overwritten. | `RAINMAKER-PGR.InboxVisibilityConfig` (tabs stay off without it). |
| `2176984d7` (direct, kenya-prod) | 2026-09-17 | backend pgr-services + deploy/ops + MDMS/config | Both | **CMS V2.12 backend, infrastructure and configurator sync, squashed** (905 files; the title understates it): policy-based search scoping, analytics capability checks, the employee working-context API and more; full list in note b. | `egov.accesscontrol.host`; `PGR_EMPLOYEE_CONTEXT_*_ROLE_CODES`; optional policy on the `/pgr-services/v2/request/_search` record in `ACCESSCONTROL-ACTIONS-TEST`; `PGR_COMPLAIN_IDLE_TIME`. |
| `7eaefc863` | 2026-09-17 | deploy/ops | — | Configurator build fixed after the sync (a duplicate `visibleNavGroups`). | none |
| `d72391231` (direct) | 2026-09-18 | backend pgr-services | Both | Employee department and jurisdiction scope wired into search. The department-name cache keeps serving its last good value during a brief MDMS outage, so an officer's results are not narrowed. | `jurisdictionSubtreeCacheTtlMs` (default 5 min). |
| `5d9420775` | 2026-09-18 | localization | Both | Seeds two labels that showed as raw keys on the employee home. | Upsert `DASHBOARD_CARD_HEADER`, `ULBGRADE_STATE`. |
| `9d97efb41`, `b9f1bfc1e`, `9fe44bc3d`, `b953b2145`, `03f4e4a02`, `f56b19ed4`, `9c34a4449` | 2026-09-18 to 2026-09-21 | employee UI | Both | **New employee header** with a greeting, live clock, hover language menu and a profile card (department, role, location, last login, Edit profile, Logout). The city picker appears only for staff with roles in more than one city. The logo fits the bar. The Ombudsman role gets the Complaints card. | Labels `CORE_TOPBAR_*`. |
| `f19dbd4a0` | 2026-09-18 | MDMS/config | New environments | Seeds an enabled Matomo destination row for fresh Kenya environments. | Matomo siteId 1, goals 1/2, dimensions 1–4. |
| `6bef31ae4` | 2026-09-18 | MDMS/config | Both | `PGR_PII_MASKING=false` declared in the repo's globalConfigs (local and dev builds). | none live (the Ansible template already defaults to false). |
| `adef886be` (cherry-pick) | 2026-09-18 (authored 09-07) | citizen UI + employee UI | Both | A failed request no longer throws the user onto the maintenance page. An expired session goes to the right login page and keeps drafts, language and caches. The citizen wizard checks the session before submitting. | none |
| `30bb121e9`, `763726dcd`, `e4c056c02`, `4dc8c4bea`, `d27899dd8`, `5d732f538`, `117a1ed1f` | 2026-09-18 (authored 09-07/08) | citizen UI + employee UI | Both | If another account signs in in another tab of the same browser, a notice explains what happened (it only informs). One tab's logout no longer wipes another tab's session. From CMS V2.12 (CCSD-2231). | Labels `CORE_SESSION_COLLISION_*` (English fallbacks exist). |
| `16c6e311f` | 2026-09-18 | citizen UI | Both | **The citizen map opens at the tenant centre at street zoom with a pin and coordinates already filled in** (CMS V2.12 behaviour, requested explicitly). A citizen who never touches the map submits the centre point. | `RAINMAKER-PGR.MapConfig` `center`/`defaultZoom`, or globalConfigs `MAP_CENTER` (Ansible `map_center`, required). |
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

Note a (#4): Citizen reopen goes back to the previous handler. The map follows the pin and uses a vector street map, with a raster fallback where WebGL is missing (from CMS V2.12). Live configuration also needed: workflow roles at the APPLY target state; optional `RAINMAKER-PGR.MapConfig`; browsers must reach `tiles.openfreemap.org`.

Note b (`2176984d7`), in full:

- search scoping by policy (department or jurisdiction per role, read from the access-control action record);
- capability checks for analytics;
- employee working-context API;
- Helm and CI validation workflows;
- updates to the `ansible/nairobi-mdms` packs;
- reopen fallback window cut from 10 days to 72 h (the enforced value is `UIConstants.REOPENSLA`).

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
| #56 | 2026-09-23 | employee UI | Both (URL only) | **Present but not released.** Role-tiered employee home at `/digit-ui/employee/home-v2` (oversight, casework, intake, read-only). **Not linked from any menu**: the only reference is the route in core `App.js`, and `/employee` is unchanged. | `PGR_HOME_*` labels are unseeded (English fallbacks); `InboxVisibilityConfig`; dashboard access for the oversight charts. |
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
| #103 (`df9aa019d`) | 2026-10-05 (merged; commits dated 2026-10-01) | backend pgr-services | Both (bgrm via #133) | **Confidential complaints are masked on the server.** Name, phone, e-mail and address are hidden from everyone who is neither the complainant nor a `CONFIDENTIAL_COMPLAINT_VIEWER`. Also a new **filtered timeline API**: note a. | Deploy pgr-services first; **action 2635 plus role grants** (without them the timeline is empty, and there is no fallback on nairobi-prod); role `CONFIDENTIAL_COMPLAINT_VIEWER` (missing on bo per #133). |
| #103 (`ee3f83a44`) | 2026-10-05 (merged; commits dated 2026-10-01) | citizen UI + employee UI | Both | **Mandatory Terms & Conditions consent** on citizen create (saved in `additionalDetail.consents`); "Keep details confidential" always offered; **official PDF application** with Download, Print and Share; **manual ESCALATE**. Details in note b. | Labels `PGR_CONSENT_*`, `PGR_EXT_IS_CONFIDENTIAL_HINT`, `PGR_RECEIPT_*`; workflow ESCALATE grants (live 13 Oct, note b). `tenant.tenants.contactNumber` is printed on the PDF application. |
| #103 (`24a6358a1`) | 2026-10-05 (merged; commits dated 2026-10-01) | public landing | Bonga | Emergency helplines section, motion and accessibility pass (contrast, 44 px targets). **The emergency numbers were removed again by #155.** | `LandingSection` helplines row only if the landing is MDMS-driven. |
| #103 (`c16c75208`) | 2026-10-05 (merged; commits dated 2026-10-01) | citizen UI + employee UI + deploy/ops | Both | **Lazy loading**: heavy screens, maps and PDF libraries load on demand; the startup download drops from 9.5 MB to 4.55 MB. | Deploy the whole `build/` folder, including `build/chunks/`. |
| #103 (`64e5dee4e`) | 2026-10-05 (merged; commits dated 2026-10-01) | localization + roles/access | Both (seeds) | Seeds for the labels above, a helplines landing row, and access-control action 2635 with role grants. | These seeds reach only new tenants; live tenants need upserts and grant scripts. |
| #104 | 2026-10-05 | citizen UI | Both | The optional address field moves to step 1 of the citizen wizard. | none |
| `da6df4be3` (direct) | 2026-10-05 | backend pgr-services | Bonga | **Complaint numbers without zero padding** (BNG-2026-125); padded numbers are still found by search. Opt-in. **Not in `feat/bomet-uat`**, so Bomet keeps padded numbers. | `egov.idgen.pgr.serviceRequestId.strip-sequence-padding=true` (default `false`; the live value is not in the repo; #128 cites BNG-2026-161). |
| #117 | 2026-10-05 | citizen UI | Both | Share hands out the PDF application. The OTP **resend** wait is 3:00 (also for the employee change-password OTP). **Emoji rating** replaces stars; the stored value is still 1–5. | Labels `CS_RATING_LABEL_1..5` and receipt share labels. |
| #119 (incl. #120) | 2026-10-05 | citizen UI + employee UI | Both | Review fixes for #117. Share opens a sheet with Open PDF, Email, WhatsApp, SMS and More apps (#120's Copy link was removed later by #129). | 11 `PGR_RECEIPT_SHARE_*` labels |
| #118 | 2026-10-05 | public landing | Bonga | Hero photo of the County customer-service centre. #154 later replaced the hero design. | none |
| #121 | 2026-10-05 | employee UI | Both | PDF application buttons styled on the employee "complaint submitted" page; Open PDF works reliably. | none |
| #125 | 2026-10-07 | employee UI | Both | "Keep details confidential" on the employee create form. | pgr-services with the #103 backend (both have it); label `PGR_EXT_IS_CONFIDENTIAL_LABEL`. |
| #128 | 2026-10-08 | backend pgr-services | Both (bgrm via #133) | **No staff exemption** from confidential masking, including the clerk who filed the complaint. Only the citizen owner and viewer-role holders see the details. | Rebuilt image; viewer role assignments. |
| #129 | 2026-10-08 | citizen UI + employee UI | Both | Share sends the PDF itself, which prints the complainant's name and phone number (note c). Copy link and the "track here" text are removed. | Labels `PGR_RECEIPT_SHARE_HINT_PDF`, `PGR_RECEIPT_SHARE_ATTACH`. |
| #130 | 2026-10-08 | dashboard | Both | **Dashboard export menu**: Excel (summary plus a sheet per tile), CSV and PDF report, each with context, KPIs and every chart, table and map as data. | `DASHBOARD_EXPORT_*` labels (English fallbacks). |
| #131 | 2026-10-08 | citizen UI + employee UI | Both | The citizen footer sits flush at the bottom. A bundled DIGIT logo is used when the tenant logo is missing or broken. The complaint page refreshes on return to the tab and after a failed, out-of-date action (port of #60). | none |
| #132 | 2026-10-08 | employee UI | Both | Employees are greeted by designation ("Hello, Director"), and the department in the profile menu is translated. | `COMMON_MASTERS_DESIGNATION_<CODE>` and `COMMON_MASTERS_DEPARTMENT_<CODE>` labels (live en_IN: nb 334/137, bo 208/72); HRMS designation. |
| #134 | 2026-10-09 | employee UI | Both | **Take Action is offered by role again**, not only to the assignee (reverts #93's gate and #95's queue exception). The LME reassign picker stays. | none |
| #136 | 2026-10-09 | backend pgr-services | Both (bgrm via `781906447`) | The server enforces **time windows**: REOPEN within `REOPENSLA` of the last update, WITHDRAW within `WITHDRAWSLA` of filing. Configurable per tenant (`UIConstants.actionWindows`), with defaults in properties. | `UIConstants.REOPENSLA`/`WITHDRAWSLA`/`actionWindows`; `PGR_ACTION_WINDOWS_DEFAULTS`, `PGR_COMPLAIN_IDLE_TIME`, `PGR_COMPLAIN_WITHDRAW_TIME` (fallbacks 72 h); migration `V20260930000000` (both counties carry `WITHDRAWSLA` and `actionWindows`, 13 Oct). |
| #140 | 2026-10-09 | citizen UI + employee UI | Both | Browser tab title and favicon follow the tenant instead of the build. **Its pre-boot follow-up `875cf1871` is not merged.** | `CORE_APP_TITLE` per tenant (live: nb "Bonga Nai", bo "Bomet Feedback" / sw "Maoni ya Bomet"); `StateInfo.logoUrl`. |
| #142 | 2026-10-09 | citizen UI + employee UI | Both | Share is a modal dialog, offered on every device in this build. The PDF is prepared when the dialog opens, so sharing runs inside the user's tap; on computers it still refused or stalled (note c). Each channel is prefilled with a complaint summary (never the complainant's name or phone; the PDF itself prints them, note c). | Labels `PGR_RECEIPT_SHARE_CLOSE`/`_PREPARING`; `tenant.tenants.contactNumber` (both tenants print `0000000000`). |
| #145 | 2026-10-09 | citizen UI + employee UI | Both | The Reopen button and menu follow the live window (refreshed every minute) and disappear at the deadline. A reopen link opened after the window shows a notice. | `UIConstants.REOPENSLA` (+ `actionWindows`); labels `CS_CANNOT_REOPEN_COMPLAINT_PAST_DEADLINE` etc. |
| #146 | 2026-10-09 | citizen UI + employee UI | Bomet | **Withdraw** through a confirmation popup (optional reason) for citizens, and a confirmation in employee Take Action (comment required). Offered only within `WITHDRAWSLA` and never after a reopen. Live 13 Oct: Bonga has WITHDRAW before assignment (PENDINGFORASSIGNMENT, 1-day window); Bomet at PENDINGATLME (3-day window). | Workflow WITHDRAW → CANCELLED (CITIZEN, CSR) — live on both; `WITHDRAWSLA` nb 1 day, bo 3 days; 10 labels (present on both); `CS_COMMON_PGR_STATE_CANCELLED` reads "Withdrawn" (Kiswahili "Imeondolewa") on both sites (read 19 Oct). |
| #147 | 2026-10-12 | tests | — | End-to-end regression test: a Take Action draft stays with one complaint and one action. | Playwright environment |
| #148 | 2026-10-12 | deploy/ops + citizen UI + employee UI | Both | **After a deploy, open tabs switch to the new build** at the next "hub" screen. Stale labels and MDMS caches are dropped. Ansible rebuilds the UI when `src/` changes. | Ship `build-info.json` with `index.html`; nginx `Cache-Control: no-cache` (Compose and Ansible have it; Helm does not). |
| #150 | 2026-10-12 | employee UI + workflow | Bonga | **"Reassign to GRO"**: a last-mile officer sends the complaint back to the GRO queue, unassigned, with no picker and an optional comment. | Workflow REASSIGNTOGRO PENDINGATLME → PENDINGFORASSIGNMENT (PGR_LME), live on nb; 4 labels; **no SMS template**. |
| #151 | 2026-10-12 | employee UI | Bonga | After Reassign to GRO, a 5-second "Sent back to the GRO" notice, then the inbox. | Labels `CS_REASSIGNTOGRO_DONE_*` |
| #152 | 2026-10-12 | public landing | Bonga | County help lines and contact e-mail added. | none (set in code) |
| #153 | 2026-10-12 | public landing | Bonga | Only the county's new lines (0725 624 489 24/7, 0730 047 047, 020 724 7047) and one e-mail. #152 flagged that the e-mail is a personal mailbox, not a county address. | none |
| #154 | 2026-10-12 | public landing + MDMS/config (configurator) | Bonga | New top of the page from the county's 12 Oct design: utility strip, crest masthead, hero, photo category cards, slogan band. In-page section links fixed. **On bgrm this page showed Nairobi branding**, hence the bgrm branch. | Optional `LandingSection` `tagline` row. |
| #155 | 2026-10-13 | public landing | Bonga | The help-line section becomes one "Call Customer Service" panel. **Police, Ambulance and Fire numbers are removed.** | none |
| #157 (`0c7b3f640`) | 2026-10-13 | filestore/security + deploy/ops + citizen UI | Both (**off by default**) | Optional **ClamAV virus scan of uploads**: infected files are refused and quarantined, and the upload widget shows a clear message. | Ansible `enable_file_scan: true` (default `false`); memory: about 1.5 GB for ClamAV, plus up to 1 GB for the upload proxy under heavy load — budget about 2.5 GB; MinIO quarantine; OpenBao passwords; nginx `/filestore/` route; labels `CS_FILE_*`. Enabling is tracked in issue #159 (OPEN). |

Note a (#103, `df9aa019d`): Searches by person exclude confidential complaints, and notifications and events carry no complainant identity. New **filtered timeline API** `/v2/request/_chronology` (from CMS V2.12): citizens see no officer names, contacts or internal comments, while the closing comment stays.

Note b (#103, `ee3f83a44`): Both timelines read the chronology API. The official PDF application is an offline PDF with Download, Print and Share. Complaint type and sub-type pickers are sorted A–Z with "Others" last. Manual ESCALATE: the assignee pick is mandatory and the list offers the tier above. Workflow ESCALATE grants, live 13 Oct — nb: PENDINGATLME (PGR_LME, SYSTEM), ESCALATEDLEVEL1 (CHIEF_OFFICER, SYSTEM); bo: PENDINGATLME (PGR_LME, SYSTEM), ESCALATEDLEVEL1 (ADMIN_DIRECTOR, HEALTH_DIRECTOR, WATER_CHIEF_OFFICER, PGR_LME, SYSTEM), ESCALATEDLEVEL2 (ADMIN_CHIEF_OFFICER, HEALTH_CHIEF_OFFICER, WATER_CECM, PGR_LME, SYSTEM).

Note c (#142): #142 was meant to make sharing work in Safari on Mac and desktop Chrome. On computers sharing still refused or stalled (Safari on Mac, issue #138, open); #162 (open, §5) would show Share in the mobile view only. The message that goes with a shared PDF (number, status, category, filing date, address, description, help line) never contains the complainant's name or phone number. The PDF application itself prints them as the person opening it may see them: in full on the resident's own copy, and masked when staff without the `CONFIDENTIAL_COMPLAINT_VIEWER` role open a confidential complaint, because the server masks them before the browser draws the PDF. Because Share hands over the PDF itself, a resident who shares it also shares their own name and number.

---

## 5. Changes not in this release

This section lists pull requests outside `nairobi-prod` that matter to the counties, then open pull requests that are not in this build.

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
| #122 | PR, OPEN | master | n/a | The Bomet "superset" is not merged. Superset-only items that are therefore live on neither county:<br>• #81 (employee auto-assign) and #50/#78/#82 (reopen picker);<br>• the #98 escalation and its follow-ups;<br>• #55, #59;<br>• `5d429bd08` (**My Complaints fails with WORKFLOW_NOT_FOUND after 10 complaints**);<br>• `35aa73c28` (title before boot);<br>• `072bb4104` ("Withdrawn" label seed; both sites already show "Withdrawn", read 19 Oct);<br>• the chronology fallback (in `b15d97bf4`).<br>Only its Landing folder (at `3f4965e44`) was copied into bgrm-changes. |
| #133 | PR, merged 2026-10-08 | feat/bomet-uat | It is itself a port **from** nairobi-prod: `5cd998fd0` = `df9aa019d` (backend), `5c02a2b20` = `1a848286c`. | Gives bgrm's backend (`bomet-uat-6eb6b85`) the chronology API and confidential masking. Action 2635 is granted on bo (21 roles, live). `CONFIDENTIAL_COMPLAINT_VIEWER` does not exist on bo **or nb** (live, 13 Oct), so no officer in either county can see a confidential complainant. |
| #156 | PR, OPEN | nairobi-prod | n/a | Would revert #154 and #155 on nairobi-prod; its tree equals nairobi-prod at #153 (`d7016c952`). While it stays open, nairobi-prod (Bonga) shows the 12 Oct design. bgrm-changes already contains the same two reverts (identical trees: `f6ead681a` vs `9fdb81ad8`). |
| #158 | PR, merged 2026-10-13 | nairobi-prod-bgrm-changes | Same commit as #157 (`0c7b3f640`). | ClamAV proxy code is on both UI branches. Off unless `enable_file_scan: true`. |

Other open PRs worth knowing about:

| # | Base | Change | Consequence while open |
|---|---|---|---|
| #162 | nairobi-prod | Share for the PDF application only in the mobile view (768 px or narrower), without "More apps"; computers get Download and Print | Not in this build: Share is offered on every device, with "More apps" where the browser has a share sheet (#142), and sharing from computers stays unreliable (Safari on Mac, issue #138). bgrm needs the same commit on `nairobi-prod-bgrm-changes`. |
| #161 | nairobi-prod | Staff top bar: a fallback logo when the county logo fails to load (the county's logo bundled with the app, otherwise the bundled DIGIT mark), and a long designation greeting shortened with an ellipsis | Not in this build: a county logo that fails to load shows as a broken image in the staff header, and a long designation can push the language and profile menus, with Logout, off screen (both seen on cms-pilot, 14 Oct). bgrm needs the same commit on `nairobi-prod-bgrm-changes`. |
| #72 | nairobi-prod | Completes the citizen logout question | The citizen logout dialog reads "Are you sure you want to" (unless the seeded text is a full sentence; unverified). |
| #89 | kenya-prod | Bomet icon seeds | A data fix is needed on bo either way (#89 confirms both records still had `PGRIcon`). |
| #91 | kenya-prod | Hide extended-attribute detail cards (issue #73) | The "Complainant Details" card can show "NA" to directors on Bomet. |
| #87 | nairobi-prod | Citizen-menu theme colours | none listed |
| #101 | kenya-prod | feat/bomet-uat | Draft; the branch is bgrm's backend source. |
| #126 | nairobi-prod | `loc` migration phase | Catches up missing labels; #126 counted 70+ missing keys on nb on 7 Oct. |
| #49 | master | master ← nairobi-prod | Review PR; master is still at #48. |
| #47 | sync branch | `nairobi` branch | Review draft |
| #30, #33, #35, #36, #38 | various | CMS V2.12 update PRs | Superseded by the direct commits `626864567` and `2176984d7`. |
| #37 | upgrade-master (merged) | — | Not in nairobi-prod. |

---

## 6. `nairobi-prod` vs `nairobi-prod-bgrm-changes`

- **Containment.** `git log origin/nairobi-prod-bgrm-changes..origin/nairobi-prod` lists three commits (read 19 Oct):
  - `8e6289e86`, the #157 **merge commit**. Its single change, `0c7b3f640`, is in bgrm-changes through #158 (`78444ee4e`).
  - `32a56d27d` (13 Oct): the scan proxy's load-test suite, `backend/filestore-scan-proxy/loadtest/`.
  - `723b680d7` (14 Oct, after the described code): the server backup script, `local-setup/scripts/backup-server.sh` (§2).
  - So **bgrm-changes contains all of nairobi-prod's application content** up to #157/#158. It lacks only the load-test suite and the backup script, and neither touches the UI code (`digit-ui-esbuild/`).
- **Commits only on bgrm-changes:**
  - `ba374fc51`: revert #155;
  - `f6ead681a`: revert #154;
  - `bae16acca`: "bgrm gets its Bomet landing page back";
  - `78444ee4e`: #158.
- **Tree difference (61 files against `8e6289e86`), all landing-related.** The purpose is to give bgrm a Bomet front page while sharing every other change. Against today's `nairobi-prod` (`723b680d7`) the difference is 67 files: these 61, the five load-test files and the backup script.
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
  - Every non-landing change must be merged into both branches, as was done for #157/#158. The load-test suite and the backup script are not on bgrm-changes yet; neither changes the UI build bgrm runs.
  - The emergency numbers (999/112) are still on the Bomet page but gone from the Bonga page (#155).

---

## 7. Included from CMS V2.12

CMS Kenya includes CMS V2.12 as merged on 31 Aug and its 16 Sep update (`7ee88f83`). The table lists the CMS V2.12 features that matter
in Kenya, their state in the two counties (live 13–14 Oct) and where the code lives on `nairobi-prod`.

| CMS V2.12 feature | In the counties | Evidence on `nairobi-prod` |
|---|---|---|
| 3-step resident form: category pickers, drafts that survive a refresh, consent capture | live | `pages/citizen/Create/CreatePGRFlowV2.tsx` |
| Attachments when filing and on every action; video and audio play in the browser; accept list matches the filestore allow-list shipped in Compose (the live servers' list was not read; issue #25, §11) | live | `components/PgrFileUpload.js`, `utils/attachmentKind.js` |
| Action screens built from the county's workflow; reopen and rate keep routing data; reopen needs a reason and restarts escalation | live | `pages/employee/PGRDetails.js`, `components/PGRWorkflowModal.js`, `ReopenComplaint/AddtionalDetails.js` |
| Complaint categories as data (`ComplaintHierarchy`, N levels) | live; both counties use 2 levels | `RAINMAKER-PGR.ComplaintHierarchyDefinition` |
| Notifications to the newest workflow step, department names, acting-officer and deep-link placeholders | live | `pgr-services` `NotificationService.java` |
| Configurable escalation states (`pgr.escalation.states`) | default `PENDINGATLME,PENDINGFORASSIGNMENT` | `application.properties` |
| Direct SMS / e-mail delivery and the OTP pipeline (novu-bridge) | in use; Kenya added the Bongatech and Source Code gateways; each county's gateway not verified | `DirectDeliveryService.java`, `UserOtpSmsConsumer.java` |
| Analytics framework (host allow-list, personal data scrubbed, kill switch), destinations editor, Matomo provisioning | Matomo live on bgrm; not configured on Bonga | `public/analytics.js`, `configurator/src/admin/analytics/` |
| Landing-page renderer and the configurator's Landing Page Builder | live (county landing pages) | `pages/citizen/Landing/`, `configurator/src/admin/landingBuilder/` |
| Theme colours from MDMS (`ThemeConfig`) | live | `src/theme/applyTheme.js` |
| Master data cached in IndexedDB; compressed, always-revalidated UI delivery | live | `idbCache.js`, `nginx-site.conf.j2` |
| Policy-driven complaint search (action 2008 scope and redaction) | live, county policies differ (§3.4.1) | `pgr-services` `policy/` |
| Role-list search scoping (`pgr.department.scope.roles`, `pgr.jurisdiction.scope.roles`) | off (empty); the policy above is used instead | `EmployeeDepartmentScopeService.java`, `EmployeeJurisdictionScopeService.java` |
| Admin cross-department search | not usable: neither county has an access-control action for `/v2/request/_admin/_search` | `AdminComplaintSearchController.java` |
| On-screen PII masking | off (`PGR_PII_MASKING=false`); Kenya masks confidential complainants on the server instead | `utils/piiMasking.js` |
| Intake channel chips on the staff form | shown; the "Green Line" option is not used in Kenya | `components/ChannelChipsComponent.js` |
| Password-gated testing entrance | off | `local-setup/ansible/playbook-deploy.yml` |
| Reception-officer inbox; four-tier CMS workflow and its roles | unused | `OnlyMyComplaintsFilter.js`, `CmsPgrWorkflowConfig.json` |
| Authority picker and per-authority questions | unused (no Kenya data) | `CreatePGRFlowV2.tsx` |
| Portuguese language packs; Ozeki SMS gateway | unused | `localisations/pt_PT/`, `OzekiOverridesBuilder.java` |
| Migration runner `ccrs-migrate.cjs` | operator tooling | `docs/migration/ccrs-migrate.cjs` |
| Configurator role-action create / edit | removed by the 16 Sep update (the buttons remain) | `configurator/src/App.tsx` |

**Not included in this release:** the mobile app wrapper, the tutorial page, the self-contained security scanner and OpenSSF Scorecard
(Kenya keeps the CI security pipeline, `.github/workflows/security-scan.yml`), the reopen fresh-fetch fix, and the double-submit guard
on filing (`3a299b851`).

**Present but not released:** the role-tiered staff home at `/digit-ui/employee/home-v2` (Kenya work: #56, #63, #80; §4.4). It is in the code but reachable only by URL, is not linked from any menu, and is not part of this release.

---

## 8. Configuration changes against CMS V2.12

Operator-level changes between the CMS V2.12 baseline and `nairobi-prod`: backend settings, migrations, MDMS, workflow, access control, labels, deployment and image tagging. Layer tags are explained in §1.

### 8(a) Backend settings: `backend/*/src/main/resources/application.properties`

Only two services changed between base and nairobi-prod: `backend/pgr-services/src/main/resources/application.properties` (+74/-2) and `backend/novu-bridge/src/main/resources/application.properties` (+65). No property files changed for `digit-config-service`, `digit-user-preferences-service` or `xstate-chatbot` (`git diff --stat` base..np).

#### a.1 pgr-services

| Key (env override) | Default | What it controls | Opt-in? | Layer / commit |
|---|---|---|---|---|
| `egov.idgen.pgr.serviceRequestId.strip-sequence-padding` | `false` | Drops egov-idgen's six-digit zero pad from the trailing sequence of newly generated IDs (`BNG-2026-000125` to `BNG-2026-125`). Search always matches both spellings (`ServiceRequestIdFormat.searchVariants`, `PGRQueryBuilder`). Existing IDs are never rewritten. | **Yes** (off by default; "an existing deployment's numbering cannot change shape on a redeploy", `PGRConfiguration.java`) | [K] `da6df4be3` (2026-10-05). **nairobi-prod only**; absent on `feat/bomet-uat`. No deploy path sets it; env-var spelling: note a. |
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

Note a (`strip-sequence-padding`): the env-var spelling is unverified because the key is camelCase (`serviceRequestId`); Spring's env lookup would most likely accept `EGOV_IDGEN_PGR_SERVICEREQUESTID_STRIP_SEQUENCE_PADDING`.

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
- `ACCESSCONTROL-ROLEACTIONS` gains grants for those actions and loses all `CMS_*` officer-role grants (seed for new tenants: `utilities/.../mdmsData/ACCESSCONTROL-*`).
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
  - `document.title` comes from label `CORE_APP_TITLE`; the wording is set per tenant by upsert. Live 13 Oct: bo "Bomet Feedback" / "Maoni ya Bomet", nb "Bonga Nai" (§3.5); the commit message gives bo as "Bomet Feedback Hub".
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
| `utilities/.../CmsPgrWorkflowConfig.json` | **added [S]** `bffdce15e` | 3-level CMS officer chain, selected only by `pgr.workflow.variant=cms`. Roles are `CMS_*`: `PENDINGFORASSIGNMENT` → `REFERRED` → `INVESTIGATION` ↔ `INFOFROMCITIZEN` → `RESOLVED`/`REJECTED`. |
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
| same, value changes | `localeRegion`/`localeDefault` `IN`/`en` → **`PT`/`pt`** (a leftover from another deployment; both live counties' files have `localeDefault = "en"`) | | [S] `21a6f1f2e` |
| `digit-ui-esbuild/public/globalConfigs.js` (dev/default copy) | `PGR_PII_MASKING` (`false`) | as above | [K] `6bef31ae4` |
| same | `ANALYTICS_KILL_SWITCH` (`false`) | Hard-disables all analytics when `true` | [S] `e9a0f0e43` |
| same | `ANALYTICS_SCRIPT_HOSTS` (`[]`) | Extra allowed analytics script hosts | [S] `e9a0f0e43` |
| same | `ANALYTICS_CUSTOM_ENABLED` (`false`) | Allows `type: CUSTOM` provider rows | [S] `e9a0f0e43` |
| same, value changes | Footer logos [P]; locale `PT`/`pt` [S] | | |
| `local-setup/ansible/templates/globalConfigs.js.j2` (Ansible, the live path) | `PGR_PII_MASKING` (host_var `pgr_pii_masking`, default **false**) | as above | [K] `05d714058` |
| same | `ANALYTICS_*` ×3 (host_vars `analytics_kill_switch`/`analytics_script_hosts`/`analytics_custom_enabled`) | as above | [S] `e9a0f0e43` |
| same | `TESTING_MODE`, `TESTING_TENANT_ID` (only when `testing_ui_enabled`) | `/testing-ui` entrance | [S] `06ee871e6` |
| `configs/assets/globalConfigsPGR.js`, `local-setup/configs/assets/globalConfigsPGR.js`, `frontend/micro-ui/web/public/globalConfigs.example.js` | none (footer-logo values only) | | [P] |
| **NEW** `devops/deploy-as-code/charts/urban/digit-ui/files/globalConfigs.js.tpl` and `templates/globalconfigs-configmap.yaml` (Helm renders `globalConfigs.js`; no S3 upload) | 34 keys from `values.yaml` `globalConfigs:` | **Lacks `PGR_PII_MASKING`, `ANALYTICS_*` and `TESTING_*`**, so a Helm-rendered config masks PII. Several keys use names the UI does not read, and some are absent (note a). This is a CMS V2.12 issue. Both live counties' `globalConfigs.js` are generated by Ansible (note a). | [P] `2176984d7` |

Note a (Helm `globalConfigs.js.tpl`): keys whose names the UI does not read are `FOOTER_LOGO_URL`/`FOOTER_BW_LOGO_URL` (UI reads `DIGIT_FOOTER`/`DIGIT_FOOTER_BW`), `ASSET_S3_BUCKET` (`S3BUCKET`), `CONFIG_MODULE_NAME` (`UICONFIG_MODULENAME`), `BOUNDARYTYPE` (`BOUNDARY_TYPE`) and `CENTRAL_INSTANCE_ENABLED` (`ENABLE_SINGLEINSTANCE`). `JWT_TOKEN` and `MDMS_V1/V2_CONTEXT_PATH` are also absent. Both live counties' `globalConfigs.js` are generated by Ansible (`host_vars/nairobi.yml`, `host_vars/bometnew.yml`, per the files' header).

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
  - New example `host_vars/nairobi.yml.example` (`32617c679`): `ke`/`ke.nairobi`, `hierarchy_type: NAIROBI-Hierarchy`, `+254` and `^[17][0-9]{8}$`, postal `^[0-9]{5}$`, `pgr_notification_config_driven: true`. It contains local test secrets; the values are not repeated here. Its `map_center` (line 56) is Bomet's centre (-0.7817, 35.3428), not Bonga Nai's live centre (-1.2864, 36.8172, §2): set it when onboarding from this template.
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

Nothing is present on bomet-uat but absent on nairobi-prod under `backend/` (`git diff --stat` from `32a56d27d` to `feat/bomet-uat` shows 27 files, 9 insertions and 2,103 deletions, all removals).

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
| `.github/workflows/build.yml` | Maven services listed in `build/build-config.yml` (the six its `pipeline_name` input offers): `pgr-services` (+ `pgr-services-db`), `novu-bridge` (+ `-db`), `digit-config-service` (+ `-db`), `digit-user-preferences-service` (+ `-db`), `default-data-handler`, `xstate-chatbot` (+ `-db`). Uses `build/maven/Dockerfile` with `WORK_DIR`. | `workflow_dispatch` (input `pipeline_name`) | `<last path segment of the branch>-<git short sha>`: `BRANCH="${GITHUB_REF##*/}"`. An existing matching tag is reused. Pushes `egovio/<image>:<tag>-amd64` and `-arm64`, then a multi-arch manifest `egovio/<image>:<tag>`. |
| `.github/workflows/spa-build.yml` | `configurator`, `digit-ui-esbuild`, `digit-ui-v2`, `digit-mcp`, `otp-publisher`, **`filestore-scan-proxy`** (added [K] `0c7b3f640`; also in `build/build-config.yml`) | `workflow_dispatch` | `${GITHUB_REF_NAME//\//-}-<short sha>`: slashes become dashes, so `feat/x` becomes `feat-x-…`. Multi-arch manifest. |
| `.github/workflows/release-build.yml` → `build-images.yml` | **All** images in `build/build-config.yml` at the release tag's commit, including `novu-bridge-endpoint` and the legacy `digit-ui` (`frontend/micro-ui`), which `build.yml` does not offer | GitHub **release published**; runs from the default branch `master` (present on `origin/master` `43a974608`) | `egovio/<image>:<release-tag>` (immutable). `build-images.yml` defaults to `develop-<sha8>` when no version tag is given. |
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
- Default image pins in the repo (CMS V2.12 release build): `egovio/pgr-services:2.12-5137119` and the others in g.1. These are **not** Kenya builds.
- UI delivery: Ansible `digit_ui_mode: static` builds `digit-ui-esbuild` on the box (`host_vars/_example.yml:236-258`), or uses an optional `digit_ui_bundle_image`. bgrm's rollout shipped a prebuilt bundle, so live UI provenance is per build id, not an image tag.

---

## 9. Testing status

### Automated suites (run 13 Oct 2026 on a clean checkout of `nairobi-prod` @ `8e6289e86`, Node 20.20.2)

| Suite | Command (from the workspace) | Result |
|---|---|---|
| Frontend shell unit tests | `cd digit-ui-esbuild && npm test` | **192 / 192 pass** |
| Frontend PGR and dashboard unit tests | `node --test $(find products -name '*.test.js')` (36 files) | **316 / 316 pass** |
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
| Flyway history-table match · Gatus coverage · DB seed sync · analytics seed parity · deploy-as-code validation | pass at each update of PR #49 (`master` ← `nairobi-prod`); on 19 Oct (head `723b680d7`) 9 checks pass and 3 fail (below) |
| Flyway · Gatus on #157 | pass |
| Gateway whitelist parity | runs only when `kong.yml` or `env.yaml` change; last run 21 Sep on a kenya-prod PR, never on `nairobi-prod`; passes locally (above) |
| #152–#155 | no checks triggered |
| Local Setup CI | **fails**; no completed success in 66 runs since 4 Sep (recorded 13 Oct); on PR #49 the jobs "test" and "Config combination + infra contracts" fail |
| Tilt CI | **fails** on every run since 15 Sep; last passed 4 Sep; on PR #49 the job "tilt-test" fails |

The three failing jobs on PR #49 (logs read 19 Oct):

- Local Setup CI, job "test": the `minio/mc` image can no longer be pulled ("pull access denied").
- Tilt CI, job "tilt-test": the `minio/minio` image can no longer be pulled.
- Local Setup CI, job "Config combination + infra contracts": 1 of 13 contract tests fails (`static/infra-contracts.test.ts:62`), because a service list now includes `db-migrations`, which the test does not expect.

The minio image references are identical at the CMS V2.12 baseline, `kenya-layer-start` and `32a56d27d`, so the two pull failures are external and not caused by this release. The contract-test failure is on the repository side and needs a fix in the repository.

### Manual / UAT

The county flows were exercised on the live sites and on a local Bomet stack as each change was made:

- filing and auto-assignment;
- escalation;
- resolve, reopen and rate;
- withdraw;
- the PDF application and dashboard export.

The checks mostly used real officer accounts rather than an administrator. A formal UAT sign-off is not kept in the repository. The end-to-end runs on cms-pilot (the test twin of Bonga Nai) that prepared the training videos and the support package are recorded, with their findings and follow-ups, in the release notes' [Support preparation: findings and follow-ups](RELEASE-NOTES-CMS-KENYA-V2.12.md#support-preparation-findings-and-follow-ups).

### Scan proxy load test (13 Oct 2026)

The virus-scanning proxy was load-tested on 13 Oct with 2,250 uploads in 14 runs on a local CMS stack (8 CPUs simulated by pinning containers on a laptop; 15 GiB of memory under heavy swap). Every infected test file (90) was blocked and quarantined, and no clean file was wrongly blocked. Scanning caused no noticeable slowdown up to 50 parallel uploads and added about 0.7 s at the median at 100. The weak point was `egov-filestore`, which ran out of Java heap under 100 parallel 5 MB uploads (41 failures without scanning, 5 with). Full results and sizing advice: `backend/filestore-scan-proxy/loadtest/report-8cpu-16gb.md` on `nairobi-prod` (§12) and the release notes' [File scan: virus scanning of uploads](RELEASE-NOTES-CMS-KENYA-V2.12.md#file-scan-virus-scanning-of-uploads).

---

## 10. Known limitations and open issues

### 10.1 Known limitations (as in the release notes)

The 25 known limitations are kept in one place, the release notes' [Known Limitations](RELEASE-NOTES-CMS-KENYA-V2.12.md#known-limitations), and are not copied here. Their numbering, 1 to 25, is the one the support package (pull request #163) cites as "limitation 9" and so on. They come in four groups:

- [Not yet in this release](RELEASE-NOTES-CMS-KENYA-V2.12.md#not-yet-in-this-release): limitations 1 to 5;
- [Configuration to complete in the counties](RELEASE-NOTES-CMS-KENYA-V2.12.md#configuration-to-complete-in-the-counties): limitations 6 to 15;
- [Behaviour to be aware of](RELEASE-NOTES-CMS-KENYA-V2.12.md#behaviour-to-be-aware-of): limitations 16 to 21;
- [Inherited from CMS V2.12](RELEASE-NOTES-CMS-KENYA-V2.12.md#inherited-from-cms-v212): limitations 22 to 25.

### 10.2 Open issues that bear on shipped changes

Checked on GitHub on 19 Oct 2026: 63 issues, 36 open. Only four open issues carry a priority label: three are still open work (P1 #77, P2 #54 and #52), and one (P1 #102) was delivered by this release. Seven open issues were delivered by this release and only need closing, one (#138) was partly delivered, 13 have a lower priority and 12 remain: 3 + 7 + 1 + 13 + 12 = 36.

**High priority (P1 / P2) still open: 3.**

| Issue | Priority | What remains |
|---|---|---|
| #77 | P1 | Bomet: a staff reopen without choosing an officer is not routed to an officer (limitation 2). The fix (#78, with #50 and #82) is on `kenya-prod` and `feat/bomet-uat`, not on the UI branches the counties run (§5). |
| #54 | P2 | A resident who refuses location access can see the raw key `CS_GEOLOCATION_ERROR`. The fix (#55) is not on nairobi-prod; seeding the five `CS_GEOLOCATION_*` labels (L2) removes it on both counties. |
| #52 | P2 | Bomet: sidebar visibility is read from the page address during rendering and can be stale after in-app navigation. |

**Delivered by this release, to close on GitHub: 7** — #143 (by #145), #127 (by #150 and #151), #124 (by #132), #116 (by #103; Bonga's landing page now has a single customer-service panel, #155), #111 (by #154), #75 (by #96, regression test #147), #102 (by #103).

**Partly delivered: 1** — #138 (sharing the PDF application): fixed on phones by #142, which is in this build; on computers (Safari on Mac) sharing still refused or stalled. Pull request #162 (open, §5) would show Share in the mobile view only.

**Lower priority (no priority label, treated as P3) still open: 13** — #144 inbox default (needs a decision; conflicts with `31edfa212`), #141 escalation level shown in the timeline, #139 Share panel cosmetics, #137 video upload limit on Bonga, #149 dropdown auto-scroll, #115 Kiswahili completeness, #45 Bomet 7-digit numbers, #66 sidebar icons, #67 5 MB photo cap, #68 truthfulness declaration, #73 complainant details layout, #74 Bomet call-centre complaints not escalated automatically, #159 enabling virus scanning.

**Remaining open issues: 12.** Four of them touch areas this release changed: #61 (reopen not working on Nairobi; probably addressed by #65, #85 and #145, and needs a retest before it is closed) and #25 (Word files refused on Bomet; the Compose setting shipped in the repository accepts .docx, but the live servers' setting was not read, §11); #16 (Bomet: restrictions by jurisdiction and department) and #18 (Bomet: escalation changes), which relate to the search scoping by department and area and to the manual and department-tier escalation in this release — whether they are complete needs Bomet's confirmation. The other 8 are requests that do not bear on this release's changes.

## 11. Not verified

1. **Container images on both servers.** Bonga's pgr-services and novu-bridge images, and bgrm's novu-bridge image, were not read from the boxes. The table to complete before tagging is at the end of §2.
2. **novu-bridge settings in each county:**
   - the SMS gateway (Bongatech, Source Code or Novu's primary);
   - `NOVU_BRIDGE_USER_OTP_DEFAULT_TENANT_ID` (Bonga needs `nb`);
   - user-otp's `SMS_TOPIC`;
   - the direct-mode variables.
3. Whether the live gateways run with Kong `ENFORCE_UNAUTH` / `ENFORCE_RBAC = true`.
4. **The workflow service's default page limit** (`egov.wf.default.limit`). It decides whether a resident with more than 10 complaints hits `WORKFLOW_NOT_FOUND`.
5. **pgr-services escalation states** (`PGR_ESCALATION_STATES`) on bgrm. Automatic escalation beyond level 1 needs `ESCALATEDLEVEL1,ESCALATEDLEVEL2` added.
6. **The environment variable behind Bonga's unpadded complaint numbers.** The property is evidently on, because Bonga's numbers are unpadded.
7. **Filing twice on a double click.** Whether this can happen without the CMS V2.12 double-submit guard (`3a299b851`) was not tested.
8. **The configurator's role-action Create/Edit buttons** after the CMS V2.12 update removed their routes (not browser-checked).
9. **Bomet's redaction rule on screen.** The policy code (`PolicyInputBuilder`: tenant-wide means no department and no area restriction) says last-mile officers, department tiers and GROs on Bomet see complainant names and phone numbers redacted (§3.4.1). Not checked on an officer's screen.
10. **Accepted upload formats on the live file servers.** The UI accepts photos, PDF, Word, Excel and five video formats (`PgrFileUpload.js`), and the filestore allow-list shipped in Compose (`ALLOWED_FORMATS_MAP`) accepts them too; the servers' own setting was not read. Issue #25 (open) reports Word files refused on Bomet.
11. **Live 13 Oct statements not re-read on 19 Oct.** The 13 Oct capture is not in the repository. On 19 Oct only the escalation configuration (§3), the status labels "Withdrawn" and "Escalated (Level n)", and the confidentiality label were read again on both sites.
12. **Test-suite figures** (192/192, 316/316, 228/229, 17/17 aliases, 298 Playwright tests listed) were recorded on 13 Oct at `8e6289e86` and not re-run (§9).
13. **The start-up download figure** (9.5 MB to 4.55 MB) comes from PR #103 and was not re-measured.
14. **The manual and UAT statement** in §9 has no artefact in the repository.
15. **Who owns the contact mailbox in Bonga Nai's footer.** #152 flagged it as a personal address; only the County can confirm who owns it. The address is deliberately not reproduced in these documents.
16. **Whether a resident sharing the PDF should share their own name and number** is a product question (raised 19 Oct). The PDF application prints the complainant's name and phone number, and Share hands over the PDF itself (§4.4, note c).

---

## 12. Documentation

The full list of documents for this release (the release documents, the training videos, the support package, the operations handbook, and the deployment and configuration guides) is in the release notes: [Documentation](RELEASE-NOTES-CMS-KENYA-V2.12.md#documentation). It is not repeated here. The evidence on this page also relies on two files of the scan proxy:

- [ClamAV scan proxy README](../../backend/filestore-scan-proxy/README.md): enabling virus scanning and reading the quarantine; the source of the 1.5 GB memory figure for ClamAV.
- [Scan proxy load-test report](../../backend/filestore-scan-proxy/loadtest/report-8cpu-16gb.md) (on `nairobi-prod`; the link works once this page reaches `nairobi-prod` through pull request #160): the 13 Oct load test of 2,250 uploads, with its sizing advice.

---

## 13. Topic index: security, file scan, storage quota, sessions, CMS V2.12 contributions

The evidence behind the "In detail" section of the release notes.

| Topic | Kenya changes | From CMS V2.12 | How it was verified |
|---|---|---|---|
| Security fixes | #103 (`df9aa019d`), #128 (`1a848286c`), #129 and #142 (the share message carries no name or phone; the PDF itself prints them, §4.4 note c), #136 (`c6fee0995`), #157 (`0c7b3f640`); landing-link sanitising `safeHref` (PR #1, `b590fd6a0`) | CMS V2.12 update `2176984d7`: Kong `ENFORCE_UNAUTH` / `ENFORCE_RBAC` set to `true`, policy scoping and field redaction, fail-closed `AccessControlUnavailableException`. `626864567`: jsPDF 2.5.1 → 4.2.1. Earlier CMS V2.12: ward-tooltip escaping `8c1120f9`, scope-bypass hardening `9e650397`, analytics host allow-list `e9a0f0e4` | `kong.yml` and `digit-ui-esbuild/package.json` at product-base vs `nairobi-prod`; class present only on `nairobi-prod` |
| CMS V2.12 security fixes **not** taken | — | `b0fad2383` (bean validation: Hibernate Validator 8 / Jakarta), `4b373f5c9` (complainant validation), `9df954273` (`@SafeHtml` across the request graph), `687c6e8c6` (postgresql 42.7.11, jsoup removed), `b43f0d3d2` (code-base security scan), `939711f2f` (micro-UI Dependabot) | `nairobi-prod` pgr-services `pom.xml`: hibernate-validator 6.0.16.Final, postgresql 42.7.1, jsoup 1.10.2. 33 main-source files still import `javax.validation`. Only the legacy `security-scan.yml` workflow exists |
| File scan | #157 / #158 (`0c7b3f640`); load test `32a56d27d` | — | `backend/filestore-scan-proxy/src/app.js` (responses, quarantine, fail-closed), `loadtest/report-8cpu-16gb.md` |
| Browser storage quota | #148 (`eb71852f7`: IndexedDB entries tagged with the build; caches dropped on a new build) | CMS V2.12 `8fd9f8088` (MDMS cache moved to IndexedDB; in the baseline); the `Digit.Storage` write guard | `idbCache.js`, `Storage.js` and `MDMS.js` on `nairobi-prod` |
| Session and browser handling | #148, #131 (`ae5fc2c53`), #96 / #147, #142 (`792faf7e8`), `f0f518102`, #103 (`c16c75208`), #140 (`a95b7e9de`), forgot password (`fa8b6588a`, `857f76e29`, `98c335803`). Not in this build: #162 (Share in the mobile view only, no "More apps") and #161 (top-bar logo fallback and long designation), both open pull requests (§5) | CMS V2.12: session collision (`30bb121e9` … `117a1ed1f`); request-failure classification (`adef886be`) | Commit messages and the test notes in each PR |
| Screenshots and videos | Virus scan of every attachment when enabled (#157) | CMS V2.12: `e81431c28` (video and audio play), `33a5477dd` (full-screen controls, timeline thumbnail), `c175d74e4` and `230cf3746` (uniform size, CSS fix), `721e44c84` (accept list matches the filestore allow-list), `430690a9f` (staff-form attachments), `065908088` / `291f01f7c` (reopen uploads) | `PgrFileUpload.js` (`DEFAULT_ACCEPT`, 5 MB, 5 files) and `attachmentKind.js` on `nairobi-prod` |
| UI enhancements from CMS V2.12 | — | `626864567` (front-end subset of upstream `7ee88f83`): dashboard header, filters, footer, KPI tiles, `CardUpdatedStamp`, `analyticsBatch`, `LanguageMenu`; TopBar working-context chip; `applyTheme` header tone; `ImageComponent` fallback; inbox visibility tabs; reopen window in the timeline | File list and message of `626864567` |

---

**CMS Kenya V2.12:** **Release preview and evidence** (this page) · [Release notes](RELEASE-NOTES-CMS-KENYA-V2.12.md) · [County release note](COUNTY-RELEASE-NOTE-CMS-KENYA-V2.12.md)
