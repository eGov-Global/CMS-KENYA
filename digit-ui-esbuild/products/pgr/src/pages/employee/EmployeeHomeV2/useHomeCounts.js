// Home KPI counts.
//
// DELIBERATELY NOT `useTabCounts`. That hook returns ALERT counts —
// new-since-last-seen, against a high-water cursor that `markSeen` advances
// when a tab is opened. Reusing it here would show an officer "12" that
// silently drops to 0 once they visit the inbox. The home needs TOTALS, so
// this calls the same `_count` endpoint with no `fromDate` and no cursor.
//
// Failure is propagated, never flattened. `useTabCounts.rawCount` catches
// everything and returns 0, which would render a 403 or an outage as
// "nothing to do" — the single most dangerous thing this screen could say to
// a supervisor. Here an error resolves the count to `null`, and the KPI card
// renders "—" for null, distinctly from a genuine "0".

import { useQuery } from "react-query";
import { Request } from "@egovernments/digit-ui-libraries";
import Urls from "../../../utils/urls";
import useInboxVisibility from "../../../hooks/pgr/useInboxVisibility";

/** One `_count` call. Resolves to a number, or null when it could not be read. */
const countFor = async (url, tenantId, criteria) => {
  try {
    const res = await Request({
      url,
      method: "POST",
      auth: true,
      userService: true,
      useCache: false,
      params: { tenantId, ...criteria },
    });
    const n = res?.count ?? res?.Count ?? null;
    return typeof n === "number" ? n : null;
  } catch (e) {
    // null, not 0 — the caller must be able to tell "none" from "unknown".
    return null;
  }
};

/**
 * @param {object} opts
 * @param {string[]} opts.openStates    states counted as "open"
 * @param {boolean}  opts.mineOnly      scope to the caller (casework/intake)
 * @returns {{ counts: object, isLoading: boolean }} counts values are
 *          `number | null`; null means unavailable.
 */
const useHomeCounts = ({ openStates = [], mineOnly = false } = {}) => {
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const user = Digit.UserService.getUser();
  const uuid = user?.info?.uuid;

  // Same endpoint selection as useTabCounts: the visibility endpoint when the
  // tenant has opted into server-resolved scope, else the plain _count derived
  // from the search URL. NOTE: when serverSide is false the scope is supplied
  // by the CLIENT, so these figures are a convenience, not a boundary.
  const { serverSide } = useInboxVisibility();
  const countUrl = serverSide ? Urls.pgr.visibilityCount : Urls.pgr.search.replace("_search", "_count");

  // Server-side scoping: passing assignee makes pgr-services resolve the
  // caller's own queue. Without it the count is tenant-wide, which only the
  // oversight tier should ever see. Array form, matching useTabCounts.
  const mine = mineOnly && uuid ? { assignee: [uuid] } : {};

  const { data, isLoading } = useQuery(
    ["pgr-home-counts", tenantId, uuid, mineOnly, serverSide, openStates.join(",")],
    async () => {
      if (!openStates.length) return { open: null, overdue: null, resolved: null };
      const [open, resolved] = await Promise.all([
        countFor(countUrl, tenantId, { ...mine, applicationStatus: openStates }),
        countFor(countUrl, tenantId, { ...mine, applicationStatus: ["RESOLVED"] }),
      ]);
      // NOTE: there is no SLA-breach criterion on _count today, so "overdue"
      // is intentionally left unavailable rather than faked from open counts.
      // Wire it once the aggregate endpoint lands (see the feasibility study).
      return { open, resolved, overdue: null };
    },
    { enabled: openStates.length > 0, retry: false, staleTime: 60_000, refetchOnWindowFocus: false }
  );

  return {
    counts: data || { open: null, overdue: null, resolved: null },
    isLoading,
  };
};

export default useHomeCounts;
