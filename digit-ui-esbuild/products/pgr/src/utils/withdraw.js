// WITHDRAW closes a complaint at the complainant's request (Bomet:
// PENDINGATLME -> CANCELLED, granted to CITIZEN and CSR). It is a yes/no
// decision with nothing to hand over or attach, so both the citizen and the
// employee surfaces confirm it in a popup instead of the page-per-action flow
// REOPEN and RATE use. Same flow as feat/kenya-superset; the time window
// (WITHDRAWSLA, counted from filing) comes from useActionWindow, like REOPEN.
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

// A complaint that has been REOPENED is not offered Withdraw again: it is back
// with the department at the citizen's own request. A UI rule only; the server
// checks nothing beyond the filing window, which by then has normally passed.
export const wasReopened = (processInstances) => (processInstances || []).some((pi) => pi?.action === "REOPEN");
