// findReopenAssignee / findLatestAssigneeUuidByRole: the network wrappers over
// the pure history reads. One history request per reopen; a failed request is
// null (the page then routes by department), never an exception.
"use strict";
const { test, before } = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");

// Replace the real WorkflowService (network + platform globals) with a stub
// driven by the sandbox's __history hook.
const stubWorkflowService = {
  name: "stub-workflow-service",
  setup(build) {
    build.onResolve({ filter: /services\/workflow\/Workflow$/ }, () => ({ path: "workflow-stub", namespace: "stub" }));
    build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: "export const WorkflowService = { getByBusinessId: (...args) => globalThis.__history(...args) };",
      loader: "js",
    }));
  },
};
const SRC = path.resolve(__dirname, "../products/pgr/src/utils/workflowAssignee.js");
const sandbox = { module: { exports: {} }, console: { warn: () => {} } };
sandbox.exports = sandbox.module.exports;
sandbox.globalThis = sandbox;
let findReopenAssignee;
let findLatestAssigneeUuidByRole;
// Plugins need the async build API.
before(async () => {
  const { outputFiles } = await esbuild.build({ entryPoints: [SRC], bundle: true, write: false, format: "cjs", platform: "node", target: "es2018", plugins: [stubWorkflowService] });
  vm.runInNewContext(outputFiles[0].text, sandbox);
  ({ findReopenAssignee, findLatestAssigneeUuidByRole } = sandbox.module.exports);
});

const person = (uuid, ...roles) => ({ uuid, roles: roles.map((code) => ({ code })) });
const DIRECTOR = person("D", "PGR_LME", "DIRECTOR");
const CHIEF = person("C", "CHIEF_OFFICER");
const HISTORY = [
  { action: "ASSIGN", state: { state: "PENDINGATLME" }, assigner: person("G", "GRO"), assignes: [DIRECTOR], auditDetails: { lastModifiedTime: 1 } },
  { action: "ESCALATE", state: { state: "ESCALATEDLEVEL1" }, assigner: person("S", "SYSTEM"), assignes: [CHIEF], auditDetails: { lastModifiedTime: 2 } },
  { action: "RESOLVE", state: { state: "RESOLVED" }, assigner: CHIEF, assignes: null, auditDetails: { lastModifiedTime: 3 } },
];
const OPTS = { targetStates: ["PENDINGATLME"], reopenRoles: ["CECM", "CHIEF_OFFICER", "DIRECTOR", "PGR_LME"] };

test("one history request per reopen, and the step order applied to it", async () => {
  let calls = 0;
  sandbox.__history = async (tenant, id, params, history) => { calls++; assert.strictEqual(history, true); return { ProcessInstances: HISTORY }; };
  assert.strictEqual(await findReopenAssignee("nb", "CMS-1", OPTS), "D");
  assert.strictEqual(calls, 1);
});

test("a failed history request is null, not an exception", async () => {
  sandbox.__history = async () => { throw new Error("network down"); };
  assert.strictEqual(await findReopenAssignee("nb", "CMS-1", OPTS), null);
  assert.strictEqual(await findLatestAssigneeUuidByRole("nb", "CMS-1", "CMS_CASE_MANAGER"), null);
});

test("a response without ProcessInstances names nobody", async () => {
  sandbox.__history = async () => ({});
  assert.strictEqual(await findReopenAssignee("nb", "CMS-1", OPTS), null);
});

test("missing tenant or complaint id: no request at all", async () => {
  let calls = 0;
  sandbox.__history = async () => { calls++; return { ProcessInstances: HISTORY }; };
  assert.strictEqual(await findReopenAssignee("", "CMS-1", OPTS), null);
  assert.strictEqual(await findReopenAssignee("nb", undefined, OPTS), null);
  assert.strictEqual(await findLatestAssigneeUuidByRole("nb", "CMS-1", ""), null);
  assert.strictEqual(calls, 0);
});

test("findLatestAssigneeUuidByRole is unchanged for rating / employee details: latest holder, assignee before actor", async () => {
  sandbox.__history = async () => ({ ProcessInstances: HISTORY });
  assert.strictEqual(await findLatestAssigneeUuidByRole("nb", "CMS-1", "CHIEF_OFFICER"), "C");
  assert.strictEqual(await findLatestAssigneeUuidByRole("nb", "CMS-1", "GRO"), "G"); // only ever an actor
  assert.strictEqual(await findLatestAssigneeUuidByRole("nb", "CMS-1", "CMS_CASE_MANAGER"), null);
});
