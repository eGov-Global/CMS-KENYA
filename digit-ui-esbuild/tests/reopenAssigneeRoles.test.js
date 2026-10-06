// deriveTransitionAssigneeRoles: who a citizen REOPEN may be routed to.
//
// The engine validates every assignee as "can act on the TARGET state", so the
// roles must come from the state REOPEN lands in, not from the create path.
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
const { deriveAssigneeRoles, deriveTransitionAssigneeRoles } = mod.exports;

// Arrays are born in the vm realm; copy them over so strict equality compares
// contents, not Array prototypes.
const same = (actual, expected) => assert.deepStrictEqual([...actual], expected);

const state = (uuid, name, actions, extra = {}) => ({ uuid, state: name, applicationStatus: name, actions, ...extra });
const act = (action, roles, nextState) => ({ action, roles, nextState, active: true });

// Nairobi pilot shape: a GRO triage stop fronts the LME state, REOPEN skips it.
const NAIROBI = {
  states: [
    state("s0", null, [act("APPLY", ["CITIZEN", "CSR"], "s1")], { isStartState: true }),
    state("s1", "PENDINGFORASSIGNMENT", [act("ASSIGN", ["GRO"], "s2"), act("REJECT", ["GRO"], "s4")]),
    state("s2", "PENDINGATLME", [
      act("REASSIGN", ["PGR_LME"], "s3"),
      act("RESOLVE", ["PGR_LME"], "s5"),
      act("REJECT", ["PGR_LME"], "s4"),
      act("ESCALATE", ["SYSTEM"], "s6"),
    ]),
    state("s3", "PENDINGFORREASSIGNMENT", [act("ASSIGN", ["GRO"], "s2"), act("REJECT", ["GRO"], "s4")]),
    state("s4", "REJECTED", [act("RATE", ["CSR", "CITIZEN"], "s7"), act("REOPEN", ["CITIZEN", "CSR", "PGR_VIEWER"], "s2")], { isTerminateState: true }),
    state("s5", "RESOLVED", [act("REOPEN", ["CITIZEN", "CSR", "PGR_VIEWER"], "s2"), act("RATE", ["CSR", "CITIZEN"], "s8")], { isTerminateState: true }),
    state("s6", "ESCALATEDLEVEL1", [act("RESOLVE", ["PGR_LME", "CHIEF_OFFICER"], "s5")]),
    state("s7", "CLOSEDAFTERREJECTION", null, { isTerminateState: true }),
    state("s8", "CLOSEDAFTERRESOLUTION", null, { isTerminateState: true }),
  ],
};

// Bomet-style two-level shape: APPLY lands on the LME state directly and the
// engine references states by NAME; COMMENT is a citizen self-loop.
const TWO_LEVEL = {
  states: [
    state("t0", null, [act("APPLY", ["CITIZEN", "CSR"], "PENDINGATLME")], { isStartState: true }),
    state("t1", "PENDINGATLME", [
      act("RESOLVE", ["PGR_LME", "PGR_VIEWER"], "RESOLVED"),
      act("REJECT", ["PGR_LME", "PGR_VIEWER"], "REJECTED"),
      act("COMMENT", ["CITIZEN"], "PENDINGATLME"),
    ]),
    state("t2", "RESOLVED", [act("REOPEN", ["CITIZEN", "CSR", "PGR_VIEWER"], "PENDINGATLME")], { isTerminateState: true }),
    state("t3", "REJECTED", [act("REOPEN", ["CITIZEN", "CSR", "PGR_VIEWER"], "PENDINGATLME")], { isTerminateState: true }),
  ],
};

test("Nairobi: REOPEN from RESOLVED routes to the LME tier, never the GRO who triaged it", () => {
  same(deriveTransitionAssigneeRoles(NAIROBI, "RESOLVED", "REOPEN"), ["PGR_LME"]);
  // The create path still resolves to the triage tier — the two differ, which
  // is exactly why reopen must not reuse it.
  same(deriveAssigneeRoles(NAIROBI), ["GRO"]);
});

test("Nairobi: REOPEN from REJECTED lands on the same LME state", () => {
  same(deriveTransitionAssigneeRoles(NAIROBI, "REJECTED", "REOPEN"), ["PGR_LME"]);
});

test("SYSTEM (auto-escalation actor) is never an assignee candidate", () => {
  assert.ok(!deriveTransitionAssigneeRoles(NAIROBI, "RESOLVED", "REOPEN").includes("SYSTEM"));
});

test("unknown current state: every state carrying REOPEN contributes", () => {
  same(deriveTransitionAssigneeRoles(NAIROBI, undefined, "REOPEN"), ["PGR_LME"]);
  same(deriveTransitionAssigneeRoles(NAIROBI, "NOT_A_STATE", "REOPEN"), ["PGR_LME"]);
});

test("a state that does not carry the action falls back to the states that do", () => {
  // PENDINGATLME has no REOPEN; the terminal states do.
  same(deriveTransitionAssigneeRoles(NAIROBI, "PENDINGATLME", "REOPEN"), ["PGR_LME"]);
});

test("no such action, no workflow, no action name → empty", () => {
  same(deriveTransitionAssigneeRoles(NAIROBI, "RESOLVED", "FROBNICATE"), []);
  same(deriveTransitionAssigneeRoles(undefined, "RESOLVED", "REOPEN"), []);
  same(deriveTransitionAssigneeRoles(NAIROBI, "RESOLVED", undefined), []);
});

test("two-level workflow with name references: reopen and create agree, self-loops ignored", () => {
  const reopen = deriveTransitionAssigneeRoles(TWO_LEVEL, "RESOLVED", "REOPEN");
  same(reopen, ["PGR_LME", "PGR_VIEWER"]);
  same(deriveAssigneeRoles(TWO_LEVEL), [...reopen]);
});

test("inactive REOPEN transitions are skipped", () => {
  const ws = JSON.parse(JSON.stringify(NAIROBI));
  ws.states.find((s) => s.state === "RESOLVED").actions[0].active = false;
  same(deriveTransitionAssigneeRoles(ws, "RESOLVED", "REOPEN"), ["PGR_LME"]); // falls back to REJECTED's
  ws.states.find((s) => s.state === "REJECTED").actions[1].active = false;
  same(deriveTransitionAssigneeRoles(ws, "RESOLVED", "REOPEN"), []);
});
