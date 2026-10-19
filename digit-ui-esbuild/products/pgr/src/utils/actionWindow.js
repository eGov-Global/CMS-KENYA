// Whether a time-limited workflow action (REOPEN, WITHDRAW, …) is still allowed, decided
// exactly the way pgr-services decides it (MDMSUtils.getActionWindow and
// ServiceRequestValidator.validateActionWindow), so the UI hides an action at the instant
// the server starts refusing it:
//
//   rule      the RAINMAKER-PGR.UIConstants.actionWindows entry for the action, from the
//             complaint tenant's record first, then the state record; else the deployment
//             default below (REOPEN counts from the last update, WITHDRAW from filing)
//   window    the rule's inline windowMs, else the record value its windowKey names
//             (e.g. REOPENSLA), city record first; else the rule's fallbackMs
//   start     the complaint's auditDetails[measuredFrom]
//   closed    when now - start > window (strictly greater, as on the server)
//
// Unknowns defer to the server rather than block: with no window value anywhere (the server
// then applies its deployment fallback) or no timestamp, the action stays available. A rule
// whose measuredFrom is not recognised is closed, because the server fails closed on it.
// Free of React and Digit globals so every branch is unit-tested.

const MEASURED_FROM = { createdtime: "createdTime", lastmodifiedtime: "lastModifiedTime" };

// Mirrors pgr.action.windows.defaults in pgr-services' application.properties.
const DEFAULT_RULES = [
  { action: "REOPEN", windowKey: "REOPENSLA", measuredFrom: "lastModifiedTime" },
  { action: "WITHDRAW", windowKey: "WITHDRAWSLA", measuredFrom: "createdTime" },
];

const positiveMs = (v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined);

const findRule = (rules, action) =>
  (Array.isArray(rules) ? rules : []).find((r) => r && r.action != null && String(r.action).trim().toUpperCase() === action) || null;

/**
 * The window for `action` given the UIConstants records (most specific first):
 * { action, measuredFrom, windowMs } — windowMs undefined when no value is configured —,
 * { action, misconfigured: true }, or null when the action is not time-limited.
 */
export const resolveActionWindow = (layers, action) => {
  if (action == null || !String(action).trim()) return null;
  const name = String(action).trim().toUpperCase();
  const records = (Array.isArray(layers) ? layers : []).filter((l) => l && typeof l === "object");
  let rule = null;
  for (const record of records) {
    rule = findRule(record.actionWindows, name);
    if (rule) break;
  }
  if (!rule) rule = findRule(DEFAULT_RULES, name);
  if (!rule) return null;
  const measuredFrom = MEASURED_FROM[String(rule.measuredFrom ?? "").trim().toLowerCase()];
  if (!measuredFrom) return { action: name, misconfigured: true };
  let windowMs = positiveMs(rule.windowMs);
  const key = rule.windowKey == null ? "" : String(rule.windowKey).trim();
  for (const record of records) {
    if (windowMs || !key) break;
    windowMs = positiveMs(record[key]);
  }
  if (!windowMs) windowMs = positiveMs(rule.fallbackMs);
  return { action: name, measuredFrom, windowMs };
};

/**
 * { open, known, deadline } for one complaint at `now`. known=false means the action is not
 * time-limited or its window is unknown; deadline is the epoch ms the window closes at.
 */
export const actionWindowState = ({ layers, action, auditDetails, now = Date.now() }) => {
  const rule = resolveActionWindow(layers, action);
  if (!rule) return { open: true, known: false };
  if (rule.misconfigured) return { open: false, known: true };
  const start = auditDetails?.[rule.measuredFrom];
  if (!rule.windowMs || typeof start !== "number" || !Number.isFinite(start)) return { open: true, known: false };
  return { open: !(now - start > rule.windowMs), known: true, deadline: start + rule.windowMs };
};
