# 6. Knowledge-transfer guide

[← Package index](README.md)

A five-session plan to bring a new support engineer from zero to handling CMS Kenya tickets on their own. Each session is about two hours: one hour of material, one hour of hands-on exercises on **cms-pilot**. L1 agents need sessions 1–3; L2 operators all five; L3 engineers sessions 1, 4 and 5.

## Before session 1

| Item | Who provides it |
|---|---|
| A personal cms-pilot officer account (never a shared ADMIN) | eGov platform team |
| The test resident numbers to use (`7110001xx`) — cms-pilot sends **real** SMS | eGov platform team |
| Read access to the ticket queue | Support lead |
| For L2: SSH access to cms-pilot and the county servers, sudo, and an OpenBao reader role | Platform lead, with county approval |
| Read this package's [README](README.md) and [support matrix](01-support-matrix.md) | The trainee |

## Session 1 — The system and the two counties (everyone)

**Material**

- What CMS is: residents report problems with county services, officers work them, leadership watches the dashboard. Built on DIGIT; this release is CMS V2.12 with Kenya changes.
- The sites: Bonga Nai (Nairobi, tenant `nb`) and Bomet Feedback Hub (tenant `bo`); cms-pilot is Bonga's test twin. Both counties run the same application code (`nairobi-prod`); only the landing pages differ, and Bomet's backend is a separate build.
- The key differences ([matrix §1.4](01-support-matrix.md#14-who-can-act-at-each-status)):

| | Bonga | Bomet |
|---|---|---|
| Intake | GRO assigns each new complaint | Goes straight to the department officer |
| Escalation | Chief Officer, then CECM | Three department levels |
| Withdraw | 1 day, before assignment | 3 days |
| Complaint number | `BNG-2026-125` | `BFH-2026-000125` |
| Reassign to GRO | Yes | No |
| Complainant name/phone for officers | Shown to officers in scope | Hidden below CSR / Ombudsman |

- Watch: [V01](02-video-catalogue.md#l1--egov-support-desk), V02, V03.

**Exercises (cms-pilot)**

1. As a test resident, file a complaint on a phone-size browser window. Note the complaint number.
2. As a CSR, file one on the resident's behalf.
3. Find both complaints by number in the inbox and state who holds each one.

## Session 2 — Officer work and resident follow-up (everyone)

**Material**

- The status → role table; why "no Take Action" is usually correct behaviour.
- Reopen, withdraw and rating windows ([matrix §1.5](01-support-matrix.md#15-time-windows-residents-ask-about)).
- The PDF application: Download, Print; Share on phones.
- Watch: V04, V05, V08, V09.

**Exercises**

1. As GRO, assign your session-1 complaint to a last-mile officer. As that officer, resolve it.
2. As the resident, rate it. Then file another, have it resolved, and reopen it. Where does it go?
3. File a third complaint and withdraw it as the resident. Try to withdraw one that is already assigned — what happens on Bonga?
4. Answer these as if on the phone: "My Reopen button is gone", "I can't Escalate", "Share does nothing on my laptop".

## Session 3 — Taking tickets (L1)

**Material**

- The eight evidence items; covering personal data; severities S1–S4; the hand-over to L2 ([L1-01](05-procedures.md#l1-01-take-a-ticket-and-collect-evidence), [L1-09](05-procedures.md#l1-09-hand-over-to-l2)).
- The troubleshooting guide, section by section ([part 4](04-troubleshooting.md)).
- What counts as S1: site down, nobody can sign in, personal data exposed ([§4.10](04-troubleshooting.md#410-personal-data-seen-where-it-should-not-be)).
- Watch: V07, V06.

**Exercises** — the trainer plays the user; the trainee writes the ticket:

1. "I filed yesterday and can't find my complaint." (Expected: number, search, status, holder.)
2. "There's a strange code `CS_GEOLOCATION_ERROR` when I press Use my location." (Expected: screenshot, language; L2 label ticket.)
3. "I'm a Bomet health officer and I can see the complainant's phone number." (Expected: S1 security escalation, data covered.)
4. "Nobody in our office receives the SMS." (Expected: S2, L2, event and time.)

**Sign-off for L1:** the trainee handles exercises 1–4 correctly, using only the matrix and the troubleshooting guide.

## Session 4 — Configuration and data (L2)

**Material**

- Where settings live ([V10](02-video-catalogue.md#l2--platform-operators-and-county-it)): complaint types, labels, permissions, workflow, employees, tenants, notification log.
- The caches and how to clear them:

| Cache | Lasts | Clear by |
|---|---|---|
| Workflow definitions | ~15 min | Change only through `_update` (it clears the cache) |
| Access-control role permissions | ~15 min | Wait, or `sudo docker restart egov-accesscontrol` |
| Labels on the server | until cleared | `POST /localization/messages/cache-bust` |
| Labels in the browser | up to a day | Automatic on a new build; or a hard reload |
| Reopen/withdraw windows in the complaint service | 60 s | Wait a minute |

- The 8 KB gateway trap on large saves (401 "Authentication required"): batch label uploads.
- Live changes need a named approver; do everything on cms-pilot first; save the "before" state as the rollback.
- Watch: V11, V12, V13, V15.

**Exercises (cms-pilot only)**

1. Look up an officer's roles, department and wards ([L2-01](05-procedures.md#l2-01-check-an-officers-roles-department-and-jurisdiction)).
2. Find a raw label on cms-pilot (the Take Action menu showed `WITHDRAW` and `REASSIGNTOGRO` on 14 Oct). Write the upsert for English and Kiswahili and the cache-bust call — **do not run it** without the platform lead.
3. Read the reopen and withdraw windows for `nb` (city and state record) and convert them to days.
4. Read the notification log for the complaints you filed and explain each status.
5. Read the Bonga-shaped workflow on cms-pilot and draw it as a diagram. Compare it with the table in the matrix.

## Session 5 — Servers, deploys and defects (L2, L3)

**Material**

- Service map: the gateway (Kong) → complaint service (pgr-services) → workflow, users, HR, MDMS, labels, files (with the optional virus scanner), notifications (novu-bridge). The CMS V2.12 handbook covers each in depth ([`docs/2.12/operations/`](../../2.12/operations/README.md)).
- Container names on the Ansible layout: most are `digit-<service>-1`; some keep their own name (`egov-accesscontrol`, `docker-postgres`, `kong-gateway`, `novu-bridge`). Ports are not published on the host — use container IPs or `docker exec`.
- Health checks, safe restarts and the commands never to run ([L2-09](05-procedures.md#l2-09-health-check-and-safe-restart)).
- Deploy verification and rollback; build ids; branches per county ([L2-10](05-procedures.md#l2-10-verify-a-deploy), [L3-02](05-procedures.md#l3-02-ship-a-fix-to-a-county)).
- The escalation job ([L2-08](05-procedures.md#l2-08-check-the-escalation-job)).
- Writing a defect report engineering can act on ([L3-01](05-procedures.md#l3-01-reproduce-on-cms-pilot-and-hand-over-to-engineering)).
- Watch: V14, V16, V17, V18.

**Exercises (cms-pilot)**

1. List the running containers and their images; save it as a rollback record.
2. Run the health loop through the gateway.
3. Find the last "Escalation scan complete" line and explain the numbers.
4. Take one ticket from session 3 and write the L3 defect report for it.

**Sign-off for L2:** the trainee completes sessions 4 and 5 exercises and shadows two live L2 tickets.

## Reference card

| Need | Where |
|---|---|
| Who owns this issue? | [Support matrix](01-support-matrix.md) |
| What does this message mean? | [Troubleshooting §4.9](04-troubleshooting.md#49-message-catalogue) |
| How do I do X? | [Procedures](05-procedures.md) |
| What changed in this release, and was it tested? | [Traceability matrix](07-traceability-matrix.md) |
| Generic operations (Grafana, logs, alerts, incident template) | [`docs/2.12/operations/`](../../2.12/operations/README.md) |
| Release notes and known limitations | `docs/kenya/RELEASE-NOTES-CMS-KENYA-V2.12.md` (PR #160) |

## Open questions the support team inherits

These could not be verified while preparing this package. Each needs an owner.

1. Which image tags run on Bonga, bgrm and cms-pilot (`docker ps` on each server).
2. The live SMS gateway settings and which OTP path each county uses.
3. Whether the live gateways run with the larger request-body buffer (the 8 KB 401 trap suggests not).
4. The workflow service's page limit on each site (the "more than 10 complaints" problem).
5. Whether virus scanning is enabled on either county (issue #159).
6. The escalation job's states and system-user setting on each site.
7. Which access-control actions exist live for editing complaint types, escalation settings and inbox visibility.
8. Who at each county approves configuration changes, and the county contacts for S1 incidents.
