// Pure aggregation for the employee home — no React, no network, so the
// shaping of one page of complaints into charts/feeds/tables is testable
// without a running stack.
//
// Everything here works on the SAMPLE the hook could fetch (see useHomeData:
// pgr-services enriches every row through egov-workflow, whose default page
// is 10, so a single _search above that fails with WORKFLOW_NOT_FOUND). When
// the tenant-wide total exceeds the sample, `partial` is true and every
// panel derived from `items` must say so instead of posing as a census.

import { DAY_MS, slaDaysRemaining } from "../../../utils/sla";

export const OPEN_STATES = [
  "PENDINGFORASSIGNMENT",
  "PENDINGFORREASSIGNMENT",
  "PENDINGATLME",
  "ESCALATEDLEVEL1DUE",
  "ESCALATEDLEVEL2DUE",
  "ESCALATEDLEVEL3DUE",
];
export const RESOLVED_STATES = ["RESOLVED", "CLOSEDAFTERRESOLUTION"];

// Age buckets for the "cases by age" chart. Keys, not labels — the view
// localises them (PGR_HOME_AGE_<KEY>).
export const AGE_BUCKETS = ["LT1", "D1_3", "D3_7", "GT7"];
export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];


export const startOfDay = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Monday 00:00 of the week containing `ts` (ISO week, matching the chart). */
export const startOfWeek = (ts) => {
  const d = new Date(startOfDay(ts));
  const shift = (d.getDay() + 6) % 7; // Sunday=0 -> 6, Monday=1 -> 0
  return d.getTime() - shift * DAY_MS;
};

const ageBucket = (days) => (days < 1 ? "LT1" : days < 3 ? "D1_3" : days < 7 ? "D3_7" : "GT7");

/** Count items per key, descending. Items whose key is null are skipped. */
const tally = (items, keyOf) => {
  const m = new Map();
  items.forEach((i) => {
    const k = keyOf(i);
    if (k == null) return;
    m.set(k, (m.get(k) || 0) + 1);
  });
  return [...m.entries()].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n);
};

/**
 * @param {object}   args
 * @param {object[]} args.wrappers  ServiceWrappers from pgr-services _search
 * @param {object[]} args.defs      serviceDefs (leaf complaint types) for SLA + department
 * @param {object}   args.totals    { total, open, resolved, today } — number | null each
 * @param {object}   args.extras    { avgResolutionMs } from the _search envelope
 * @param {boolean}  args.lastPageFull  the last fetched page was full — with an unknown
 *                                  total that is the only evidence the sample is cut
 * @param {number}   args.now       epoch ms, injectable for tests
 */
export function deriveHomeData({ wrappers = [], defs = [], totals = {}, extras = {}, lastPageFull = false, now = Date.now() }) {
  const defByCode = {};
  (defs || []).forEach((d) => {
    if (d?.serviceCode != null) defByCode[d.serviceCode] = d;
  });

  const items = wrappers
    .map((w) => {
      const s = w?.service || {};
      const def = defByCode[s.serviceCode] || {};
      const created = s.auditDetails?.createdTime ?? null;
      const modified = s.auditDetails?.lastModifiedTime ?? created;
      const isOpen = OPEN_STATES.includes(s.applicationStatus);
      const isResolved = RESOLVED_STATES.includes(s.applicationStatus);
      const slaDays = slaDaysRemaining(created, def.slaHours, now);
      const ageDays = created == null ? null : (now - created) / DAY_MS;
      return {
        id: s.serviceRequestId,
        status: s.applicationStatus || null,
        isOpen,
        isResolved,
        code: s.serviceCode || null,
        typeName: def.name || null,
        dept: def.department || null,
        ward: s.address?.locality?.code || null,
        wardName: s.address?.locality?.name || null,
        source: s.source || null,
        created,
        modified,
        slaDays,
        ageDays,
        overdue: isOpen && slaDays != null && slaDays < 0,
      };
    })
    .filter((i) => i.id);

  const open = items.filter((i) => i.isOpen);

  // Created per day over the last 14 days, oldest first (sparkline order).
  const perDay14 = Array(14).fill(0);
  const today0 = startOfDay(now);
  items.forEach((i) => {
    if (i.created == null) return;
    const back = Math.floor((today0 - startOfDay(i.created)) / DAY_MS);
    if (back >= 0 && back < 14) perDay14[13 - back] += 1;
  });

  // Created this ISO week, Monday..Sunday.
  const week0 = startOfWeek(now);
  const byWeekday = WEEKDAYS.map((key) => ({ key, n: 0 }));
  items.forEach((i) => {
    if (i.created == null || i.created < week0) return;
    const idx = Math.min(6, Math.floor((i.created - week0) / DAY_MS));
    byWeekday[idx].n += 1;
  });

  const total = typeof totals.total === "number" ? totals.total : null;

  return {
    items,
    open,
    sampleSize: items.length,
    totals: { total, open: totals.open ?? null, resolved: totals.resolved ?? null, today: totals.today ?? null },
    // known total: cut when it exceeds the sample; unknown total: cut when the
    // last page came back full (a short page means we have everything)
    partial: total != null ? total > items.length : lastPageFull,
    overdue: open.filter((i) => i.overdue).length,
    byStatus: tally(items, (i) => i.status),
    byAge: AGE_BUCKETS.map((key) => ({
      key,
      n: open.filter((i) => i.ageDays != null && ageBucket(i.ageDays) === key).length,
    })),
    byDept: tally(items, (i) => i.dept || "UNKNOWN"),
    byWard: tally(items, (i) => i.ward),
    byType: tally(items, (i) => i.code),
    openByWard: tally(open, (i) => i.ward),
    openByStatus: tally(open, (i) => i.status),
    bySource: tally(items, (i) => i.source || "unknown"),
    byWeekday,
    perDay14,
    recent: [...items].sort((a, b) => (b.modified || 0) - (a.modified || 0)).slice(0, 6),
    dueSoon: open
      .filter((i) => i.slaDays != null)
      .sort((a, b) => a.slaDays - b.slaDays)
      .slice(0, 5),
    oldestOpenDays: open.reduce((m, i) => (i.ageDays != null && i.ageDays > m ? i.ageDays : m), 0),
    avgResolutionMs: typeof extras.avgResolutionMs === "number" ? extras.avgResolutionMs : null,
  };
}

export default deriveHomeData;
