// Query criteria for the employee home's counts and sample page.
//
// Kept free of imports so the rule is unit-testable: what the home asks the
// server for is exactly what decides whether an officer sees figures or a wall
// of zeros.

export const SCOPE = { ALL: "ALL", MINE: "MINE", LOGGED: "LOGGED" };

/**
 * @param {object} o
 * @param {string} o.tenantId
 * @param {string} [o.uuid]        acting user
 * @param {string} o.scope         SCOPE.ALL | SCOPE.MINE | SCOPE.LOGGED
 * @param {boolean} o.serverSide   tenant resolves visibility in pgr-services
 *                                 (RAINMAKER-PGR.InboxVisibilityConfig.serverSide)
 */
export const homeQueryParams = ({ tenantId, uuid, scope, serverSide }) => {
  const base = { tenantId };
  if (scope === SCOPE.MINE && uuid) base.assignee = [uuid];
  if (scope === SCOPE.LOGGED && uuid) base.createdBy = [uuid];
  // The server-side inbox endpoints read visibility from `scope` and DEFAULT
  // to MINE (assignee = me) when it is absent — RequestsApiController. Without
  // it every tier that is not an assignee (intake clerks, assessors, oversight,
  // viewers) counted zero on a tenant with the flag on. Same mapping as the
  // inbox page: MINE for the own queue, TEAM for everything wider; TEAM falls
  // back to the tenant-wide view when the user has no projected reportees.
  if (serverSide) base.scope = scope === SCOPE.MINE ? "MINE" : "TEAM";
  return base;
};
