# CMS Kenya V2.12 — support enablement package

This package equips the people who support the two live CMS Kenya sites:

| Site | County | Tenant | Address |
|---|---|---|---|
| **Bonga Nai** | Nairobi City County | `nb` | https://bonga.nairobi.go.ke |
| **Bomet Feedback Hub** (bgrm) | Bomet County | `bo` | https://bgrm.bomet.go.ke |
| cms-pilot (test twin of Bonga) | — | `nb` | https://cms-pilot.digit.org |

It is written for three support levels:

| Level | Who | Works from | Typical action |
|---|---|---|---|
| **L1** | eGov support desk | A browser and the ticket | Recognise the problem, guide the user, collect evidence, escalate |
| **L2** | eGov platform / county IT operators | Server, configurator, APIs, database (read) | Configuration, data, roles, caches, restarts |
| **L3** | eGov engineering | Code and builds | Defects that survive a reload and correct configuration |

The rule from the CMS V2.12 operations handbook applies unchanged: *if there is a screen for it, it is L1; if it needs the server, a log, a database or a configuration file, it is L2; if it needs a code change, it is L3.*

## The seven parts

| # | Document | What it answers |
|---|---|---|
| 1 | [Support matrix](01-support-matrix.md) | Which level owns an issue type, what L1 checks first, and when to escalate |
| 2 | [Video catalogue](02-video-catalogue.md) | Which training video to watch, by level: the problem it solves, the audience and the outcome |
| 3 | [Storyboards and narration](03-storyboards-narration.md) | Scene-by-scene storyboards and English narration scripts for every video |
| 4 | [Troubleshooting guide](04-troubleshooting.md) | Symptoms with screenshots, on-screen messages and what they mean, linked to the videos |
| 5 | [Procedures](05-procedures.md) | Step-by-step tasks: prerequisites, steps, verification, expected outcome, escalation |
| 6 | [Knowledge-transfer guide](06-knowledge-transfer.md) | A five-session plan to bring a new support engineer up to speed, with exercises |
| 7 | [Traceability matrix](07-traceability-matrix.md) | Every release change → its test evidence → the video → the procedure |

**Single-page version:** open [`support-package.html`](support-package.html) in a browser (from a checkout or a downloaded copy of this folder) to read all seven parts with the screenshots inline. It is generated from these Markdown files; edit the Markdown, not the HTML.

A [screen gallery](screenshots/README.md) shows every captured screen by journey. Screenshots are in [`screenshots/`](screenshots/): `screenshots/bonga/` from live Bonga (taken read-only, with personal data masked), `screenshots/cms-pilot/` from the test twin, where test complaints were worked through the whole workflow.

## How to read the status tags

Every procedure, check and claim carries one of these tags:

| Tag | Meaning |
|---|---|
| **VERIFIED** | Observed on a live site or cms-pilot on 13–14 Oct 2026, or read directly from the code on `nairobi-prod`. The source is named. |
| **RECOMMENDATION** | Sensible practice or an inference that has **not** been confirmed. Confirm it before relying on it, and update the tag when you do. |
| **NOT VERIFIED** | A fact this package needs but could not establish (for example a server setting nobody has read). Listed so nobody assumes it. |

## Related documents (read these too, do not duplicate them)

| Document | Use |
|---|---|
| [`docs/2.12/operations/`](../../2.12/operations/README.md) | The CMS V2.12 operations handbook: L1 first response, L2 diagnosis, cheat sheet, known issues, incident report template, dashboards and alerts. Product-generic; this package adds the Kenya specifics. |
| [`docs/2.12/jurisdiction-access-control.md`](../../2.12/jurisdiction-access-control.md) | Who sees which complaints (action 2008 scope rules). |
| [`docs/reopen-window.md`](../../reopen-window.md) | How the reopen window is configured and enforced. |
| [`backend/filestore-scan-proxy/README.md`](../../../backend/filestore-scan-proxy/README.md) | Virus scanning of uploads (off by default). |
| `docs/kenya/RELEASE-NOTES-CMS-KENYA-V2.12.md` and `RELEASE-PREVIEW-CMS-KENYA-V2.12.md` | The release body and its evidence, including the 25 known limitations. These arrive with the release-notes pull request (#160). |

## Rules that apply to everyone

1. **Treat all complaint data as personal data.** Never paste a resident's name, phone number or address into a ticket, chat or screenshot. Use the complaint number.
2. **Test on cms-pilot, not on the live sites.** Anything that files, assigns or resolves a complaint on Bonga or bgrm creates real records and sends real SMS. cms-pilot also sends real SMS: use the agreed test numbers (`7110001xx`) only.
3. **Never test officer screens as ADMIN.** ADMIN holds every role, so a check that passes as ADMIN proves nothing about what a real officer sees. Use the officer's own account or a test officer.
4. **Passwords and tokens never go into tickets, documents or scripts.** Report *which* secret and *where*, never its value.
5. **Write changes on live sites only with a named approver.** Every L2 procedure that changes a live site says so at the top.

## How this package was produced

- Screenshots of Bonga were taken on 14 Oct 2026 with a script that blocks every write request in the browser, signed in as the test officers EMP130 (GRO + CSR) and EMP048 (last-mile officer). Personal data on screen was blurred before each shot. A person must still review every Bonga image before it is published.
- The workflow videos and screenshots were recorded on cms-pilot on 14 Oct 2026 with the test accounts TESTCSR, TESTGRO, TESTLME and a test resident, after cms-pilot was aligned with Bonga's workflow, reopen/withdraw windows and access rules the same day.
- Facts about the code come from `nairobi-prod` at `32a56d27d` (13 Oct 2026). Facts about the live sites come from a read-only capture taken on 13 Oct 2026.
- The capture scripts live with the QA kit, not in this repository: `capture-bonga.js` (read-only, Bonga) and `flows-cmspilot.js` (writes, cms-pilot only).
