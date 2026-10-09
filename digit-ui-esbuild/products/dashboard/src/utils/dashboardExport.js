// Dashboard export: one model, three serialisers (Excel workbook, CSV, PDF report).
//
// The model is built from exactly what is on the dashboard — the laid-out tiles,
// their assembled results and the active filters — so an export is a faithful
// copy of the screen: a context block (dashboard, organisation, period, area,
// complaint type, exported at, data as-of), a KPI summary (value, previous
// period, change) and every chart/table/map tile as a full data table with
// display labels. Kept free of React, i18n and the DOM: the caller injects the
// label resolvers and the translation function, which keeps every serialiser
// unit-testable and the i18n contract (literal DASHBOARD_* keys with English
// fallbacks) visible in one place.

export const EXPORT_FORMATS = ["xlsx", "csv", "pdf"];
export const PDF_ROW_CAP = 200;
const SHEET_NAME_MAX = 31;
// Mirrors KpiTile's applyFormat: percent formats take ratios (<= 1) or percentages, durations are
// milliseconds, ratings are out of five. The tenant number mask is a display concern of the tiles;
// exports keep the plain decimal point so the files parse the same everywhere.
const PERCENT_FORMATS = new Set(["percent", "percentOneDecimal", "percentInteger", "percentNoDecimal", "percentage"]);
const MS_PER_HOUR = 3600000;
const MS_PER_DAY = 86400000;
export const normalizePct = (v) => (v <= 1 ? v * 100 : v);

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const toNum = (v) => {
  if (isNum(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};

/** snake_case / camelCase column names -> "Title Case" when no label is seeded. */
export const humanizeName = (name) =>
  String(name ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Percent metrics move in percentage points; everything else in % change. */
export function computeDelta(value, prior, format) {
  const v = toNum(value);
  const p = toNum(prior);
  if (v == null || p == null) return null;
  if (PERCENT_FORMATS.has(format)) return { unit: "pp", value: normalizePct(v) - normalizePct(p) };
  if (p === 0) return null;
  return { unit: "%", value: ((v - p) / Math.abs(p)) * 100 };
}

const trimNumber = (n, decimals) => {
  const s = Number(n).toFixed(decimals);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
};

/** Display text for a card value, the way the card shows it (see KpiTile applyFormat). */
export function formatScalar(value, format) {
  const n = toNum(value);
  if (n == null) return value == null || value === "" ? "" : String(value);
  switch (format) {
    case "integer":
      return String(Math.round(n));
    case "percentInteger":
    case "percentNoDecimal":
      return `${Math.round(normalizePct(n))}%`;
    case "percent":
    case "percentOneDecimal":
    case "percentage":
      return `${normalizePct(n).toFixed(1)}%`;
    case "decimalOne":
      return n.toFixed(1);
    case "decimalTwo":
      return n.toFixed(2);
    case "ratingOutOfFive":
      return `${n.toFixed(1)}/5`;
    case "hoursDays": {
      const hours = n / MS_PER_HOUR;
      if (hours < 48) return `${trimNumber(Math.round(hours * 10) / 10, 1)} h`;
      return `${trimNumber(Math.round((n / MS_PER_DAY) * 10) / 10, 1)} d`;
    }
    case "hoursDecimal":
      return `${(n / MS_PER_HOUR).toFixed(1)}h`;
    case "signedInteger":
      return `${n >= 0 ? "+" : ""}${Math.round(n)}`;
    default:
      return trimNumber(n, 2);
  }
}

export function formatDelta(delta) {
  if (!delta) return "";
  const sign = delta.value > 0 ? "+" : "";
  return `${sign}${trimNumber(delta.value, 1)}${delta.unit}`;
}

/** Epoch-ms or ISO date-time -> YYYY-MM-DD (exports want a sortable date, not a locale string). */
export function toIsoDate(value) {
  if (value == null || value === "") return "";
  const d = typeof value === "number" || /^\d{12,}$/.test(String(value)) ? new Date(Number(value)) : new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

const pad = (n) => String(n).padStart(2, "0");
export const formatStamp = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * Build the export model.
 *   tileIds   laid-out tile ids, in dashboard order
 *   kpis      catalog defs by id
 *   assemble  (id, def) -> assembled result ({ value, prior, columns, rows, ... }) or null
 *   context   already-resolved strings: { title, tenant, period, geography, complaintType, asOf }
 *   resolvers { isCard(kind), title(def), subtitle(def), column(def, col), cell(value, col, def), groupBy(id) }
 */
export function buildExportModel({ tileIds, kpis, assemble, context, resolvers, now = new Date() }) {
  const summary = [];
  const tiles = [];
  for (const id of tileIds || []) {
    const def = kpis?.[id];
    if (!def) continue;
    const viz = def.viz || {};
    const res = assemble(id, def) || null;
    const title = resolvers.title(def) || id;
    if (resolvers.isCard(viz.kind)) {
      const value = res?.value ?? null;
      const prior = res?.prior ?? null;
      summary.push({ id, title, value, prior, format: viz.format || null, delta: computeDelta(value, prior, viz.format) });
      continue;
    }
    const rawCols = res?.columns?.length
      ? res.columns
      : res?.rows?.[0]
      ? Object.keys(res.rows[0]).map((name) => ({ name }))
      : [];
    const columns = rawCols.map((c) => {
      const col = typeof c === "string" ? { name: c } : c;
      return { name: col.name, role: col.role || null, format: col.format || null, label: resolvers.column(def, col) || humanizeName(col.name) };
    });
    const rows = (res?.rows || []).map((row) => columns.map((col) => resolvers.cell(row?.[col.name], col, def)));
    tiles.push({ id, title, subtitle: resolvers.subtitle(def) || "", kind: viz.kind || "table", columns, rows, groupBy: resolvers.groupBy ? resolvers.groupBy(id) || null : null });
  }
  return { context: { ...context }, summary, tiles, generatedAt: now };
}

const slug = (s) =>
  String(s || "dashboard")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "dashboard";

export function exportFileName(model, ext) {
  const d = model.generatedAt;
  return `${slug(model.context.tenant)}-dashboard-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.${ext}`;
}

/* ------------------------------------------------------------------ */
/* Shared table shapes                                                  */
/* ------------------------------------------------------------------ */

export function contextRows(model, t) {
  const c = model.context;
  const rows = [
    [t("DASHBOARD_EXPORT_CTX_DASHBOARD", "Dashboard"), c.title || ""],
    [t("DASHBOARD_EXPORT_CTX_TENANT", "Organisation"), c.tenant || ""],
    [t("DASHBOARD_EXPORT_CTX_PERIOD", "Period"), c.period || ""],
    [t("DASHBOARD_EXPORT_CTX_GEOGRAPHY", "Area"), c.geography || ""],
    [t("DASHBOARD_EXPORT_CTX_TYPE", "Complaint type"), c.complaintType || ""],
    [t("DASHBOARD_EXPORT_CTX_GENERATED", "Exported at"), formatStamp(model.generatedAt)],
  ];
  if (c.asOf) rows.push([t("DASHBOARD_EXPORT_CTX_ASOF", "Data as of"), formatStamp(new Date(c.asOf))]);
  return rows;
}

export const summaryHeader = (t) => [
  t("DASHBOARD_EXPORT_COL_TITLE", "Title"),
  t("DASHBOARD_EXPORT_COL_VALUE", "Value"),
  t("DASHBOARD_EXPORT_COL_PRIOR", "Previous period"),
  t("DASHBOARD_EXPORT_COL_CHANGE", "Change"),
];

export const summaryRow = (s) => [s.title, formatScalar(s.value, s.format), formatScalar(s.prior, s.format), formatDelta(s.delta)];

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

const csvEscape = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One file, one section per tile; UTF-8 BOM + CRLF so Excel opens it cleanly. */
export function toCsvText(model, t) {
  const line = (cells) => cells.map(csvEscape).join(",");
  const out = [line([t("DASHBOARD_EXPORT_SECTION_CONTEXT", "About this export")])];
  for (const r of contextRows(model, t)) out.push(line(r));
  out.push("", line([t("DASHBOARD_EXPORT_SHEET_SUMMARY", "Summary")]), line(summaryHeader(t)));
  for (const s of model.summary) out.push(line(summaryRow(s)));
  for (const tile of model.tiles) {
    out.push("", line([tile.title, tile.subtitle, tile.groupBy ? `${t("DASHBOARD_EXPORT_CTX_GROUPBY", "Grouped by")}: ${tile.groupBy}` : ""].filter(Boolean)));
    out.push(line(tile.columns.map((c) => c.label)));
    if (!tile.rows.length) out.push(line([t("DASHBOARD_EXPORT_NO_DATA", "No data for the current filters")]));
    for (const r of tile.rows) out.push(line(r));
  }
  return `﻿${out.join("\r\n")}\r\n`;
}

/* ------------------------------------------------------------------ */
/* Excel                                                               */
/* ------------------------------------------------------------------ */

/** Excel sheet names: no []:*?/\ , at most 31 chars, unique within the workbook. */
export function sheetName(title, used) {
  let base = String(title || "Sheet").replace(/[[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim() || "Sheet";
  if (base.length > SHEET_NAME_MAX) base = base.slice(0, SHEET_NAME_MAX).trim();
  let name = base;
  for (let n = 2; used.has(name.toLowerCase()); n++) {
    const suffix = ` (${n})`;
    name = `${base.slice(0, SHEET_NAME_MAX - suffix.length).trim()}${suffix}`;
  }
  used.add(name.toLowerCase());
  return name;
}

const widthsFor = (header, rows) =>
  header.map((h, i) => {
    let w = String(h ?? "").length;
    for (const r of rows.slice(0, 200)) w = Math.max(w, String(r[i] ?? "").length);
    return { wch: Math.min(48, Math.max(10, w + 2)) };
  });

/** Summary sheet (context + KPI table + sheet index) and one sheet per tile. */
export function toWorkbook(model, XLSX, t) {
  const wb = XLSX.utils.book_new();
  const used = new Set();
  const summaryName = sheetName(t("DASHBOARD_EXPORT_SHEET_SUMMARY", "Summary"), used);
  const tileSheets = model.tiles.map((tile) => ({ tile, name: sheetName(tile.title, used) }));
  const sHeader = summaryHeader(t);
  const aoa = [
    [t("DASHBOARD_EXPORT_SECTION_CONTEXT", "About this export")],
    ...contextRows(model, t),
    [],
    [t("DASHBOARD_EXPORT_SHEET_SUMMARY", "Summary")],
    sHeader,
    ...model.summary.map(summaryRow),
    [],
    [t("DASHBOARD_EXPORT_SHEET_INDEX", "Sheets")],
    [t("DASHBOARD_EXPORT_COL_SHEET", "Sheet"), t("DASHBOARD_EXPORT_COL_TITLE", "Title")],
    ...tileSheets.map(({ tile, name }) => [name, tile.title]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 34 }, { wch: 22 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, summaryName);
  for (const { tile, name } of tileSheets) {
    const header = tile.columns.map((c) => c.label);
    const rows = tile.rows.map((r) => r.map((v) => (v === "" ? null : v)));
    const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    sheet["!cols"] = widthsFor(header, tile.rows);
    if (header.length) sheet["!autofilter"] = { ref: `A1:${colLetter(header.length - 1)}${Math.max(1, rows.length + 1)}` };
    XLSX.utils.book_append_sheet(wb, sheet, name);
  }
  return wb;
}

function colLetter(i) {
  let s = "";
  for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) s = String.fromCharCode(65 + (n % 26)) + s;
  return s;
}

/* ------------------------------------------------------------------ */
/* PDF report                                                          */
/* ------------------------------------------------------------------ */

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const BOTTOM = PAGE_H - 18;
const LINE_MM = 4.2;
const CELL_PAD = 1.6;

/**
 * A4 portrait report drawn as structured text: title + context, the KPI
 * summary, then every tile as a table (header row shaded, long cells wrapped,
 * rows capped at PDF_ROW_CAP with a note), page numbers on every page.
 * `jsPDF` is injected (loaded on demand by the caller) so this stays pure.
 */
export function toPdf(model, jsPDF, t) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;
  const font = (size, style = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };
  const newPageIfNeeded = (h) => {
    if (y + h > BOTTOM) {
      doc.addPage();
      y = MARGIN;
    }
  };
  const wrap = (text, width) => {
    const s = text == null ? "" : String(text);
    const lines = doc.splitTextToSize(s, Math.max(4, width));
    return lines.length ? lines : [""];
  };

  const table = (heading, subheading, header, rows, note) => {
    const colCount = Math.max(1, header.length);
    // Column widths proportional to content, floored so narrow numeric columns stay readable.
    const weights = header.map((h, i) => {
      let w = String(h ?? "").length;
      for (const r of rows.slice(0, 60)) w = Math.max(w, Math.min(40, String(r[i] ?? "").length));
      return Math.max(6, w);
    });
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    const widths = weights.map((w) => Math.max(18, (w / total) * CONTENT_W));
    const scale = CONTENT_W / widths.reduce((a, b) => a + b, 0);
    const cols = widths.map((w) => w * scale);

    newPageIfNeeded(16);
    font(12, "bold");
    doc.setTextColor(20);
    doc.text(String(heading), MARGIN, y + 4);
    y += 6;
    if (subheading) {
      font(8.5);
      doc.setTextColor(100);
      for (const l of wrap(subheading, CONTENT_W)) {
        doc.text(l, MARGIN, y + 3);
        y += LINE_MM;
      }
      y += 1;
    }
    const drawRow = (cells, { head = false, zebra = false } = {}) => {
      font(head ? 8.5 : 8.5, head ? "bold" : "normal");
      const wrapped = cells.map((c, i) => wrap(c, cols[i] - 2 * CELL_PAD));
      const lines = Math.max(...wrapped.map((w) => w.length));
      const h = lines * LINE_MM + 2 * CELL_PAD;
      newPageIfNeeded(h);
      if (head || zebra) {
        doc.setFillColor(head ? 226 : 245, head ? 232 : 245, head ? 240 : 247);
        doc.rect(MARGIN, y, CONTENT_W, h, "F");
      }
      doc.setDrawColor(215);
      doc.line(MARGIN, y + h, MARGIN + CONTENT_W, y + h);
      doc.setTextColor(head ? 30 : 40);
      let x = MARGIN;
      wrapped.forEach((ls, i) => {
        ls.forEach((l, li) => doc.text(l, x + CELL_PAD, y + CELL_PAD + (li + 1) * LINE_MM - 1.1));
        x += cols[i];
      });
      y += h;
    };
    drawRow(header.length ? header : [""], { head: true });
    if (!rows.length) drawRow([t("DASHBOARD_EXPORT_NO_DATA", "No data for the current filters")].concat(Array(colCount - 1).fill("")));
    rows.slice(0, PDF_ROW_CAP).forEach((r, i) => drawRow(r, { zebra: i % 2 === 1 }));
    if (rows.length > PDF_ROW_CAP || note) {
      font(8);
      doc.setTextColor(110);
      const msg = rows.length > PDF_ROW_CAP
        ? t("DASHBOARD_EXPORT_ROWS_TRUNCATED", "Showing the first {n} rows of {total}").replace("{n}", String(PDF_ROW_CAP)).replace("{total}", String(rows.length))
        : note;
      newPageIfNeeded(LINE_MM + 2);
      doc.text(msg, MARGIN, y + 3.2);
      y += LINE_MM + 2;
    }
    y += 6;
  };

  // Title block
  font(16, "bold");
  doc.setTextColor(20);
  doc.text(String(model.context.title || t("DASHBOARD_EXPORT_CTX_DASHBOARD", "Dashboard")), MARGIN, y + 6);
  y += 10;
  font(9);
  doc.setTextColor(90);
  for (const [k, v] of contextRows(model, t)) {
    if (!v) continue;
    doc.text(`${k}: ${v}`, MARGIN, y + 3);
    y += LINE_MM;
  }
  y += 5;

  table(t("DASHBOARD_EXPORT_SHEET_SUMMARY", "Summary"), "", summaryHeader(t), model.summary.map(summaryRow));
  for (const tile of model.tiles) {
    const sub = [tile.subtitle, tile.groupBy ? `${t("DASHBOARD_EXPORT_CTX_GROUPBY", "Grouped by")}: ${tile.groupBy}` : ""].filter(Boolean).join(" · ");
    table(tile.title, sub, tile.columns.map((c) => c.label), tile.rows);
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  const stamp = `${model.context.title || ""} · ${formatStamp(model.generatedAt)}`.replace(/^ · /, "");
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(8);
    doc.setTextColor(120);
    doc.text(stamp, MARGIN, PAGE_H - 9);
    doc.text(
      t("DASHBOARD_EXPORT_PDF_PAGE", "Page {n} of {total}").replace("{n}", String(i)).replace("{total}", String(pages)),
      PAGE_W - MARGIN,
      PAGE_H - 9,
      { align: "right" }
    );
  }
  return doc;
}

/* ------------------------------------------------------------------ */
/* Browser download                                                    */
/* ------------------------------------------------------------------ */

export function downloadText(text, filename, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
