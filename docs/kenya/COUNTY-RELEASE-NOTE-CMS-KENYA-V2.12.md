# CMS V2.12: Release Note for Kenya

**Bonga Nai** (Nairobi City County) · **Bomet Feedback Hub** (Bomet County)
Updates live as of 13 October 2026

---

## Overview

Both counties now run CMS V2.12, the Complaint Management System, in its Kenya edition. Over recent weeks we have delivered a series of updates to the systems of Nairobi City County (Bonga Nai) and Bomet County (Bomet Feedback Hub). Most respond directly to feedback from user acceptance testing in both counties. They have four goals:

- making it easier for residents to file and follow up a complaint, including on basic phones and slow connections;
- protecting the privacy of residents who complain;
- helping county officers route, escalate and resolve complaints faster;
- giving county leadership reports they can take away and share.

Both counties run the same application. Each county has its own public website, and behaviour differs where each county's settings differ: complaint categories, the steps a complaint goes through, and time limits. Those differences are set out below.

---

## Highlights

- **Confidential complaints.** A resident, or a staff member filing for a resident, can ask for the resident's identity to be kept confidential. The system hides the complainant's name and contact details from county staff, and leaves them out of staff notifications.
- **Complaint PDF.** After filing, a resident can download or print an official PDF application of the complaint, and share it from a phone.
- **Faster to open.** The application downloads less than half as much data when it starts, so it opens noticeably faster on mobile data.
- **Officers can escalate.** An officer can pass a complaint to the next level of seniority directly, without waiting for the automatic, time-based escalation.
- **Dashboard export.** County leadership can export the dashboard as an Excel workbook, a CSV file or a PDF report.
- **Clear time limits.** Residents can reopen or withdraw a complaint only within the period the County has set. The option disappears automatically when that period ends.
- **English and Kiswahili** in both counties.
- **Security fixes.** Residents' privacy and the County's data are protected by the system itself, not only on screen. Confidential complainants' details, the residents' timeline and the time limits are all enforced by the server. Access checks are stricter, and the PDF component has a security fix.
- **Virus scanning of uploaded files.** When switched on, every photo, video or document is checked for viruses before it is stored. Infected files are refused and kept aside for investigation.
- **No more "storage full" errors.** Large settings no longer fill up the browser and stop the page with a "quota exceeded" error. Old cached data is cleared after every update.
- **Improvements from CMS V2.12.** A refreshed dashboard, a clearer staff top bar, correct county logos and colours, inbox tabs in Bomet, and videos and screenshots that play and display directly in complaints.

---

## For residents

### Filing a complaint
- Residents accept the **Terms & Conditions** before submitting, and their consent is recorded with the complaint.
- A **"Keep my details confidential"** option is available on every complaint.
- The optional **address** field is on the first screen, next to the complaint category. What the resident types is saved and shown to the officer handling the complaint.
- Complaint types and sub-types are listed **alphabetically**, with "Others" at the end.
- The **map** opens at the county centre with a pin the resident can move to the exact spot. If the pin is not moved, the county centre is recorded as the location. Clearing a search keeps the map where it is instead of zooming out.
- Questions whose answers the system could not keep (name, address and e-mail on the first screen) have been removed, so residents no longer type information that is then lost.

### After filing
- **Complaint PDF application:** Download and Print buttons appear on the confirmation screen and on the complaint page. On phones a Share button appears as well: it offers e-mail, WhatsApp and SMS and sends the PDF itself. Computers don't offer Share, because sharing was unreliable there (especially on Mac). The message includes the complaint number, status, category, date and description, and **never** the complainant's name or phone number.
- **Rating with faces:** residents rate the service by choosing one of five faces, each with a short label, instead of stars. The rating works with a keyboard and screen readers. Earlier ratings are kept.
- **Progress timeline:** residents see what has happened to their complaint and when. Officers' names, phone numbers and internal comments are not shown.
- **Reopening:** a resident can reopen a resolved or rejected complaint within **3 days** in both counties. The Reopen option disappears when the period ends, even on a page left open.
- **Withdrawing:** a resident can withdraw a complaint they no longer need, after a short confirmation with an optional reason. The complaint is marked "Withdrawn" straight away.
  - **Nairobi:** within 1 day of filing, while the complaint is still waiting to be assigned.
  - **Bomet:** within 3 days of filing.
  - A complaint that has been reopened cannot be withdrawn.
- **Location by name:** the complaint page shows the location as County, Sub-County and Ward names.
- **Escalation status:** an escalated complaint shows its escalation level instead of "Open".

### Signing in and everyday use
- A one-time password (OTP) can be re-sent after **3 minutes**.
- The browser tab shows the county's name and logo.
- When we release an update, people who have the application open move to the new version automatically.
- A brief network problem no longer sends people to a maintenance page. An expired session goes to the sign-in page and keeps any half-filled complaint.

---

## For county officers and staff

### Filing on a resident's behalf (front desk and call centre)
- Staff can tick **"Keep details confidential"** when filing for a resident.
- Filing a complaint with an address no longer fails.
- After filing, staff can download or print the PDF application for the resident, or share it from a phone.
- Staff can **withdraw** a complaint on a resident's behalf within the County's time limit, after confirming and giving a reason.

### Working on complaints
- **Manual escalation:** an officer can escalate a complaint to the next level, and chooses the senior officer who receives it.
- **Assigning:** the officer list is a single search box that finds people by name or department. It lists only the officers who work complaints directly; senior officers receive complaints through escalation. Deactivated accounts are no longer listed.
- **Nairobi, reassigning:** an officer who receives a complaint by mistake can pass it to another officer of the same department, in any ward.
- **Nairobi, sending back:** an officer can send a complaint back to the Grievance Redressal Officers (GROs) for reassignment, with an optional comment.
- **No carried-over notes:** a note typed for one complaint and not submitted no longer appears when the officer opens another complaint.
- **Always up to date:** the complaint page refreshes when the officer returns to it. It also refreshes if an action fails because the complaint changed in the meantime, for example after an automatic escalation.
- **Reopen and Withdraw** appear in the officer's action menu only while the County's time limit allows them.
- **Inbox:** the default list shows resolved and rejected complaints as well as escalated ones. The sub-type filter works, and escalation levels have proper names.
- **Timeline:** when a complaint is escalated, the timeline shows who escalated it.

### Home page and account
- Directors, Chief Officers and CECMs in both counties, and the Ombudsman in Bomet, see the **Complaints** card on their home page.
- Officers are greeted by **designation** (for example "Hello, Director"), and the profile menu shows their department by name.
- **Forgot password** sends the one-time password to the mobile number the officer types.
- **Top bar:** the county logo always shows, and long job titles no longer push the profile menu and Logout off the screen.
- A notice warns an officer when **another account signs in** in the same browser, so one session does not silently replace another.

---

## Privacy and data protection

- **Confidential complaints are protected by the system itself, not only on screen.** For a confidential complaint, the complainant's name, phone number, e-mail and address are hidden from all county staff, including the staff member who filed it, unless the County has authorised that person to view confidential complaints. The details are also left out of staff notifications. Residents always see their own details.
- **Residents do not see which officer handled their complaint.** Officers' names and phone numbers are not shown to residents.
- **The PDF application and shared messages** never include the complainant's name or phone number.

---

## For county leadership

- **Dashboard export:** the Export button offers an **Excel workbook**, a **CSV file** or a **PDF report**. Each export records the filters and period applied and the key figures compared with the previous period. It includes every chart, table and map on the dashboard as a data table.
- **Bomet, usage statistics:** the County's own analytics service counts how residents use the public website and the complaint form, for example how many start and finish a complaint. Personal details are removed.

## Security, reliability and improvements from CMS V2.12

### Security
- **Protection happens in the system, not only on screen.**
  - Confidential complainants' details are hidden by the server itself.
  - Residents' progress timelines leave out officers' names, contacts and internal comments.
  - The PDF application never carries the complainant's name or phone number.
- **Time limits cannot be bypassed.** Reopen and withdraw are refused outside the County's period even if someone calls the system directly.
- **Stricter access checks.** The system is set up to block requests from anyone who is not signed in or lacks the right role, instead of only recording them. Search results follow each officer's department and area.
- **Up-to-date components.** The PDF component used for the complaint PDF and reports was updated to a version with a known security problem fixed.
- **Still to come.** Some security improvements made in CMS V2.12 in September are not yet included. The most important is stricter checking of the data sent with each complaint. We recommend including them in the next update.

### Virus scanning of uploaded files
- When switched on, every photo, video or document uploaded to a complaint is checked for viruses before it is stored.
  - A file that fails the check is refused, and the person uploading sees a clear message. The file is kept aside securely for 90 days for investigation.
  - A file that cannot be checked, for example a password-protected document, is refused and not kept.
  - If the scanner is unavailable, uploads pause with a "try again later" message rather than letting unchecked files through.
- **Tested under load** on a test server with 8 processors and 16 GB of memory:
  - every test virus was caught;
  - no genuine file was blocked;
  - normal use (up to 50 uploads at the same moment) showed no noticeable slowdown.
- The feature is **off until each County switches it on**. It needs about 2.5 GB of extra server memory. The test also showed that the file storage service should be given more memory before heavy use.

### "Storage full" errors in the browser
Browsers give each website only a small amount of storage. The system used to keep its reference data there, such as complaint categories and settings. With large configurations this filled up, and the browser stopped the page with a "quota exceeded" error. Now:
- **More room:** reference data is kept in the browser's larger store.
- **No crash:** when storage is full, the page carries on instead of failing.
- **Clean-up:** old leftovers are cleared.
- **Updates:** cached data is refreshed after every update.

### Sessions and browsers
- **Two officers sharing one computer.** One officer signing out or timing out no longer signs out another officer working in a different tab. If a second officer signs in, the first sees a notice explaining what happened; nothing is lost and nobody is signed out.
- **Expired sessions.** When a session expires, the person is taken to the sign-in page and then returned to their work. Their language and any half-filled complaint are kept. A brief network problem shows a message on the page instead of a maintenance screen, which used to cause duplicate complaints.
- **After an update.** Pages left open, such as an officer's inbox, move to the new version automatically at a safe moment, never in the middle of a form.
- **Sharing from phones.** The Share option appears on phones only. On computers, where sharing was unreliable (especially on Mac), Download and Print are offered.
- **Up-to-date pages.** The complaint page refreshes when the officer comes back to it.
- **Faster start.** The application loads less than half as much data when it opens.

### Improvements from CMS V2.12
- **Photos, screenshots and videos on complaints.** Residents and staff can attach photos and screenshots, videos and documents (PDF, Word, Excel) when filing, and when acting on or reopening a complaint. Up to 5 files of 5 MB each. Videos play directly in the page with full-screen controls, and the timeline shows a preview.
- **Dashboard.** Refreshed header, filters, figures and charts; each card shows when its data was last updated; faster loading; a language menu.
- **Staff screens.** The top bar shows the officer's working role. The county's logo and colours display correctly on dark headers, and missing images fall back cleanly.
- **Bomet inbox tabs.** Bomet officers' inboxes are organised into tabs.

---

## How the two counties differ

| | Nairobi: Bonga Nai | Bomet: Bomet Feedback Hub |
|---|---|---|
| Public website | Bonga Nai front page | Bomet Feedback Hub front page |
| Area covered | 6 sub-counties, 17 wards | 5 sub-counties, 25 wards |
| Where a new complaint goes | To the Grievance Redressal Officers, who assign it to an officer | Straight to the responsible officer, chosen automatically by department and location |
| Escalation | 2 levels: Chief Officer, then CECM | 3 levels within the department: Director, Chief Officer, CECM (Water: Chief Officer, then CECM) |
| Withdraw | Within 1 day, before the complaint is assigned | Within 3 days of filing |
| Reopened complaints go to | The Grievance Redressal Officers | The responsible officer |
| Complaint categories | 21 types, 39 sub-types | 48 types, 94 sub-types (Health, Water & Sewage, Administration) |
| Complaint number example | BNG-2026-125 | BFH-2026-000020 |
| Languages | English, Kiswahili | English, Kiswahili |

### Nairobi City County: Bonga Nai
- **Public website** redesigned to the County's design of 12 October, with a single **"Call Customer Service"** panel: 0725 624 489 (24 hours), 0730 047 047 and 020 724 7047. At the County's request, other emergency numbers are no longer listed.
- **Complaint workflow:** Grievance Redressal Officers review and assign complaints; the assigned officer works them; complaints escalate to Chief Officers and then CECMs. Officers can escalate manually, reassign within their department, or send a complaint back to the GROs.
- **New "Others" complaint type** for complaints that do not fit an existing category.
- **Shorter complaint numbers**, for example BNG-2026-125 instead of BNG-2026-000125. Older numbers can still be searched.

### Bomet County: Bomet Feedback Hub
- **Public website:** the Bomet Feedback Hub front page, with Bomet's own wording, sub-counties and help lines.
- **Automatic routing of residents' complaints:** each complaint a resident submits goes straight to an officer of the responsible department for its ward. If there is no ward officer, it goes to the sub-county officer, then the county-level officer. Complaints go to the officers who work them, not to senior officers.
- **Escalation** through the department's Director, Chief Officer and CECM; escalated complaints appear in the inbox with their level.
- **Withdraw:** residents and front-desk staff can withdraw a complaint within 3 days of filing.
- **Bomet branding:** the county crest, and a Bomet landscape on the sign-in screens.

---

## Other fixes

- The reopen page opens reliably (it could fail to load).
- Error and "page not found" screens show their image and a clear button back to the home page.
- Buttons and confirmation dialogs are readable in each county's colours.
- The sign-in screens fill the whole screen on every device size, with the county's colours and, in Bomet, a county landscape.
- The residents' home page shows the complaints section with its own banner.
- The application shows a default logo if a county logo fails to load.

---

## Training videos

A short video course shows the whole complaint journey on screen, with a voice explaining each step: a resident filing a complaint, the front desk filing one for a caller, the officer who checks and assigns complaints, the officer who resolves them, escalation to the Chief Officer, and the resident rating, reopening or withdrawing, and the front desk withdrawing a complaint for a caller. There are 22 parts of one to three minutes each, about 33 minutes in total, with subtitles, including four short parts on how the system protects residents' privacy and the county's data: confidential complaints, safe sign-in, safe uploads and the rules the system enforces. They use test accounts, not real residents' data.

Watch them here: [CMS Kenya V2.12 – videos and support documents](https://drive.google.com/drive/folders/1QiImno9XX1cxhgQtSXCFc0TS7GU6FUDG?usp=sharing) (folder `1-videos`). They suit training new officers and front-desk staff, and briefing county leadership.
