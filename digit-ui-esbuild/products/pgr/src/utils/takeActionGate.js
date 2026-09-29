/**
 * Whether the employee complaint details page offers Take Action.
 *
 * Nairobi product rule: only the employee the complaint is currently assigned
 * to may act on it — with one exception, the assignment queue. A complaint that
 * nobody holds yet, sitting in a state that offers ASSIGN (PENDINGFORASSIGNMENT
 * on nb), is open to every role that can act on that state. Without it,
 * complaints filed by employees (never auto-assigned) and citizen complaints in
 * a department with no GRO of its own could never be picked up by anyone.
 *
 * The viewer must still hold a role on at least one of the state's actions.
 * This is a UI gate only: pgr-services / workflow-v2 authorise by role.
 */
export const canTakeAction = ({ state, assignees, userUuid, userRoles }) => {
  const actions = state?.actions;
  if (!actions) return false;
  const assignedTo = (assignees || []).map((a) => a?.uuid).filter(Boolean);
  const isOpenAssignmentQueue = assignedTo.length === 0 && actions.some((a) => a?.action === "ASSIGN");
  if (!isOpenAssignmentQueue && !assignedTo.includes(userUuid)) return false;
  const actionRoles = new Set(actions.flatMap((a) => a?.roles || []));
  return (userRoles || []).some((r) => actionRoles.has(r));
};
