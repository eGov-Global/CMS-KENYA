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

export default isActionable;
