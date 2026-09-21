// Resolve a PGR `applicationStatus` to a display label.
//
// Two key spellings exist for the same statuses, and which one is seeded
// differs per status:
//
//   CS_COMMON_PGR_STATE_<STATUS>   what the seed data actually ships for the
//                                  full workflow state set (PENDINGATLME,
//                                  ESCALATEDLEVEL1-3, RESOLVED, REJECTED,
//                                  CLOSEDAFTER*, CANCELLED, ...). This is also
//                                  what the workflow states FILTER renders via
//                                  its `labelPrefix: "CS_COMMON_"`, and what
//                                  the complaint DETAILS header uses.
//
//   CS_COMMON_<STATUS>             a legacy spelling that survives for a few
//                                  statuses only — notably CS_COMMON_PENDINGATLME.
//
// Call sites that hardcoded the bare form therefore worked for
// PENDINGATLME and silently failed for every escalated status: the citizen
// "My Complaints" pill fell back to its tone-bucket word and showed a
// 3x-escalated complaint as "OPEN", and the employee inbox column rendered
// the raw key. Prefer the prefixed key, fall back to the legacy one, then to
// whatever the caller wants to show instead of a raw key.

/** Build the preferred (prefixed) localization key for a status. */
export const statusKey = (status) => (status ? `CS_COMMON_PGR_STATE_${status}` : "");

/** Build the legacy (bare) localization key for a status. */
export const legacyStatusKey = (status) => (status ? `CS_COMMON_${status}` : "");

/**
 * @param {(k: string) => string} t       i18n translate
 * @param {string} status                 applicationStatus, e.g. "ESCALATEDLEVEL2"
 * @param {string} [fallback]             shown when neither key is seeded.
 *                                        Defaults to the raw status, which is
 *                                        still more useful than a raw key.
 * @returns {string} the localized label, or `fallback`
 */
export function statusLabel(t, status, fallback) {
  if (!status) return fallback || "";
  const tr = typeof t === "function" ? t : (k) => k;

  const preferred = statusKey(status);
  const v = tr(preferred);
  if (v && v !== preferred) return v;

  const legacy = legacyStatusKey(status);
  const lv = tr(legacy);
  if (lv && lv !== legacy) return lv;

  return fallback !== undefined ? fallback : status;
}
