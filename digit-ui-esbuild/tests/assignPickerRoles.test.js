// Who the Assign picker lists on Nairobi's widened workflow.
//
// cms-pilot (2026-09-25) lets DIRECTOR, CHIEF_OFFICER and CECM act at
// PENDINGATLME next to PGR_LME. The picker derives its HRMS role filter from
// the actors of the target state, so without narrowing a GRO's ASSIGN listed
// every chief officer and CECM too. The rule: a transition into a state with a
// PGR_LME actor lists only PGR_LME holders (the directors); anything else is
// unchanged.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");

const SRC = path.resolve(__dirname, "../products/pgr/src/utils/autoAssign.js");
const { outputFiles } = esbuild.buildSync({ entryPoints: [SRC], bundle: true, write: false, format: "cjs", platform: "node", target: "es2018" });
const mod = { exports: {} };
vm.runInNewContext(outputFiles[0].text, { module: mod, exports: mod.exports });
const { narrowToLastMile, deriveTransitionAssigneeRoles } = mod.exports;
const same = (actual, expected) => assert.deepStrictEqual([...actual], expected);

const act = (action, roles, nextState) => ({ action, roles, nextState, active: true });
const state = (uuid, name, actions) => ({ uuid, state: name, applicationStatus: name, actions });
// The pilot's nb PGR workflow after the widening (state/role shape copied from
// the live businessservice; uuids shortened).
const NAIROBI = {
  states: [
    state("s0", null, [act("APPLY", ["CITIZEN", "CSR"], "s1")]),
    state("s1", "PENDINGFORASSIGNMENT", [act("ASSIGN", ["GRO"], "s3"), act("REJECT", ["GRO"], "s6")]),
    state("s2", "PENDINGFORREASSIGNMENT", [act("ASSIGN", ["GRO"], "s3"), act("REJECT", ["GRO"], "s6")]),
    state("s3", "PENDINGATLME", [
      act("REASSIGN", ["CECM", "CHIEF_OFFICER", "DIRECTOR", "PGR_LME"], "s2"),
      act("RESOLVE", ["CECM", "CHIEF_OFFICER", "DIRECTOR", "PGR_LME"], "s7"),
      act("REJECT", ["CECM", "CHIEF_OFFICER", "DIRECTOR", "PGR_LME"], "s6"),
      act("ESCALATE", ["SYSTEM"], "s4"),
    ]),
    state("s4", "ESCALATEDLEVEL1", [act("RESOLVE", ["PGR_LME", "CHIEF_OFFICER"], "s7"), act("REJECT", ["PGR_LME", "CHIEF_OFFICER"], "s6"), act("ESCALATE", ["SYSTEM"], "s5")]),
    state("s5", "ESCALATEDLEVEL2", [act("RESOLVE", ["PGR_LME", "CECM"], "s7"), act("REJECT", ["PGR_LME", "CECM"], "s6")]),
    state("s6", "REJECTED", [act("RATE", ["CSR", "CITIZEN"], "s8"), act("REOPEN", ["CITIZEN", "CSR", "PGR_VIEWER"], "s3")]),
    state("s7", "RESOLVED", [act("REOPEN", ["CITIZEN", "CSR", "PGR_VIEWER"], "s3"), act("RATE", ["CSR", "CITIZEN"], "s9")]),
  ],
};

test("GRO ASSIGN (first assignment and after a send-back) lists only PGR_LME holders", () => {
  for (const from of ["PENDINGFORASSIGNMENT", "PENDINGFORREASSIGNMENT"]) {
    const actors = deriveTransitionAssigneeRoles(NAIROBI, from, "ASSIGN");
    assert.ok(actors.includes("CHIEF_OFFICER") && actors.includes("CECM"), "the widened workflow lists the tiers as actors");
    same(narrowToLastMile(actors), ["PGR_LME"]);
  }
});

test("the picker's own role set (it keeps SYSTEM) narrows the same way", () => {
  // PGRDetails' NON_ASSIGNEE_ROLES does not drop SYSTEM, so its union for
  // PENDINGATLME is the four officer roles plus SYSTEM.
  same(narrowToLastMile(["CECM", "CHIEF_OFFICER", "DIRECTOR", "PGR_LME", "SYSTEM"]), ["PGR_LME"]);
});

test("REASSIGN (LME sends it back) still lists the GRO queue", () => {
  same(narrowToLastMile(deriveTransitionAssigneeRoles(NAIROBI, "PENDINGATLME", "REASSIGN")), ["GRO"]);
});

test("workflows without a PGR_LME actor are untouched (CMS tiers)", () => {
  same(narrowToLastMile(["CMS_SUPERVISOR", "CMS_CASE_MANAGER"]), ["CMS_SUPERVISOR", "CMS_CASE_MANAGER"]);
});
