// homeQueryParams: what the employee home asks pgr-services for, per tier.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");

const SRC = path.resolve(__dirname, "../products/pgr/src/pages/employee/EmployeeHomeV2/homeQuery.js");
const { outputFiles } = esbuild.buildSync({ entryPoints: [SRC], bundle: true, write: false, format: "cjs", platform: "node", target: "es2018" });
const mod = { exports: {} };
vm.runInNewContext(outputFiles[0].text, { module: mod, exports: mod.exports });
const { SCOPE, homeQueryParams } = mod.exports;
const plain = (o) => JSON.parse(JSON.stringify(o));

const UUID = "0348424c-8ab8-46eb-b369-fceeadfcf060";

test("server-side visibility: wide scopes ask for TEAM, the own queue for MINE", () => {
  // Reproduces cms-pilot 2026-09-25: the inbox endpoints default to MINE when
  // `scope` is absent, so intake clerks, assessors and oversight all read 0.
  assert.deepStrictEqual(plain(homeQueryParams({ tenantId: "nb", uuid: UUID, scope: SCOPE.ALL, serverSide: true })), { tenantId: "nb", scope: "TEAM" });
  assert.deepStrictEqual(plain(homeQueryParams({ tenantId: "nb", uuid: UUID, scope: SCOPE.LOGGED, serverSide: true })), { tenantId: "nb", createdBy: [UUID], scope: "TEAM" });
  assert.deepStrictEqual(plain(homeQueryParams({ tenantId: "nb", uuid: UUID, scope: SCOPE.MINE, serverSide: true })), { tenantId: "nb", assignee: [UUID], scope: "MINE" });
});

test("legacy (client-side) visibility: no scope param, same criteria as before", () => {
  assert.deepStrictEqual(plain(homeQueryParams({ tenantId: "bo", uuid: UUID, scope: SCOPE.ALL, serverSide: false })), { tenantId: "bo" });
  assert.deepStrictEqual(plain(homeQueryParams({ tenantId: "bo", uuid: UUID, scope: SCOPE.LOGGED, serverSide: false })), { tenantId: "bo", createdBy: [UUID] });
  assert.deepStrictEqual(plain(homeQueryParams({ tenantId: "bo", uuid: UUID, scope: SCOPE.MINE, serverSide: false })), { tenantId: "bo", assignee: [UUID] });
});

test("no user id: never sends an empty assignee/createdBy, still scopes TEAM", () => {
  assert.deepStrictEqual(plain(homeQueryParams({ tenantId: "nb", uuid: undefined, scope: SCOPE.MINE, serverSide: true })), { tenantId: "nb", scope: "MINE" });
  assert.deepStrictEqual(plain(homeQueryParams({ tenantId: "nb", uuid: undefined, scope: SCOPE.LOGGED, serverSide: true })), { tenantId: "nb", scope: "TEAM" });
});
