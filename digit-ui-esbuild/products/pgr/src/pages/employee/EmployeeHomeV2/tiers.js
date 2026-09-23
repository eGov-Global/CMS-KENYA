// Role tiers for the employee home — the single authority.
//
// THIS IS PRESENTATION ONLY. `didEmployeeHasAtleastOneRole` is a client-side
// check and is trivially bypassed from devtools. Tiering makes ordinary
// officers' screens NARROWER; it does not make data unreachable. Every gate
// that matters is enforced server-side (pgr-services scopes the inbox,
// egov-accesscontrol gates the analytics capabilities, `_admin/_search`
// returns 403 to callers without the grant — verified against cms-pilot).
//
// Tiers key off DATA SCOPE, not job title, because that is the only axis the
// backend actually draws:
//   OVERSIGHT  sees beyond its own department  (the `_admin/_search` grant)
//   CASEWORK   sees its own department queue
//   NARROW     one job: intake, or read-only
//
// Deliberately NOT split by workflow stage. CMS_SCREENING_OFFICER /
// CMS_SUPERVISOR / CMS_CASE_MANAGER see the same queue and differ only in
// which workflow ACTIONS the server permits — that belongs on the detail
// screen, which is already workflow-driven, not re-encoded as a home tier.

export const TIER = {
  OVERSIGHT: "OVERSIGHT",
  CASEWORK: "CASEWORK",
  NARROW: "NARROW",
};

// Both casings are intentional: HRMS provisioned the ombudsman role
// mixed-case and PGRCard.js already carries both. Dropping either silently
// locks out real users.
const OVERSIGHT_ROLES = ["SUPERUSER", "CMS_ADMIN", "Ombudsman_Officer", "OMBUDSMAN_OFFICER"];

// Intake is a SHAPE within NARROW, not a tier of its own: it has the same data
// scope as casework and differs by one link, which PGRCard already gates to
// exactly this pair.
const INTAKE_ROLES = ["CSR", "CMS_RECEPTION_OFFICER"];

// Read-only is an ORTHOGONAL flag, not a fourth tier. It suppresses action
// affordances while leaving the tier's read surfaces intact.
//
// PGR_VIEWER belongs here, not in CASEWORK: PGRDetails.js states plainly that
// it is "a viewer credential, not a prerequisite to act", and real field users
// are seeded with PGR_LME or GRO instead. It was missing from the first draft
// of this map, and the local test account holds ONLY PGR_VIEWER — so the page
// correctly rendered nothing, which is how the gap surfaced.
// TICKET_REPORT_VIEWER is the same shape (report access, no queue actions).
const READ_ONLY_ROLES = ["CMS_VIEWER", "PGR_VIEWER", "TICKET_REPORT_VIEWER"];

// Everything else that can work a queue. All nine <DEPT>_* roles live here
// regardless of the DIRECTOR / CHIEF_OFFICER / CECM suffix: the department
// prefix bounds their scope, the suffix is only an escalation rung.
// GRO defaults here deliberately — no code fact places it cross-department,
// so it fails narrow pending a product decision.
const CASEWORK_ROLES = [
  "PGR_LME", "GRO", "DGRO",
  "CMS_SUPERVISOR", "CMS_SCREENING_OFFICER", "CMS_CASE_MANAGER",
  "HEALTH_DIRECTOR", "HEALTH_CHIEF_OFFICER", "HEALTH_CECM",
  "WATER_DIRECTOR", "WATER_CHIEF_OFFICER", "WATER_CECM",
  "ADMIN_DIRECTOR", "ADMIN_CHIEF_OFFICER", "ADMIN_CECM",
];

/**
 * The platform helper is tenant-EXACT: a role held at the state tenant (`ke`)
 * does not match while the user operates on a city tenant (`ke.nairobi`).
 * That is the normal DIGIT pattern for cross-city admin roles, so a
 * state-level SUPERUSER would silently drop a tier. Match case-insensitively
 * and accept a role held at an ancestor tenant.
 */
const holdsRole = (wanted = []) => {
  const want = wanted.map((r) => String(r).toLowerCase());
  const user = Digit?.UserService?.getUser?.();
  const current = String(Digit?.ULBService?.getCurrentTenantId?.() || "");
  return (user?.info?.roles || []).some((r) => {
    if (!want.includes(String(r?.code || "").toLowerCase())) return false;
    const held = String(r?.tenantId || "");
    // exact tenant, or held at an ancestor ("ke" covers "ke.nairobi")
    return !held || held === current || current.startsWith(`${held}.`);
  });
};

/**
 * resolveTier — highest tier wins for a multi-role user.
 *
 * Tier governs KPIs and which panels render. It does NOT govern links:
 * those keep their own independent per-link role filter, so someone holding
 * both CMS_RECEPTION_OFFICER and CMS_ADMIN gets oversight KPIs *and* keeps
 * their Create Complaint action. Collapsing links into the tier would take
 * away an affordance the user legitimately holds.
 *
 * @returns {{ tier: string, readOnly: boolean, isIntake: boolean, hasAny: boolean }}
 */
export const resolveTier = () => {
  const oversight = holdsRole(OVERSIGHT_ROLES);
  const casework = holdsRole(CASEWORK_ROLES);
  const intake = holdsRole(INTAKE_ROLES);
  const readOnly = holdsRole(READ_ONLY_ROLES);

  const tier = oversight ? TIER.OVERSIGHT : casework ? TIER.CASEWORK : TIER.NARROW;

  return {
    tier,
    // read-only only bites when the user has no role that can act
    readOnly: readOnly && !oversight && !casework && !intake,
    isIntake: intake,
    hasAny: oversight || casework || intake || readOnly,
  };
};

export default resolveTier;
