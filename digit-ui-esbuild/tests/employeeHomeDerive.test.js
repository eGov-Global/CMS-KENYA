// deriveHomeData: the pure aggregation behind the employee home v2 panels.
//
// The module is ESM (like every other product source); the harness is CJS
// (`node --test`), so we transpile the single file in-memory with esbuild —
// already a devDependency — and evaluate the CJS output in a vm context.
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");

const SRC = path.resolve(__dirname, "../products/pgr/src/pages/employee/EmployeeHomeV2/deriveHomeData.js");
// bundle: the module imports the shared SLA util from products/pgr/src/utils/sla.js
const { outputFiles } = esbuild.buildSync({ entryPoints: [SRC], bundle: true, write: false, format: "cjs", platform: "node", target: "es2018" });
const code = outputFiles[0].text;
const mod = { exports: {} };
vm.runInNewContext(code, { module: mod, exports: mod.exports, Date });
const { deriveHomeData, OPEN_STATES, startOfWeek } = mod.exports;

const DAY = 86400000;
const HOUR = 3600000;
// A fixed Wednesday 12:00 local so the weekday buckets are deterministic.
const NOW = (() => { const d = new Date(2026, 8, 23, 12, 0, 0, 0); return d.getTime(); })();

const wrap = (id, status, created, extra = {}) => ({
  service: {
    serviceRequestId: id,
    applicationStatus: status,
    serviceCode: extra.code || "TYPE_A",
    source: "source" in extra ? extra.source : "web",
    address: { locality: { code: extra.ward || "WARD_1", name: null } },
    auditDetails: { createdTime: created, lastModifiedTime: extra.modified ?? created },
  },
  workflow: { action: extra.action || "APPLY" },
});

const DEFS = [
  { serviceCode: "TYPE_A", name: "Type A", department: "HEALTH", slaHours: 48 },
  { serviceCode: "TYPE_B", name: "Type B", department: "WATER", slaHours: 720 },
];

test("maps SLA, age and department from serviceDefs; overdue only for OPEN rows", () => {
  const out = deriveHomeData({
    wrappers: [
      wrap("A-1", "PENDINGATLME", NOW - 3 * DAY), // 48h budget, 3 days old -> overdue
      wrap("A-2", "RESOLVED", NOW - 3 * DAY), // resolved rows are never overdue
      wrap("A-3", "PENDINGATLME", NOW - 2 * HOUR, { code: "TYPE_B", ward: "WARD_2" }),
      wrap("A-4", "PENDINGATLME", NOW - 2 * DAY, { code: "NO_DEF" }), // falls back to the 5-day SLA
    ],
    defs: DEFS,
    totals: { total: 4, open: 3, resolved: 1 },
    now: NOW,
  });
  const byId = Object.fromEntries(out.items.map((i) => [i.id, i]));
  assert.equal(byId["A-1"].overdue, true);
  assert.equal(byId["A-1"].slaDays, -1);
  assert.equal(byId["A-2"].overdue, false);
  assert.equal(byId["A-3"].dept, "WATER");
  assert.equal(byId["A-4"].dept, null);
  assert.equal(byId["A-4"].slaDays, 3);
  assert.equal(out.overdue, 1);
  assert.equal(out.partial, false);
  assert.deepEqual(out.openByStatus, [{ key: "PENDINGATLME", n: 3 }]);
  assert.deepEqual(out.byDept.map((r) => r.key), ["HEALTH", "WATER", "UNKNOWN"]);
  assert.deepEqual(out.byAge.map((r) => r.n), [1, 1, 1, 0]); // <1d, 1–3d, 3–7d, >7d over OPEN rows
});

test("partial: known total vs sample; unknown total falls back to whether the last page was full", () => {
  const one = [wrap("A-1", "PENDINGATLME", NOW - HOUR)];
  assert.equal(deriveHomeData({ wrappers: one, totals: { total: 46 }, now: NOW }).partial, true);
  assert.equal(deriveHomeData({ wrappers: one, totals: { total: 1 }, now: NOW }).partial, false);
  const nulls = deriveHomeData({ wrappers: one, totals: {}, now: NOW });
  assert.equal(nulls.partial, false); // short page, no total: we have everything there is
  assert.equal(nulls.totals.total, null);
  assert.equal(nulls.totals.open, null);
  const ten = Array.from({ length: 10 }, (_, i) => wrap(`P-${i}`, "PENDINGATLME", NOW - i * HOUR));
  assert.equal(deriveHomeData({ wrappers: ten, totals: {}, lastPageFull: true, now: NOW }).partial, true); // full page, count failed
  assert.equal(deriveHomeData({ wrappers: ten, totals: { total: 10 }, lastPageFull: true, now: NOW }).partial, false); // known total wins
});

test("an empty sample yields zero tallies (the hook, not this function, decides whether the sample was READABLE)", () => {
  const out = deriveHomeData({ wrappers: [], totals: { total: 412, open: 180, resolved: 200 }, now: NOW });
  assert.equal(out.sampleSize, 0);
  assert.equal(out.partial, true);
  assert.equal(out.overdue, 0);
  assert.deepEqual(out.openByStatus, []);
});

test("recent is ordered by lastModifiedTime desc and dueSoon by SLA asc, both capped", () => {
  const wrappers = Array.from({ length: 8 }, (_, i) =>
    wrap(`R-${i}`, OPEN_STATES[i % OPEN_STATES.length], NOW - (i + 1) * DAY, { modified: NOW - i * HOUR })
  );
  const out = deriveHomeData({ wrappers, defs: [{ serviceCode: "TYPE_A", slaHours: 24 * 5 }], now: NOW });
  assert.deepEqual(out.recent.map((i) => i.id), ["R-0", "R-1", "R-2", "R-3", "R-4", "R-5"]);
  assert.equal(out.dueSoon.length, 5);
  assert.deepEqual(out.dueSoon.map((i) => i.id), ["R-7", "R-6", "R-5", "R-4", "R-3"]); // oldest = least SLA left
});

test("weekday and 14-day series count only what falls in their window", () => {
  const monday = startOfWeek(NOW);
  const wrappers = [
    wrap("W-1", "PENDINGATLME", monday + HOUR), // Monday
    wrap("W-2", "PENDINGATLME", monday + 2 * DAY + HOUR), // Wednesday (today)
    wrap("W-3", "PENDINGATLME", monday - HOUR), // last week: excluded from weekday, included in 14-day
    wrap("W-4", "PENDINGATLME", NOW - 20 * DAY), // outside both
  ];
  const out = deriveHomeData({ wrappers, now: NOW });
  assert.deepEqual(out.byWeekday.map((r) => r.n), [1, 0, 1, 0, 0, 0, 0]);
  assert.equal(out.perDay14.reduce((s, x) => s + x, 0), 3);
  assert.equal(out.perDay14[13], 1); // today is the last bucket
});

test("rows without an id are dropped; channel and type tallies are descending", () => {
  const out = deriveHomeData({
    wrappers: [
      { service: { applicationStatus: "PENDINGATLME" } },
      wrap("S-1", "PENDINGATLME", NOW, { source: "inperson" }),
      wrap("S-2", "PENDINGATLME", NOW, { source: "inperson", code: "TYPE_B" }),
      wrap("S-3", "PENDINGATLME", NOW, { source: null }),
    ],
    now: NOW,
  });
  assert.equal(out.sampleSize, 3);
  assert.deepEqual(out.bySource, [{ key: "inperson", n: 2 }, { key: "unknown", n: 1 }]);
  assert.deepEqual(out.byType, [{ key: "TYPE_A", n: 2 }, { key: "TYPE_B", n: 1 }]);
});
