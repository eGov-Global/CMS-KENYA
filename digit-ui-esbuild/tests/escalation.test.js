// Manual escalation on Bomet: who the escalation popup offers, and who may escalate.
//
// The popup lists the roles that act at the NEXT level but not at the current
// one, so the LME tier (which can resolve at every level) and SYSTEM (the SLA
// timer) drop out and each department's own next tier remains.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");

const SRC = path.resolve(__dirname, "../products/pgr/src/utils/escalation.js");
const { outputFiles } = esbuild.buildSync({ entryPoints: [SRC], bundle: true, write: false, format: "cjs", platform: "node", target: "es2018" });
const mod = { exports: {} };
vm.runInNewContext(outputFiles[0].text, { module: mod, exports: mod.exports });
const { actingRoles, nextLevelRoles, isCurrentAssignee, escalationStamp } = mod.exports;

// Bomet (bgrm, tenant bo) PGR workflow, with manual ESCALATE granted to each level's holders.
const LME = ["PGR_LME"];
const L1 = ["ADMIN_DIRECTOR", "HEALTH_DIRECTOR", "WATER_CHIEF_OFFICER"];
const L2 = ["WATER_CECM", "HEALTH_CHIEF_OFFICER", "ADMIN_CHIEF_OFFICER"];
const L3 = ["ADMIN_CECM", "HEALTH_CECM"];
const PENDINGATLME = { actions: [
  { action: "RESOLVE", roles: LME }, { action: "REJECT", roles: LME },
  { action: "ESCALATE", roles: ["SYSTEM", ...LME] },
] };
const ESCALATEDLEVEL1 = { actions: [
  { action: "RESOLVE", roles: [...LME, ...L1] }, { action: "REJECT", roles: [...LME, ...L1] },
  { action: "ESCALATE", roles: ["SYSTEM", ...L1] },
] };
const ESCALATEDLEVEL2 = { actions: [
  { action: "RESOLVE", roles: [...LME, ...L2] }, { action: "REJECT", roles: [...LME, ...L2] },
  { action: "ESCALATE", roles: ["SYSTEM", "HEALTH_CHIEF_OFFICER", "ADMIN_CHIEF_OFFICER"] },
] };
// What computeAssigneeRoles yields for each target (its forward actions' roles).
const rolesAt = (state) => [...actingRoles(state)];
const L3_FORWARD = [...LME, ...L3]; // the ESCALATE self-loop at L3 is not a forward action

test("LME escalating offers the Directors tier (and Water's Chief Officer)", () => {
  assert.deepStrictEqual(nextLevelRoles({ currentState: PENDINGATLME, nextStateRoles: rolesAt(ESCALATEDLEVEL1) }).sort(), [...L1].sort());
});

test("Director escalating offers the Chief Officers tier (and Water's CECM)", () => {
  assert.deepStrictEqual(nextLevelRoles({ currentState: ESCALATEDLEVEL1, nextStateRoles: rolesAt(ESCALATEDLEVEL2) }).sort(), [...L2].sort());
});

test("Chief Officer escalating offers the CECMs", () => {
  assert.deepStrictEqual(nextLevelRoles({ currentState: ESCALATEDLEVEL2, nextStateRoles: L3_FORWARD }).sort(), [...L3].sort());
});

test("never offers the LME tier or SYSTEM", () => {
  for (const [cur, next] of [[PENDINGATLME, rolesAt(ESCALATEDLEVEL1)], [ESCALATEDLEVEL1, rolesAt(ESCALATEDLEVEL2)], [ESCALATEDLEVEL2, L3_FORWARD]]) {
    const offered = nextLevelRoles({ currentState: cur, nextStateRoles: next });
    assert.ok(!offered.includes("PGR_LME") && !offered.includes("SYSTEM"), JSON.stringify(offered));
  }
});

test("missing data offers nobody rather than throwing", () => {
  assert.deepStrictEqual([...nextLevelRoles({ currentState: undefined, nextStateRoles: undefined })], []);
  assert.deepStrictEqual([...nextLevelRoles({ currentState: { actions: null }, nextStateRoles: ["X"] })], ["X"]);
});

test("only the current assignee may escalate", () => {
  const assignees = [{ uuid: "lme-a" }];
  assert.strictEqual(isCurrentAssignee({ assignees, userUuid: "lme-a" }), true);
  assert.strictEqual(isCurrentAssignee({ assignees, userUuid: "lme-b" }), false);
  assert.strictEqual(isCurrentAssignee({ assignees: null, userUuid: "lme-a" }), false);
  assert.strictEqual(isCurrentAssignee({ assignees, userUuid: undefined }), false);
});

test("escalation advances the same additionalDetail keys the SLA escalation writes", () => {
  const first = escalationStamp({ additionalDetail: {}, assignees: [{ uuid: "lme-a" }], now: 1000 });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(first)), { escalationLevel: 1, lastEscalatedAt: 1000, escalatedFrom: ["lme-a"] });
  const second = escalationStamp({ additionalDetail: { escalationLevel: 1, department: "HEALTH" }, assignees: [{ uuid: "dir-a" }], now: 2000 });
  assert.strictEqual(second.escalationLevel, 2);
  // string-typed levels (older JSON round-trips) still advance
  assert.strictEqual(escalationStamp({ additionalDetail: { escalationLevel: "2" }, assignees: [], now: 3 }).escalationLevel, 3);
  assert.strictEqual(escalationStamp({ additionalDetail: undefined, assignees: null, now: 4 }).escalatedFrom.length, 0);
});

test("the level follows the target state, whatever the stored counter says", () => {
  // e.g. an employee REOPEN on an older bundle left escalationLevel 2 behind
  const stale = { escalationLevel: 2 };
  assert.strictEqual(escalationStamp({ additionalDetail: stale, assignees: [], targetState: "ESCALATEDLEVEL1", now: 1 }).escalationLevel, 1);
  assert.strictEqual(escalationStamp({ additionalDetail: {}, assignees: [], targetState: "ESCALATEDLEVEL3", now: 1 }).escalationLevel, 3);
  // a target not named ESCALATEDLEVEL<n> counts on from the stored level
  assert.strictEqual(escalationStamp({ additionalDetail: { escalationLevel: 1 }, assignees: [], targetState: "SUPERVISOR_REVIEW", now: 1 }).escalationLevel, 2);
});
