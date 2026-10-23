import test from "node:test";
import assert from "node:assert/strict";
import { responsibleDepartmentCode } from "../products/pgr/src/utils/additionalDetail.js";
import { expectedResolutionTime, DEFAULT_SLA_MS, HOUR_MS } from "../products/pgr/src/utils/sla.js";

test("the complaint type's department wins over the routed stamp", () => {
  assert.equal(responsibleDepartmentCode("HEALTH", { department: "ADMINISTRATION" }), "HEALTH");
});

test("an unmapped type falls back to the stamped department, object or JSON string", () => {
  assert.equal(responsibleDepartmentCode("NA", { department: "WATER&SEWAGE" }), "WATER&SEWAGE");
  assert.equal(responsibleDepartmentCode(undefined, '{"department":"HEALTH"}'), "HEALTH");
});

test("NA, blanks and unparseable additionalDetail mean no department", () => {
  assert.equal(responsibleDepartmentCode("NA", { department: "na" }), null);
  assert.equal(responsibleDepartmentCode("  ", "not json"), null);
  assert.equal(responsibleDepartmentCode(null, null), null);
});

test("expected resolution = creation + the type's slaHours, else the 5-day business default", () => {
  assert.equal(expectedResolutionTime(1000, 72), 1000 + 72 * HOUR_MS);
  assert.equal(expectedResolutionTime(1000, undefined), 1000 + DEFAULT_SLA_MS);
  assert.equal(expectedResolutionTime("1000", "24"), 1000 + 24 * HOUR_MS);
  assert.equal(expectedResolutionTime(null, 72), null);
});
