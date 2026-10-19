import { WorkflowService } from "../services/workflow/Workflow";
import { latestParticipantByRole, pickReopenAssignee } from "./workflowHistory";

// Workflow-history lookups for routing a citizen or employee action to a
// specific staff member. CCSD-2167 introduced them for the CMS workflow:
//   - Rate Us -> the CASE MANAGER (CMS_CASE_MANAGER) who last handled it
//   - Reopen  -> the SUPERVISOR   (CMS_SUPERVISOR)   who handled it
// and the reopen now also covers the standard GRO/LME workflow (see
// findReopenAssignee / pickReopenAssignee): back to the officer the complaint
// was last with at the state it re-enters.
//
// The history comes from /egov-workflow-v2/egov-wf/process/_search?history=true.
// Every step's `assignes[]` (routed TO) and `assigner` (the actor) carry a
// `uuid` and a structured `roles: [{ code }]` array — verified live on
// cms-pilot for both an employee and a CITIZEN token, so the citizen flows can
// read it.
// The pure reads live in utils/workflowHistory.js; this module only fetches.

const fetchHistory = async (stateCode, businessId, onFailure) => {
  try {
    const response = await WorkflowService.getByBusinessId(stateCode, businessId, {}, true);
    return Array.isArray(response && response.ProcessInstances) ? response.ProcessInstances : [];
  } catch (e) {
    // Never block the reopen/rate/reassign on a history-fetch failure, but say
    // so: this catch silently masked a broken URL (Urls.WorkFlowProcessSearch
    // never existed) for days, making the whole derivation a no-op.
    console.warn(`workflowAssignee: history fetch failed for ${businessId}; ${onFailure}`, e);
    return null;
  }
};

/**
 * Most-recent workflow-history participant holding `roleCode`, as a bare user
 * UUID (the shape the PGR workflow payload's `assignes` expects), or null.
 * Assignees are preferred over actors (see latestParticipantByRole).
 *
 * @param {string} stateCode  state tenant (workflow is searched at state level)
 * @param {string} businessId complaint serviceRequestId
 * @param {string} roleCode   e.g. "CMS_SUPERVISOR" | "CMS_CASE_MANAGER"
 * @returns {Promise<string|null>}
 */
export const findLatestAssigneeUuidByRole = async (stateCode, businessId, roleCode) => {
  if (!stateCode || !businessId || !roleCode) return null;
  const instances = await fetchHistory(stateCode, businessId, "sending no assignee");
  return instances ? latestParticipantByRole(instances, roleCode) : null;
};

/**
 * Who a citizen reopen goes back to, from one history fetch (see
 * pickReopenAssignee for the order). Null when the history names nobody or
 * the fetch fails; the caller then routes by department.
 *
 * @param {string} stateCode
 * @param {string} businessId
 * @param {{ targetStates: string[], reopenRoles: string[] }} opts
 * @returns {Promise<string|null>}
 */
export const findReopenAssignee = async (stateCode, businessId, opts) => {
  if (!stateCode || !businessId) return null;
  const instances = await fetchHistory(stateCode, businessId, "routing the reopen by department instead");
  return instances ? pickReopenAssignee(instances, opts) : null;
};
