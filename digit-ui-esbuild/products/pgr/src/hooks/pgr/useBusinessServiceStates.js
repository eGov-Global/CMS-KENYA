import { useMemo } from "react";
import { useQuery } from "react-query";
import { Request } from "@egovernments/digit-ui-libraries";
import Urls from "../../utils/urls";

/**
 * useBusinessServiceStates — reads the PGR workflow BusinessService and exposes
 * the set of open/actionable states (every non-terminal state with actions).
 *
 * Visibility V1 uses this as the shared STATUS scope for both inbox tabs: the
 * tabs differ on the assignee axis (My = assigned to me, All = everyone's),
 * not the status axis. Deriving "open" from the live BusinessService instead
 * of a hardcoded list keeps the inbox correct for tenants with customised
 * workflows. The reportee/jurisdiction-aware resolver is server-side Step 2
 * (CCRS/VISIBILITY-DESIGN.md §4).
 *
 * The return is reference-stable (useMemo): PGRInbox memoizes the composer
 * config off it, and the composer treats config identity as load-bearing
 * (see the CCRS#558 note in PGRInbox.js).
 */
const codeOf = (s) => s?.applicationStatus || s?.state;
const isActionable = (s) => !s?.isTerminateState && Array.isArray(s?.actions) && s.actions.length > 0;

const useBusinessServiceStates = (tenantId, { enabled = true } = {}) => {
  const fetchBusinessService = async () => {
    const wfBs = await Request({
      url: Urls.workflow.businessServiceSearch,
      method: "POST",
      auth: true,
      userService: true,
      useCache: true,
      params: { tenantId, businessServices: "PGR" },
    });
    return wfBs?.BusinessServices?.[0] || null;
  };

  // Cache the whole BusinessService (not just states) under the one shared
  // key so other consumers (useAutoAssignment's role derivation) don't issue
  // a second identical request for the same tenant.
  const { data: businessService = null, isLoading } = useQuery(
    ["pgrBusinessServiceStates", tenantId],
    fetchBusinessService,
    { staleTime: 5 * 60 * 1000, retry: false, refetchOnWindowFocus: false, enabled: !!tenantId && enabled }
  );

  // Every open/actionable state (any non-terminal state that has actions).
  // Keyed on the query data (stable between renders), NOT a per-render
  // `states` array — the reference stability of this return is load-bearing
  // for PGRInbox's composer config (CCRS#558).
  const allActionableStates = useMemo(
    () => (businessService?.states || []).filter(isActionable).map(codeOf).filter(Boolean),
    [businessService]
  );

  return { allActionableStates, businessService, isLoading };
};

export default useBusinessServiceStates;
