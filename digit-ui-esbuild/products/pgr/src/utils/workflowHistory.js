// Pure reads over a complaint's workflow history (process instances from
// egov-wf/process/_search?history=true). No network, so the routing rules can
// be tested against realistic histories.

const rolesOf = (user) => ((user && Array.isArray(user.roles)) ? user.roles : []).map((r) => r && r.code).filter(Boolean);

const newestFirst = (instances) =>
  [...(Array.isArray(instances) ? instances : [])].sort(
    (a, b) => (b?.auditDetails?.lastModifiedTime || 0) - (a?.auditDetails?.lastModifiedTime || 0)
  );

/**
 * The user who most recently held the complaint while it sat in one of
 * `stateNames` — the assignee of the newest step that landed there — provided
 * they still hold one of `allowedRoles` (the roles that can act on that state;
 * the workflow engine refuses anyone else as assignee). Older holders are
 * tried when the newest one no longer qualifies. Null when nobody did.
 *
 * Reopen uses this to send a complaint back to the officer it was with at the
 * state it re-enters. That is the person the GRO assigned, however the case
 * moved afterwards: escalation (chief officer, CECM) happens at other states,
 * and a send-back to the GRO queue lands at PENDINGFORREASSIGNMENT.
 *
 * @param {object[]} processInstances history, any order
 * @param {string[]} stateNames       e.g. ["PENDINGATLME"]
 * @param {string[]} [allowedRoles]   omit to accept any assignee
 * @returns {string|null} user uuid
 */
export const latestHolderAtState = (processInstances, stateNames, allowedRoles) => {
  const wanted = new Set((Array.isArray(stateNames) ? stateNames : []).filter(Boolean));
  if (wanted.size === 0) return null;
  const allowed = Array.isArray(allowedRoles) && allowedRoles.length > 0 ? new Set(allowedRoles) : null;
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
