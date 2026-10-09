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

