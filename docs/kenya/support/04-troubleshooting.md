# 4. Troubleshooting guide — symptoms, screens and messages

[← Package index](README.md) · [Support matrix](01-support-matrix.md) · [Procedures](05-procedures.md)

Use this guide when a user reports something specific. Each section shows what the user sees, what it means, what L1 does, and when to escalate. Screenshots: `bonga/` images are from the live site (masked), `cms-pilot/` images from the test twin.

## 4.1 Reading what is on screen

| What the user sees | What it means | Owner |
|---|---|---|
| Words in capitals with underscores (`CS_GEOLOCATION_ERROR`, `WITHDRAW`) | A label is missing for that language. The function usually still works. **VERIFIED:** on cms-pilot on 14 Oct the GRO's Take Action menu showed `WITHDRAW` as a raw key next to "Reject" and "Assign". | L2 ([L2-02](05-procedures.md#l2-02-add-or-correct-a-label)) |
| A toast "Failed to update complaint" | The Take Action request was refused. The page reloads the complaint, so the timeline shows the real status. | L1 ([L1-05](05-procedures.md#l1-05-take-action-missing-or-failed-to-update-complaint)) |
| The sign-in page appears in the middle of work | The session expired (or a 401 came back). Drafts are kept; sign in again. | L1 |
| "Another account signed in" notice | Someone signed in to a different account in another tab of the same browser (shared desk). Nothing was logged out. | L1 — explain |
| "Something went wrong" full page | The app could not load a page it needed. | L1 reload; L2 if it persists |
| "Under maintenance" page | The site is being updated, or the core services are down. | L2 if unplanned (S1) |
| "Working context unavailable" in the top bar | The officer's HR record could not be read. | L2 ([L2-01](05-procedures.md#l2-01-check-an-officers-roles-department-and-jurisdiction)) |

Error messages and the codes behind them are listed in [§4.9](#49-message-catalogue).

## 4.2 Signing in and filing

| | |
|---|---|
| Screens | Resident sign-in [`cms-pilot/06-citizen-login-phone.png`](screenshots/cms-pilot/06-citizen-login-phone.png); live Bonga [`bonga/06-citizen-login-phone.png`](screenshots/bonga/06-citizen-login-phone.png); officer sign-in [`bonga/03-employee-login.png`](screenshots/bonga/03-employee-login.png); filing steps [`cms-pilot/41-…`](screenshots/cms-pilot/41-create-step1-phone.png), [`42-…`](screenshots/cms-pilot/42-create-step2-phone.png), [`43-…`](screenshots/cms-pilot/43-create-step3-phone.png) |
| Video | [V01](03-storyboards-narration.md#v01--a-resident-files-a-complaint-phone), [V02](03-storyboards-narration.md#v02--the-front-desk-files-on-a-residents-behalf) |

| Symptom | Likely cause | L1 action | Escalate |
|---|---|---|---|
| "Enter a valid mobile number" | Number typed with 0 or +254, or not 9 digits | Type 9 digits starting with 7 or 1 (e.g. `712345678`) | — |
| OTP never arrives | Network delay; wrong number; gateway problem | Wait 3 minutes and press Resend; confirm the number | Nobody in the county receives OTPs → L2 S2 ([L2-06](05-procedures.md#l2-06-check-sms-and-otp-delivery)) |
| "Invalid OTP" | Old code, or typed wrong | Use the latest code within 15 minutes | — |
| Submit button stays grey on step 3 | Terms box not ticked, or the description is empty | Tick the terms box; write a description | — |
| "File is too large (max 5 MB)" / "You can upload up to 5 files" | Client-side limits | Smaller file; fewer files | — |
| Ward list empty or the pin "is wrong" | The map starts at the county centre (by design) | Choose the sub-county first, then the ward; drag the pin | Ward missing from the list → L2 (boundary data) |
| Staff filing fails: `FAILED_TO_CREATE_COMPLAINT` (or a raw code) | Backend refusal: missing phone/name, ward not chosen, category not valid | Re-check phone, name, category, ward; note the time | Persists after a reload → L3 with the time; `INVALID_CASE_RELATED_TO` → L2 (old backend image) |
| Officer: "Invalid login credentials" | Wrong password or wrong city | Check the city field and caps lock; use Forgot Password | Account locked or reset fails → L2 |

## 4.3 Finding a complaint

| Symptom | Likely cause | L1 action | Escalate |
|---|---|---|---|
| Search finds nothing | Typo; zero padding (Bonga numbers have none: `BNG-2026-125`); wrong county | Retype exactly; try the other county's site | Number valid but missing on both → L2 (S2 if several) |
| "It's not in my inbox" | Someone else holds it: another tier after escalation, the GRO after a send-back, the resident after resolution | Read **Current Status** and the timeline ([`bonga/15-complaint-details-gro.png`](screenshots/bonga/15-complaint-details-gro.png)); match it to [matrix §1.4](01-support-matrix.md#14-who-can-act-at-each-status) | Status says the officer should hold it but it is not in their inbox → L2 (department / jurisdiction) |
| Resident: "Couldn't load your complaints" | Known issue with more than 10 complaints (limitation 3) | Ask how many complaints they have filed; give them the number to search for | L2 to check the workflow page-limit setting |

## 4.4 Officer actions

| | |
|---|---|
| Screens | Take Action and dialogs: [`cms-pilot/18-assign-dialog-list.png`](screenshots/cms-pilot/18-assign-dialog-list.png), [`19-reject-dialog`](screenshots/cms-pilot/19-reject-dialog.png), `34-resolve-dialog` *(screenshot to follow)*, `35-escalate-dialog` *(screenshot to follow)*, `36-reassign-to-gro-dialog` *(screenshot to follow)* |
| Video | [V03](03-storyboards-narration.md#v03--the-gro-assigns-a-complaint-bonga), [V04](03-storyboards-narration.md#v04--the-officer-resolves-escalates-or-sends-back) |

| Symptom | Likely cause | L1 action | Escalate |
|---|---|---|---|
| No Take Action button | Role does not match the current status (see [matrix §1.4](01-support-matrix.md#14-who-can-act-at-each-status)); the complaint was escalated | Explain who holds it now | Role matches and button missing after a reload → L2 ([L2-04](05-procedures.md#l2-04-check-or-change-the-workflow)) |
| Assign list does not show the officer | Only active last-mile officers (PGR_LME) are listed | Confirm the officer's role and that they are active | Officer has PGR_LME and is active → L2 ([L2-01](05-procedures.md#l2-01-check-an-officers-roles-department-and-jurisdiction)) |
| "Failed to update complaint" | Someone acted first; the officer lost the role at this status; a backend code | Reload and read the status | Repeats after a reload, or codes `DEPARTMENT_NOT_FOUND` / `INVALID_ASSIGNMENT` / `INVALID ROLE` → L2, then L3 |
| The comment box shows another complaint's text | Fixed in this release (#147) | Reload | Recurs → L3 |
| Reassign to GRO missing on Bomet | It exists on Bonga only | Explain | — |

## 4.5 Resident follow-up: rate, reopen, withdraw, PDF

| | |
|---|---|
| Screens | [`cms-pilot/46-my-complaints-phone.png`](screenshots/cms-pilot/46-my-complaints-phone.png), [`47-complaint-details-phone`](screenshots/cms-pilot/47-complaint-details-phone.png), [`50-rate-page-phone`](screenshots/cms-pilot/50-rate-page-phone.png), [`52-reopen-reason-phone`](screenshots/cms-pilot/52-reopen-reason-phone.png), `53-reopen-details-phone` *(screenshot to follow)*, [`54-withdraw-confirm-phone`](screenshots/cms-pilot/54-withdraw-confirm-phone.png) |
| Video | [V05](03-storyboards-narration.md#v05--the-resident-rates-reopens-or-withdraws) |

| Symptom | Likely cause | L1 action | Escalate |
|---|---|---|---|
| Reopen missing | More than 3 days since the resolution | Explain; the resident can file a new complaint quoting the old number | County wants a longer window → L2 change request ([L2-03](05-procedures.md#l2-03-check-or-change-the-reopen-and-withdraw-windows)) |
| "Complaint is closed" on Reopen | Window passed while the page was open | As above | Refused well inside the window → L3 |
| Withdraw missing | Bonga: more than 1 day, or already assigned; Bomet: more than 3 days; or the complaint was reopened | Explain the rule | Offered but refused inside the window → L3 |
| "Couldn't withdraw the complaint" | Window ended, not the owner, or wrong status | Reload and check the status | Repeats → L3 |
| Share does nothing on a computer | Share is for phones; Download and Print are the computer options | Use Download | Share fails on a phone → L3 |
| PDF shows `0000000000` as the county phone | County helpline not configured (limitation 9) | Explain | L2 change request |

## 4.6 Attachments

| Message | Meaning | L1 action | Escalate |
|---|---|---|---|
| "File is too large (max 5 MB)." | Client limit; nothing was sent | Smaller file | — |
| "Request failed with status code 413" | The web server refused the size | Note the file size | File under 5 MB → L2 ([L2-07](05-procedures.md#l2-07-check-an-upload-and-the-virus-scanner)) |
| "extension does not match the file format" | The file's content does not match its name (renamed file) | Re-save or export the photo normally | Genuine photo refused → L2 |
| "This file failed a security scan." | Virus scanner found something (only when scanning is on) | Ask for a different file; do not ask them to resend the same one | Many reports in a short time → L2 |
| "File upload is temporarily unavailable." | Scanner down or starting; uploads are refused, not let through | Retry in 10 minutes | Everyone affected → L2 S2 |
| Video over about 4 MB fails on Bonga | Open issue #137 | Shorter clip | Already tracked |

## 4.7 Notifications

| Symptom | Likely cause | L1 action | Escalate |
|---|---|---|---|
| No SMS after filing | Wrong number on the complaint; network; gateway | Check the number (last 3 digits only in the ticket) | Several residents → L2 S2 ([L2-06](05-procedures.md#l2-06-check-sms-and-otp-delivery)) |
| No SMS after Withdraw / Reassign to GRO (Bonga) / Escalate (Bomet) | No message template for those events (limitation 10) | Explain | — |
| SMS wording wrong | Template text | Copy the exact wording | L2 (notification template) |

## 4.8 Site and browser

| Symptom | Likely cause | L1 action | Escalate |
|---|---|---|---|
| Two people see different screens | One browser is on an older build | Compare build ids ([L1-08](05-procedures.md#l1-08-check-which-build-the-browser-is-running)); hard reload | Server build differs from what was deployed → L2 |
| Site does not open | Network, or site down | Try mobile data; try the other county's site | Fails on two networks → L2 S1 ([L2-09](05-procedures.md#l2-09-health-check-and-safe-restart)) |
| Very slow; pages stay on the loading dots | Server load or network path | Note the time and page; try again | Many users or more than 15 minutes → L2 S2. **Observed 14 Oct:** Bonga stopped responding from one network for several minutes at a time, then answered in about 1 s again |

## 4.9 Message catalogue

The most common messages, what triggers them and who acts. Source: the code on `nairobi-prod` (`products/pgr/src/**`, `backend/pgr-services/**`, `backend/filestore-scan-proxy/**`, `local-setup/kong/kong.yml`). **VERIFIED** from code; whether each label is seeded on a live site is not verified unless stated.

| On screen (or code) | Trigger | Owner |
|---|---|---|
| "This file failed a security scan." (`CS_FILE_VIRUS_DETECTED`) | Scanner: `400 VIRUS_DETECTED` | L1 / L2 |
| "This file could not be checked…" (`CS_FILE_NOT_SCANNABLE`) | Password-protected or too complex file | L1 |
| "File upload is temporarily unavailable." (`CS_FILE_SCAN_UNAVAILABLE`) | Scanner `503 SCAN_UNAVAILABLE` | L2 |
| "The window for reopening this complaint has closed" (`CS_CANNOT_REOPEN_COMPLAINT_PAST_DEADLINE`) | Reopen after `REOPENSLA` | L1 |
| "Couldn't withdraw the complaint." (`CS_WITHDRAW_FAILED`) | Withdraw refused (window, owner, status) | L1 |
| `CS_GEOLOCATION_*` shown as raw keys | Location permission / timeout; labels not seeded on either site (issues #54, #55) | L2 labels |
| "Couldn't load your complaints" | My Complaints search failed — often `WORKFLOW_NOT_FOUND` with more than 10 complaints | L2 |
| `FAILED_TO_CREATE_COMPLAINT` | Staff filing refused by the backend | L1 → L3 |
| `FAILED_TO_UPDATE_COMPLAINT` / "Failed to update complaint" | Take Action refused | L1 → L2 |
| `CS_COMMON_EMPLOYEE_FETCH_ERROR` (raw) | Assign picker could not load officers | L2 |
| "Working context unavailable" | `/employee/_context` failed | L2 |
| `INVALID_ACTION` "Complaint is closed" / "…withdrawal period has ended" | Server-side window check | L1 |
| `INVALID_ACTION_WINDOW_CONFIG` | The window settings are malformed: every Reopen/Withdraw fails | L2 S2 |
| `INVALID_ASSIGNMENT` | Assignee's department does not match (in practice Bomet) | L2 |
| `DEPARTMENT_NOT_FOUND` | Assignee has no active HR department | L2 |
| `WORKFLOW_NOT_FOUND` | Workflow page limit / missing workflow record | L2 |
| `IDGEN ERROR` | Complaint number could not be generated | L2 S2 |
| HTTP 401 "Authentication required" on a large save | Gateway body-size trap (~8 KB) on admin/label saves | L2 (batch the save) |
| HTTP 403 "You are not authorized to perform this action" | The role lacks the API permission (access control) | L2 ([L2-05](05-procedures.md#l2-05-grant-or-check-an-access-control-permission)) |
| HTTP 503 "Could not verify authentication" | User service unreachable | L2 S1/S2 |

## 4.10 Personal data seen where it should not be

Treat as **S1 security** and escalate to L3 at once, with the complaint number, the officer's user name and role, the time, and a screenshot with the data covered:

- a resident sees officer names, phone numbers or internal comments in the timeline;
- on Bomet, an officer below CSR / Ombudsman sees a complainant's name or phone;
- a complaint marked confidential shows the complainant's details to an officer who should not see them.

Do not forward the uncovered screenshot to anyone.
