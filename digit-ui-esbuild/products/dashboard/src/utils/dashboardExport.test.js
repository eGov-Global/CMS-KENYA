// Unit tests for the dashboard export model and its three serialisers.
// Run from digit-ui-esbuild/:  node --test products/dashboard/src/utils/dashboardExport.test.js
// The module is ESM; bundled to CJS with the repo's esbuild like layoutStore.test.js.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");
const esbuild = require("esbuild");

function bundle(entry) {
  const out = path.join(os.tmpdir(), `${path.basename(entry, ".js")}.cjs.${process.pid}.js`);
  esbuild.buildSync({ entryPoints: [path.join(__dirname, entry)], bundle: true, format: "cjs", platform: "neutral", outfile: out });
  process.on("exit", () => { try { fs.unlinkSync(out); } catch (e) { /* gone */ } });
  return require(out);
}

const X = bundle("dashboardExport.js");
const t = (key, fallback) => fallback;

const KPIS = {
  resolution_rate: { viz: { kind: "number-tile-delta", format: "percent" } },
  open_breached: { viz: { kind: "scalar" } },
  by_stage: { viz: { kind: "stacked-bar", title: "Open by stage", columns: [{ name: "service_group", labelKey: "X", label: "Type" }] } },
  at_risk: { viz: { kind: "table" } },
  empty_chart: { viz: { kind: "bar" } },
};
const RESULTS = {
  resolution_rate: { value: 0.013, prior: 0.527 }, // ratios, as the analytics API returns percent metrics
  open_breached: { value: 82, prior: 46 },
  by_stage: { columns: [{ name: "service_group", role: "dimension" }, { name: "workflow_status", role: "dimension" }, { name: "total", role: "measure" }],
    rows: [{ service_group: "WaterPipes", workflow_status: "PENDINGATLME", total: 29 }, { service_group: "Staff, Misconduct", workflow_status: "PENDINGFORASSIGNMENT", total: "2" }] },
  at_risk: { rows: [{ service_request_id: "PG-1", created_date: Date.UTC(2026, 9, 7, 12), hours_left: 3.5 }] },
  empty_chart: { columns: [{ name: "label", role: "dimension" }, { name: "total", role: "measure" }], rows: [] },
};
const resolvers = {
  isCard: (k) => ["scalar", "number-tile", "number-tile-delta", "number-tile-sparkline", "sparkline-card"].includes(k),
  title: (def) => def.viz.title || null,
  subtitle: (def) => def.viz.subtitle || "",
  column: (def, col) => (def.viz.columns || []).find((c) => c.name === col.name)?.label || null,
  cell: (v, col) => (col.name === "workflow_status" ? ({ PENDINGATLME: "Assigned", PENDINGFORASSIGNMENT: "Pending assignment" }[v] || v) : /_date$/.test(col.name) ? X.toIsoDate(v) : /^\d+(\.\d+)?$/.test(String(v)) ? Number(v) : v),
  groupBy: (id) => (id === "by_stage" ? "Ward" : null),
};
const model = () => X.buildExportModel({
  tileIds: ["resolution_rate", "open_breached", "by_stage", "at_risk", "empty_chart", "missing"],
  kpis: KPIS, assemble: (id) => RESULTS[id] || null,
  context: { title: "Complaint Resolution Operations", tenant: "Bomet County", period: "08/09/2026 – 08/10/2026", geography: "All wards", complaintType: "All types", asOf: Date.UTC(2026, 9, 8, 10, 30) },
  resolvers, now: new Date(2026, 9, 8, 13, 5),
});

test("model: cards become summary rows with deltas; charts/tables keep every row with labels", () => {
  const m = model();
  assert.deepEqual(m.summary.map((s) => s.id), ["resolution_rate", "open_breached"]);
  assert.equal(m.summary[0].delta.unit, "pp");
  assert.equal(Math.round(m.summary[0].delta.value * 10) / 10, -51.4);
  assert.equal(m.summary[1].delta.unit, "%");
  assert.equal(Math.round(m.summary[1].delta.value * 10) / 10, 78.3);
  assert.deepEqual(m.tiles.map((x) => x.id), ["by_stage", "at_risk", "empty_chart"]);
  const stage = m.tiles[0];
  assert.deepEqual(stage.columns.map((c) => c.label), ["Type", "Workflow Status", "Total"]);
  assert.deepEqual(stage.rows, [["WaterPipes", "Assigned", 29], ["Staff, Misconduct", "Pending assignment", 2]]);
  assert.equal(stage.groupBy, "Ward");
  // a table with no declared columns derives them from the first row; dates become ISO
  assert.deepEqual(m.tiles[1].columns.map((c) => c.label), ["Service Request Id", "Created Date", "Hours Left"]);
  assert.deepEqual(m.tiles[1].rows[0], ["PG-1", "2026-10-07", 3.5]);
  assert.deepEqual(m.tiles[2].rows, []);
});

test("file name: tenant slug + date + extension", () => {
  assert.equal(X.exportFileName(model(), "xlsx"), "bomet-county-dashboard-2026-10-08.xlsx");
  assert.equal(X.exportFileName({ ...model(), context: { tenant: "" } }, "csv"), "dashboard-dashboard-2026-10-08.csv");
});

test("CSV: BOM, context block, summary, one section per tile, quoted commas, no-data note", () => {
  const csv = X.toCsvText(model(), t);
  assert.ok(csv.startsWith("﻿About this export\r\n"));
  assert.match(csv, /\r\nDashboard,Complaint Resolution Operations\r\n/);
  assert.match(csv, /\r\nExported at,2026-10-08 13:05\r\n/);
  assert.match(csv, /\r\nSummary\r\nTitle,Value,Previous period,Change\r\n/);
  assert.match(csv, /\r\n[^\r\n]*,1\.3%,52\.7%,-51\.4pp\r\n/);
  assert.match(csv, /\r\nOpen by stage,Grouped by: Ward\r\nType,Workflow Status,Total\r\nWaterPipes,Assigned,29\r\n"Staff, Misconduct",Pending assignment,2\r\n/);
  assert.match(csv, /\r\nLabel,Total\r\nNo data for the current filters\r\n/);
});

test("Excel: Summary sheet first with context + KPI table + sheet index, one sheet per tile, unique sanitised names", () => {
  const sheets = [];
  const XLSX = { utils: { book_new: () => ({ Sheets: {} }), aoa_to_sheet: (aoa) => ({ aoa }), book_append_sheet: (wb, ws, name) => sheets.push({ name, ws }) } };
  const m = model();
  m.tiles[1].title = "Open by stage"; // duplicate title -> suffixed sheet name
  m.tiles[2].title = "Complaints: by ward / type [long title that exceeds thirty-one characters]";
  X.toWorkbook(m, XLSX, t);
  assert.deepEqual(sheets.map((s) => s.name), ["Summary", "Open by stage", "Open by stage (2)", "Complaints by ward type long ti"]);
  const summary = sheets[0].ws.aoa;
  assert.deepEqual(summary[0], ["About this export"]);
  assert.deepEqual(summary[1], ["Dashboard", "Complaint Resolution Operations"]);
  assert.ok(summary.some((r) => r[0] === "Summary"));
  assert.ok(summary.some((r) => r[1] === "1.3%" && r[3] === "-51.4pp"));
  assert.ok(summary.some((r) => r[0] === "Open by stage (2)" && r[1] === "Open by stage"));
  assert.deepEqual(sheets[1].ws.aoa[0], ["Type", "Workflow Status", "Total"]);
  assert.deepEqual(sheets[1].ws.aoa[1], ["WaterPipes", "Assigned", 29]);
  assert.equal(sheets[1].ws["!autofilter"].ref, "A1:C3");
  assert.equal(sheets[1].ws["!cols"].length, 3);
});

test("PDF: pages carry title, context, summary and every tile, with page numbers; long tables are capped", () => {
  const calls = [];
  let pages = 1;
  class FakeDoc {
    constructor() { this.internal = {}; }
    setFont(f, s) { calls.push(["font", f, s]); }
    setFontSize() {}
    setTextColor() {}
    setFillColor() {}
    setDrawColor() {}
    rect() {}
    line() {}
    text(s) { calls.push(["text", String(s)]); }
    splitTextToSize(s, w) { const str = String(s); const n = Math.max(1, Math.ceil(str.length / Math.max(1, Math.floor(w / 1.8)))); return Array.from({ length: n }, (_, i) => str.slice(i * Math.ceil(str.length / n), (i + 1) * Math.ceil(str.length / n))); }
    addPage() { pages++; }
    getNumberOfPages() { return pages; }
    setPage() {}
    save() {}
  }
  const m = model();
  m.tiles[0].rows = Array.from({ length: 250 }, (_, i) => [`Type ${i}`, "Assigned", i]);
  X.toPdf(m, FakeDoc, t);
  const texts = calls.filter((c) => c[0] === "text").map((c) => c[1]);
  assert.ok(texts.includes("Complaint Resolution Operations"));
  assert.ok(texts.includes("Period: 08/09/2026 – 08/10/2026"));
  assert.ok(texts.includes("Summary"));
  assert.ok(texts.includes("Open by stage"));
  assert.ok(texts.includes("Type 199") && !texts.includes("Type 200"));
  assert.ok(texts.includes("Showing the first 200 rows of 250"));
  assert.ok(pages > 1);
  assert.ok(texts.includes(`Page 1 of ${pages}`) && texts.includes(`Page ${pages} of ${pages}`));
  assert.ok(texts.includes("No data for the current filters"));
});

test("helpers: humanizeName, formatScalar, formatDelta, toIsoDate, sheetName", () => {
  assert.equal(X.humanizeName("service_request_id"), "Service Request Id");
  assert.equal(X.humanizeName("slaStatusBucket"), "Sla Status Bucket");
  assert.equal(X.formatScalar(0.0125, "percent"), "1.3%");
  assert.equal(X.formatScalar(1, "percent"), "100.0%");
  assert.equal(X.formatScalar(51.4, "percentInteger"), "51%");
  assert.equal(X.formatScalar("82", null), "82");
  assert.equal(X.formatScalar(3, "ratingOutOfFive"), "3.0/5");
  assert.equal(X.formatScalar(5 * 3600000, "hoursDays"), "5 h");
  assert.equal(X.formatScalar(3 * 86400000, "hoursDays"), "3 d");
  assert.equal(X.formatScalar(2.5, "durationHours"), "2.5");
  assert.equal(X.formatScalar(null, "percent"), "");
  assert.equal(X.formatDelta(X.computeDelta(10, 0, "count")), "");
  assert.equal(X.formatDelta(X.computeDelta(3, 4, "count")), "-25%");
  assert.equal(X.toIsoDate("2026-10-07T12:00:00Z"), "2026-10-07");
  assert.equal(X.toIsoDate("n/a"), "n/a");
  const used = new Set();
  assert.equal(X.sheetName("A/B:C*D?E[F]", used), "A B C D E F");
  assert.equal(X.sheetName("a b c d e f", used), "a b c d e f (2)");
});
