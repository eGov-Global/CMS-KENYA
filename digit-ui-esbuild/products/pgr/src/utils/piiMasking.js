// Deploy-level switch for complainant/employee PII masking in the PGR UI.
//
// Mozambique's product calls (CCSD-1971, CCSD-2130, QA #19) mask the citizen
// actor in the timeline, employee contacts on the employee details view, and
// the complainant card on confidential complaints. Kenya/Bomet runs no
// confidentiality programme and shows identities in clear (product decision,
// 2026-09-15). One code path serves both forks via deploy-time config so the
// syncwithmoz merges stay conflict-free:
//
//   PGR_PII_MASKING absent  -> masking ON  (Moz needs no config change)
//   PGR_PII_MASKING false   -> masking OFF (set by the Kenya deploy template)
//
// NOTE: this is a display-side switch only. Values the backend already masks
// per its enc security policy (e.g. "*****0104" mobiles, "****" confidential
// extendedAttributes) arrive masked and cannot be recovered client-side —
// turning those off is a server-side policy change, not a UI one.
export const isPiiMaskingEnabled = () => {
  const v = window?.globalConfigs?.getConfig?.("PGR_PII_MASKING");
  return !(v === false || v === "false");
};
