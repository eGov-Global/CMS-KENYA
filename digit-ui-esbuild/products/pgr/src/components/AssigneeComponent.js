import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { Dropdown, Loader } from "@egovernments/digit-ui-components";
import { buildAssigneeGroups } from "../utils/assigneeOptions";

const AssigneeComponent = ({ config, onSelect, formState, defaultValues }) => {
  const { t } = useTranslation();
  const [assignees, setAssignees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const hrmsContext = window?.globalConfigs?.getConfig("HRMS_CONTEXT_PATH") || "egov-hrms";

  // Get roles from config populators; buildAssigneeGroups documents how
  // `department` / `allDepartments` scope the list.
  const { roles = [], department, allDepartments } = config?.populators || {};

  // Fetch employee data based on roles
  // Staff lists change on the scale of HRMS edits, not seconds. The hook's
  // defaults (cacheTime 1s / staleTime 5s) drop the entry almost as soon as the
  // action modal closes, so every re-open refetched the FULL employee list —
  // measured: three modal opens produced three identical ~220KB fetches. Each
  // in-flight copy sits in egov-hrms's heap, so the redundant calls inflated
  // its peak memory for no user-visible benefit. Minutes-long windows collapse
  // an open/close/re-open cycle to a single request.
  const { 
    isLoading: isEmployeeDataLoading, 
    data: employeeData, 
    error 
  } = Digit.Hooks.useCustomAPIHook({
    url: `/${hrmsContext}/employees/_search`,
    params: {
      tenantId: tenantId,
      roles: roles.join(","),
      isActive: true,
    },
    changeQueryName: `hrms-assignees-${tenantId}-${roles.join(",")}`,
    options: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    },
    config: {
      enabled: roles.length > 0,
    },
  });

  // Department display name. Onboarding seeds COMMON_MASTERS_DEPARTMENT_<code>
  // (not DEPARTMENT_<code>), so use that key; fall back to the raw code.
  const deptLabel = (code) => {
    const deptKey = `COMMON_MASTERS_DEPARTMENT_${code}`;
    return t(deptKey) === deptKey ? code : t(deptKey);
  };

  // Update assignees when employee data changes
  useEffect(() => {
    if (employeeData?.Employees?.length > 0) {
      setAssignees(buildAssigneeGroups(employeeData.Employees, { department, allDepartments, deptLabel }));
    }
  }, [employeeData]);

  // Handle employee selection
  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    if (employee && config?.key) {
      onSelect(config.key, employee);
    }
  };
  

  if (error) return <div>{t("CS_COMMON_EMPLOYEE_FETCH_ERROR")}</div>;
  if (isEmployeeDataLoading) return <Loader />;

  // CCSD-2124: the assignee is mandatory on ASSIGN, so an EMPTY list would
  // leave the operator stuck behind a generic "required field" toast with no
  // way to see why. Say it plainly: nobody with the required role exists in
  // the scoped department (or tenant) — a staffing/onboarding gap, not a UI
  // failure. The submit stays blocked (mandatory + no value).
  if (!assignees || assignees.length === 0) {
    const K = "CS_COMMON_NO_ASSIGNABLE_EMPLOYEES";
    const msg =
      t(K) === K
        ? "No eligible employee found for this department. An employee with the required role must be onboarded before this complaint can be assigned."
        : t(K);
    return (
      <div className="assignee-dropdown-container">
        <div style={{ color: "var(--color-error, #d4351c)", fontSize: "0.875rem", fontWeight: 500 }}>{msg}</div>
      </div>
    );
  }

  // One control: the dropdown's own input is the search box. Typing filters
  // the department-grouped list by department OR person (the atom matches
  // nested children, not just group headers).
  const searchLabel = t("CS_COMMON_SEARCH_EMPLOYEE") === "CS_COMMON_SEARCH_EMPLOYEE" ? "Search by name or department" : t("CS_COMMON_SEARCH_EMPLOYEE");

  return (
    <div className="assignee-dropdown-container">
      <Dropdown
        t={t}
        option={assignees}
        optionKey="name"
        selected={selectedEmployee}
        select={(value) => {
          handleEmployeeSelect(value);
        }}
        isSearchable
        placeholder={searchLabel}
        label={t(config.label)}
        variant="nesteddropdown"
      />
    </div>
  );
};

export default AssigneeComponent;
