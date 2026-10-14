# 1. Support matrix — who owns what, and when to escalate

[← Package index](README.md) · Videos: [catalogue](02-video-catalogue.md) · Steps: [procedures](05-procedures.md)

## 1.1 Levels and severities

| Level | Owner | Can use | Must not do |
|---|---|---|---|
| **L1** | eGov support desk | Both public sites, cms-pilot test accounts, this package, the ticket | Change data or settings on a live site; sign in as ADMIN to "try"; paste personal data into tickets |
| **L2** | eGov platform operators, with county IT | Server (`sudo docker …`), configurator, MDMS / workflow / localization APIs, database (read; writes only with an approver) | Change code; run destructive commands (`docker compose down -v`, `system prune`, bare `up -d`) |
| **L3** | eGov engineering | Code, builds, image releases | Deploy to a live site without the county's approval and a rollback plan |

Severity follows the CMS V2.12 handbook ([`docs/2.12/operations/README.md`](../../2.12/operations/README.md)):

| Severity | Meaning | Kenya example | First response |
|---|---|---|---|
| **S1** | Site down or nobody can file / sign in, or personal data exposed | Bonga landing page does not load for anyone; a resident can see officer phone numbers in the timeline | Escalate to L2 **and** L3 at once; tell the county contact |
| **S2** | A main flow is broken for a group of users | Officers in one department cannot Take Action; no SMS for any event | L2 within the hour |
| **S3** | One user or one complaint affected, a workaround exists | One officer sees no complaints; one upload rejected | L1 handles or escalates to L2 the same day |
| **S4** | Question, wording, request for change | "Can the reopen window be 5 days?" | L1 answers or logs as a change request |

## 1.2 Evidence L1 collects on every ticket

Collect this before anything else (procedure [L1-01](05-procedures.md#l1-01-take-a-ticket-and-collect-evidence)):

1. **County and address** — `bonga.nairobi.go.ke` or `bgrm.bomet.go.ke`.
2. **Who** — resident or officer; for an officer, the user name (for example `EMP130`), role and department. Never the password.
3. **Complaint number** — `BNG-2026-125` (Bonga, no zero padding) or `BFH-2026-000125` (Bomet, six digits).
4. **What the screen shows** — a screenshot with personal data covered, and the exact message text.
5. **When** — date and time to the minute. The escalation job runs every 5 minutes and role and label caches last up to 15 minutes, so time matters.
6. **Device and browser** — phone or computer; Chrome, Safari, Edge.
7. **Does a hard reload change it?** — Ctrl+F5 on a computer, or close the tab and reopen on a phone.
8. **Does another person or device see the same?**

## 1.3 The matrix

"Owner" is the level that normally closes the ticket. Linked IDs: **V** = video, **L1-/L2-/L3-** = procedure.

| # | Issue type | How the user describes it | L1 checks (in order) | Owner | Escalate when | Video | Procedure |
|---|---|---|---|---|---|---|---|
| 1 | **Cannot sign in (resident)** | "OTP never arrives", "OTP wrong" | Number typed with no leading 0 or +254 (9 digits starting 7 or 1); OTP is valid 15 min; Resend appears after 3 min; try once more | L1 | OTP missing for **everyone** in a county → L2 (S2); one number only after 2 tries → L2 (S3) | V01 | [L1-03](05-procedures.md#l1-03-help-a-resident-sign-in-and-file), [L2-06](05-procedures.md#l2-06-check-sms-and-otp-delivery) |
| 2 | **Cannot sign in (officer)** | "Invalid credentials", "Login button greyed" | City set to the county; privacy box ticked; caps lock; password reset via "Forgot Password?" | L1 | Reset fails or the account is locked → L2 (HRMS / user) | — | [L1-01](05-procedures.md#l1-01-take-a-ticket-and-collect-evidence), [L2-01](05-procedures.md#l2-01-check-an-officers-roles-department-and-jurisdiction) |
| 3 | **Filing fails** | "Submit does nothing", "Something went wrong", `FAILED_TO_CREATE_COMPLAINT` | Consent box ticked (Submit stays disabled without it); a ward chosen; files under 5 MB; hard reload; the exact error text | L1 | Error code on screen after a reload → L3 with the code and time; `INVALID_CASE_RELATED_TO` on staff filing → L2 (old backend image) | V01, V02 | [L1-03](05-procedures.md#l1-03-help-a-resident-sign-in-and-file) |
| 4 | **Complaint "lost"** | "I filed but cannot find it", "not in my inbox" | Search by number (both spellings on Bonga); read the status and who holds it ([L1-02](05-procedures.md#l1-02-find-a-complaint-and-see-who-holds-it)); escalated complaints move to the next tier's inbox | L1 | Number not found by search at all → L2 (database / persister) S2 if more than one | V03, V08 | [L1-02](05-procedures.md#l1-02-find-a-complaint-and-see-who-holds-it) |
| 5 | **Officer sees too few or no complaints** | "No Results Found for my department" | Status filters; search by number; confirm the officer's department and ward with their supervisor | L2 | Always L2 (HRMS department/jurisdiction, access policy on action 2008) | V12 | [L2-01](05-procedures.md#l2-01-check-an-officers-roles-department-and-jurisdiction) |
| 6 | **Officer sees too much** | "I can see the complainant's phone" (Bomet officer below CSR), "I see other wards" | Screenshot (covered); which role | **L3 / security** | **Immediately** (S1) if personal data is visible to a role that must not see it | V12 | [L3-01](05-procedures.md#l3-01-reproduce-on-cms-pilot-and-hand-over-to-engineering) |
| 7 | **No Take Action / action missing** | "There is no Take Action button", "Escalate is not in the list" | Status vs role table ([§1.4](#14-who-can-act-at-each-status)); escalated complaints belong to the next tier; reload the page | L1 | Role matches the table and the action is still missing after a reload → L2 (workflow roles) | V04, V09 | [L1-05](05-procedures.md#l1-05-take-action-missing-or-failed-to-update-complaint), [L2-04](05-procedures.md#l2-04-check-or-change-the-workflow) |
| 8 | **"Failed to update complaint"** | Toast after Submit in Take Action | Reload (the page refreshes and shows the real status); someone else may have acted first | L1 | Same error twice after a reload → L2; codes `DEPARTMENT_NOT_FOUND`, `INVALID_ASSIGNMENT`, `INVALID ROLE` → L2 then L3 | V04 | [L1-05](05-procedures.md#l1-05-take-action-missing-or-failed-to-update-complaint) |
| 9 | **Reopen / Withdraw / Rate not offered** | "Reopen button missing", "Complaint is closed" | Windows ([§1.5](#15-time-windows-residents-ask-about)); a resident can act only on their own complaint (the CSR can act for them) | L1 | Button shown but the action refused after a reload → L3; the county wants a different window → L2 change request | V05, V09 | [L1-04](05-procedures.md#l1-04-explain-the-reopen-withdraw-and-rating-windows), [L2-03](05-procedures.md#l2-03-check-or-change-the-reopen-and-withdraw-windows) |
| 10 | **Upload rejected** | "File too large", "extension does not match", `413`, "failed a security scan" | Size under 5 MB per file, at most 5 files; type in the accepted list; re-save the photo; on Bonga videos over about 4 MB fail (open issue #137) | L1 | `413` on files under 5 MB → L2 (nginx); "temporarily unavailable" for everyone → L2 urgent (scanner down, uploads fail closed) | V14 | [L1-06](05-procedures.md#l1-06-upload-rejected), [L2-07](05-procedures.md#l2-07-check-an-upload-and-the-virus-scanner) |
| 11 | **Raw text keys on screen** | "It shows `CS_GEOLOCATION_ERROR`", "WITHDRAW in capitals" | Screenshot; language (English / Kiswahili); hard reload | L2 | Always L2 (label upsert + cache-bust); still raw afterwards → L3 | V11 | [L2-02](05-procedures.md#l2-02-add-or-correct-a-label) |
| 12 | **No SMS** | "I never got the complaint number by SMS" | Which event; no SMS is sent by design for Withdraw, Reassign to GRO (Bonga) and Escalate (Bomet); the number on the complaint | L1 | No SMS for any event in a county → L2 urgent (S2) | V13 | [L2-06](05-procedures.md#l2-06-check-sms-and-otp-delivery) |
| 13 | **Escalation questions** | "Never escalated", "escalated after 2 minutes" | Number, category, who holds it; Bomet has 11 categories still on 2-minute test timers (known limitation 8) | L2 | Several levels in one scan, or call-centre complaints never escalating on Bomet → L3 | V18 | [L2-08](05-procedures.md#l2-08-check-the-escalation-job) |
| 14 | **PDF application / Share** | "Share does nothing on my laptop" | Device; on computers Download and Print are the expected options; phones use the share sheet | L1 | Share fails on Android/iPhone after a reload → L3 | V05 | [L1-07](05-procedures.md#l1-07-pdf-application-and-share) |
| 15 | **Page looks old / behaves differently on one device** | "My colleague has the new screen, I don't" | Compare build ids ([L1-08](05-procedures.md#l1-08-check-which-build-the-browser-is-running)); hard reload; clear site data | L1 | Build id differs from the server after a reload → L2 (deploy / cache headers) | V16 | [L1-08](05-procedures.md#l1-08-check-which-build-the-browser-is-running) |
| 16 | **Site down / very slow** | "Bonga does not open" | Try from a second network (mobile data); check the other county's site | L1 → L2 | Immediately (S1) if it fails from two networks | V17 | [L2-09](05-procedures.md#l2-09-health-check-and-safe-restart) |
| 17 | **Dashboard empty or wrong** | "Dashboard shows nothing", "numbers look wrong" | Date range; role (tenant-wide roles only); reload | L1 | Empty for every leadership user → L2 (access control / analytics) | V06 | [L2-05](05-procedures.md#l2-05-grant-or-check-an-access-control-permission) |
| 18 | **Configuration change request** | "Add a category", "change the reopen window", "new officer" | Write down the exact request and who approved it at the county | L2 | Platform cannot express it → L3 | V10, V15 | [L2-02](05-procedures.md#l2-02-add-or-correct-a-label) to [L2-05](05-procedures.md#l2-05-grant-or-check-an-access-control-permission) |

## 1.4 Who can act at each status

**VERIFIED** — read from the live workflow definitions captured read-only on 13 Oct 2026 (`workflow-PGR.json` for `nb` and `bo`); cms-pilot was aligned with Bonga's on 14 Oct.

**Bonga (`nb`)** — two-step intake: the GRO assigns.

| Status (screen wording) | Code | Actions → next status [roles allowed] |
|---|---|---|
| Pending for assignment | `PENDINGFORASSIGNMENT` | Assign → Pending at LME [GRO]; Reject [GRO]; Withdraw → Withdrawn [resident, CSR; within 1 day of filing] |
| Pending at last-mile officer | `PENDINGATLME` | Resolve, Reject, Reassign (same department), Reassign to GRO → Pending for assignment, Escalate → Level 1 [PGR_LME; Escalate also by the escalation job] |
| Escalated (Level 1) | `ESCALATEDLEVEL1` | Resolve, Reject [PGR_LME, CHIEF_OFFICER]; Escalate → Level 2 [CHIEF_OFFICER, escalation job] |
| Escalated (Level 2) | `ESCALATEDLEVEL2` | Resolve, Reject [PGR_LME, CECM]; no further escalation |
| Resolved / Rejected | `RESOLVED`, `REJECTED` | Rate → Closed [resident, CSR]; Reopen → Pending for assignment [resident, CSR, PGR_VIEWER; within 3 days] |
| Closed / Withdrawn | `CLOSEDAFTERRESOLUTION`, `CLOSEDAFTERREJECTION`, `CANCELLED` | none |

**Bomet (`bo`)** — filing goes straight to the department's officer (auto-assignment by the category's department and the ward).

| Status | Code | Actions → next status [roles allowed] |
|---|---|---|
| Pending at last-mile officer | `PENDINGATLME` | Resolve, Reject [PGR_LME]; Escalate → Level 1 [PGR_LME, escalation job]; Withdraw [resident, CSR; within 3 days of filing]. **No Reassign on Bomet.** |
| Escalated (Level 1) | `ESCALATEDLEVEL1` | Resolve, Reject, Escalate → Level 2 [department level-1 roles, e.g. ADMIN_DIRECTOR, HEALTH_DIRECTOR, WATER_CHIEF_OFFICER; PGR_LME] |
| Escalated (Level 2) | `ESCALATEDLEVEL2` | Resolve, Reject, Escalate → Level 3 [level-2 roles, e.g. ADMIN_CHIEF_OFFICER, HEALTH_CHIEF_OFFICER, WATER_CECM; PGR_LME] |
| Escalated (Level 3) | `ESCALATEDLEVEL3` | Resolve, Reject [level-3 roles, e.g. ADMIN_CECM, HEALTH_CECM; PGR_LME] |
| Resolved / Rejected | `RESOLVED`, `REJECTED` | Rate → Closed [resident, CSR]; Reopen → Pending at LME [resident, CSR, PGR_VIEWER; within 3 days] |

Bomet's workflow also defines `PENDINGFORASSIGNMENT` (Assign / Reject by GRO), but filing never leads there.

RECOMMENDATION: read the exact action list for a status from the live workflow ([L2-04](05-procedures.md#l2-04-check-or-change-the-workflow)) before telling an officer an action "should" exist; the workflows are not versioned in the repository (known limitation 21).

## 1.5 Time windows residents ask about

| Window | Bonga | Bomet | Measured from | Where it is set | Status |
|---|---|---|---|---|---|
| Reopen | 3 days | 3 days | the last update (resolution) | `RAINMAKER-PGR.UIConstants` `REOPENSLA` | VERIFIED (live capture 13 Oct) |
| Withdraw | 1 day, only while waiting for assignment | 3 days, while with the officer | filing | `UIConstants` `WITHDRAWSLA` + `actionWindows` | VERIFIED (live capture 13 Oct) |
| OTP validity | 15 minutes | 15 minutes | sending | platform default | VERIFIED (code) |
| OTP resend | after 3 minutes | after 3 minutes | sending | fixed in the app | VERIFIED (code) |
| Escalation check | every 5 minutes | every 5 minutes | — | pgr-services setting | VERIFIED (code) |

The server enforces the reopen and withdraw windows; the buttons disappear at the deadline. A refused action after the deadline is correct behaviour, not a fault.

## 1.6 Known behaviour that is not a fault (answer at L1)

| What the user reports | Answer | Source |
|---|---|---|
| The map pin starts in the middle of the county | Move the pin to the exact spot; the county centre is the starting point | Release known limitation 16 |
| Resolved and rejected complaints appear in Bonga's default inbox | By design on Bonga | Limitation 17 |
| The PDF application shows `0000000000` as the county phone | County helpline not configured yet (L2 change request, `tenant.tenants`) | Limitation 9 |
| No SMS after Withdraw, Reassign to GRO (Bonga) or Escalate (Bomet) | No message template for those events yet | Limitation 10 |
| On Bomet, officers below CSR/Ombudsman see no complainant name or phone | County access policy | Limitation 7 |
| On a computer, the PDF application has Download and Print but no Share | Share is offered in the phone view only (once PR #162 is deployed) | PR #162 |
| A resident with more than 10 complaints sees "Couldn't load your complaints" | Known; depends on a workflow-service page-limit setting not verified on either site | Limitation 3 |
