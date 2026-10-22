// Which workflow states the employee inbox treats as actionable.
//
// Lives here rather than inside useBusinessServiceStates so it can be unit
// tested without dragging in react / react-query / the libraries package.
//
// Actionable == the state still offers at least one action. Deliberately NOT
// `!isTerminateState`: on Bomet's PGR workflow RESOLVED and REJECTED are both
// terminal AND carry REOPEN + RATE, and REOPEN is granted to CSR — the
// call-centre role. Excluding terminal states therefore hid exactly the
// complaints a call centre needs in order to reopen them, leaving them
// reachable only by exact complaint number or by ticking the
// Resolved/Rejected filter by hand (#46).
//
// The genuinely finished states (CLOSEDAFTERRESOLUTION, CLOSEDAFTERREJECTION,
// CANCELLED) declare zero actions, so the actions check alone already excludes
// them — and does so from the live workflow rather than from a flag that means
// something subtly different.
export const isActionable = (s) => Array.isArray(s?.actions) && s.actions.length > 0;

// RESOLVED and REJECTED stay actionable (REOPEN, RATE), so the default inbox
// lists them — Bomet's call centre needs them there to reopen (#46). Nairobi
// wants them only when the Status filter asks for them (#144), so a deployment
// can drop them from the DEFAULT list by setting the runtime switch
// PGR_INBOX_INCLUDE_RESOLVED_REJECTED to false. Absent keeps today's behaviour.
// Either way they stay reachable through the Status filter and by number.
export const RESOLVED_REJECTED = ["RESOLVED", "REJECTED"];

export const includeResolvedRejectedByDefault = (
  getConfig = typeof window !== "undefined" ? window.globalConfigs?.getConfig : undefined
) => {
  const v = getConfig?.("PGR_INBOX_INCLUDE_RESOLVED_REJECTED");
  return !(v === false || v === "false");
};

export const defaultInboxStatuses = (codes, includeResolvedRejected) =>
  includeResolvedRejected ? codes : codes.filter((c) => !RESOLVED_REJECTED.includes(c));

export default isActionable;
