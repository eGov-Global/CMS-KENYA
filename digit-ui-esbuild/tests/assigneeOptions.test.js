// Who the Assign/Reassign picker lists, and under which department.
//
// cms-pilot (2026-09-25): the picker grouped people by assignments[0], so
// ADMIN (current department Center, ended Street Lights and Health &
// Sanitation assignments, returned in varying order) showed as "Admin (Street
// Lights)", and deactivated test accounts were still offered.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");

const SRC = path.resolve(__dirname, "../products/pgr/src/utils/assigneeOptions.js");
const { outputFiles } = esbuild.buildSync({ entryPoints: [SRC], bundle: true, write: false, format: "cjs", platform: "node", target: "es2018" });
const mod = { exports: {} };
vm.runInNewContext(outputFiles[0].text, { module: mod, exports: mod.exports });
const { buildAssigneeGroups } = mod.exports;
// Results come from another realm; round-trip to compare by value.
const plain = (v) => JSON.parse(JSON.stringify(v));
// [department code, header the dropdown shows, option labels in order].
const summary = (groups) => plain(groups).map((g) => [g.code, g.name, g.options.map((o) => o.name)]);

const assignment = (department, isCurrentAssignment) => ({ department, isCurrentAssignment });
const employee = (uuid, name, assignments, isActive = true) => ({
  isActive,
  user: { uuid, name, userServiceUuid: `us-${uuid}`, mobileNumber: "700000000" },
  assignments,
});
const LABELS = { DEPT_1: "Street Lights", DEPT_3: "Health & Sanitation", CENTER: "Center", DEPT_9: "Roads" };
const deptLabel = (code) => LABELS[code] || code;

// ADMIN's pilot record, in the two orders HRMS returned it on 2026-09-25.
const ADMIN_STREET_FIRST = employee("u-admin", "Admin", [assignment("DEPT_1", false), assignment("DEPT_3", false), assignment("CENTER", true)]);
const ADMIN_HEALTH_FIRST = employee("u-admin", "Admin", [assignment("DEPT_3", false), assignment("DEPT_1", false), assignment("CENTER", true)]);
const DIRECTOR = employee("u-dir", "Road Director", [assignment("DEPT_9", true)]);
const TESTLME_INACTIVE = employee("u-test", "Test Resolver", [assignment("DEPT_1", true)], false);

test("an ended assignment never labels a person: ADMIN is listed under Center only", () => {
  for (const admin of [ADMIN_STREET_FIRST, ADMIN_HEALTH_FIRST]) {
    assert.deepStrictEqual(summary(buildAssigneeGroups([admin], { allDepartments: true, deptLabel })), [["CENTER", "Center", ["Admin (Center)"]]]);
  }
});

test("the picked option carries the current department, which PGRDetails stamps onto the complaint", () => {
  const [group] = plain(buildAssigneeGroups([ADMIN_STREET_FIRST], { allDepartments: true, deptLabel }));
  assert.strictEqual(group.options[0].department, "CENTER");
  assert.strictEqual(group.options[0].uuid, "u-admin");
  assert.strictEqual(group.options[0].userServiceUUID, "us-u-admin");
});

test("a department-scoped Assign ignores ended assignments", () => {
  assert.deepStrictEqual(summary(buildAssigneeGroups([ADMIN_STREET_FIRST, DIRECTOR], { department: "DEPT_1", deptLabel })), []);
  assert.deepStrictEqual(summary(buildAssigneeGroups([ADMIN_STREET_FIRST, DIRECTOR], { department: "CENTER", deptLabel })), [["CENTER", "Center", ["Admin (Center)"]]]);
});

test("deactivated employees are dropped even if HRMS ignored isActive=true", () => {
  assert.deepStrictEqual(summary(buildAssigneeGroups([TESTLME_INACTIVE, DIRECTOR], { allDepartments: true, deptLabel })), [["DEPT_9", "Roads", ["Road Director (Roads)"]]]);
  assert.deepStrictEqual(summary(buildAssigneeGroups([TESTLME_INACTIVE], { department: "DEPT_1", deptLabel })), []);
});

test("an assignment without the flag counts as current, as in pgr-services", () => {
  const legacy = employee("u-legacy", "Legacy Officer", [{ department: "DEPT_9" }]);
  assert.deepStrictEqual(summary(buildAssigneeGroups([legacy], { department: "DEPT_9", deptLabel })), [["DEPT_9", "Roads", ["Legacy Officer (Roads)"]]]);
});

test("a person with two current departments appears under each when unscoped, once when scoped", () => {
  const twoDepts = employee("u-two", "Two Hats", [assignment("DEPT_1", true), assignment("DEPT_9", true)]);
  assert.deepStrictEqual(summary(buildAssigneeGroups([twoDepts], { allDepartments: true, deptLabel })), [
    ["DEPT_1", "Street Lights", ["Two Hats (Street Lights)"]],
    ["DEPT_9", "Roads", ["Two Hats (Roads)"]],
  ]);
  assert.deepStrictEqual(summary(buildAssigneeGroups([twoDepts], { department: "DEPT_9", deptLabel })), [["DEPT_9", "Roads", ["Two Hats (Roads)"]]]);
});

test("unmapped complaint types stay unscoped: department NA or absent lists everyone current", () => {
  const all = [["CENTER", "Center", ["Admin (Center)"]], ["DEPT_9", "Roads", ["Road Director (Roads)"]]];
  assert.deepStrictEqual(summary(buildAssigneeGroups([ADMIN_STREET_FIRST, DIRECTOR], { department: "NA", deptLabel })), all);
  assert.deepStrictEqual(summary(buildAssigneeGroups([ADMIN_STREET_FIRST, DIRECTOR], { deptLabel })), all);
});

test("people with no current department or no uuid are not offered", () => {
  const ended = employee("u-ended", "Moved On", [assignment("DEPT_1", false)]);
  const noUuid = { isActive: true, user: { name: "No Uuid" }, assignments: [assignment("DEPT_9", true)] };
  const noAssignments = employee("u-none", "No Assignments", undefined);
  assert.deepStrictEqual(summary(buildAssigneeGroups([ended, noUuid, noAssignments], { allDepartments: true, deptLabel })), []);
  assert.deepStrictEqual(summary(buildAssigneeGroups(undefined, { allDepartments: true, deptLabel })), []);
});

test("without a label resolver the raw department code is shown", () => {
  assert.deepStrictEqual(summary(buildAssigneeGroups([DIRECTOR], { allDepartments: true })), [["DEPT_9", "DEPT_9", ["Road Director (DEPT_9)"]]]);
});

test("people keep the HRMS response order within a department, as before", () => {
  const first = employee("u-a", "Zawadi", [assignment("DEPT_9", true)]);
  const second = employee("u-b", "Amani", [assignment("DEPT_9", true)]);
  assert.deepStrictEqual(summary(buildAssigneeGroups([first, second], { department: "DEPT_9", deptLabel })), [["DEPT_9", "Roads", ["Zawadi (Roads)", "Amani (Roads)"]]]);
});

test("a record without an isActive field is kept: only an explicit false drops it", () => {
  const unflagged = { user: { uuid: "u-nf", name: "No Flag" }, assignments: [assignment("DEPT_9", true)] };
  assert.deepStrictEqual(summary(buildAssigneeGroups([unflagged], { department: "DEPT_9", deptLabel })), [["DEPT_9", "Roads", ["No Flag (Roads)"]]]);
});

test("two current assignments in the same department list the person once", () => {
  const doubled = employee("u-dd", "Double Entry", [assignment("DEPT_9", true), { department: "DEPT_9" }]);
  assert.deepStrictEqual(summary(buildAssigneeGroups([doubled], { allDepartments: true, deptLabel })), [["DEPT_9", "Roads", ["Double Entry (Roads)"]]]);
});
