// Idle logout for employees (#224, VAPT "Insecure Session Management").
//
// Pure logic with an injected clock, event target, interval and shared store so
// it can be tested without a browser.
//
// - The countdown is checked against the clock, not trusted to one setTimeout:
//   background tabs throttle timers and a closed laptop stops them, so the check
//   also runs on every activity event and when the user returns to the tab.
//   Activity that arrives AFTER the limit logs out instead of restarting it.
// - The last-activity time is SHARED (a plain timestamp in localStorage, no
//   credential): activity in any open tab keeps every tab alive, so a forgotten
//   background tab cannot sign out a tab the employee is using. It also survives
//   a reload or a browser "reopen closed tab", so a restored tab whose last
//   activity is older than the limit is logged out as soon as it loads, instead
//   of starting a fresh 15 minutes.

export const DEFAULT_EMPLOYEE_IDLE_MINUTES = 15;

export const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"];

/** localStorage key holding the last employee activity time (epoch ms). Not a secret. */
export const LAST_ACTIVITY_KEY = "Digit.EmployeeLastActivity";

const RETURN_EVENTS = ["focus"]; // on the window
const DOC_RETURN_EVENTS = ["visibilitychange"]; // on the document

/** Minutes from config → milliseconds. Missing/invalid → default; 0 or less → off (0). */
export const idleTimeoutMs = (configuredMinutes) => {
  if (configuredMinutes == null || configuredMinutes === "") return DEFAULT_EMPLOYEE_IDLE_MINUTES * 60 * 1000;
  const n = Number(configuredMinutes);
  if (!Number.isFinite(n)) return DEFAULT_EMPLOYEE_IDLE_MINUTES * 60 * 1000;
  if (n <= 0) return 0;
  return Math.round(n * 60 * 1000);
};

/** A shared last-activity store over a Storage (localStorage in the app). Never throws. */
export const storageActivityStore = (storage) => ({
  read: () => {
    try {
      const v = Number(storage && storage.getItem(LAST_ACTIVITY_KEY));
      return Number.isFinite(v) && v > 0 ? v : null;
    } catch (e) {
      return null;
    }
  },
  write: (t) => {
    try {
      if (storage) storage.setItem(LAST_ACTIVITY_KEY, String(t));
    } catch (e) {
      /* blocked storage: the per-tab countdown still works */
    }
  },
});

/** Records "the employee is active now" — called at login so a new session never starts out stale. */
export const markEmployeeActive = (storage, now = Date.now()) => storageActivityStore(storage).write(now);

/**
 * Starts the countdown. Calls onIdle once, then stops itself. If the shared
 * last activity is already older than the limit when it starts (restored tab),
 * onIdle fires immediately.
 * @returns {() => void} stop: removes every listener and the interval.
 */
export const startIdleTimer = ({
  timeoutMs,
  onIdle,
  target = typeof window !== "undefined" ? window : null,
  doc = typeof document !== "undefined" ? document : null,
  now = () => Date.now(),
  setInterval: setIntervalFn = (fn, ms) => setInterval(fn, ms),
  clearInterval: clearIntervalFn = (id) => clearInterval(id),
  checkEveryMs = 15 * 1000,
  shared = null,
  writeEveryMs = 5 * 1000,
}) => {
  if (!timeoutMs || timeoutMs <= 0 || !target) return () => {};

  const sharedRead = () => (shared ? shared.read() : null);
  let last = sharedRead() ?? now();
  let lastWritten = 0;
  let done = false;
  let intervalId = null;

  const latestActivity = () => Math.max(last, sharedRead() || 0);
  const expired = () => now() - latestActivity() >= timeoutMs;

  const record = (t) => {
    last = t;
    if (shared && t - lastWritten >= writeEveryMs) {
      shared.write(t);
      lastWritten = t;
    }
  };

  const stop = () => {
    ACTIVITY_EVENTS.forEach((e) => target.removeEventListener(e, onActivity));
    RETURN_EVENTS.forEach((e) => target.removeEventListener(e, check));
    if (doc) DOC_RETURN_EVENTS.forEach((e) => doc.removeEventListener(e, check));
    if (intervalId != null) clearIntervalFn(intervalId);
    intervalId = null;
  };

  const fire = () => {
    if (done) return;
    done = true;
    stop();
    onIdle();
  };

  function check() {
    if (!done && expired()) fire();
  }

  function onActivity() {
    if (done) return;
    if (expired()) fire();
    else record(now());
  }

  ACTIVITY_EVENTS.forEach((e) => target.addEventListener(e, onActivity, { passive: true }));
  RETURN_EVENTS.forEach((e) => target.addEventListener(e, check));
  if (doc) DOC_RETURN_EVENTS.forEach((e) => doc.addEventListener(e, check));
  intervalId = setIntervalFn(check, Math.min(checkEveryMs, timeoutMs));

  // A restored tab may already be past the limit; otherwise publish "active now"
  // if nothing was recorded yet (a session from before this build).
  if (expired()) fire();
  else if (shared && sharedRead() == null) record(now());

  return stop;
};
