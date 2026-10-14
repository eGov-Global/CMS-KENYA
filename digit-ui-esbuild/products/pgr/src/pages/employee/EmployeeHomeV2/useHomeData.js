// One data hook for the whole employee home.
//
// Request budget matters here: the field offices run on slow links, so the
// page makes as few calls as it can and never polls.
//   round trip 1  -> 3 (intake: 4) tiny `_count` calls + the FIRST page of
//                   `_search`, all in parallel
//   round trip 2  -> only when the total exceeds one page: up to two more
//                   pages, in parallel
//   + serviceDefs  (SessionStorage / MDMS IndexedDB cache — usually free)
//   + oversight    one analytics `_query` batch, optional; a 403 or an outage
//                  simply degrades the two county-wide charts to the sample
//
// PAGE is 10 because pgr-services enriches every row through egov-workflow,
// whose default page size is 10; a single `_search` above that fails with
// WORKFLOW_NOT_FOUND (reproduced on the local stack). Paging by offset works.
//
// Scope is a SERVER concern. This hook only forwards the criterion that
// selects the caller's own queue (`assignee`) or own intake (`createdBy`),
// plus the `scope` the server-side inbox endpoints need (homeQuery.js); what
// the search returns is decided by pgr-services' visibility rules, never by
// the client.
//
// Failures degrade, never flatten: a count that could not be read is `null`
// (rendered as "—"), a page that failed is simply absent, and `isError` is
// only raised when NOTHING came back — the page then shows a retry panel
// instead of a wall of zeros.

import { useQuery } from "react-query";
import { Request } from "@egovernments/digit-ui-libraries";
import Urls from "../../../utils/urls";
import useInboxVisibility from "../../../hooks/pgr/useInboxVisibility";
import { SCOPE, homeQueryParams } from "./homeQuery";
import { deriveHomeData, OPEN_STATES, RESOLVED_STATES, startOfDay } from "./deriveHomeData";

const ANALYTICS_QUERY_URL = "/pgr-services/v2/analytics/_query";
const PAGE = 10;
const MAX_PAGES = 3;

// Re-exported so the page keeps importing SCOPE from the hook.
export { SCOPE };

const post = (url, params = {}, data = {}) =>
  Request({ url, method: "POST", auth: true, userService: true, useCache: false, params, data });

/** One `_count`. Resolves to a number, or null when it could not be read. */
const countFor = async (url, params, onError) => {
  try {
    const res = await post(url, params);
    const n = res?.count ?? res?.Count;
    return typeof n === "number" ? n : null;
  } catch (e) {
    onError?.(e);
    return null;
  }
};

/** One `_search` page. Resolves to { wrappers, extras } or null on failure. */
const pageFor = async (url, params, offset, onError) => {
  try {
    const res = await post(url, { ...params, limit: PAGE, offset });
    return {
      wrappers: res?.ServiceWrappers || [],
      extras: { avgResolutionMs: res?.averageResolutionTime },
    };
  } catch (e) {
    onError?.(e);
    return null;
  }
};

/** Leaf complaint types (SLA hours + department). Cached by the inbox already. */
const loadServiceDefs = async (tenantId) => {
  const cached = Digit.SessionStorage.get("serviceDefs");
  if (Array.isArray(cached) && cached.length) return cached;
  try {
    const defs = await Digit.MDMSService.getServiceDefs(tenantId, "PGR");
    if (Array.isArray(defs) && defs.length) Digit.SessionStorage.set("serviceDefs", defs);
    return Array.isArray(defs) ? defs : [];
  } catch (e) {
    return [];
  }
};

const count = (name, agg = "count") => [{ name, agg }];
const ANALYTICS_QUERIES = {
  byDept: { grain: "facts", window: { name: "all" }, dimensions: ["department_code"], measures: count("n"), sort: [{ by: "n", dir: "desc" }], limit: 8 },
  byWard: { grain: "facts", window: { name: "all" }, dimensions: ["ward_code"], measures: count("n"), sort: [{ by: "n", dir: "desc" }], limit: 6 },
  openByWard: { grain: "facts", window: { name: "all" }, filters: { is_open: true }, dimensions: ["ward_code"], measures: count("n"), sort: [{ by: "n", dir: "desc" }], limit: 5 },
};

/**
 * County-wide breakdowns for the oversight tier. Optional: the capability is
 * granted per role in egov-accesscontrol and a tenant may not have it wired.
 */
const fetchAnalytics = async (tenantId) => {
  try {
    const res = await post(ANALYTICS_QUERY_URL, {}, { tenantId, queries: ANALYTICS_QUERIES });
    if (!res?.results) return { available: false };
    const rows = (key, dim) =>
      (res.results[key]?.rows || [])
        .map((r) => ({ key: r[dim], n: Number(r.n) || 0 }))
        .filter((r) => r.key != null && r.key !== "");
    return {
      available: true,
      byDept: rows("byDept", "department_code"),
      byWard: rows("byWard", "ward_code"),
      openByWard: rows("openByWard", "ward_code"),
    };
  } catch (e) {
    return { available: false };
  }
};

/**
 * @param {object}  opts
 * @param {string}  opts.scope          one of SCOPE
 * @param {boolean} opts.withAnalytics  oversight only — try the analytics batch
 */
const useHomeData = ({ scope = SCOPE.ALL, withAnalytics = false } = {}) => {
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const uuid = Digit.UserService.getUser()?.info?.uuid;

  // Same endpoint choice as the inbox: the visibility endpoints when the
  // tenant has opted into server-resolved scope, else the plain ones.
  const { serverSide, isLoading: visLoading } = useInboxVisibility();
  const searchUrl = serverSide ? Urls.pgr.visibilitySearch : Urls.pgr.search;
  const countUrl = serverSide ? Urls.pgr.visibilityCount : Urls.pgr.search.replace("_search", "_count");

  const base = homeQueryParams({ tenantId, uuid, scope, serverSide });

  const query = useQuery(
    ["pgr-home-data", tenantId, uuid, scope, serverSide, withAnalytics],
    async () => {
      const now = Date.now();
      const statuses = [];
      const onError = (e) => statuses.push(e?.response?.status ?? 0);
      const [total, open, resolved, today, page0] = await Promise.all([
        countFor(countUrl, base, onError),
        countFor(countUrl, { ...base, applicationStatus: OPEN_STATES }, onError),
        countFor(countUrl, { ...base, applicationStatus: RESOLVED_STATES }, onError),
        scope === SCOPE.LOGGED ? countFor(countUrl, { ...base, fromDate: startOfDay(now) }, onError) : Promise.resolve(null),
        pageFor(searchUrl, base, 0, onError),
      ]);

      const wrappers = [...(page0?.wrappers || [])];
      let lastPageFull = !!page0 && wrappers.length >= PAGE;
      if (total != null && total > PAGE && page0) {
        // known total: fetch exactly the pages needed, in parallel
        const pages = Math.min(MAX_PAGES, Math.ceil(total / PAGE));
        const more = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) => pageFor(searchUrl, base, (i + 1) * PAGE, onError))
        );
        more.forEach((p) => p && wrappers.push(...p.wrappers));
      } else if (total == null && lastPageFull) {
        // count failed: the only way to know whether more exists is to keep
        // paging while pages come back full (up to the cap)
        for (let i = 1; i < MAX_PAGES && lastPageFull; i += 1) {
          const p = await pageFor(searchUrl, base, i * PAGE, onError);
          if (!p) break;
          wrappers.push(...p.wrappers);
          lastPageFull = p.wrappers.length >= PAGE;
        }
      }

      const [defs, analytics] = await Promise.all([
        loadServiceDefs(tenantId),
        withAnalytics ? fetchAnalytics(tenantId) : Promise.resolve({ available: false }),
      ]);

      const derived = deriveHomeData({
        wrappers,
        defs,
        totals: { total, open, resolved, today },
        extras: page0?.extras || {},
        lastPageFull,
        now,
      });
      const nothing = !page0 && total == null && open == null && resolved == null;
      return {
        ...derived,
        analytics,
        nothing,
        // false when the first page could not be read: every sample-derived figure
        // (past SLA, charts, feed) is then UNKNOWN, not zero
        sampleOk: !!page0,
        // 401/403 means "not allowed", which the page words differently from "down"
        forbidden: statuses.some((st) => st === 401 || st === 403),
      };
    },
    // wait for the visibility flag: it decides WHICH endpoints to call, and it
    // starts false while its MDMS read is in flight
    { enabled: !visLoading, retry: false, staleTime: 60_000, refetchOnWindowFocus: false, keepPreviousData: true }
  );

  return {
    data: query.data || null,
    isLoading: visLoading || query.isLoading,
    isFetching: query.isFetching,
    // "error" = the page has nothing at all to show, not "one count failed"
    isError: query.isError || !!query.data?.nothing,
    refetch: query.refetch,
  };
};

export default useHomeData;
