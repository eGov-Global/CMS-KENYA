// Which workflow states the inbox treats as actionable (#46).
// Run from digit-ui-esbuild/:
//   node --test products/pgr/src/utils/workflowStates.test.js
//
// This predicate decides the DEFAULT status scope of the employee inbox, so a
// state it rejects is effectively invisible: a call-centre employee can only
// reach it by typing an exact complaint number or by ticking a filter by hand.
//
// The fixtures below are the real Bomet PGR BusinessService, read from
// bgrm.bomet.go.ke — RESOLVED and REJECTED are BOTH terminal AND carry
// REOPEN/RATE, which is the combination the old `!isTerminateState` test got
// wrong. Same node --test + esbuild-to-CJS idiom as autoAssign.test.js.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");
const esbuild = require("esbuild");

function bundle(entry) {
  const out = path.join(os.tmpdir(), `${path.basename(entry, ".js")}.cjs.${process.pid}.js`);
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, entry)],
    bundle: true,
    format: "cjs",
    platform: "neutral",
    outfile: out,
  });
  process.on("exit", () => {
    try { fs.unlinkSync(out); } catch (e) { /* already gone */ }
  });
  return require(out);
}

const { isActionable } = bundle("workflowStates.js");

// Verbatim shapes from the live Bomet workflow.
const PENDINGATLME = { state: "PENDINGATLME", isTerminateState: false, actions: [{ action: "RESOLVE" }, { action: "ESCALATE" }, { action: "REJECT" }] };
const ESCALATEDLEVEL3 = { state: "ESCALATEDLEVEL3", isTerminateState: false, actions: [{ action: "RESOLVE" }, { action: "ESCALATE" }, { action: "REJECT" }] };
const RESOLVED = { state: "RESOLVED", isTerminateState: true, actions: [{ action: "REOPEN", roles: ["CITIZEN", "CSR", "PGR_VIEWER"] }, { action: "RATE", roles: ["CSR", "CITIZEN"] }] };
const REJECTED = { state: "REJECTED", isTerminateState: true, actions: [{ action: "RATE" }, { action: "REOPEN" }] };
const CLOSEDAFTERRESOLUTION = { state: "CLOSEDAFTERRESOLUTION", isTerminateState: true, actions: [] };
const CANCELLED = { state: "CANCELLED", isTerminateState: true, actions: [] };

test("open states are actionable", () => {
  assert.equal(isActionable(PENDINGATLME), true);
  assert.equal(isActionable(ESCALATEDLEVEL3), true);
});

test("RESOLVED and REJECTED are actionable despite being terminal (#46)", () => {
  // They carry REOPEN — granted to CSR, the call-centre role — so they must
  // appear in the default inbox scope or a call centre cannot reopen them.
  assert.equal(isActionable(RESOLVED), true);
  assert.equal(isActionable(REJECTED), true);
});

test("genuinely finished states stay excluded", () => {
  // Zero actions: nothing can be done to these, so they would only add noise.
  assert.equal(isActionable(CLOSEDAFTERRESOLUTION), false);
  assert.equal(isActionable(CANCELLED), false);
});

test("terminality alone must not decide it", () => {
  // The regression guard: a predicate keyed on isTerminateState passes every
  // other test here and still fails these two.
  const terminalButActionable = [RESOLVED, REJECTED];
  for (const s of terminalButActionable) {
    assert.equal(s.isTerminateState, true, `${s.state} fixture should be terminal`);
    assert.equal(isActionable(s), true, `${s.state} must remain in the default scope`);
  }
});

test("malformed states are rejected without throwing", () => {
  assert.equal(isActionable(null), false);
  assert.equal(isActionable(undefined), false);
  assert.equal(isActionable({}), false);
  assert.equal(isActionable({ state: "X", actions: null }), false);
  assert.equal(isActionable({ state: "X", actions: "REOPEN" }), false);
});
