# Employee home — role-tiered wireframes

**Date:** 2026-09-23
**Method:** 3 independent designs → scored judge panel → 3 adversarial reviews (security / feasibility / role-coverage). Every load-bearing claim re-verified by me against the code and against the live pilot.
**Status:** design only. Nothing built.

> **Read this first.** Every gate drawn below is **UX narrowing, not an access-control boundary.** `didEmployeeHasAtleastOneRole` is client-side and bypassable from devtools. These wireframes make ordinary officers' screens *simpler*; they do not make data *unreachable*. Do not cite this document as evidence of access control.

---

## 1. The problem, measured

On the live pilot today (`cms-pilot`, tenant `nb`):

| User | What the home shows |
|---|---|
| ADMIN (holds 11 roles incl. SUPERUSER) | 2 cards, 4 links |
| A `HEALTH_DIRECTOR` | **1 card, 1 link** ("Search Complaint") |

A department Director — the person who resolves complaints — lands on an almost empty screen. That is the real baseline the redesign improves.

---

## 2. Three tiers, keyed to data scope

The judge panel settled on **three**, and I agree. The role list contains exactly three distinct *data scopes*. Workflow stage (screening vs supervisor vs case manager) is **not** a tier: those roles see the same queue and differ only in permitted actions, which the detail screen already drives from workflow.

| Tier | Scope | Roles |
|---|---|---|
| **T1 Oversight** | Beyond own department | `SUPERUSER`, `CMS_ADMIN`, `Ombudsman_Officer`, `OMBUDSMAN_OFFICER` |
| **T2 Casework** | Own department queue | `PGR_LME`, `GRO`, `CMS_SUPERVISOR`, `CMS_SCREENING_OFFICER`, `CMS_CASE_MANAGER`, all nine `<DEPT>_{DIRECTOR,CHIEF_OFFICER,CECM}` |
| **T3 Narrow** | One job | `CSR`, `CMS_RECEPTION_OFFICER` (intake), `CMS_VIEWER` (read-only) |

Two corrections the reviews forced:

- **All nine `<DEPT>_*` roles sit in T2**, including CECM and CHIEF_OFFICER. The department prefix bounds their scope; the suffix is an escalation rung, not a wider view.
- **`GRO` defaults to T2**, not T1. There is no code fact placing it cross-department. Fail narrow, and raise it as a product question.

**Multi-role users:** tier decides *KPIs and the oversight panel only*. Links keep the existing independent per-link filter (`links.filter(hasRequiredRoles)`). Someone holding both `CMS_RECEPTION_OFFICER` and `CMS_ADMIN` gets T1 KPIs *and* keeps their Create Complaint link. Highest tier wins for KPIs; links are computed per link, never inherited from the tier.

---

## 3. Wireframes

### T1 — Oversight (ADMIN / OMBUDSMAN / SUPERUSER)

```
+--------------------------------------------------------------------------+
| [=] Nai Pepea         Nairobi (nb)          EN v      Admin v            |   <- upstream topbar, untouched
+--------------------------------------------------------------------------+
|                                                                          |
|  +--------------------------------+  +--------------------------------+  |
|  | (!) Complaints                 |  | (#) Dashboard                  |  |
|  +--------------------------------+  +--------------------------------+  |
|  |   18      7       4      2     |  | (renders only when the server  |  |
|  | Unassg Overdue Escal  Reopen   |  |  capability check allows;      |  |
|  +--------------------------------+  |  null while loading)           |  |
|  | Search Complaint            >  |  +--------------------------------+  |
|  | Admin Search (all depts)    >  |  | Open Dashboard              >  |  |
|  |   ^ T1-ONLY — existing         |  +--------------------------------+  |
|  |     ES_PGR_ADMIN_SEARCH        |                                      |
|  | Create Complaint            >  |   <- ONLY if they also hold an       |
|  +--------------------------------+      intake role                     |
|                                                                          |
|  ---- OversightPanel (below the grid, via additionalComponent) ----       |
|  +--------------------------------------------------------------------+  |
|  | Across departments            Health  Water  Admin   (aggregates    |  |
|  |   Open          42              18      14      10     only —       |  |
|  |   Overdue        7               3       2       2     never names) |  |
|  +--------------------------------------------------------------------+  |
+--------------------------------------------------------------------------+
```

**Deliberately absent at T1:** complainant names or phone numbers anywhere; any recent-complaints list; export/CSV (the documented top leak path); any bucket small enough to re-identify (show `<5`).

### T2 — Casework (Directors, supervisors, case managers)

```
+--------------------------------------------------------------------------+
|  +--------------------------------+                                      |
|  | (!) Complaints                 |     No Dashboard card unless the      |
|  +--------------------------------+     server capability check grants it |
|  |     12          3              |                                      |
|  | Assigned to me  Overdue (mine) |     No OversightPanel                 |
|  +--------------------------------+                                      |
|  | Search Complaint            >  |                                      |
|  +--------------------------------+                                      |
+--------------------------------------------------------------------------+
```

**Absent:** Admin Search; Create Complaint (unless separately held); any tenant-wide or other-department figure.

### T3 — Narrow: intake (CSR / CMS_RECEPTION_OFFICER)

```
+--------------------------------------------------------------------------+
|  +--------------------------------+                                      |
|  | (!) Complaints                 |     Intake is a single job. The       |
|  +--------------------------------+     screen is deliberately one        |
|  |         6                      |     action plus one number.           |
|  | Logged by me today             |                                      |
|  +--------------------------------+                                      |
|  | Create Complaint            >  |   <- primary action, first            |
|  | Search Complaint            >  |                                      |
|  +--------------------------------+                                      |
+--------------------------------------------------------------------------+
```

### T3 — Narrow: read-only (CMS_VIEWER)

```
+--------------------------------------------------------------------------+
|  +--------------------------------+                                      |
|  | (!) Complaints        [Read-only]                                     |
|  +--------------------------------+     readOnly is an ORTHOGONAL flag,   |
|  | Search Complaint            >  |     not a fourth tier. It suppresses  |
|  +--------------------------------+     every action affordance.          |
+--------------------------------------------------------------------------+
```

### Day-one reality — every KPI returns 0 on the pilot

```
  +--------------------------------+     Counts MUST be passed as the
  |     0           0              |     STRING "0". LandingPageCard.js:97
  | Assigned to me  Overdue        |     guards with {metric?.count && ...}
  +--------------------------------+     so the NUMBER 0 renders a label
  | Search Complaint            >  |     with no number above it.
  +--------------------------------+
```

### Degraded — counts unavailable

```
  +--------------------------------+     Three DISTINCT states required:
  |     —           —              |       "0"  loaded, genuinely zero
  | Assigned to me  Overdue        |       skeleton  loading
  +--------------------------------+       "—"  unavailable
  | Search Complaint            >  |
  +--------------------------------+     A failed count must never cost
                                         the user their navigation links.
```

---

## 4. Verified findings that change the build

Each re-checked by me, not taken on trust.

| # | Finding | Evidence |
|---|---|---|
| 1 | **`useTabCounts` returns ALERT counts, not totals** — new-since-last-seen, and opening a tab resets to 0. Reusing it for home KPIs would show numbers that shrink as you browse. | `useTabCounts.js` header + `markSeen` |
| 2 | **Zero renders blank.** `{metric?.count && ...}` — falsy 0 hides the number. | `LandingPageCard.js:97` |
| 3 | **Metric CSS ships only prebuilt.** Absent from every `.scss` source, present in `public/vendor/digit-ui-components-css.css`. KPI chips style themselves for free. | 0 source hits, 9 vendor hits |
| 4 | **Tailwind does not reach the employee home.** Globs cover only `digit-ui-components-v2/src` and `products/pgr/src/pages/citizen`. The dashboard's `tw-` components are **not** reusable here. | `tailwind.config.ts` |
| 5 | **Ombudsman has no gate anywhere.** Appears exactly once in the whole tree, in the broad access list. Today it is an ordinary inbox user. | 1 hit, `PGRCard.js:18` |
| 6 | **Capability tiering already exists server-side.** `_access` returns `capabilities[]`; the 40 KPI definitions are gated `_query` (27), `reports` (8), `officer` (3), `reports-extended` (2). | Live probe + `KpiDefinition.json` |
| 7 | **Role checks are tenant-exact.** A `CMS_ADMIN` provisioned at state `mz` fails the check at city `mz.igsae` and silently drops a tier. | `didEmployeeHasRole` |
| 8 | **`?src=admin` picks the cross-department endpoint with no client role check** — but I probed the endpoint live and **the server returns 403**. So this is a **UX bug, not a leak**: the user gets a broken page, not other departments' data. | `PGRDetails.js:212` + live 403 |

---

## 5. What I recommend

**Ship links-only tiering first.** It delivers the entire narrow-vs-wide ask, needs no counts, no new endpoint, and no backend work. Roughly **2 days**.

Then, in order:
1. **Give Ombudsman its oversight capability.** This is the substantive deliverable; the KPIs are cosmetics.
2. **KPI chips** using the free vendor CSS — but only after replacing `useTabCounts` with a totals hook, and only with the three render states specified.
3. **OversightPanel** last. It is **blocked on a backend aggregate endpoint** that re-derives scope from the token. Without one, the only path is N+1 count calls per department per page load.

Fix the `?src=admin` guard as a one-line hygiene change regardless.

---

## 6. Open questions

1. `GRO` — T1 or T2? No code fact decides it; I defaulted to T2.
2. Ombudsman — grant real oversight, or leave as an ordinary inbox user?
3. Is the oversight aggregate endpoint in scope, or is T1 links-only for now?
4. `ROLE_BASED_HOMECARD` must be confirmed absent/false per environment. If true, `Home.js` renders a different component and none of this applies.
5. Tab counts were deliberately disabled on the inbox (`PGRInbox.js:94`, commented out). Reintroducing counts on the home reverses a prior product call and needs sign-off.
