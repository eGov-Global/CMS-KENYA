import { WorkflowService } from "../services/workflow/Workflow";
import { latestParticipantByRole } from "./workflowHistory";

const rolesOf = (user) => ((user && Array.isArray(user.roles)) ? user.roles : []).map((r) => r && r.code).filter(Boolean);

// Never block a reopen/rate/reassign on a history-fetch failure — the caller
// falls back (no assignee, or fresh department routing). But say so: this
// catch once silently masked a broken URL for days.
const fetchHistory = async (stateCode, businessId, onFailure) => {
  try {
    const response = await WorkflowService.getByBusinessId(stateCode, businessId, {}, true);
    return Array.isArray(response && response.ProcessInstances) ? response.ProcessInstances : [];
  } catch (e) {
    console.warn(`workflowAssignee: history fetch failed for ${businessId}; ${onFailure}`, e);
    return null;
  }
};

/**
 * Most-recent workflow-history participant holding `roleCode`, as a bare user
 * UUID (the shape the PGR workflow payload's `assignes` expects), or null.
 *
 * `assignes` (routed-to) is preferred over `assigner` (actor) because the
 * ticket's intent is "the complaint was assigned to this person"; the actor
 * is a fallback (`includeActor`, default true) so a role that only ever
 * appears as an actor is still found. Pass `includeActor: false` where an
 * actor-derived pick could name someone pgr-services rejects (a superuser or
 * cross-department director who resolved it).
 *
 * @param {string} stateCode  state tenant (workflow is searched at state level)
 * @param {string} businessId complaint serviceRequestId
 * @param {string} roleCode   e.g. "CMS_SUPERVISOR" | "CMS_CASE_MANAGER"
 * @returns {Promise<string|null>}
 */
export const findLatestAssigneeUuidByRole = async (stateCode, businessId, roleCode, { includeActor = true } = {}) => {
  if (!stateCode || !businessId || !roleCode) return null;
  const instances = await fetchHistory(stateCode, businessId, "sending no assignee");
  if (!instances) return null;
  if (includeActor) return latestParticipantByRole(instances, roleCode);
  // Most-recent first: "last handled" wins when a role appears across several
  // steps (reassignment, repeated investigation rounds).
  const ordered = [...instances].sort(
    (a, b) => (b?.auditDetails?.lastModifiedTime || 0) - (a?.auditDetails?.lastModifiedTime || 0)
  );
  for (const pi of ordered) {
    for (const a of pi?.assignes || []) {
      if (a?.uuid && rolesOf(a).includes(roleCode)) return a.uuid;
    }
  }
  return null;
};

/**
 * Same lookup, but for ANY of several role codes — the first (most recent)
 * history participant holding one of them wins.
 *
 * Bomet's 2-level workflow has no single fixed "supervisor" role the way the
 * CMS workflow does: the assignable set is derived from the live
 * BusinessService (deriveAssigneeRoles -> e.g. PGR_LME, PGR_VIEWER), so the
 * caller passes that list rather than hardcoding a role that may not exist
 * on this tenant.
 *
 * @param {string} stateCode   tenant the workflow is searched at
 * @param {string} businessId  complaint serviceRequestId
 * @param {string[]} roleCodes e.g. ["PGR_LME", "PGR_VIEWER"]
 * @returns {Promise<string|null>}
 */
export const findLatestAssigneeUuidByAnyRole = async (stateCode, businessId, roleCodes, opts = {}) => {
  const wanted = (Array.isArray(roleCodes) ? roleCodes : []).filter(Boolean);
  if (!stateCode || !businessId || wanted.length === 0) return null;
  for (const role of wanted) {
    const uuid = await findLatestAssigneeUuidByRole(stateCode, businessId, role, opts);
    if (uuid) return uuid;
  }
  return null;
};

