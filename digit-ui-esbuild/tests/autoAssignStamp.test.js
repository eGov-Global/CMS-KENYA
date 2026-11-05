import test from "node:test";
import assert from "node:assert/strict";
import { stampAutoAssignment } from "../products/pgr/src/utils/autoAssign.js";

const assignment = { uuid: "emp-1", department: "WATER", tier: "DEPARTMENT_AND_JURISDICTION", jurisdiction: "WARD_7" };

test("sets workflow.assignes and merges the audit record into a string additionalDetail", () => {
  const payload = { service: { additionalDetail: JSON.stringify({ supervisorName: "x" }) }, workflow: { action: "APPLY" } };
  stampAutoAssignment(payload, assignment, "employee-create");
  assert.deepEqual(payload.workflow, { action: "APPLY", assignes: ["emp-1"] });
  assert.equal(payload.service.additionalDetail.supervisorName, "x");
  assert.deepEqual(payload.service.additionalDetail.autoAssignment, { assignee: "emp-1", departmentCode: "WATER", tier: "DEPARTMENT_AND_JURISDICTION", jurisdiction: "WARD_7", source: "employee-create" });
});

test("merges into an object additionalDetail and omits jurisdiction when the tier has none", () => {
  const payload = { service: { additionalDetail: { category: "c" } }, workflow: { action: "APPLY" } };
  stampAutoAssignment(payload, { uuid: "emp-2", department: "WATER", tier: "DEPARTMENT" }, "employee-create");
  assert.equal(payload.service.additionalDetail.category, "c");
  assert.deepEqual(payload.service.additionalDetail.autoAssignment, { assignee: "emp-2", departmentCode: "WATER", tier: "DEPARTMENT", source: "employee-create" });
});

test("a null resolution leaves the payload untouched", () => {
  const payload = { service: { additionalDetail: "{}" }, workflow: { action: "APPLY" } };
  stampAutoAssignment(payload, null, "employee-create");
  assert.deepEqual(payload, { service: { additionalDetail: "{}" }, workflow: { action: "APPLY" } });
});
