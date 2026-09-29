/**
 * Manual escalation (Bomet UAT): the officer holding a complaint escalates it
 * one level up — Sub-County Administrator -> Director -> Chief Officer -> CECM.
 *
 * Who the escalation popup offers: the roles that act at the NEXT level but not
 * at the current one. PGR_LME can RESOLVE/REJECT at every escalated level and
 * SYSTEM runs the SLA escalation at each, so "who acts at the next state" alone
 * would offer LMEs again; subtracting the current level's actors leaves exactly
 * the next tier. Derived from the live workflow, so no role name is hardcoded:
 * each department's own tier (ADMIN_*, HEALTH_*, WATER_*) comes through and the
 * picker's department filter narrows it to the complaint's department.
 */
export const actingRoles = (state) => new Set((state?.actions || []).flatMap((a) => a?.roles || []));

export const nextLevelRoles = ({ currentState, nextStateRoles }) => {
  const current = actingRoles(currentState);
  return (nextStateRoles || []).filter((r) => !current.has(r));
};

// The same additionalDetail keys pgr-services' EscalationService writes on an
// SLA escalation. The scheduler reads escalationLevel to pick each level's
// deadline and to stop at maxDepth, so a manual escalation must advance it too.
export const escalationStamp = ({ additionalDetail, assignees, now }) => ({
  escalationLevel: (Number(additionalDetail?.escalationLevel) || 0) + 1,
  lastEscalatedAt: now,
  escalatedFrom: (assignees || []).map((a) => a?.uuid).filter(Boolean),
});

// Escalating is the holder's call, not every officer who can open the page:
// Take Action on this tenant is role-based, so without this any LME of the
// department would see ESCALATE on a colleague's complaint.
export const isCurrentAssignee = ({ assignees, userUuid }) =>
  !!userUuid && (assignees || []).some((a) => a?.uuid === userUuid);
