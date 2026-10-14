# 2. Video catalogue — by support level

[← Package index](README.md) · Scripts: [storyboards and narration](03-storyboards-narration.md)

Each video is short (2–6 minutes) and teaches one job. For every video the catalogue states the problem it solves, the audience, what the viewer can do afterwards, and the documents it relies on.

**Status of each video**

| Status | Meaning |
|---|---|
| **RECORDED (silent, captioned)** | Screen recording made on cms-pilot on 14 Oct 2026 by an automated browser, with on-screen captions. Narration still has to be voiced over from the script in [part 3](03-storyboards-narration.md). |
| **STORYBOARD** | Scenes, captions and narration are written; the recording still has to be made by a person, following the storyboard. Several of these show server or configuration screens that must be recorded on cms-pilot, never on a live site. |

Recordings are kept outside the repository (they are large binary files); see [where the recordings are](#where-the-recordings-are).

## L1 — eGov support desk

| ID | Title | Problem it solves | Audience | After watching, the viewer can… | Status | Documents |
|---|---|---|---|---|---|---|
| **V01** | A resident files a complaint (phone) | Desk agents cannot guide a resident through a flow they have never seen | L1, county call centre | Walk a resident through sign-in with OTP, the three filing steps, consent, attachments and the complaint number; explain the PDF application | RECORDED | [L1-03](05-procedures.md#l1-03-help-a-resident-sign-in-and-file), [troubleshooting §4.2](04-troubleshooting.md#42-signing-in-and-filing) |
| **V02** | The front desk files on a resident's behalf | Walk-in and phone complaints are filed wrongly or not at all | L1, CSR staff | File for a resident with their phone number and channel; find the number on the success page | RECORDED | [L1-03](05-procedures.md#l1-03-help-a-resident-sign-in-and-file) |
| **V03** | The GRO assigns a complaint (Bonga) | "Who has my complaint?" — agents do not know the intake step | L1, GRO staff | Read the inbox and filters, open a complaint, Assign to a last-mile officer, recognise Reject | RECORDED | [L1-02](05-procedures.md#l1-02-find-a-complaint-and-see-who-holds-it), [matrix §1.4](01-support-matrix.md#14-who-can-act-at-each-status) |
| **V04** | The officer resolves, escalates or sends back | "There is no Take Action", "Failed to update complaint" | L1, officers | Recognise each officer action and its result: Resolve, Escalate to the next tier, Reassign to GRO; explain why an action is missing | RECORDED | [L1-05](05-procedures.md#l1-05-take-action-missing-or-failed-to-update-complaint) |
| **V05** | The resident rates, reopens or withdraws | "Reopen is missing", "Withdraw does nothing" | L1 | Explain the rating, the 3-day reopen window and the withdraw window, and the PDF application on a phone | RECORDED | [L1-04](05-procedures.md#l1-04-explain-the-reopen-withdraw-and-rating-windows), [L1-07](05-procedures.md#l1-07-pdf-application-and-share) |
| **V06** | Leadership dashboard and export | "The dashboard is empty", "how do I export?" | L1, county leadership | Read the dashboard, change the date range, export to Excel, CSV or PDF | RECORDED | [matrix row 17](01-support-matrix.md#13-the-matrix) |
| **V07** | Taking a ticket: the first five minutes | Tickets reach L2 without the facts needed to act | L1 | Collect the eight evidence items, cover personal data in screenshots, set a severity | STORYBOARD | [L1-01](05-procedures.md#l1-01-take-a-ticket-and-collect-evidence), [matrix §1.2](01-support-matrix.md#12-evidence-l1-collects-on-every-ticket) |
| **V08** | Reading a complaint: status, timeline and who holds it | Agents guess where a complaint is | L1 | Find a complaint by number (both spellings on Bonga), read the timeline and status, name the role that must act next | STORYBOARD (uses recorded screens) | [L1-02](05-procedures.md#l1-02-find-a-complaint-and-see-who-holds-it) |
| **V09** | "Why can't I…?" — windows and roles | Correct behaviour is reported as a fault | L1 | Answer the five most common "missing button" questions from the role and window tables | STORYBOARD | [matrix §1.4–1.6](01-support-matrix.md#14-who-can-act-at-each-status) |

## L2 — platform operators and county IT

All L2 videos are recorded on **cms-pilot** with test data. They show where a setting lives and how to check it; changes on a live site follow the written procedure and need an approver.

| ID | Title | Problem it solves | Audience | After watching, the viewer can… | Status | Documents |
|---|---|---|---|---|---|---|
| **V10** | Configurator tour (read-only) | Operators do not know where settings live | L2 | Find complaint types, labels, role permissions, the workflow, employees, tenants and the notification log in the configurator | STORYBOARD (screenshots captured) | [L2-01](05-procedures.md#l2-01-check-an-officers-roles-department-and-jurisdiction) to [L2-06](05-procedures.md#l2-06-check-sms-and-otp-delivery) |
| **V11** | Fixing a raw label on screen | `CS_…` keys shown to residents | L2 | Find the missing key, upsert it in English and Kiswahili, bust the label cache, verify | STORYBOARD | [L2-02](05-procedures.md#l2-02-add-or-correct-a-label) |
| **V12** | An officer sees too few or too many complaints | Department, ward and access-policy problems | L2 | Check an officer's roles, department and jurisdiction; read the action-2008 policy; know the 15-minute cache | STORYBOARD | [L2-01](05-procedures.md#l2-01-check-an-officers-roles-department-and-jurisdiction), [L2-05](05-procedures.md#l2-05-grant-or-check-an-access-control-permission) |
| **V13** | SMS and OTP not received | Residents get no messages | L2 | Read the delivery log (SENT / SKIPPED / FAILED), tell a gateway problem from a "no template" case | STORYBOARD | [L2-06](05-procedures.md#l2-06-check-sms-and-otp-delivery) |
| **V14** | Upload rejected | Photos and videos refused | L2 | Separate client limits (5 MB, 5 files, types) from nginx 413 and the virus scanner; read the scanner log | STORYBOARD | [L2-07](05-procedures.md#l2-07-check-an-upload-and-the-virus-scanner) |
| **V15** | Changing the reopen or withdraw window | County asks for a different window | L2 | Read `UIConstants` for the city and state record, change it with the right role, wait out the 60-second cache, verify on cms-pilot | STORYBOARD | [L2-03](05-procedures.md#l2-03-check-or-change-the-reopen-and-withdraw-windows) |

## L3 — engineering

| ID | Title | Problem it solves | Audience | After watching, the viewer can… | Status | Documents |
|---|---|---|---|---|---|---|
| **V16** | Reproducing a defect on cms-pilot and handing it over | Defect reports that cannot be reproduced | L2, L3 | Reproduce with a test officer, record the build id and request, write a defect report that engineering can act on | STORYBOARD | [L3-01](05-procedures.md#l3-01-reproduce-on-cms-pilot-and-hand-over-to-engineering), [L1-08](05-procedures.md#l1-08-check-which-build-the-browser-is-running) |
| **V17** | Deploy verification and rollback | A deploy that half-works | L2, L3 | Run the post-deploy checklist (build id, health, smoke flow) and roll back UI or backend | STORYBOARD | [L2-09](05-procedures.md#l2-09-health-check-and-safe-restart), [L3-02](05-procedures.md#l3-02-ship-a-fix-to-a-county) |
| **V18** | Escalation job diagnostics | "Never escalated" / "escalated too fast" | L2, L3 | Read the escalation log lines, the timers in `EscalationConfig`, and the preconditions per complaint | STORYBOARD | [L2-08](05-procedures.md#l2-08-check-the-escalation-job) |

## Suggested viewing order

| Role | Watch |
|---|---|
| New L1 agent (day 1) | V07 → V01 → V02 → V03 → V04 → V05 → V08 → V09 → V06 |
| New L2 operator | All L1 videos, then V10 → V12 → V11 → V15 → V13 → V14 → V18 → V17 |
| L3 engineer joining support rotation | V08, V09, V12, then V16 → V17 → V18 |

## Where the recordings are

The recorded videos (WebM, silent, with burned-in captions) were produced by the cms-pilot capture script and are kept with the QA kit, not in git:

| Video | File |
|---|---|
| V01 | `01-resident-files-a-complaint.webm` |
| V02 | `02-staff-files-on-behalf.webm` |
| V03 | `03-gro-assigns.webm` |
| V04 | `04-officer-works-complaints.webm` |
| V05 | `05-resident-rates-reopens-withdraws.webm` (rate and withdraw) and `05b-resident-reopens.webm` (the two-step reopen) |
| V06 | `06-dashboard-export.webm` — trim the last scene (the role-tiered home `/employee/home-v2`, not released) before use |

**Before sharing any recording outside eGov:** recordings V01–V06 were made before on-screen redaction was added, so they show the test resident's name and the names of cms-pilot officers (cms-pilot's officer list mirrors real county staff). `05b-resident-reopens.webm` and all screenshots in this folder were taken with every name and phone number replaced on screen. Re-record V01–V06 with the redacting capture, or review them frame by frame, before external use.

RECOMMENDATION: once narrated, publish the final videos to the team's shared drive or as release assets, and add the links to this table. Keep the recordings out of the repository.

## Content rules for anyone recording

1. Record on **cms-pilot** with the test accounts (TESTCSR, TESTGRO, TESTLME, TESTCHIEF) and the test resident numbers `7110001xx` only. cms-pilot sends real SMS.
2. Never record a live site's complaint list or details unless every name, phone number and address is masked.
3. Never show a password, token, OpenBao value or `.env` content on screen. Type passwords off camera.
4. Use the county's language settings as residents see them; record English first, Kiswahili subtitles later.
5. Keep captions short (one line, plain words) and leave each caption on screen for at least two seconds.
