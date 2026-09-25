import { currentDepartments } from "./autoAssign";

/**
 * Department-grouped options for the Assign/Reassign picker's nested dropdown.
 *
 * A person is listed under the department(s) they CURRENTLY hold, never under
 * `assignments[0]`: HRMS keeps ended assignments in the list and returns them
 * in no stable order, so the first entry could be a department the person left
 * (cms-pilot ADMIN showed under Street Lights or Health & Sanitation depending
 * on the response, while its only current department is Center). The picked
 * option's `department` is stamped onto the complaint, so a stale one also
 * mis-routed it. Deactivated employees are dropped even when HRMS ignores the
 * `isActive` search param.
 *
 * `allDepartments` is true for a CMS_SCREENING_OFFICER (routes across EVERY
 * department) and for REASSIGN (department-agnostic by design). An unmapped
 * complaint type (department "NA" or absent) is unscoped too: pgr-services
 * skips its department validation for these, so filtering by "NA" would empty
 * the dropdown. Everyone else sees only the complaint's department. Groups and
 * people keep the HRMS response order, as the picker always did.
 */
export const buildAssigneeGroups = (employees, { department, allDepartments, deptLabel = (code) => code } = {}) => {
  const unscoped = allDepartments || !department || department === "NA";
  const groups = new Map();
  (employees || []).forEach((employee) => {
    const uuid = employee?.user?.uuid;
    if (!uuid || employee?.isActive === false) return;
    currentDepartments(employee).forEach((code) => {
      if (!unscoped && code !== department) return;
      if (!groups.has(code)) groups.set(code, { code, name: deptLabel(code), options: [] });
      const group = groups.get(code);
      const label = `${employee.user?.name} (${group.name})`;
      group.options.push({
        code: label,
        name: label,
        uuid,
        userServiceUUID: employee.user?.userServiceUuid,
        mobileNumber: employee.user?.mobileNumber,
        department: code,
      });
    });
  });
  return [...groups.values()];
};
