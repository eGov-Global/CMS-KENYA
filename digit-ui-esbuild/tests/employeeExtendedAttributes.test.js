// What an employee-filed complaint sends as service.extendedAttributes.
//
// Nairobi has no category template (no ComplaintRelatedToMap row for "nb"), so
// until now the employee form dropped the "Keep details confidential" tick on
// the floor: the flag only travelled inside the template object. The bare flag
// must reach pgr-services on its own, exactly as the citizen wizard sends it.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");

const SRC = path.resolve(__dirname, "../products/pgr/src/utils/extendedAttributes.js");
const { outputFiles } = esbuild.buildSync({ entryPoints: [SRC], bundle: true, write: false, format: "cjs", platform: "node", target: "es2018" });
const mod = { exports: {} };
vm.runInNewContext(outputFiles[0].text, { module: mod, exports: mod.exports });
const { buildCreateExtendedAttributes } = mod.exports;
// Results come from another realm; round-trip to compare by value.
const plain = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

const NAIROBI = { caseRelatedTo: null, fieldKeys: [] };
const MOZ = { caseRelatedTo: "IGE", fieldKeys: ["instituteName", "dateOfFact"] };

test("no template, confidential ticked: the bare flag is sent", () => {
  assert.deepStrictEqual(plain(buildCreateExtendedAttributes({ isConfidential: true }, NAIROBI)), { isConfidential: true });
  assert.deepStrictEqual(plain(buildCreateExtendedAttributes({ isConfidential: true }, undefined)), { isConfidential: true });
});

test("no template, not ticked: nothing is sent, as before", () => {
  assert.strictEqual(buildCreateExtendedAttributes({ isConfidential: false }, NAIROBI), undefined);
  assert.strictEqual(buildCreateExtendedAttributes({}, NAIROBI), undefined);
  assert.strictEqual(buildCreateExtendedAttributes(undefined, undefined), undefined);
});

test("a template keeps the full object: hierarchy, flag and the filled dynamic fields", () => {
  const form = {
    isConfidential: true,
    SelectComplaintType: { code: "Harassment", name: "Harassment" },
    SelectSubComplaintType: { serviceCode: "HarassmentByStaff" },
    instituteName: "Escola 12",
    dateOfFact: "",
  };
  assert.deepStrictEqual(plain(buildCreateExtendedAttributes(form, MOZ)), {
    caseRelatedTo: "IGE",
    isConfidential: true,
    schemaVersion: "1.0",
    hierarchyLevel1: "Harassment",
    hierarchyLevel2: "HarassmentByStaff",
    instituteName: "Escola 12",
  });
});

test("a template with the flag unticked still records isConfidential false", () => {
  const ext = plain(buildCreateExtendedAttributes({ SelectComplaintType: { name: "Roads" } }, MOZ));
  assert.strictEqual(ext.isConfidential, false);
  assert.strictEqual(ext.caseRelatedTo, "IGE");
  assert.strictEqual(ext.hierarchyLevel1, "Roads");
  assert.strictEqual("hierarchyLevel2" in ext, false);
});
