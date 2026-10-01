// WITHDRAW on Bomet (PENDINGATLME -> CANCELLED, CITIZEN + CSR): which actions the
// employee modal turns into a confirmation, and the update the citizen popup sends.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");

const SRC = path.resolve(__dirname, "../products/pgr/src/utils/withdraw.js");
const { outputFiles } = esbuild.buildSync({ entryPoints: [SRC], bundle: true, write: false, format: "cjs", platform: "node", target: "es2018" });
const mod = { exports: {} };
vm.runInNewContext(outputFiles[0].text, { module: mod, exports: mod.exports });
const { isConfirmationAction, buildWithdrawRequest, WITHDRAW_REASON_MAX_LENGTH } = mod.exports;

const SERVICE = { tenantId: "bo", serviceRequestId: "PG-PGR-2026-09-30-000001", applicationStatus: "PENDINGATLME" };

test("only WITHDRAW is a confirmation action", () => {
  assert.strictEqual(isConfirmationAction("WITHDRAW"), true);
  for (const action of ["ASSIGN", "RESOLVE", "REJECT", "ESCALATE", "REOPEN", "RATE", undefined]) {
    assert.strictEqual(isConfirmationAction(action), false, String(action));
  }
});

test("withdraw request carries the complaint, the action and no assignee", () => {
  const req = buildWithdrawRequest(SERVICE, "Resolved it myself");
  assert.strictEqual(req.service, SERVICE);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(req.workflow)), { action: "WITHDRAW", assignes: [], comments: "Resolved it myself" });
});

test("a blank reason sends no comment", () => {
  for (const reason of ["", "   \n ", undefined, null]) {
    assert.strictEqual("comments" in buildWithdrawRequest(SERVICE, reason).workflow, false, JSON.stringify(reason));
  }
});

test("the reason is trimmed and capped at the textarea limit", () => {
  assert.strictEqual(buildWithdrawRequest(SERVICE, "  no longer needed  ").workflow.comments, "no longer needed");
  const long = "x".repeat(WITHDRAW_REASON_MAX_LENGTH + 50);
  assert.strictEqual(buildWithdrawRequest(SERVICE, long).workflow.comments.length, WITHDRAW_REASON_MAX_LENGTH);
});
