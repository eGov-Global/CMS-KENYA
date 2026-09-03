import { useCallback } from "react";
import { useQuery } from "react-query";
import { Request } from "@egovernments/digit-ui-libraries";
import useBusinessServiceStates from "./useBusinessServiceStates";
import useFetchBoundaries from "../boundary/useFetchBoundaries";
import { deriveAssigneeRoles, narrowToLastMile, resolveAutoAssignee } from "../../utils/autoAssign";

const hrmsContext = () => window?.globalConfigs?.getConfig("HRMS_CONTEXT_PATH") || "egov-hrms";

/**
 * useAutoAssignment — prefetches everything client-side routing needs
 * (workflow BusinessService → assignable roles → HRMS candidates, plus the
 * boundary tree) while the user is still filling the form, and exposes a
 * synchronous `resolve()` for the submit handler.
 *
 * `resolve()` is best-effort: if any of the prefetches hasn't landed (slow
 * network) or resolution finds nobody, it returns null and the caller submits
 * unassigned — the pre-feature behaviour. It must never block a submit.
 *
 * All three queries are tenant-keyed; the access-control seeds map both
 * businessservice/_search and egov-hrms/employees/_search to CITIZEN, so the
 * citizen create flow can prefetch them with its own token.
 */
const useAutoAssignment = (tenantId) => {
  // Shares the ["pgrBusinessServiceStates", tenantId] cache entry the inbox
  // already populates — no second BusinessService request per tenant.
  const { businessService } = useBusinessServiceStates(tenantId);

  // Narrow to the last-mile role for create-time assignment (see narrowToLastMile):
  // a new complaint must land on PGR_LME, never a senior PGR_VIEWER.
  const roles = narrowToLastMile(deriveAssigneeRoles(businessService));

  const { data: employees } = useQuery(
    ["pgrAutoAssignEmployees", tenantId, roles.join(",")],
    async () => {
      const res = await Request({
        url: `/${hrmsContext()}/employees/_search`,
        method: "POST",
        auth: true,
        userService: true,
        params: { tenantId, roles: roles.join(","), isActive: true },
      });
      // Project down to the three fields the resolver reads. The HRMS
      // response carries the full employee record (name, mobile number,
      // service history); none of that belongs in a citizen session's memory
      // for 10 minutes. NOTE: this trims what we retain, not what crosses
      // the wire — the response itself is still the full record, which is a
      // deployment-level exposure decision (CITIZEN is already granted this
      // endpoint in the access-control seeds).
      return (res?.Employees || []).map((e) => ({
        isActive: e?.isActive,
        user: { uuid: e?.user?.uuid },
        assignments: (e?.assignments || []).map((a) => ({
          department: a?.department,
          isCurrentAssignment: a?.isCurrentAssignment,
        })),
        jurisdictions: (e?.jurisdictions || []).map((j) => ({ boundary: j?.boundary })),
      }));
    },
    { staleTime: 10 * 60 * 1000, retry: false, refetchOnWindowFocus: false, enabled: !!tenantId && roles.length > 0 }
  );

  // Shares the react-query cache key BoundaryComponent already populates, so
  // in the create flow this is usually a cache hit, not a second fetch.
  const { data: boundaryData } = useFetchBoundaries(tenantId, {
    staleTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!tenantId,
  });

  const resolve = useCallback(
    ({ departmentCode, localityCode, seed }) =>
      resolveAutoAssignee({
        employees,
        departmentCode,
        localityCode,
        boundaryRoots: boundaryData?.[0]?.boundary,
        tenantId,
        seed,
      }),
    [employees, boundaryData, tenantId]
  );

  return { resolve };
};

export default useAutoAssignment;
