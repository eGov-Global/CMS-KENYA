// Pins how bgrm's My Complaints builds the rows its cards show and its search
// matches: the testing-entrance filter runs before the search, the count and
// the pages, and a complaint's type and category are named from its own
// tenant's hierarchy before the citizen tenant's service defs.
// Run from digit-ui-esbuild/:  node --test tests/citizenMyComplaintsRows.test.js
//
// complaintRows lives in the page module, so this bundles the page with its
// package imports (React, router, i18n, the component libraries, icons)
// replaced by empty modules: only the pure function is called. Plugins need
// esbuild's async build, hence the before() hook.

const { before, beforeEach, test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");
const esbuild = require("esbuild");

const ENTRY = path.join(__dirname, "../products/pgr/src/pages/citizen/ComplaintsList.js");
const UTIL = path.join(__dirname, "../products/pgr/src/utils/citizenComplaints.js");
const OUT = path.join(os.tmpdir(), `citizenMyComplaintsRows.cjs.${process.pid}.js`);

const stubPackages = {
  name: "stub-packages",
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, (args) => ({ path: args.path, namespace: "stub" }));
    build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "module.exports = {};", loader: "js" }));
  },
};

process.on("exit", () => {
  try {
    fs.unlinkSync(OUT);
  } catch {
    // Best effort; the temp file is process-scoped.
  }
});

let complaintRows;
let pageOf;
let searchComplaints;

before(async () => {
  await esbuild.build({
    stdin: {
      contents: `export { complaintRows } from ${JSON.stringify(ENTRY)};\nexport { pageOf, searchComplaints } from ${JSON.stringify(UTIL)};`,
      resolveDir: __dirname,
      loader: "js",
    },
    bundle: true,
    format: "cjs",
    platform: "neutral",
    loader: { ".js": "jsx" },
    plugins: [stubPackages],
    outfile: OUT,
    logLevel: "silent",
  });
  ({ complaintRows, pageOf, searchComplaints } = require(OUT));
});

// The entrance setup utils/testingTenant reads: TESTING_MODE marks the testing
// entrance, TESTING_TENANT_ID names the testing tenant.
const entrance = ({ testing = false, testingTenant = "bo.testing" } = {}) => {
  const config = { TESTING_MODE: testing, TESTING_TENANT_ID: testingTenant };
  globalThis.window = { globalConfigs: { getConfig: (key) => config[key] } };
};
beforeEach(() => entrance());

// Seeded COMPLAINT_HIERARCHY.* labels; anything else comes back as its key.
const seeded = { "COMPLAINT_HIERARCHY.STREETLIGHT": "Streetlight not working" };
const t = (key) => seeded[key] || key;

const wrap = (id, tenantId, serviceCode, createdTime, description = "") => ({
  service: { serviceRequestId: id, tenantId, serviceCode, description, applicationStatus: "PENDINGATLME", auditDetails: { createdTime } },
});

test("a testing-tenant complaint is gone before the search, the count and the pages", () => {
  const wrappers = [
    wrap("PG-PGR-2026-10-01-000001", "bo.bomet", "STREETLIGHT", 1),
    wrap("TST-PGR-2026-10-02-000002", "bo.testing", "STREETLIGHT", 2),
  ];
  const rows = complaintRows(wrappers, { t });
  assert.deepEqual(rows.map((r) => r.id), ["PG-PGR-2026-10-01-000001"]);
  assert.deepEqual(searchComplaints(rows, "TST-PGR").length, 0);
  assert.equal(pageOf(searchComplaints(rows, ""), 1, 10).total, 1);

  entrance({ testing: true });
  assert.deepEqual(complaintRows(wrappers, { t }).map((r) => r.id), ["TST-PGR-2026-10-02-000002"]);
});

test("type and category come from the complaint's own tenant, and the search matches both", () => {
  const nodesByTenant = {
    "bo.chepalungu": [
      { code: "BUSINESS", name: "Business" },
      { code: "NO_LICENCE", name: "Operating without a licence", parentCode: "BUSINESS" },
    ],
  };
  // The citizen tenant's defs name the same code differently; the complaint's own tenant wins.
  const defsByCode = { NO_LICENCE: { name: "Citizen-tenant name", menuPath: "OTHER", menuPathName: "Other" } };
  const [row] = complaintRows([wrap("PG-PGR-2026-10-03-000003", "bo.chepalungu", "NO_LICENCE", 3, "Kiosk at the stage")], {
    t,
    nodesByTenant,
    defsByCode,
  });
  assert.equal(row.concern, "Operating without a licence");
  assert.equal(row.category, "Business");
  for (const query of ["licence", "business", "kiosk stage", "000003"]) {
    assert.equal(searchComplaints([row], query).length, 1, query);
  }
});

test("a seeded label beats node names; before the own tenant loads, the citizen tenant's defs, then the cached names", () => {
  const defsByCode = { WATER_LEAK: { name: "Water leakage", menuPath: "WATER", menuPathName: "Water and Sewage" } };
  const rows = complaintRows(
    [
      wrap("A", "bo.bomet", "STREETLIGHT", 1),
      wrap("B", "bo.bomet", "WATER_LEAK", 2),
      wrap("C", "bo.bomet", "ROAD_POTHOLE", 3),
    ],
    {
      t,
      nodesByTenant: { "bo.bomet": [{ code: "STREETLIGHT", name: "Street light" }] },
      defsByCode,
      namesByCode: { ROAD_POTHOLE: "Pothole on the road" },
    }
  );
  assert.deepEqual(
    rows.map((r) => [r.id, r.concern, r.category]),
    [
      ["A", "Streetlight not working", ""],
      ["B", "Water leakage", "Water and Sewage"],
      ["C", "Pothole on the road", ""],
    ]
  );
});

test("newest first, ten to a page, over every complaint fetched", () => {
  const wrappers = Array.from({ length: 23 }, (_, i) => wrap(`PG-${i}`, "bo.bomet", "STREETLIGHT", i));
  const matches = searchComplaints(complaintRows(wrappers, { t }), "");
  const last = pageOf(matches, 3, 10);
  assert.deepEqual([last.pages, last.from, last.to, last.total], [3, 21, 23, 23]);
  assert.deepEqual(last.rows.map((r) => r.id), ["PG-2", "PG-1", "PG-0"]);
  assert.equal(pageOf(matches, 1, 10).rows[0].id, "PG-22");
});
