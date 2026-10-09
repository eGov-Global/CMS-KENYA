// WITHDRAW closes a complaint at the complainant's request (Bomet:
// PENDINGATLME -> CANCELLED, granted to CITIZEN and CSR). It is a yes/no
// decision with nothing to hand over or attach, so both the citizen and the
// employee surfaces confirm it in a popup instead of the page-per-action flow
// REOPEN and RATE use.
export const CONFIRMATION_ACTIONS = ["WITHDRAW"];

export const isConfirmationAction = (action) => CONFIRMATION_ACTIONS.includes(action);

export const WITHDRAW_REASON_MAX_LENGTH = 1000;

// No assignee: CANCELLED is terminal, and egov-workflow-v2 rejects any
// assignee on a transition into a terminal state. An empty reason is left out
// so the timeline doesn't render an empty "Comments" line.
export const buildWithdrawRequest = (service, reason) => {
  const comments = String(reason || "").trim().slice(0, WITHDRAW_REASON_MAX_LENGTH);
  return {
    service,
    workflow: { action: "WITHDRAW", assignes: [], ...(comments ? { comments } : {}) },
  };
};

// Whether WITHDRAW should be offered at all. Two gates:
//   - the withdraw window (RAINMAKER-PGR.UIConstants.WITHDRAWSLA, measured from
//     filing). pgr-services enforces the same value (validateActionWindow), so once
//     it has passed the server refuses the action and the button must not be shown.
//     An unknown window (MDMS still loading, or no usable value) defers to the
//     server and lets the button through, like REOPEN.
//   - a complaint that has been REOPENED is not offered Withdraw again: it is back
//     with the department at the citizen's own request. This one is a UI rule only;
//     the server has no reopen check beyond the filing window, which in practice has
//     long passed by the time a complaint is resolved and reopened.
export const isWithdrawOpen = ({ createdTime, windowMs, processInstances, now = Date.now() } = {}) => {
  const reopened = (processInstances || []).some((pi) => pi?.action === "REOPEN");
  if (reopened) return false;
  if (typeof windowMs !== "number" || !Number.isFinite(windowMs) || windowMs <= 0) return true;
  return typeof createdTime === "number" && Number.isFinite(createdTime) && now - createdTime < windowMs;
};
