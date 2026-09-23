// Unit tests for the client-side auto-assignment resolver.
// Run from digit-ui-esbuild/:  node --test products/pgr/src/utils/autoAssign.test.js
//
// Every failure mode of this module is silent by design (resolveAutoAssignee
// returns null and the complaint submits unassigned), so these tests are the
// only guard distinguishing "no candidates" from "the resolver is broken".
// Same node --test + esbuild-to-CJS idiom as products/dashboard's tests.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");
const esbuild = require("esbuild");

function bundle(entry) {
  const out = path.join(
    os.tmpdir(),
    `${path.basename(entry, ".js")}.cjs.${process.pid}.js`
  );
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, entry)],
    bundle: true,
    format: "cjs",
    platform: "neutral",
    outfile: out,
  });
  process.on("exit", () => {
    try {
      fs.unlinkSync(out);
    } catch (e) {
      /* already gone */
    }
  });
  return require(out);
}

const { deriveAssigneeRoles, narrowToLastMile, boundaryAncestorCodes, resolveAutoAssignee, narrowByJurisdiction } =
  bundle("autoAssign.js");

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

// Live bo-tenant shape: nextState carries the state NAME.
const BS_BY_NAME = {
  states: [
    {
      isStartState: true,
      state: null,
      actions: [{ action: "APPLY", nextState: "PENDINGATLME", roles: ["CITIZEN", "CSR"], active: true }],
    },
    {
      state: "PENDINGATLME",
      applicationStatus: "PENDINGATLME",
      actions: [
        { action: "RESOLVE", nextState: "RESOLVED", roles: ["PGR_LME", "PGR_VIEWER"], active: true },
        { action: "REJECT", nextState: "REJECTED", roles: ["PGR_LME", "PGR_VIEWER"], active: true },
        // Self-loop: its CITIZEN role must never leak into the assignee set.
        { action: "COMMENT", nextState: "PENDINGATLME", roles: ["CITIZEN"], active: true },
      ],
    },
    { state: "RESOLVED", isTerminateState: true, actions: [] },
    { state: "REJECTED", isTerminateState: true, actions: [] },
  ],
};

// Seeded-dump shape: nextState carries the state UUID.
const BS_BY_UUID = {
  states: [
    {
      isStartState: true,
      uuid: "u-start",
      state: null,
      actions: [{ action: "APPLY", nextState: "u-lme", roles: ["CITIZEN"], active: true }],
    },
    {
      uuid: "u-lme",
      state: "PENDINGATLME",
      actions: [
        { action: "RESOLVE", nextState: "u-res", roles: ["PGR_LME"], active: true },
        { action: "COMMENT", nextState: "u-lme", roles: ["CITIZEN"], active: true },
      ],
    },
    { uuid: "u-res", state: "RESOLVED", isTerminateState: true, actions: [] },
  ],
};

const TREE = [
  {
    code: "BOMET",
    boundaryType: "County",
    children: [
      {
        code: "BOMET_CENTRAL",
        boundaryType: "Sub-County",
        children: [
          { code: "BOMET_CENTRAL_SILIBWET", boundaryType: "Ward", children: [] },
          { code: "BOMET_CENTRAL_NDARAWETA", boundaryType: "Ward", children: [] },
        ],
      },
      { code: "CHEPALUNGU", boundaryType: "Sub-County", children: [] },
    ],
  },
];

const emp = (uuid, dept, opts = {}) => ({
  isActive: opts.isActive,
  user: { uuid },
  assignments: opts.assignments || [{ department: dept, isCurrentAssignment: opts.isCurrentAssignment }],
  jurisdictions: (opts.jurisdictions || []).map((boundary) => ({ boundary })),
});

/* ------------------------------------------------------------------ */
/* deriveAssigneeRoles                                                 */
/* ------------------------------------------------------------------ */

test("derives roles from the create target's forward actions, name-shaped nextState", () => {
  assert.deepEqual(deriveAssigneeRoles(BS_BY_NAME).sort(), ["PGR_LME", "PGR_VIEWER"]);
});

test("derives roles when nextState is a uuid", () => {
  assert.deepEqual(deriveAssigneeRoles(BS_BY_UUID), ["PGR_LME"]);
});

test("self-loop (COMMENT) roles and system roles never enter the assignee set", () => {
  assert.ok(!deriveAssigneeRoles(BS_BY_NAME).includes("CITIZEN"));
});

test("no start state / no APPLY / missing target all yield []", () => {
  assert.deepEqual(deriveAssigneeRoles(null), []);
  assert.deepEqual(deriveAssigneeRoles({ states: [] }), []);
  assert.deepEqual(
    deriveAssigneeRoles({
      states: [{ isStartState: true, actions: [{ action: "APPLY", nextState: "GHOST", roles: ["X"] }] }],
    }),
    []
  );
});

/* ------------------------------------------------------------------ */
/* narrowToLastMile — create-time assignment must skip senior viewers */
/* ------------------------------------------------------------------ */

test("narrowToLastMile keeps only PGR_LME when the workflow lists both", () => {
  // The Bomet regression: PENDINGATLME → RESOLVE/REJECT grant PGR_LME AND
  // PGR_VIEWER, so a new complaint could land on a senior CECM (PGR_VIEWER)
  // instead of the last-mile DIRECTOR (PGR_LME).
  assert.deepEqual(narrowToLastMile(["PGR_VIEWER", "PGR_LME"]), ["PGR_LME"]);
});

test("narrowToLastMile falls back to the full set when there is no PGR_LME", () => {
  // A single-tier tenant that routes straight to a viewer must still resolve
  // someone rather than being narrowed to an empty role list.
  assert.deepEqual(narrowToLastMile(["PGR_VIEWER"]), ["PGR_VIEWER"]);
});

test("narrowToLastMile handles empty / nullish input", () => {
  assert.deepEqual(narrowToLastMile([]), []);
  assert.deepEqual(narrowToLastMile(null), []);
  assert.deepEqual(narrowToLastMile(undefined), []);
});

/* ------------------------------------------------------------------ */
/* boundaryAncestorCodes                                               */
/* ------------------------------------------------------------------ */

test("ward locality yields its ancestor path NARROWEST FIRST", () => {
  // Order is the contract: assignment stops at the first level with a
  // candidate, so ward must precede sub-county must precede county.
  assert.deepEqual(boundaryAncestorCodes(TREE, "BOMET_CENTRAL_SILIBWET"), [
    "BOMET_CENTRAL_SILIBWET",
    "BOMET_CENTRAL",
    "BOMET",
  ]);
});

test("root locality yields just the root", () => {
  assert.deepEqual([...boundaryAncestorCodes(TREE, "BOMET")], ["BOMET"]);
});

test("unknown locality and missing inputs yield null", () => {
  assert.equal(boundaryAncestorCodes(TREE, "NOWHERE"), null);
  assert.equal(boundaryAncestorCodes(TREE, null), null);
  assert.equal(boundaryAncestorCodes(null, "BOMET"), null);
});

/* ------------------------------------------------------------------ */
/* resolveAutoAssignee                                                 */
/* ------------------------------------------------------------------ */

const base = {
  boundaryRoots: TREE,
  tenantId: "bo",
  localityCode: "BOMET_CENTRAL_SILIBWET",
  departmentCode: "DEPT_WATER",
  seed: "seed-1",
};

test("tier 1: jurisdiction match wins over department-only candidates", () => {
  const inWard = emp("uuid-ward", "DEPT_WATER", { jurisdictions: ["BOMET_CENTRAL"] });
  const elsewhere = emp("uuid-far", "DEPT_WATER", { jurisdictions: ["CHEPALUNGU"] });
  const r = resolveAutoAssignee({ ...base, employees: [elsewhere, inWard] });
  assert.equal(r.uuid, "uuid-ward");
  assert.equal(r.tier, "DEPARTMENT_AND_JURISDICTION");
  assert.equal(r.department, "DEPT_WATER");
});

test("bottom-up: the ward officer beats the sub-county and county officers", () => {
  const ward = emp("uuid-ward", "DEPT_WATER", { jurisdictions: ["BOMET_CENTRAL_SILIBWET"] });
  const sub = emp("uuid-sub", "DEPT_WATER", { jurisdictions: ["BOMET_CENTRAL"] });
  const county = emp("uuid-county", "DEPT_WATER", { jurisdictions: ["BOMET"] });
  const r = resolveAutoAssignee({ ...base, employees: [county, sub, ward] });
  assert.equal(r.uuid, "uuid-ward");
  assert.equal(r.jurisdiction, "BOMET_CENTRAL_SILIBWET");
});

test("bottom-up: with no ward officer it steps up to the sub-county, not the county", () => {
  const sub = emp("uuid-sub", "DEPT_WATER", { jurisdictions: ["BOMET_CENTRAL"] });
  const county = emp("uuid-county", "DEPT_WATER", { jurisdictions: ["BOMET"] });
  const r = resolveAutoAssignee({ ...base, employees: [county, sub] });
  assert.equal(r.uuid, "uuid-sub");
  assert.equal(r.jurisdiction, "BOMET_CENTRAL");
});

test("bottom-up: only the county officer exists, so the county gets it", () => {
  const county = emp("uuid-county", "DEPT_WATER", { jurisdictions: ["BOMET"] });
  const r = resolveAutoAssignee({ ...base, employees: [county] });
  assert.equal(r.uuid, "uuid-county");
  assert.equal(r.jurisdiction, "BOMET");
  assert.equal(r.tier, "DEPARTMENT_AND_JURISDICTION");
});

test("bottom-up: precedence is per-level, not a popularity contest", () => {
  // Three officers one level up must not outvote the single ward officer.
  const ward = emp("uuid-ward", "DEPT_WATER", { jurisdictions: ["BOMET_CENTRAL_SILIBWET"] });
  const subs = ["a", "b", "c"].map((n) => emp(`uuid-sub-${n}`, "DEPT_WATER", { jurisdictions: ["BOMET_CENTRAL"] }));
  const r = resolveAutoAssignee({ ...base, employees: [...subs, ward] });
  assert.equal(r.uuid, "uuid-ward");
});

test("bottom-up: a sibling ward never receives the complaint", () => {
  const sibling = emp("uuid-sibling", "DEPT_WATER", { jurisdictions: ["BOMET_CENTRAL_NDARAWETA"] });
  const r = resolveAutoAssignee({ ...base, employees: [sibling] });
  // Not on the locality's path -> no jurisdiction level matches; only the
  // department-only widening can pick them up.
  assert.equal(r.tier, "DEPARTMENT");
});

test("tier 2: falls back to department-only when no jurisdiction covers the locality", () => {
  const elsewhere = emp("uuid-far", "DEPT_WATER", { jurisdictions: ["CHEPALUNGU"] });
  const r = resolveAutoAssignee({ ...base, employees: [elsewhere] });
  assert.equal(r.uuid, "uuid-far");
  assert.equal(r.tier, "DEPARTMENT");
});

test("tier 2: locality missing from the tree (boundary drift) still assigns by department", () => {
  const e = emp("uuid-1", "DEPT_WATER", { jurisdictions: ["BOMET"] });
  const r = resolveAutoAssignee({ ...base, localityCode: "NOT_IN_TREE", employees: [e] });
  assert.equal(r.tier, "DEPARTMENT");
});

test("junk jurisdiction values (tenant code, dotted tenant) never count as coverage", () => {
  const junk = emp("uuid-junk", "DEPT_WATER", { jurisdictions: ["bo", "ke.bomet"] });
  const real = emp("uuid-real", "DEPT_WATER", { jurisdictions: ["BOMET"] });
  const r = resolveAutoAssignee({ ...base, employees: [junk, real] });
  assert.equal(r.uuid, "uuid-real");
});

test("wrong department, ended assignment, inactive and uuid-less employees are excluded", () => {
  const wrongDept = emp("uuid-a", "DEPT_ROADS");
  const ended = emp("uuid-b", "DEPT_WATER", { isCurrentAssignment: false });
  const inactive = emp("uuid-c", "DEPT_WATER", { isActive: false });
  const noUuid = { user: {}, assignments: [{ department: "DEPT_WATER" }] };
  assert.equal(resolveAutoAssignee({ ...base, employees: [wrongDept, ended, inactive, noUuid] }), null);
});

test("absent isCurrentAssignment counts as current (CSR form's departmentGate semantics)", () => {
  const e = emp("uuid-1", "DEPT_WATER");
  assert.equal(resolveAutoAssignee({ ...base, employees: [e] }).uuid, "uuid-1");
});

test("no department code / no employees resolve to null, never throw", () => {
  assert.equal(resolveAutoAssignee({ ...base, departmentCode: null, employees: [emp("u", "D")] }), null);
  assert.equal(resolveAutoAssignee({ ...base, employees: [] }), null);
  assert.equal(resolveAutoAssignee({ ...base, employees: undefined }), null);
});

test("selection is deterministic for a seed and spreads across seeds", () => {
  const pool = [
    emp("uuid-1", "DEPT_WATER", { jurisdictions: ["BOMET"] }),
    emp("uuid-2", "DEPT_WATER", { jurisdictions: ["BOMET"] }),
    emp("uuid-3", "DEPT_WATER", { jurisdictions: ["BOMET"] }),
  ];
  const first = resolveAutoAssignee({ ...base, employees: pool });
  assert.equal(resolveAutoAssignee({ ...base, employees: pool }).uuid, first.uuid);
  const picked = new Set();
  for (let i = 0; i < 40; i++) {
    picked.add(resolveAutoAssignee({ ...base, employees: pool, seed: `s-${i}` }).uuid);
  }
  assert.equal(picked.size, 3);
});

/* ------------------------------------------------------------------ */
/* narrowByJurisdiction — the MANUAL assignee picker's jurisdiction    */
/* gate. Shares resolveAutoAssignee's narrowest-first walk, but must   */
/* WIDEN rather than empty out: an empty dropdown blocks the action.   */
/* ------------------------------------------------------------------ */

const JBASE = { boundaryRoots: TREE, tenantId: "bo", localityCode: "BOMET_CENTRAL_SILIBWET" };

test("jurisdiction: keeps only the employees covering the complaint's ward", () => {
  const inWard = emp("uuid-ward", "DEPT_WATER", { jurisdictions: ["BOMET_CENTRAL_SILIBWET"] });
  const elsewhere = emp("uuid-far", "DEPT_WATER", { jurisdictions: ["CHEPALUNGU"] });
  const out = narrowByJurisdiction({ ...JBASE, employees: [inWard, elsewhere] });
  assert.deepEqual(out.candidates.map((e) => e.user.uuid), ["uuid-ward"]);
  assert.equal(out.jurisdiction, "BOMET_CENTRAL_SILIBWET");
});

test("jurisdiction: narrowest level wins — ward officer over sub-county over county", () => {
  const ward = emp("uuid-ward", "DEPT_WATER", { jurisdictions: ["BOMET_CENTRAL_SILIBWET"] });
  const sub = emp("uuid-sub", "DEPT_WATER", { jurisdictions: ["BOMET_CENTRAL"] });
  const county = emp("uuid-county", "DEPT_WATER", { jurisdictions: ["BOMET"] });
  const out = narrowByJurisdiction({ ...JBASE, employees: [county, sub, ward] });
  assert.deepEqual(out.candidates.map((e) => e.user.uuid), ["uuid-ward"]);
});

test("jurisdiction: falls up to the next level when the ward has nobody", () => {
  const sub = emp("uuid-sub", "DEPT_WATER", { jurisdictions: ["BOMET_CENTRAL"] });
  const county = emp("uuid-county", "DEPT_WATER", { jurisdictions: ["BOMET"] });
  const out = narrowByJurisdiction({ ...JBASE, employees: [county, sub] });
  assert.deepEqual(out.candidates.map((e) => e.user.uuid), ["uuid-sub"]);
  assert.equal(out.jurisdiction, "BOMET_CENTRAL");
});

// The load-bearing negative: a tenant that never seeded HRMS jurisdictions
// must keep its FULL dropdown, not lose every option. This is what separates
// the filter from a regression that blocks reopen everywhere.
test("jurisdiction: nobody on the path -> returns the input unchanged, never empty", () => {
  const a = emp("uuid-a", "DEPT_WATER", { jurisdictions: ["CHEPALUNGU"] });
  const b = emp("uuid-b", "DEPT_WATER", { jurisdictions: [] });
  const out = narrowByJurisdiction({ ...JBASE, employees: [a, b] });
  assert.deepEqual(out.candidates.map((e) => e.user.uuid), ["uuid-a", "uuid-b"]);
  assert.equal(out.jurisdiction, null);
});

test("jurisdiction: missing locality or boundary tree widens instead of emptying", () => {
  const a = emp("uuid-a", "DEPT_WATER", { jurisdictions: ["BOMET"] });
  assert.equal(narrowByJurisdiction({ ...JBASE, localityCode: null, employees: [a] }).candidates.length, 1);
  assert.equal(narrowByJurisdiction({ ...JBASE, boundaryRoots: null, employees: [a] }).candidates.length, 1);
  assert.equal(narrowByJurisdiction({ ...JBASE, localityCode: "NOWHERE", employees: [a] }).candidates.length, 1);
});

test("jurisdiction: junk boundary values are ignored, not treated as coverage", () => {
  // Field data carries the tenant code in `boundary`; it must not count as
  // covering anything (same defensive filter as resolveAutoAssignee).
  const junk = emp("uuid-junk", "DEPT_WATER", { jurisdictions: ["bo", "ke.bomet"] });
  const real = emp("uuid-real", "DEPT_WATER", { jurisdictions: ["BOMET_CENTRAL_SILIBWET"] });
  const out = narrowByJurisdiction({ ...JBASE, employees: [junk, real] });
  assert.deepEqual(out.candidates.map((e) => e.user.uuid), ["uuid-real"]);
});

test("jurisdiction: empty and non-array inputs are safe", () => {
  assert.deepEqual(narrowByJurisdiction({ ...JBASE, employees: [] }).candidates, []);
  assert.deepEqual(narrowByJurisdiction({ ...JBASE, employees: null }).candidates, []);
  assert.deepEqual(narrowByJurisdiction({}).candidates, []);
});
