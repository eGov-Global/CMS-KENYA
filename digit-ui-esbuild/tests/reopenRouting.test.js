// Who a citizen reopen goes back to: pickReopenAssignee, the history part of
// the reopen routing (CMS_SUPERVISOR, then the holder at the re-entry state,
// then the role-ordered search) — the function the reopen page calls through
// findReopenAssignee.
//
// On Nairobi's widened workflow (cms-pilot, 2026-09-25: PENDINGATLME actions
// list CECM, CHIEF_OFFICER, DIRECTOR, PGR_LME) the role-ordered search alone
// sent escalated complaints to the CECM or chief officer, and — when the
// officer held PGR_LME but not DIRECTOR — to the admin account (GRO + PGR_LME)
// after a send-back. Cases where the old routing differs assert both results.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");

const load = (rel) => {
  const { outputFiles } = esbuild.buildSync({ entryPoints: [path.resolve(__dirname, rel)], bundle: true, write: false, format: "cjs", platform: "node", target: "es2018" });
  const mod = { exports: {} };
  vm.runInNewContext(outputFiles[0].text, { module: mod, exports: mod.exports });
  return mod.exports;
};
const { latestHolderAtState, latestParticipantByAnyRole, pickReopenAssignee } = load("../products/pgr/src/utils/workflowHistory.js");
const { transitionTargetStateNames, deriveTransitionAssigneeRoles } = load("../products/pgr/src/utils/autoAssign.js");
const same = (actual, expected) => assert.deepStrictEqual([...actual], expected);

// --- the pilot's widened nb PGR workflow (shape of the live businessservice)
const act = (action, roles, nextState) => ({ action, roles, nextState, active: true });
const st = (uuid, name, actions) => ({ uuid, state: name, applicationStatus: name, actions });
const NAIROBI = {
  states: [
    st("s0", null, [act("APPLY", ["CITIZEN", "CSR"], "s1")]),
    st("s1", "PENDINGFORASSIGNMENT", [act("ASSIGN", ["GRO"], "s3"), act("REJECT", ["GRO"], "s6")]),
    st("s2", "PENDINGFORREASSIGNMENT", [act("ASSIGN", ["GRO"], "s3"), act("REJECT", ["GRO"], "s6")]),
    st("s3", "PENDINGATLME", [
      act("REASSIGN", ["CECM", "CHIEF_OFFICER", "DIRECTOR", "PGR_LME"], "s2"),
      act("RESOLVE", ["CECM", "CHIEF_OFFICER", "DIRECTOR", "PGR_LME"], "s7"),
      act("REJECT", ["CECM", "CHIEF_OFFICER", "DIRECTOR", "PGR_LME"], "s6"),
      act("ESCALATE", ["SYSTEM"], "s4"),
    ]),
    st("s4", "ESCALATEDLEVEL1", [act("RESOLVE", ["PGR_LME", "CHIEF_OFFICER"], "s7"), act("REJECT", ["PGR_LME", "CHIEF_OFFICER"], "s6"), act("ESCALATE", ["SYSTEM"], "s5")]),
    st("s5", "ESCALATEDLEVEL2", [act("RESOLVE", ["PGR_LME", "CECM"], "s7"), act("REJECT", ["PGR_LME", "CECM"], "s6")]),
    st("s6", "REJECTED", [act("RATE", ["CSR", "CITIZEN"], "s8"), act("REOPEN", ["CITIZEN", "CSR", "PGR_VIEWER"], "s3")]),
    st("s7", "RESOLVED", [act("REOPEN", ["CITIZEN", "CSR", "PGR_VIEWER"], "s3"), act("RATE", ["CSR", "CITIZEN"], "s9")]),
  ],
};

// --- people, with the pilot's role mix
const u = (uuid, ...roles) => ({ uuid, roles: roles.map((code) => ({ code })) });
const DIRECTOR = u("D", "PGR_LME", "DIRECTOR", "EMPLOYEE");
const DIRECTOR2 = u("D2", "PGR_LME", "DIRECTOR", "EMPLOYEE");
const CHIEF = u("C", "CHIEF_OFFICER", "EMPLOYEE");
const CECM = u("E", "CECM", "EMPLOYEE");
const ADMIN = u("ADMIN", "GRO", "PGR_LME", "CSR", "SUPERUSER", "EMPLOYEE");
const GRO = u("G", "GRO", "EMPLOYEE");
const LME_ONLY = u("L", "PGR_LME", "EMPLOYEE");
const SUPERVISOR = u("SUP", "CMS_SUPERVISOR");
const CITIZEN = u("CIT", "CITIZEN");
const SYSTEM_USER = u("SYS", "SYSTEM");

let clock = 0;
const step = (action, state, assigner, assignes = null) => ({ action, state: { state }, assigner, assignes, auditDetails: { lastModifiedTime: ++clock } });
const history = (...steps) => { clock = 0; return steps.map((s) => s()); };
const S = (...a) => () => step(...a);

const target = transitionTargetStateNames(NAIROBI, "RESOLVED", "REOPEN");
const roles = deriveTransitionAssigneeRoles(NAIROBI, "RESOLVED", "REOPEN");
const pick = (h) => pickReopenAssignee(h, { targetStates: target, reopenRoles: roles });
// the history step as it was before: role by role, in the workflow's order
const oldPick = (h) => latestParticipantByAnyRole(h, roles);

test("REOPEN from RESOLVED or REJECTED returns to PENDINGATLME", () => {
  same(transitionTargetStateNames(NAIROBI, "RESOLVED", "REOPEN"), ["PENDINGATLME"]);
  same(transitionTargetStateNames(NAIROBI, "REJECTED", "REOPEN"), ["PENDINGATLME"]);
  same(transitionTargetStateNames(NAIROBI, undefined, "REOPEN"), ["PENDINGATLME"]);
  same(transitionTargetStateNames(NAIROBI, "RESOLVED", "FROBNICATE"), []);
  same(transitionTargetStateNames(undefined, "RESOLVED", "REOPEN"), []);
});

test("assigned director resolved it: back to the director", () => {
  assert.strictEqual(pick(history(S("APPLY", "PENDINGFORASSIGNMENT", CITIZEN), S("ASSIGN", "PENDINGATLME", GRO, [DIRECTOR]), S("RESOLVE", "RESOLVED", DIRECTOR))), "D");
});

test("escalated to the chief officer, who resolved it: back to the director, not the chief officer", () => {
  assert.strictEqual(pick(history(
    S("APPLY", "PENDINGFORASSIGNMENT", CITIZEN), S("ASSIGN", "PENDINGATLME", GRO, [DIRECTOR]),
    S("ESCALATE", "ESCALATEDLEVEL1", SYSTEM_USER, [CHIEF]), S("RESOLVE", "RESOLVED", CHIEF)
  )), "D");
  assert.strictEqual(oldPick(history(
    S("APPLY", "PENDINGFORASSIGNMENT", CITIZEN), S("ASSIGN", "PENDINGATLME", GRO, [DIRECTOR]),
    S("ESCALATE", "ESCALATEDLEVEL1", SYSTEM_USER, [CHIEF]), S("RESOLVE", "RESOLVED", CHIEF)
  )), "C", "the old routing sent it to the chief officer");
});

test("escalated twice, the CECM resolved it: back to the director", () => {
  assert.strictEqual(pick(history(
    S("APPLY", "PENDINGFORASSIGNMENT", CITIZEN), S("ASSIGN", "PENDINGATLME", GRO, [DIRECTOR]),
    S("ESCALATE", "ESCALATEDLEVEL1", SYSTEM_USER, [CHIEF]), S("ESCALATE", "ESCALATEDLEVEL2", SYSTEM_USER, [CECM]),
    S("RESOLVE", "RESOLVED", CECM)
  )), "D");
  assert.strictEqual(oldPick(history(
    S("APPLY", "PENDINGFORASSIGNMENT", CITIZEN), S("ASSIGN", "PENDINGATLME", GRO, [DIRECTOR]),
    S("ESCALATE", "ESCALATEDLEVEL1", SYSTEM_USER, [CHIEF]), S("ESCALATE", "ESCALATEDLEVEL2", SYSTEM_USER, [CECM]),
    S("RESOLVE", "RESOLVED", CECM)
  )), "E", "the old routing sent it to the CECM");
});

test("a chief officer rejected it directly at Pending at LME: back to the director", () => {
  assert.strictEqual(pick(history(S("APPLY", "PENDINGFORASSIGNMENT", CITIZEN), S("ASSIGN", "PENDINGATLME", ADMIN, [DIRECTOR]), S("REJECT", "REJECTED", CHIEF))), "D");
});

test("sent back to the GRO queue (admin account as GRO), then rejected: back to the director, not the admin", () => {
  assert.strictEqual(pick(history(
    S("APPLY", "PENDINGFORASSIGNMENT", CITIZEN), S("ASSIGN", "PENDINGATLME", ADMIN, [DIRECTOR]),
    S("REASSIGN", "PENDINGFORREASSIGNMENT", DIRECTOR, [ADMIN]), S("REJECT", "REJECTED", ADMIN)
  )), "D");
});

test("re-assigned to a second director who resolved it: the second director", () => {
  assert.strictEqual(pick(history(
    S("APPLY", "PENDINGFORASSIGNMENT", CITIZEN), S("ASSIGN", "PENDINGATLME", GRO, [DIRECTOR]),
    S("REASSIGN", "PENDINGFORREASSIGNMENT", DIRECTOR, [GRO]), S("ASSIGN", "PENDINGATLME", GRO, [DIRECTOR2]),
    S("RESOLVE", "RESOLVED", DIRECTOR2)
  )), "D2");
});

test("a second reopen goes to whoever the first reopen routed it to", () => {
  assert.strictEqual(pick(history(
    S("APPLY", "PENDINGFORASSIGNMENT", CITIZEN), S("ASSIGN", "PENDINGATLME", GRO, [DIRECTOR]), S("RESOLVE", "RESOLVED", DIRECTOR),
    S("REOPEN", "PENDINGATLME", CITIZEN, [DIRECTOR2]), S("RESOLVE", "RESOLVED", DIRECTOR2)
  )), "D2");
});

test("never reached Pending at LME (rejected at triage by a GRO): history names nobody, the page routes by department", () => {
  assert.strictEqual(pick(history(S("APPLY", "PENDINGFORASSIGNMENT", CITIZEN, [GRO]), S("REJECT", "REJECTED", GRO))), null);
});

test("the holder no longer has a role that can act there: skipped for an older qualifying holder, else null", () => {
  const moved = u("D", "EMPLOYEE"); // same person, roles removed since
  assert.strictEqual(pick(history(S("ASSIGN", "PENDINGATLME", GRO, [DIRECTOR2]), S("REASSIGN", "PENDINGFORREASSIGNMENT", DIRECTOR2, [GRO]), S("ASSIGN", "PENDINGATLME", GRO, [moved]), S("RESOLVE", "RESOLVED", moved))), "D2");
  assert.strictEqual(pick(history(S("ASSIGN", "PENDINGATLME", GRO, [moved]), S("RESOLVE", "RESOLVED", moved))), null);
});

test("defensive inputs", () => {
  assert.strictEqual(latestHolderAtState(null, ["PENDINGATLME"], roles), null);
  assert.strictEqual(latestHolderAtState([], [], roles), null);
  assert.strictEqual(latestHolderAtState([{ state: { state: "PENDINGATLME" }, assignes: [{ roles: [{ code: "PGR_LME" }] }] }], ["PENDINGATLME"], roles), null); // no uuid
  // an empty role list accepts nobody (as the role search did); undefined accepts anyone
  assert.strictEqual(latestHolderAtState(history(S("ASSIGN", "PENDINGATLME", GRO, [CHIEF])), ["PENDINGATLME"], []), null);
  assert.strictEqual(latestHolderAtState(history(S("ASSIGN", "PENDINGATLME", GRO, [CHIEF])), ["PENDINGATLME"]), "C");
});

test("order: a CMS supervisor in the history wins over a newer holder at the re-entry state", () => {
  assert.strictEqual(pick(history(S("ASSIGN", "REFERRED", GRO, [SUPERVISOR]), S("ASSIGN", "PENDINGATLME", GRO, [DIRECTOR]), S("RESOLVE", "RESOLVED", DIRECTOR))), "SUP");
});

test("send-back via the admin GRO when the officer holds PGR_LME but not DIRECTOR: the officer, where the old routing picked the admin", () => {
  const h = () => history(
    S("APPLY", "PENDINGFORASSIGNMENT", CITIZEN), S("ASSIGN", "PENDINGATLME", ADMIN, [LME_ONLY]),
    S("REASSIGN", "PENDINGFORREASSIGNMENT", LME_ONLY, [ADMIN]), S("REJECT", "REJECTED", ADMIN)
  );
  assert.strictEqual(pick(h()), "L");
  assert.strictEqual(oldPick(h()), "ADMIN");
});

test("order: with no holder at the re-entry state, the role search still runs", () => {
  // only an escalation target in the history (the PENDINGATLME step carried no assignee)
  assert.strictEqual(pick(history(S("ASSIGN", "PENDINGATLME", GRO), S("ESCALATE", "ESCALATEDLEVEL1", SYSTEM_USER, [CHIEF]), S("RESOLVE", "RESOLVED", CHIEF))), "C");
});

