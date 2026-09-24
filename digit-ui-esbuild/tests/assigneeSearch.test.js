// filterAssigneeGroups: the department-or-person filter behind the assignee picker.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");

const SRC = path.resolve(__dirname, "../products/pgr/src/utils/assigneeSearch.js");
const { outputFiles } = esbuild.buildSync({ entryPoints: [SRC], bundle: true, write: false, format: "cjs", platform: "node", target: "es2018" });
const mod = { exports: {} };
vm.runInNewContext(outputFiles[0].text, { module: mod, exports: mod.exports });
const { filterAssigneeGroups, countAssignees } = mod.exports;

const GROUPS = [
  { code: "HEALTH", name: "Health", options: [{ name: "Amina Otieno (Health)" }, { name: "Brian Kamau (Health)" }] },
  { code: "WATER&SEWAGE", name: "Water & Sewage", options: [{ name: "Carol Wanjiru (Water & Sewage)" }] },
  { code: "ADMINISTRATION", name: "Administration", options: [{ name: "Kamau Njoroge (Administration)" }] },
];

test("empty query returns everything untouched", () => {
  assert.deepEqual(filterAssigneeGroups(GROUPS, ""), GROUPS);
  assert.deepEqual(filterAssigneeGroups(GROUPS, "   "), GROUPS);
  assert.equal(countAssignees(GROUPS), 4);
});

test("a department match keeps all its people; other departments drop out", () => {
  const out = filterAssigneeGroups(GROUPS, "water");
  assert.deepEqual(out.map((g) => g.code), ["WATER&SEWAGE"]);
  assert.equal(out[0].options.length, 1);
});

test("a person match keeps only matching people, across departments, case-insensitively", () => {
  const out = filterAssigneeGroups(GROUPS, "KAMAU");
  assert.deepEqual(out.map((g) => [g.code, g.options.map((o) => o.name)]), [
    ["HEALTH", ["Brian Kamau (Health)"]],
    ["ADMINISTRATION", ["Kamau Njoroge (Administration)"]],
  ]);
});

test("no match yields an empty list, never headers with nobody under them", () => {
  assert.deepEqual(filterAssigneeGroups(GROUPS, "zzz"), []);
  assert.deepEqual(filterAssigneeGroups(null, "x"), []);
});
