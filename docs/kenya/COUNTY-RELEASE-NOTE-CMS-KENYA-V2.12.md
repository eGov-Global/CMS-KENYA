# CMS Kenya V2.12 — release note for Nairobi City County and Bomet County

**Nairobi (Bonga Nai):** [bonga.nairobi.go.ke](https://bonga.nairobi.go.ke/digit-ui/landing) · **Bomet (Bomet Feedback Hub):** [bgrm.bomet.go.ke](https://bgrm.bomet.go.ke/digit-ui/landing)\
**Status:** live on both sites as of 13 October 2026\
For county administrators, operational teams and supervisors. Prepared by eGov.

**CMS Kenya V2.12:** [Release preview and evidence](RELEASE-PREVIEW-CMS-KENYA-V2.12.md) · [Release notes](RELEASE-NOTES-CMS-KENYA-V2.12.md) · **County release note** (this page)

---

## Summary

Both counties now run CMS Kenya V2.12, the Kenyan version of the Complaint Management System, built on CMS V2.12. Over recent weeks eGov has delivered a series of updates to the systems of Nairobi City County (Bonga Nai) and Bomet County (Bomet Feedback Hub). Most respond directly to feedback from user acceptance testing in both counties. They have four goals:

- making it easier for residents to file and follow up a complaint, including on basic phones and slow connections;
- protecting the privacy of residents who complain;
- helping county officers route, escalate and resolve complaints faster;
- giving county leadership reports they can take away and share.

Both counties run the same application, in English and Kiswahili. Each county has its own public website, and behaviour differs where each county's settings differ: complaint categories, the steps a complaint goes through, and time limits. Those differences are [set out below](#how-the-two-counties-differ).

---

## Highlights

- **Confidential complaints.** A resident, or a staff member filing for a resident, can ask for the resident's identity to be kept confidential. The system then hides the complainant's name and contact details from county staff and leaves them out of staff notifications.
- **Official PDF application.** After filing, a resident can download, print or share an official PDF application of the complaint.
- **Smaller start-up download.** The app's start-up download is about half what it was, which saves mobile data.
- **Officers can escalate.** An officer can pass a complaint to the next level of seniority directly, without waiting for the automatic, time-based escalation.
- **Dashboard export.** County leadership can export the dashboard as an Excel workbook, a CSV file or a PDF report.
- **Clear time limits.** Residents can reopen or withdraw a complaint only within the time limit the County has set. The option disappears automatically when the time limit ends.
- **Safer and more reliable.** Privacy rules and time limits are enforced by the system itself, not only on screen. Uploaded files can be scanned for viruses (switched off on both sites for now), and the "quota exceeded" error that stopped pages in the browser is fixed.

---

## What changes for residents

### Filing a complaint

- **Public website:** each county has its own public website, which anyone can open without signing in. From there, residents can report an issue or track a complaint.
- Residents accept the **Terms & Conditions** before submitting, and their consent is recorded with the complaint.
- A **"Keep details confidential"** option is available on every complaint.
- The optional **address** field is on the first screen, next to the complaint category, for a nearby building, plot or description that helps the officer find the spot. What the resident types is saved and shown to the officer handling the complaint.
- Complaint types and sub-types are listed **alphabetically**, with "Others" at the end.
- The **map** opens at the county centre with a pin the resident can move to the exact spot. If the pin is not moved, the county centre is recorded as the location. Clearing a search keeps the map where it is instead of zooming out.

### After filing

- **Official PDF application:** Download, Print and Share buttons appear on the confirmation screen and on the complaint page. Share lets residents send the PDF by e-mail, WhatsApp or SMS; where the browser cannot attach the file itself, the PDF is downloaded first so it can be attached by hand. The message that goes with it carries the complaint's details, such as its number, status, category, date and description.
- **Rating with faces:** residents rate the service by choosing one of five faces, each with a short label, instead of stars. The rating works with a keyboard and screen readers. Earlier ratings are kept.
- **Reopening:** a resident can reopen a resolved or rejected complaint within **3 days of the last update** in both counties. The Reopen option disappears when the time limit ends, even on a page left open.
- **Withdrawing:** a resident can withdraw a complaint they no longer need, after a short confirmation with an optional reason. The complaint is marked "Withdrawn" straight away.
  - **Nairobi:** within 1 day of filing, while the complaint is still waiting to be assigned.
  - **Bomet:** within 3 days of filing.
  - A complaint that has been reopened cannot be withdrawn.
- **Location by name:** the complaint page shows the location as County, Sub-County and Ward names.
- **Escalation status:** an escalated complaint shows its level, for example "Escalated (Level 1)", instead of "Open".

### Signing in

- The one-time code used to sign in can be re-sent after **3 minutes**.
- What happens when a session expires or the connection drops is described under [Reliability](#reliability).

---

## What changes for county officers and staff

### Filing on a resident's behalf

For the front desk and call centre:

- Staff can tick **"Keep details confidential"** when filing for a resident.
- Filing a complaint with an address no longer fails.
- After filing, staff can download, print or share the PDF application for the resident.
- Staff can **withdraw** a complaint on a resident's behalf within the County's time limit, after confirming and giving a reason.

### Working on complaints

- **Manual escalation:** an officer can escalate a complaint to the next level, and chooses the senior officer who receives it.
- **Assigning:** when a Grievance Routing Officer (GRO) assigns a complaint, the officer list is a single search box that finds people by name or department. It lists only last-mile officers, the officers who work complaints directly; senior officers receive complaints through escalation. Deactivated accounts are no longer listed.
- **Take Action by role:** the Take Action button appears for every officer whose role can act at the complaint's current stage, not only for the officer the complaint is assigned to.
- **Nairobi, Reassign:** a last-mile officer who receives a complaint by mistake can pass it to another last-mile officer of the same department, in any ward.
- **Nairobi, Reassign to GRO:** an officer can send a complaint back to the GROs for reassignment, with an optional comment.
- **Always up to date:** the complaint page refreshes when the officer returns to it. It also refreshes if an action fails because the complaint changed in the meantime, for example after an automatic escalation.
- **Reopen and Withdraw** appear in the Take Action menu only while the County's time limit allows them.
- **Inbox:** the default list shows resolved and rejected complaints as well as escalated ones. The sub-type filter lists every sub-type, and escalated complaints show their level, for example "Escalated (Level 2)".
- **Timeline:** when a complaint is escalated, the timeline shows who escalated it.

### Home page and account

- Officers are greeted by **designation** (for example "Hello, Director"), and the profile menu shows their department by name.
- **Forgot password** sends the one-time code to the mobile number the officer types, with its country code.

---

## What changes for county leadership

- **Complaints card for senior officers:** Directors, Chief Officers and CECMs (County Executive Committee Members) in both counties, and the Ombudsman in Bomet, see the **Complaints** card on their home page.
- **Dashboard export:** the Export button offers an **Excel workbook**, a **CSV file** or a **PDF report**. Each export records the filters and period applied and the key figures compared with the previous period. It includes every chart, table and map on the dashboard as a data table.
- **Refreshed dashboard (from CMS V2.12):** a refreshed header, filters, figures and charts; each card shows when its data was last updated; faster loading; and a language menu.
- **Bomet, usage statistics:** an analytics tool hosted with the system, not by an outside company, counts how residents use the public website and the complaint form, for example how many start and finish a complaint. Personal details are removed.

---

## Privacy, security and reliability

Privacy and security rules are enforced by the system itself, not only on screen.

### Privacy

- **Confidential complaints.** For a confidential complaint, the complainant's name, phone number, e-mail and address are hidden from all county staff, including the staff member who filed it, unless the County has authorised that person to view confidential complaints. These details are left out of staff notifications, and a staff search by the complainant's phone number does not reveal confidential complaints. Residents always see their own details.
- **Residents' timeline.** Residents see what has happened to their complaint and when, but not officers' names, phone numbers or internal comments: the server removes these before the page receives them.
- **The PDF application** shows the complainant's name and phone number exactly as the complaint page shows them to the person printing it: in full on the resident's own copy, hidden when staff print a confidential complaint. It never shows officers' names, and the message that goes with a shared PDF never includes the complainant's name or phone number. When residents share the PDF itself, their own name and number go with it.

### Security

- **Time limits cannot be bypassed.** Reopen and withdraw are refused outside the County's time limit, even if someone calls the system directly.
- **Stricter access checks.** In the configuration as delivered, the system is set up to block requests from anyone who is not signed in or lacks the right role, instead of only recording them. Search results follow each officer's department and area.
- **Safer defaults.** In the configuration as delivered, the technical monitoring dashboards require a sign-in, and the public entry points for usage statistics limit how often any one computer can call them.
- **Up-to-date components.** The PDF component used for the PDF application and reports was updated to a version with a known security problem fixed.
- **Still to come.** Some security improvements made in CMS V2.12 in September are not yet included. The most important is stricter checking of the data sent with each complaint. eGov recommends including them in the next update.

### Reliability

- **No more "quota exceeded" errors.** The system used to keep reference data, such as complaint categories and settings, in the small storage area a browser gives each website. With large configurations it filled up, and the browser stopped the page with a "quota exceeded" ("storage full") error. That data now sits in the browser's larger store, a full store no longer stops the page, old leftovers are cleared, and cached data is refreshed after every update.
- **Two officers sharing one computer.** One officer signing out or timing out no longer signs out another officer working in a different tab. If a second officer signs in, the first sees a notice explaining what happened, so one session does not silently replace another; nothing is lost and nobody is signed out.
- **Expired sessions.** When a session expires, the person is taken to the sign-in page and then returned to their work. Their language and any half-filled complaint are kept.
- **Brief network problems.** A brief network problem shows a message on the page instead of a maintenance screen, which used to cause duplicate complaints.
- **After an update.** Pages left open, such as an officer's inbox, move to the new version automatically at a safe moment, never in the middle of a form.
- **Smaller start-up download.** Screens, maps and PDF tools load only when they are needed, so the app's start-up download is about half what it was.
- **Error screens.** Error and "page not found" screens show their image and a clear button back to the home page.

---

## Virus scanning of uploaded files

- When switched on, every photo, video or document uploaded to a complaint is checked for viruses before it is stored: an upload proxy passes each file to ClamAV, an open-source virus scanner.
  - A file that fails the check is refused, and the person uploading sees a clear message. The file is kept aside securely for 90 days for investigation.
  - A file that cannot be checked, for example a password-protected document, is refused and not kept.
  - If the scanner is unavailable, uploads pause with a "try again later" message rather than letting unchecked files through.
- **Tested under load** on a test machine with 8 processors and 16 GB of memory:
  - every test virus was caught;
  - no genuine file was blocked;
  - normal use (up to 50 uploads at the same moment) showed no noticeable slowdown;
  - under heavy load, the weak point was the file storage service, not the scanner.
- **Switched off on both sites for now.** Switching it on needs extra server memory: about 1.5 GB for ClamAV, plus up to 1 GB for the upload proxy under heavy load — budget about 2.5 GB.

Technical detail and the full test results are in the release notes, under [File scan: virus scanning of uploads](RELEASE-NOTES-CMS-KENYA-V2.12.md#file-scan-virus-scanning-of-uploads).

---

## Improvements that come from CMS V2.12

These improvements come from CMS V2.12, the product CMS Kenya V2.12 is built on.

- **Photos, documents and short videos on complaints.** Residents and staff can attach photos, documents and short videos (up to 5 files) when filing, and when acting on or reopening a complaint. Videos play directly in the page with full-screen controls, and the timeline shows a preview.
- **Staff screens.** The top bar shows the officer's working role, and the county logo and colours display correctly on dark headers.
- **Bomet inbox tabs.** Bomet officers' inboxes are organised into tabs.
- **Dashboard.** The refreshed dashboard also comes from CMS V2.12; see [What changes for county leadership](#what-changes-for-county-leadership).

---

## How the two counties differ

Both sites run the same application. What differs is each county's public website and the settings each County has chosen.

| | Nairobi (Bonga Nai) | Bomet (Bomet Feedback Hub) |
|---|---|---|
| Public website | [bonga.nairobi.go.ke](https://bonga.nairobi.go.ke/digit-ui/landing) | [bgrm.bomet.go.ke](https://bgrm.bomet.go.ke/digit-ui/landing) |
| Area covered | 6 sub-counties, 17 wards | 5 sub-counties, 25 wards |
| Where a new complaint goes | To the GROs, who assign it to a last-mile officer | Complaints filed by residents go straight to a last-mile officer, chosen automatically by department and location |
| Escalation | 2 levels: Chief Officer, then CECM | 3 levels within the department: Director, Chief Officer, CECM (Water: Chief Officer, then CECM) |
| Withdraw | Within 1 day of filing, before the complaint is assigned | Within 3 days of filing |
| Reopen | Within 3 days of the last update; goes back to the GROs | Within 3 days of the last update; goes back to a last-mile officer |
| Complaint categories | 21 types, 39 sub-types | 48 types, 94 sub-types (Health, Water & Sewage, Administration) |
| Complaint number example | BNG-2026-125 | BFH-2026-000020 |
| Languages | English, Kiswahili | English, Kiswahili |
| Usage statistics | Not set up | Counted by an analytics tool hosted with the system, with personal details removed |

The full technical comparison is in the [release preview's comparison of the two live configurations](RELEASE-PREVIEW-CMS-KENYA-V2.12.md#3-bonga-vs-bgrm-live-configuration-compared).

### Nairobi (Bonga Nai)

- **Public website** redesigned to the County's new design, with a single **"Call Customer Service"** panel: 0725 624 489 (24 hours), 0730 047 047 and 020 724 7047. At the County's request, emergency numbers such as police and fire are no longer listed.
- **Complaint workflow:** GROs review and assign complaints; the assigned last-mile officer works them; complaints escalate to Chief Officers and then CECMs. Officers can escalate manually, reassign within their department, or send a complaint back to the GROs.
- **New "Others" complaint type** for complaints that do not fit an existing category.
- **Shorter complaint numbers**, for example BNG-2026-125 instead of BNG-2026-000125. Older numbers can still be searched.

### Bomet (Bomet Feedback Hub)

- **Public website:** the Bomet Feedback Hub front page, with Bomet's own wording, sub-counties and help lines. Its wording can be updated without a new software release.
- **Automatic routing of residents' complaints:** each complaint a resident submits goes straight to a last-mile officer of the responsible department for its ward. If there is no ward officer, it goes to the sub-county officer, then the county-level officer, and then to any officer of that department. Complaints go to the officers who work them, not to senior officers.
- **Escalation** through the department's Director, Chief Officer and CECM (Water: Chief Officer, then CECM); escalated complaints appear in the inbox with their level.
- **Withdraw:** residents and front-desk staff can withdraw a complaint within 3 days of filing.
- **Bomet branding:** the county crest, and a Bomet landscape on the sign-in screens.

---

## Other fixes

- The reopen page opens reliably (it could fail to load).
- Buttons and confirmation dialogs are readable in each county's colours.
- The sign-in screens fill the whole screen on every device size, in the county colours.
- The browser tab shows the county name and logo.
- The resident pages show a default logo if the county logo fails to load.
- The complaint form no longer shows a "Your details" card (name, address and e-mail) whose answers were never saved.
- A note typed for one complaint and not submitted no longer appears when the officer opens another complaint.

---

## Training videos

The training videos were recorded on a test copy of Bonga Nai with fictional test users, so they contain no real residents' data. Each part has English narration with subtitles.

**For Bomet readers:** the walkthrough follows Nairobi's workflow. On Bomet, complaints filed by residents are assigned to the department's officer automatically at filing, so there is no GRO step; Reassign to GRO exists on Nairobi only; residents can withdraw for 3 days (Nairobi: 1 day, before assignment); and complaints escalate through the department's Director, Chief Officer and CECM (Water: Chief Officer, then CECM).

| Who should watch | Parts | Length |
|---|---|---|
| Everyone, to start | 00, 09 | 1 min 18 s |
| Anyone helping residents | 00b, 01, 06, 06b | 8 min 02 s |
| Front desk and call centre | 02, 03b | 2 min 37 s |
| All staff: signing in | 02b | 1 min 37 s |
| GROs | 03, 03c, 07 | 5 min 34 s |
| Last-mile officers | 04, 04b, 04c | 4 min 31 s |
| Chief Officers and CECMs | 05, 05b | 2 min 44 s |
| Leadership | 08 | 0 min 51 s |
| All staff: privacy and security | S1, S2, S3, S4 | 6 min 33 s |

The four privacy and security parts cover confidential complaints, safe sign-in, safe uploads and the rules the system enforces. Parts run 32 s to 2 min 54 s; 33 min 47 s in total (workflow 27 min 14 s; privacy and security 6 min 33 s).

**Where to watch:** [CMS Kenya V2.12 – videos and support documents (Google Drive folder)](https://drive.google.com/drive/folders/1QiImno9XX1cxhgQtSXCFc0TS7GU6FUDG?usp=sharing). Open the `1-videos` folder to play a part in the browser. The folder holds 11 of the 22 parts today; the other 11 and a PDF copy of the support package are being added. The parts there today are 00, 01, 02, 03, 04, 04b, 05, 06, 07, 08 and 09.

What each part shows is listed in the release notes, under [Training videos and support package](RELEASE-NOTES-CMS-KENYA-V2.12.md#training-videos-and-support-package).

---

## Where to read more

- [Release notes](RELEASE-NOTES-CMS-KENYA-V2.12.md): the complete technical account of the release, for release managers, reviewers and the teams who run the sites.
- [Release preview and evidence](RELEASE-PREVIEW-CMS-KENYA-V2.12.md): the release by theme, with the evidence behind each change.
- [Operations handbook](../2.12/operations/README.md): for the IT staff who run the system, covering what to check first when something goes wrong and how to report a problem.
- [Support package](https://github.com/eGov-Global/CMS-KENYA/pull/163) (under review): guides for the eGov support desk and the teams who run the sites, covering who handles which problem, troubleshooting and step-by-step procedures.
- The two county websites: [Bonga Nai](https://bonga.nairobi.go.ke/digit-ui/landing) and [Bomet Feedback Hub](https://bgrm.bomet.go.ke/digit-ui/landing).

---

**CMS Kenya V2.12:** [Release preview and evidence](RELEASE-PREVIEW-CMS-KENYA-V2.12.md) · [Release notes](RELEASE-NOTES-CMS-KENYA-V2.12.md) · **County release note** (this page)
