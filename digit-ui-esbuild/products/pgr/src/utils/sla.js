// Whole-complaint SLA, per complaint type, measured from creation — the ONE
// formula the inbox SLA column, the employee home and pgr-services' own
// `sortBy=sla` agree on. Keep it here so the two front-end call sites cannot
// drift apart (they did once: the inbox fell back to the workflow
// ProcessInstance's business-service SLA, a different and larger budget that
// showed 14 days for a 5-day complaint — issue #432).

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

// Uniform business-level fallback for complaint types with no per-type
// slaHours = pgr.business.level.sla (432000000 ms / 5 days), the SAME default
// pgr-services' SLA ORDER BY uses (PGRQueryBuilder.addOrderByClause →
// config.getBusinessLevelSla), so display and server sort stay consistent.
export const DEFAULT_SLA_MS = 432000000;

/** SLA budget in ms for a complaint type's `slaHours` (MDMS ComplaintHierarchy leaf). */
export const slaBudgetMs = (slaHours) => (slaHours != null ? Number(slaHours) * HOUR_MS : DEFAULT_SLA_MS);

/**
 * Whole days of SLA left (negative = overdue), or null when the creation time
 * is unknown. Rounded, so the number matches the inbox column exactly.
 */
export const slaDaysRemaining = (createdTime, slaHours, now = Date.now()) =>
  createdTime == null ? null : Math.round((slaBudgetMs(slaHours) - (now - createdTime)) / DAY_MS);
