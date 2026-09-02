// Client-side auto-assignment (2-level workflow).
//
// The live PGR BusinessService routes the create action (APPLY) straight to
// PENDINGATLME — there is no triage stop — and the employee inbox's "My" tab
// is driven purely by workflow assignees (pgr-services resolves `assignee`
// through workflow-v2; nothing filters by department). An APPLY submitted
// without assignes therefore lands in nobody's inbox, and PENDINGATLME has no
// ASSIGN action to attach an owner later.
//
// pgr-services is deliberately NOT modified (deployment constraint), so the
// submitting client resolves department + jurisdiction → employee and sends
// `workflow.assignes` on the transition; the backend forwards assignes
// verbatim to workflow-v2 (WorkflowService.getProcessInstanceForPGR).
//
// Resolution is best-effort BY DESIGN: any failure (HRMS unreachable, no
// candidates, boundary drift) resolves to null and the complaint is submitted
// unassigned — exactly the pre-feature behaviour. Routing must never block or
// fail a submit.
//
// Everything here keys on department CODES (the axis HRMS assignments and the
// ComplaintHierarchy leaf share). `additionalDetail.department` as written by
// the backend on create holds the department display NAME — never match on it.

// Mirrors PGRDetails' NON_ASSIGNEE_ROLES: system / non-employee actors that a
// workflow state may list but that must never receive an assignment.
const NON_ASSIGNEE_ROLES = new Set(["CITIZEN", "AUTO_ESCALATE", "ANONYMOUS"]);

/**
 * Derive the assignable role set from the live BusinessService instead of
 * hardcoding one: take the create action's target state and union the roles
 * of its forward (non-self-loop) actions — the same derivation PGRDetails'
 * computeAssigneeRoles uses for the manual assignee picker, applied to the
 * start state. Self-loops (COMMENT) only add noise. Deployments differ on
 * whether `nextState` carries the state uuid or its name, so match either.
 */
export const deriveAssigneeRoles = (businessService, action = "APPLY") => {
  const states = businessService?.states || [];
  const start = states.find((s) => s?.isStartState);
  const createAction = (start?.actions || []).find((a) => a?.action === action && a?.active !== false);
  const nextRef = createAction?.nextState;
  if (!nextRef) return [];
  const nextState = states.find((s) => s?.uuid === nextRef || s?.state === nextRef);
  if (!nextState) return [];
  const isSelf = (a) => a?.nextState === nextState.uuid || a?.nextState === nextState.state;
  const actions = (nextState.actions || []).filter((a) => a?.active !== false);
  const forward = actions.filter((a) => a?.nextState && !isSelf(a));
  const source = forward.length > 0 ? forward : actions;
  const roles = new Set();
  source.forEach((a) => (a?.roles || []).forEach((r) => roles.add(r)));
  return [...roles].filter((r) => !NON_ASSIGNEE_ROLES.has(r));
};

/**
 * Codes on the boundary-tree path to the complaint's locality, ordered
 * NARROWEST FIRST: the locality itself, then its parent, up to the root.
 *
 * The order is the contract. Assignment walks this list and stops at the
 * first level with a candidate, so a ward officer is preferred over the
 * sub-county officer above them, who is preferred over the county. Returning
 * an unordered set here would silently restore the old behaviour, where any
 * officer on the path was equally eligible and a county-wide officer could
 * take a complaint from the ward it belongs to.
 *
 * Returns null when the locality isn't in the tree (seeding drift) — the
 * caller then falls back to department-only matching.
 */
export const boundaryAncestorCodes = (roots, localityCode) => {
  if (!localityCode) return null;
  const walk = (node, trail) => {
    if (!node || typeof node !== "object") return null;
    const next = [...trail, node.code];
    if (node.code === localityCode) return next;
    for (const child of node.children || []) {
      const found = walk(child, next);
      if (found) return found;
    }
    return null;
  };
  for (const root of roots || []) {
    const found = walk(root, []);
    // walk() collects root -> locality; reverse to narrowest-first.
    if (found) return found.filter(Boolean).reverse();
  }
  return null;
};

// HRMS jurisdictions with junk boundary values exist in the field (e.g. the
// tenant code "ke.nairobi" instead of a boundary code) — same defensive
// filter BoundaryComponent applies to its jurisdiction gate.
const usableJurisdictionCodes = (employee, tenantId) =>
  (employee?.jurisdictions || [])
    .map((j) => j?.boundary)
    .filter((b) => typeof b === "string" && b.length > 0 && b !== tenantId && !b.includes("."));

// Same "current assignment" semantics as the CSR create form's department
// gate (isCurrentAssignment !== false: an absent flag counts as current).
const currentDepartments = (employee) => {
  const set = new Set();
  (employee?.assignments || [])
    .filter((a) => a?.isCurrentAssignment !== false && a?.department)
    .forEach((a) => set.add(a.department));
  return set;
};

// Deterministic string hash (djb2). Selection must not need server-side
// state, so "round-robin" is a stable hash of the seed over the sorted
// candidate list — uniform in expectation, reproducible for a given seed.
const hashString = (s) => {
  let h = 5381;
  const str = String(s || "");
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h;
};

const pickAssignee = (candidates, seed) => {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => (a.user.uuid < b.user.uuid ? -1 : 1));
  return sorted[hashString(seed) % sorted.length];
};

/**
 * Resolve one assignee for a complaint, widening in two tiers:
 *   1. department match AND jurisdiction covers the complaint's locality;
 *   2. department match anywhere in the tenant (jurisdiction data too sparse
 *      or drifted to narrow on — the same fallback philosophy as
 *      BoundaryComponent's jurisdiction prune).
 * Returns { uuid, department, tier } or null (submit unassigned). Never
 * throws — a routing failure must never take the submit down with it.
 */
export const resolveAutoAssignee = ({ employees, departmentCode, localityCode, boundaryRoots, tenantId, seed }) => {
  try {
    if (!departmentCode) return null;
    const base = (employees || []).filter(
      (e) => e?.user?.uuid && e?.isActive !== false && currentDepartments(e).has(departmentCode)
    );
    if (base.length === 0) return null;
    // Walk the boundary path narrowest-first and stop at the first level that
    // has anyone: the ward officer wins over the sub-county officer above
    // them, who wins over the county. Only when no level on the path has a
    // candidate do we widen to department-only.
    const path = boundaryAncestorCodes(boundaryRoots, localityCode) || [];
    for (const code of path) {
      const atLevel = base.filter((e) => usableJurisdictionCodes(e, tenantId).includes(code));
      const picked = pickAssignee(atLevel, seed);
      if (picked) {
        return {
          uuid: picked.user.uuid,
          department: departmentCode,
          tier: "DEPARTMENT_AND_JURISDICTION",
          jurisdiction: code,
        };
      }
    }
    const picked = pickAssignee(base, seed);
    if (!picked) return null;
    return {
      uuid: picked.user.uuid,
      department: departmentCode,
      tier: "DEPARTMENT",
    };
  } catch (e) {
    return null;
  }
};
