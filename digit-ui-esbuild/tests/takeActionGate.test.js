// Who sees Take Action on the employee complaint details page (Nairobi).
//
// Only the current assignee may act — except in the assignment queue: an
// unassigned complaint in a state offering ASSIGN is open to every role that
// can act there, so employee-filed complaints and citizen complaints in a
// department with no GRO can still be picked up.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");

const SRC = path.resolve(__dirname, "../products/pgr/src/utils/takeActionGate.js");
const { outputFiles } = esbuild.buildSync({ entryPoints: [SRC], bundle: true, write: false, format: "cjs", platform: "node", target: "es2018" });
const mod = { exports: {} };
vm.runInNewContext(outputFiles[0].text, { module: mod, exports: mod.exports });
const { canTakeAction } = mod.exports;

// State shapes from the nb PGR workflow on cms-pilot.
const PENDINGFORASSIGNMENT = {
  state: "PENDINGFORASSIGNMENT",
  actions: [
    { action: "ASSIGN", roles: ["GRO"] },
    { action: "REJECT", roles: ["GRO"] },
  ],
};
const PENDINGATLME = {
  state: "PENDINGATLME",
  actions: [
    { action: "RESOLVE", roles: ["PGR_LME"] },
    { action: "REJECT", roles: ["PGR_LME"] },
    { action: "ESCALATE", roles: ["SYSTEM"] },
    { action: "REASSIGN", roles: ["PGR_LME"] },
  ],
};
const ME = "me-uuid";

test("unassigned complaint in the assignment queue: any GRO may act", () => {
  assert.strictEqual(canTakeAction({ state: PENDINGFORASSIGNMENT, assignees: [], userUuid: ME, userRoles: ["GRO", "EMPLOYEE"] }), true);
  assert.strictEqual(canTakeAction({ state: PENDINGFORASSIGNMENT, assignees: null, userUuid: ME, userRoles: ["GRO"] }), true);
});

test("assignment queue still needs a role on the state", () => {
  assert.strictEqual(canTakeAction({ state: PENDINGFORASSIGNMENT, assignees: [], userUuid: ME, userRoles: ["PGR_LME", "EMPLOYEE"] }), false);
});

test("assignment queue held by another GRO: only that GRO may act", () => {
  const held = [{ uuid: "other-gro" }];
  assert.strictEqual(canTakeAction({ state: PENDINGFORASSIGNMENT, assignees: held, userUuid: ME, userRoles: ["GRO"] }), false);
  assert.strictEqual(canTakeAction({ state: PENDINGFORASSIGNMENT, assignees: held, userUuid: "other-gro", userRoles: ["GRO"] }), true);
});

test("pending at LME: only the assigned LME may act", () => {
  const held = [{ uuid: "lme-a" }];
  assert.strictEqual(canTakeAction({ state: PENDINGATLME, assignees: held, userUuid: "lme-a", userRoles: ["PGR_LME"] }), true);
  assert.strictEqual(canTakeAction({ state: PENDINGATLME, assignees: held, userUuid: "lme-b", userRoles: ["PGR_LME"] }), false);
});

test("unassigned outside the assignment queue stays closed", () => {
  // e.g. a citizen reopen that found no previous officer — no ASSIGN here.
  assert.strictEqual(canTakeAction({ state: PENDINGATLME, assignees: [], userUuid: ME, userRoles: ["PGR_LME"] }), false);
});

test("terminal state (no actions) shows nothing", () => {
  assert.strictEqual(canTakeAction({ state: { state: "RESOLVED", actions: null }, assignees: [], userUuid: ME, userRoles: ["GRO"] }), false);
  assert.strictEqual(canTakeAction({ state: undefined, assignees: [], userUuid: ME, userRoles: ["GRO"] }), false);
});
