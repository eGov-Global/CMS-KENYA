// filterDropdownOptions: the Dropdown atom's search, flat and nested.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");

const SRC = path.resolve(__dirname, "../packages/digit-ui-components/src/atoms/dropdownFilter.js");
const { outputFiles } = esbuild.buildSync({ entryPoints: [SRC], bundle: true, write: false, format: "cjs", platform: "node", target: "es2018" });
const mod = { exports: {} };
vm.runInNewContext(outputFiles[0].text, { module: mod, exports: mod.exports });
const { filterDropdownOptions } = mod.exports;
const plain = (o) => JSON.parse(JSON.stringify(o));

const FLAT = [{ code: "A", name: "Water Supply" }, { code: "B", name: "Roads" }];
const GROUPS = [
  { code: "gov", name: "Office of the Governor", options: [{ code: "e1", name: "Eunice Kariuki (Office of the Governor)" }, { code: "e2", name: "Kefa Omanga (Office of the Governor)" }] },
  { code: "fin", name: "Finance & Economic Planning Affairs", options: [{ code: "e3", name: "Test Resolver (Finance & Economic Planning Affairs)" }] },
];

test("empty filter returns the list untouched", () => {
  assert.strictEqual(filterDropdownOptions(GROUPS, "", "name"), GROUPS);
  assert.strictEqual(filterDropdownOptions(FLAT, undefined, "name"), FLAT);
  assert.deepStrictEqual(plain(filterDropdownOptions(null, "x", "name")), []);
});

test("flat list: label contains the text, case-insensitive (unchanged behaviour)", () => {
  assert.deepStrictEqual(plain(filterDropdownOptions(FLAT, "road", "name")), [{ code: "B", name: "Roads" }]);
  assert.deepStrictEqual(plain(filterDropdownOptions(FLAT, "zzz", "name")), []);
});

test("nested: a person's name finds their department group with only the matching people", () => {
  const out = plain(filterDropdownOptions(GROUPS, "kefa", "name"));
  assert.deepStrictEqual(out, [{ code: "gov", name: "Office of the Governor", options: [{ code: "e2", name: "Kefa Omanga (Office of the Governor)" }] }]);
});

test("nested: a department name keeps the whole group", () => {
  const out = plain(filterDropdownOptions(GROUPS, "finance", "name"));
  assert.deepStrictEqual(out, [GROUPS[1]]);
});

test("nested: text present in every label (the department suffix) keeps everyone", () => {
  assert.deepStrictEqual(plain(filterDropdownOptions(GROUPS, "governor", "name")), [GROUPS[0]]);
  assert.deepStrictEqual(plain(filterDropdownOptions(GROUPS, "(", "name")).flatMap((g) => g.options).length, 3);
});

test("labels are translated before matching", () => {
  const t = (k) => ({ K1: "Kiswahili label" }[k] || k);
  assert.deepStrictEqual(plain(filterDropdownOptions([{ code: "x", name: "K1" }], "swahili", "name", t)), [{ code: "x", name: "K1" }]);
});
