import test from "node:test";
import assert from "node:assert/strict";
import { humanizeCode, masterLabel, departmentLabel, designationLabel, currentDesignationCode } from "../products/pgr/src/utils/employeeLabels.js";

const seeds = {
  COMMON_MASTERS_DEPARTMENT_INCLUSIVITY_PUBLIC_PARTICIPATION_AND_CUSTOMER_SERVICE: "Inclusivity, Public Participation & Customer Service",
  "COMMON_MASTERS_DEPARTMENT_WATER&SEWAGE": "Water & Sewage",
  COMMON_MASTERS_DESIGNATION_CALL_CENTRE_EMPLOYEE: "Call Centre Employee",
};
const t = (k) => seeds[k] || k;

test("a lower-case HRMS code resolves to the upper-cased seeded label", () => {
  assert.equal(departmentLabel(t, { code: "inclusivity_public_participation_and_customer_service" }), "Inclusivity, Public Participation & Customer Service");
  assert.equal(designationLabel(t, "call_centre_employee", []), "Call Centre Employee");
});

test("a code seeded verbatim (punctuation kept) still resolves", () => {
  assert.equal(departmentLabel(t, "WATER&SEWAGE"), "Water & Sewage");
});

test("unseeded code: the master's name wins, else the code made readable", () => {
  assert.equal(designationLabel(t, "cco_public_health", [{ code: "CCO_PUBLIC_HEALTH", name: "CCO-Public Health" }]), "CCO-Public Health");
  assert.equal(designationLabel(t, "principal_administrator", []), "Principal Administrator");
  assert.equal(departmentLabel(t, { code: "DEPT_36", name: "Roads" }), "Roads");
  assert.equal(departmentLabel(t, { code: "DEPT_36" }), "Dept 36");
  assert.equal(masterLabel(t, "DEPARTMENT", ""), "");
});

test("humanizeCode leaves mixed-case names alone", () => {
  assert.equal(humanizeCode("Call Centre Employee"), "Call Centre Employee");
  assert.equal(humanizeCode("CECM"), "Cecm");
});

test("currentDesignationCode prefers the current assignment", () => {
  assert.equal(currentDesignationCode({ assignments: [{ designation: "OLD" }, { designation: "NEW", isCurrentAssignment: true }] }), "NEW");
  assert.equal(currentDesignationCode({ assignments: [{ designation: "ONLY" }] }), "ONLY");
  assert.equal(currentDesignationCode(null), null);
});
