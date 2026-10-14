# 5. Procedures — step by step

[← Package index](README.md) · [Support matrix](01-support-matrix.md) · [Troubleshooting](04-troubleshooting.md)

Every procedure has the same parts: **Prerequisites → Steps → Verify → Expected outcome → Escalate when**. Each carries a status:

- **VERIFIED** — the steps were carried out (on cms-pilot or read-only on a live site) or read from the code, as noted.
- **RECOMMENDATION** — sensible but not yet carried out end to end; confirm before relying on it, then change the tag.

Server commands assume the Ansible layout (`/opt/digit`, compose project `digit`) and `sudo`. On cms-pilot and the county servers the service ports are **not** published on the host: reach a service through its container IP (`sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' <container>`) or with `sudo docker exec`. Replace `<KONG>` below with `http://<kong-gateway container IP>:8000`.

Never paste a token, password or OpenBao value into a ticket or document. Commands that need a token read it from a shell variable you set yourself.

---

## L1 procedures (eGov support desk)

### L1-01 Take a ticket and collect evidence

**Status:** VERIFIED (process; derived from the CMS V2.12 handbook and the Kenya issue history).

- **Prerequisites:** the ticket; this package; nothing else.
- **Steps**
  1. Record the eight facts in [matrix §1.2](01-support-matrix.md#12-evidence-l1-collects-on-every-ticket).
  2. Cover names, phone numbers and addresses in any screenshot before attaching it.
  3. Set the severity (S1–S4, [matrix §1.1](01-support-matrix.md#11-levels-and-severities)).
  4. Find the matrix row ([§1.3](01-support-matrix.md#13-the-matrix)) and run its L1 checks in order.
  5. Check [§1.6 known behaviour](01-support-matrix.md#16-known-behaviour-that-is-not-a-fault-answer-at-l1) before treating it as a fault.
- **Verify:** the ticket has all eight facts and no uncovered personal data.
- **Expected outcome:** the ticket is answered at L1, or handed to L2 with the evidence ([L1-09](#l1-09-hand-over-to-l2)).
- **Escalate when:** any S1; any row whose "Escalate when" applies.

### L1-02 Find a complaint and see who holds it

**Status:** VERIFIED (cms-pilot, 14 Oct, as GRO EMP130; Bonga read-only, 14 Oct).

- **Prerequisites:** a support or test officer account with complaint search on the county's site (never ADMIN); the complaint number.
- **Steps**
  1. Sign in to the employee site and open the inbox (`/digit-ui/employee/pgr/inbox-v2`).
  2. Search by complaint number. On Bonga, numbers have no zero padding (`BNG-2026-194`); search also accepts the padded form. On Bomet, numbers are six digits (`BFH-2026-000125`) and must be typed exactly.
  3. Open the complaint. Read **Current Status** ([`bonga/15-complaint-details-gro.png`](screenshots/bonga/15-complaint-details-gro.png)).
  4. Scroll to **Complaint Timeline**; the last row is the current step.
  5. Map the status to the role that acts next ([matrix §1.4](01-support-matrix.md#14-who-can-act-at-each-status)).
- **Verify:** you can name the role (and, from the timeline, the officer) that must act next.
- **Expected outcome:** the user knows where the complaint is and who to contact.
- **Escalate when:** the number is not found at all (L2); the status says an officer holds it but it is not in their inbox (L2, [L2-01](#l2-01-check-an-officers-roles-department-and-jurisdiction)).

### L1-03 Help a resident sign in and file

**Status:** VERIFIED (cms-pilot, 14 Oct: five complaints filed through the three steps, CMS-2026-47 to 51; one on a resident's behalf by the CSR).

- **Prerequisites:** the resident's county; never ask for or record the OTP.
- **Steps**
  1. Sign-in: 9-digit mobile number without 0 or +254; the OTP arrives by SMS, is valid 15 minutes, and can be re-sent after 3 minutes.
  2. Step 1: complaint type and sub-type (A–Z; "Others" last).
  3. Step 2: sub-county, ward, then move the map pin to the exact spot.
  4. Step 3: description (required), the terms box (required — Submit stays disabled without it), optional files (up to 5, 5 MB each), optional "Keep details confidential".
  5. Submit; read the complaint number back. The resident also gets it by SMS.
  6. For walk-ins and calls, a CSR files on the resident's behalf from **Create Complaint**, with the resident's phone number and name ([V02](03-storyboards-narration.md#v02--the-front-desk-files-on-a-residents-behalf)).
- **Verify:** the success page shows a complaint number in the county's format.
- **Expected outcome:** complaint filed; status "Pending for assignment" (Bonga) or "Pending at last-mile officer" (Bomet).
- **Escalate when:** OTP missing for several residents (L2 S2); an error code after a reload (L3, with the time).

### L1-04 Explain the reopen, withdraw and rating windows

**Status:** VERIFIED (windows read from the live `UIConstants` on 13 Oct; enforcement verified by the release's automated tests and the QA kits `reopen-window-2026-10-09`, `withdraw-popup-2026-10-09`).

- **Steps:** use [matrix §1.5](01-support-matrix.md#15-time-windows-residents-ask-about):
  - Reopen: within 3 days of the resolution (both counties). Bonga returns it to the GRO; Bomet to the department officer.
  - Withdraw: Bonga within 1 day and only before assignment; Bomet within 3 days; never after a reopen.
  - Rate: any time after resolution or rejection; rating closes the complaint.
- **Verify:** compare the dates on the timeline with the window.
- **Expected outcome:** the resident understands the rule, or a refused action inside the window is escalated.
- **Escalate when:** the action is refused inside the window after a reload (L3); the county asks for different windows (L2 change request, [L2-03](#l2-03-check-or-change-the-reopen-and-withdraw-windows)).

### L1-05 Take Action missing, or "Failed to update complaint"

**Status:** VERIFIED (role table from the live workflows, 13 Oct; Take Action options observed on cms-pilot 14 Oct: GRO at Pending for assignment sees Reject, Assign, Withdraw).

- **Prerequisites:** complaint number; the officer's user name and role.
- **Steps**
  1. Find the current status ([L1-02](#l1-02-find-a-complaint-and-see-who-holds-it)).
  2. Check that the officer's role may act at that status ([matrix §1.4](01-support-matrix.md#14-who-can-act-at-each-status)). Escalated complaints belong to the next tier.
  3. Ask the officer to reload the complaint. After a failed action the page refreshes itself and shows the real status; someone else may have acted first.
  4. If an error code was shown, record it exactly.
- **Verify:** the officer reloads and either sees the action or understands why not.
- **Expected outcome:** most cases end here (wrong tier, already acted on).
- **Escalate when:** the role matches and the action is missing after a reload (L2, [L2-04](#l2-04-check-or-change-the-workflow)); `DEPARTMENT_NOT_FOUND`, `INVALID_ASSIGNMENT` or `INVALID ROLE` (L2, then L3).

### L1-06 Upload rejected

**Status:** VERIFIED (limits and messages from the code; the 5-file / 5 MB limits and accepted formats shown on the cms-pilot form, 14 Oct).

- **Steps**
  1. Ask for the exact message ([troubleshooting §4.6](04-troubleshooting.md#46-attachments)).
  2. Check: at most 5 files, each under 5 MB, type in the list on the form (JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, MP4, MOV, AVI, MKV).
  3. Ask the resident to re-save or export the photo (renamed files fail the format check), or send a shorter video.
- **Expected outcome:** the upload succeeds with a compliant file.
- **Escalate when:** `413` for a file under 5 MB; "temporarily unavailable" for everyone; a genuine file of a listed type is refused.

### L1-07 PDF application and Share

**Status:** VERIFIED for Download/Print/Share on phones (QA kit `share-popup-2026-10-09`, 13/13). The "Share only in the phone view" behaviour is in PR #162 and applies once deployed.

- **Steps:** on a computer use Download or Print. On a phone, Share opens the phone's share sheet with the PDF attached. If the phone cannot share the file, it is downloaded instead and a notice says so.
- **Escalate when:** Share fails on Android or iPhone after a reload (L3).

### L1-08 Check which build the browser is running

**Status:** VERIFIED (code: `digit-ui-esbuild/src/buildRefresh.js`; live build ids captured 13 Oct).

- **Steps**
  1. Open `https://<site>/digit-ui/build-info.json` in a new tab. It shows `{"buildId":"…"}` — the build the server has.
  2. Ask the user to hard reload (Ctrl+F5; on a phone close and reopen the tab).
  3. Open tabs switch to a new build on their own: on load, when the tab returns to the foreground after a minute, and every 5 minutes, at the next main screen.
- **Expected outcome:** after a reload the user has the server's build.
- **Escalate when:** the server's build id is not the one that was deployed (L2).

### L1-09 Hand over to L2

**Status:** VERIFIED (process).

Hand over with: the eight facts; the matrix row; what L1 checked and the result; the severity; the covered screenshots. Use Part A of the incident template ([`docs/2.12/operations/incident-report.md`](../../2.12/operations/incident-report.md)).

---

## L2 procedures (platform operators, county IT)

Live-site changes need a named approver from the county and eGov. Do every change on cms-pilot first.

### L2-01 Check an officer's roles, department and jurisdiction

**Status:** VERIFIED (cms-pilot 14 Oct: HRMS employee search as ADMIN returned roles and current-assignment departments for all 152 employees).

- **Prerequisites:** an account allowed to search HRMS (an MDMS/HR administrator). Read only.
- **Steps**
  1. Configurator → Employees, or the API:
     ```bash
     TOKEN=…   # set it yourself; never paste it into a ticket
     curl -s -X POST "<KONG>/egov-hrms/employees/_search?tenantId=nb&codes=EMP130" \
       -H 'Content-Type: application/json' -d "{\"RequestInfo\":{\"apiId\":\"Rainmaker\",\"authToken\":\"$TOKEN\"}}" \
       | jq '.Employees[] | {code, isActive, roles: [.user.roles[].code], dept: [.assignments[] | select(.isCurrentAssignment) | .department], wards: [.jurisdictions[].boundary]}'
     ```
  2. Compare with what the officer needs: role for the status ([matrix §1.4](01-support-matrix.md#14-who-can-act-at-each-status)); a current assignment with a department; a jurisdiction covering the complaint's ward.
  3. On Bomet, also check that the role is department-scoped as the access policy expects.
- **Verify:** the officer signs out and in, then sees the complaint (check with the officer, not as ADMIN).
- **Expected outcome:** the missing role, department or ward is identified.
- **Escalate when:** the record is right and the officer still cannot see the complaint after 15 minutes and a fresh sign-in (L3).

### L2-02 Add or correct a label

**Status:** VERIFIED (method used for the 14 Oct cms-pilot sync and the 12 Oct Kiswahili push; the cache-bust step was needed on cms-pilot on 14 Oct).

- **Prerequisites:** a `LOC_ADMIN` or SUPERUSER account; the approved wording in English (`en_IN`) and Kiswahili (`sw_KE`); the module (`rainmaker-pgr` or `rainmaker-common`).
- **Steps**
  1. Search the current value:
     `curl -s "<KONG>/localization/messages/v1/_search?tenantId=nb&locale=en_IN&module=rainmaker-pgr" | jq '.messages[] | select(.code=="CS_ACTION_WITHDRAW")'`
  2. Upsert both languages (Configurator → Labels, or `POST /localization/messages/v1/_upsert` with `tenantId`, `locale`, `messages[{code,message,module,locale}]`). **Keep each request under about 8 KB** — larger bodies come back as 401 at the gateway.
  3. Bust the label cache: `curl -s -X POST <KONG>/localization/messages/cache-bust -H 'Content-Type: application/json' -d '{"RequestInfo":{}}'`
  4. Hard reload the browser (labels are kept in the browser for up to a day; a new build drops them automatically).
- **Verify:** the search in step 1 returns the new text, and the screen shows it after a reload.
- **Expected outcome:** words instead of the raw key, in both languages.
- **Escalate when:** still raw after the upsert, cache-bust and reload (L3: the screen may not read that key).

### L2-03 Check or change the reopen and withdraw windows

**Status:** VERIFIED for reading (live capture 13 Oct). Changing: VERIFIED on cms-pilot on 14 Oct (sync from Bonga). Changing a live site: RECOMMENDATION — follow the same steps after cms-pilot.

- **Prerequisites:** the county's written request; `MDMS_ADMIN`.
- **Steps**
  1. Read both the city and the state record:
     `curl -s -X POST <KONG>/mdms-v2/v2/_search -H 'Content-Type: application/json' -d '{"RequestInfo":{},"MdmsCriteria":{"tenantId":"nb","schemaCode":"RAINMAKER-PGR.UIConstants"}}' | jq '.mdms[] | {tenantId, data}'`
  2. Values are milliseconds: 1 day = `86400000`, 3 days = `259200000`.
  3. `REOPENSLA` can be edited in the configurator (PGR UI Constants). `WITHDRAWSLA` and `actionWindows` need `POST /mdms-v2/v2/_update/RAINMAKER-PGR.UIConstants` with the full record.
  4. Wait 60 seconds (complaint service cache).
- **Verify:** on cms-pilot, Reopen just inside and just outside the new window; outside must fail with "Complaint is closed".
- **Expected outcome:** buttons and server checks follow the new window.
- **Escalate when:** `UNIQUE_KEY_UPDATE_ERR` on save (schema not migrated — apply `V20260827000000…sql`, see [`docs/reopen-window.md`](../../reopen-window.md)); every Reopen fails with `INVALID_ACTION_WINDOW_CONFIG` (malformed record — S2).

### L2-04 Check or change the workflow

**Status:** VERIFIED for reading (13 Oct capture; method used for the 7 Oct Bonga sync and the 14 Oct cms-pilot sync). Changing a live site: needs an approver.

- **Steps**
  1. Read: `curl -s -X POST '<KONG>/egov-workflow-v2/egov-wf/businessservice/_search?tenantId=nb&businessServices=PGR' -H 'Content-Type: application/json' -d '{"RequestInfo":{}}' | jq '.BusinessServices[0].states[] | {state, actions: [.actions[]? | {action, roles}]}'`
  2. Save the output before any change: it is your rollback.
  3. Change only through `POST /egov-workflow-v2/egov-wf/businessservice/_update` (role `SUPERUSER` or `WORKFLOW_ADMIN`) with the full edited object. **Never edit the workflow tables directly**: the service caches definitions for about 15 minutes, and `_update` is what clears that cache.
  4. The update is saved asynchronously; search again until the change appears.
- **Verify:** run the changed transition on cms-pilot with a real officer role.
- **Expected outcome:** the action appears for the intended roles only.
- **Escalate when:** the change is refused, or the platform cannot express the request (L3).

### L2-05 Grant or check an access-control permission

**Status:** VERIFIED (grants for the timeline action 2635 applied on both counties, 5 and 9 Oct; access-control role cache of 15 minutes observed). Live change: needs an approver.

- **Steps**
  1. Find the action id for the API path (Configurator → Role permissions, or MDMS `ACCESSCONTROL-ACTIONS-TEST`).
  2. Check the role has it (`ACCESSCONTROL-ROLEACTIONS.roleactions`).
  3. Add the role-action with `MDMS_ADMIN`.
  4. Wait up to 15 minutes, or restart access control: `sudo docker restart egov-accesscontrol` (container name `egov-accesscontrol`; it has no health status — watch `sudo docker logs` for "Started").
- **Verify:** the officer's request no longer returns 403.
- **Escalate when:** the change would open an endpoint to unauthenticated users — that is a security decision (gateway whitelist parity check), not configuration.

### L2-06 Check SMS and OTP delivery

**Status:** VERIFIED (cms-pilot 14 Oct: the configurator's notification log API returned rows with status SENT, SKIPPED for WhatsApp, and the gateway's response; it needs `tenantId` in the query).

- **Steps**
  1. Configurator → Notification log; filter by complaint number, channel SMS. Or `GET /novu-bridge/novu-adapter/v1/logs?tenantId=nb&limit=50` with a Bearer token of an allowed role.
  2. Read the status: **SENT** (gateway accepted), **SKIPPED** (not attempted — e.g. WhatsApp has no provider), **FAILED** (gateway refused; see the error code).
  3. No row for the event: there is no template for that action (Withdraw, Reassign to GRO on Bonga, Escalate on Bomet) — by design today.
  4. Server side: `sudo docker logs --since 1h novu-bridge 2>&1 | grep -E 'FAILED|NB_'`.
- **Verify:** a test complaint on cms-pilot with a test number (`7110001xx`) produces a SENT row.
- **Escalate when:** FAILED rows for every message (gateway credentials or balance — L2 operator with the county); OTP not delivered for anyone (S2).

### L2-07 Check an upload and the virus scanner

**Status:** VERIFIED (code and scanner README). Whether scanning is enabled on either county is NOT VERIFIED (issue #159).

- **Steps**
  1. Is scanning on? `sudo docker ps --filter name=filestore-scan-proxy`.
  2. Scanner events: `sudo docker logs --since 1h filestore-scan-proxy | grep -E 'virus_detected|scan_unavailable|upload_not_scannable'`.
  3. Scanner health: `sudo docker exec digit-clamav clamdcheck.sh`.
  4. Size refusals: `sudo tail -n 200 /var/log/nginx/error.log | grep -i 'too large'` (limit 25 MB at nginx).
- **Expected outcome:** the refusal is explained (size, type, infected, scanner down).
- **Escalate when:** the scanner is down (uploads fail closed — S2); 413 below 25 MB at nginx (L2 nginx config); a listed type refused (L3).

### L2-08 Check the escalation job

**Status:** VERIFIED (log lines and preconditions from the code; Bomet timer values from the 13 Oct capture).

- **Steps**
  1. `sudo docker logs --since 20m digit-pgr-services-1 2>&1 | grep -E 'Escalation scan|Escalated complaint|skipping escalation|No supervisor'`
  2. For one complaint, check: its status is in the scanned states; it has a named assignee; the assignee's HR record has a supervisor (`reportingTo`); the workflow allows Escalate for `SYSTEM` at that status.
  3. Timers: `RAINMAKER-PGR.EscalationConfig` (Bomet: 11 categories at 2-minute test values).
- **Escalate when:** a complaint climbs several levels in one scan; call-centre complaints never escalate on Bomet (L3).

### L2-09 Health check and safe restart

**Status:** VERIFIED (commands from the deploy playbook and runbooks).

- **Steps**
  1. `sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'` — look for `Restarting`, `unhealthy`, `Exited`.
  2. Health through the gateway: loop over `/pgr-services/health`, `/egov-workflow-v2/health`, `/user/health`, `/mdms-v2/health`, `/localization/actuator/health`, `/access/health`.
  3. Before restarting, capture the logs (`sudo docker logs --since 30m <container> > /tmp/<container>.log`).
  4. Restart one service: `sudo docker restart <container>`. To apply a changed setting: `sudo COMPOSE_PROFILES=<list> docker compose <same -f files as the deploy> up -d --no-deps <service>`.
  5. **Never** run `docker compose down -v`, `docker system prune`, or a bare `up -d`.
- **Verify:** the container shows `healthy` and the user's flow works.
- **Escalate when:** a service restarts in a loop (L3 with the logs).

### L2-10 Verify a deploy

**Status:** VERIFIED (checklist from the playbook and `buildRefresh.js`).

1. Record `docker ps` **before** the deploy (rollback point).
2. After: `curl -s https://<site>/digit-ui/build-info.json` matches the build you shipped.
3. Health checks ([L2-09](#l2-09-health-check-and-safe-restart)).
4. Labels: cache-bust if labels shipped; access control: restart if permissions shipped.
5. Smoke flow on cms-pilot (file → assign → resolve with test accounts) — never on a live site.

---

## L3 procedures (engineering)

### L3-01 Reproduce on cms-pilot and hand over to engineering

**Status:** RECOMMENDATION (template; the parts are verified individually).

1. Reproduce on cms-pilot with the same role (a test officer or a non-admin employee — never ADMIN).
2. Record the build id ([L1-08](#l1-08-check-which-build-the-browser-is-running)), the failing request (URL, status, `Errors[0].code`) with personal data removed, and the time.
3. Write the report: county, steps, expected, actual, build id, error code, time, reproduces on cms-pilot (yes/no), severity.
4. File it following `.github/CONTRIBUTING.md` (labels `area:*`, priority).

### L3-02 Ship a fix to a county

**Status:** RECOMMENDATION (branch facts VERIFIED from the release notes).

- **Branches:** Bonga UI builds from `nairobi-prod`; bgrm UI from `nairobi-prod-bgrm-changes` (same app plus the Bomet landing page) — merge non-landing changes into both. bgrm's backend is `feat/bomet-uat` (image `egovio/pgr-services:bomet-uat-6eb6b85` on 13 Oct).
- **Steps:** fix → test on cms-pilot → record `docker ps` on the target → deploy → [L2-10](#l2-10-verify-a-deploy) → keep the previous image tag for rollback (set it back and `up -d --no-deps <service>`). There is no database rollback; check for new migrations before deploying.
