import { useMemo } from "react";
import { currentDesignationCode, designationLabel } from "../../utils/employeeLabels";

/**
 * The logged-in employee's designation as a display label ("Call Centre
 * Employee"), for the top bar greeting. The user token carries no designation,
 * so it comes from the employee's own HRMS record (the same query the create
 * form and the details page make, so it is usually a cache hit), labelled via
 * the COMMON_MASTERS_DESIGNATION_* seeds with the designation master's name as
 * the fallback. Returns null while loading or when the account has no HRMS
 * record (a workbench/admin login) — callers fall back to the name.
 */
const useEmployeeDesignation = (tenantId, t) => {
  const userInfo = Digit.UserService?.getUser?.();
  const uuid = userInfo?.info?.uuid;
  const isEmployee = userInfo?.info?.type === "EMPLOYEE";
  const hrmsContext = window?.globalConfigs?.getConfig?.("HRMS_CONTEXT_PATH") || "egov-hrms";
  const { data: employeeData } = Digit.Hooks.useCustomAPIHook({
    url: `/${hrmsContext}/employees/_search`,
    params: { tenantId, uuids: uuid },
    changeQueryName: `hrms-current-employee-${uuid}`,
    options: { staleTime: 5 * 60 * 1000, cacheTime: 10 * 60 * 1000 },
    config: { enabled: !!tenantId && !!uuid && isEmployee },
  });
  const { data: designationRows } = Digit.Hooks.useCustomMDMS(
    tenantId,
    "common-masters",
    [{ name: "Designation" }],
    { select: (d) => d?.["common-masters"]?.Designation || [], enabled: !!tenantId && isEmployee },
    { schemaCode: "common-masters.Designation" }
  );
  return useMemo(() => {
    const code = currentDesignationCode(employeeData?.Employees?.[0]);
    if (!code) return null;
    return designationLabel(t, code, Array.isArray(designationRows) ? designationRows : []);
  }, [employeeData, designationRows, t]);
};

export default useEmployeeDesignation;
