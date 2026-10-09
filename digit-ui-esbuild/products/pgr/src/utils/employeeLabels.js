// Display labels for HRMS codes shown in the employee top bar.
//
// HRMS hands the UI bare codes — a department "WATER&SEWAGE" on one tenant,
// "inclusivity_public_participation_and_customer_service" on another — and the
// localisation seeds key their names as COMMON_MASTERS_<KIND>_<CODE> with the
// code upper-cased and its punctuation turned into underscores (the platform's
// getTransformedLocale). Resolve in that order: the seeded message, then the
// master's own name when the caller has it, then the code made readable.
// `t` is injected so the resolution stays unit-testable.

const transform = (code) => String(code ?? "").trim().toUpperCase().replace(/[.:\-\s/]/g, "_");

/** "call_centre_employee" / "CALL_CENTRE_EMPLOYEE" -> "Call Centre Employee"; mixed-case names are left alone. */
export const humanizeCode = (code) => {
  const raw = String(code ?? "").trim();
  if (!raw) return "";
  const shouted = raw === raw.toUpperCase() || raw === raw.toLowerCase();
  if (!shouted) return raw;
  return raw
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const seeded = (t, key) => {
  if (!key || typeof t !== "function") return null;
  const v = t(key);
  return v && v !== key ? v : null;
};

/**
 * Label for a code of the given master ("DEPARTMENT" | "DESIGNATION").
 *   masterName  the matching master record's name, when the caller fetched the master
 */
export const masterLabel = (t, kind, code, masterName) => {
  if (!code) return "";
  return (
    seeded(t, `COMMON_MASTERS_${kind}_${transform(code)}`) ||
    seeded(t, `COMMON_MASTERS_${kind}_${code}`) ||
    (masterName && String(masterName).trim()) ||
    humanizeCode(code)
  );
};

export const departmentLabel = (t, dept) =>
  typeof dept === "string" ? masterLabel(t, "DEPARTMENT", dept) : masterLabel(t, "DEPARTMENT", dept?.code, dept?.name);

/** Case-insensitive lookup of a designation master row by code. */
export const findDesignation = (rows, code) => {
  if (!code) return null;
  const c = String(code).toLowerCase();
  return (rows || []).find((r) => String(r?.code ?? "").toLowerCase() === c) || null;
};

export const designationLabel = (t, code, masterRows) => masterLabel(t, "DESIGNATION", code, findDesignation(masterRows, code)?.name);

/** The designation of the employee's current assignment, from an HRMS employee record. */
export const currentDesignationCode = (employee) => {
  const assignments = employee?.assignments || [];
  const current = assignments.find((a) => a?.isCurrentAssignment) || assignments[0];
  return current?.designation || null;
};
