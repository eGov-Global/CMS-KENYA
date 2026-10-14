// Pure reads over a complaint's workflow history (process instances from
// egov-wf/process/_search?history=true). No network, so the routing rules can
// be tested against realistic histories. utils/workflowAssignee.js fetches the
// history and calls these.

const rolesOf = (user) => ((user && Array.isArray(user.roles)) ? user.roles : []).map((r) => r && r.code).filter(Boolean);

// Most-recent first: "last handled" wins when a role appears across several
// steps (reassignment, repeated investigation rounds).
const newestFirst = (instances) =>
  [...(Array.isArray(instances) ? instances : [])].sort(
    (a, b) => (b?.auditDetails?.lastModifiedTime || 0) - (a?.auditDetails?.lastModifiedTime || 0)
  );

/**
 * Most-recent history participant holding `roleCode`, as a user uuid, or null.
 * `assignes` (routed-to) is preferred over `assigner` (actor); assigner is a
 * fallback so a role that only ever appears as an actor is still found.
 */
export const latestParticipantByRole = (processInstances, roleCode) => {
  if (!roleCode) return null;
  const ordered = newestFirst(processInstances);
  for (const pi of ordered) {
    for (const a of pi?.assignes || []) {
      if (a?.uuid && rolesOf(a).includes(roleCode)) return a.uuid;
    }
  }
  for (const pi of ordered) {
    if (pi?.assigner?.uuid && rolesOf(pi.assigner).includes(roleCode)) return pi.assigner.uuid;
  }
  return null;
};

/**
 * latestParticipantByRole for each code IN ORDER; the first role with a holder
 * wins (not the most recent holder across roles).
 */
export const latestParticipantByAnyRole = (processInstances, roleCodes) => {
  for (const role of (Array.isArray(roleCodes) ? roleCodes : []).filter(Boolean)) {
    const uuid = latestParticipantByRole(processInstances, role);
    if (uuid) return uuid;
  }
  return null;
};

/**
 * The user who most recently held the complaint while it sat in one of
 * `stateNames` — the assignee of the newest step that landed there — provided
 * they still hold one of `allowedRoles` (the roles that can act on that state;
 * the workflow engine refuses anyone else as assignee). Older holders are tried
 * when the newest one no longer qualifies. Pass `allowedRoles` undefined to
 * accept any assignee; an empty list accepts nobody.
 */
export const latestHolderAtState = (processInstances, stateNames, allowedRoles) => {
  const wanted = new Set((Array.isArray(stateNames) ? stateNames : []).filter(Boolean));
  if (wanted.size === 0) return null;
  if (Array.isArray(allowedRoles) && allowedRoles.length === 0) return null;
  const allowed = Array.isArray(allowedRoles) ? new Set(allowedRoles) : null;
  for (const pi of newestFirst(processInstances)) {
    if (!wanted.has(pi?.state?.state)) continue;
    for (const a of pi?.assignes || []) {
      if (!a?.uuid) continue;
      if (allowed && !rolesOf(a).some((r) => allowed.has(r))) continue;
      return a.uuid;
    }
  }
  return null;
};

/**
 * Who a citizen reopen goes back to, from the history alone (null when the
 * history names nobody; the caller then routes by department).
 *
 * 1. CMS_SUPERVISOR — the Mozambique CMS workflow's reopen owner.
 * 2. Whoever held the complaint the last time it sat in the state REOPEN
 *    returns it to, if they can still act there. On Nairobi that is the
 *    officer it was last with at PENDINGATLME — the director the GRO
 *    assigned, or whoever an earlier reopen routed it to. Escalation to a
 *    chief officer or CECM happens at other states, and a send-back to the
 *    GRO queue lands at PENDINGFORREASSIGNMENT, so neither counts.
 * 3. The latest participant holding a role that can act on that state, tried
 *    role by role. Before step 2 existed this was the only history step, and
 *    on Nairobi's widened workflow (CECM listed first) it sent escalated
 *    complaints to the CECM or chief officer.
 *
 * @param {object[]} processInstances
 * @param {{ targetStates: string[], reopenRoles: string[] }} opts
 */
export const pickReopenAssignee = (processInstances, { targetStates, reopenRoles } = {}) =>
  latestParticipantByRole(processInstances, "CMS_SUPERVISOR") ||
  latestHolderAtState(processInstances, targetStates, reopenRoles || []) ||
  latestParticipantByAnyRole(processInstances, reopenRoles) ||
  null;
