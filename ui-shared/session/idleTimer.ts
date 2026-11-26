/**
 * Idle sign-out timer for the Vite SPAs (the configurator today) — #224 / #233.
 *
 * A TypeScript port of digit-ui's
 *   digit-ui-esbuild/packages/libraries/src/services/atoms/Utils/idleTimer.js
 * which employees and citizens already use. digit-ui cannot import this folder:
 * its server build copies only digit-ui-esbuild/ (local-setup/scripts/
 * deploy-pilot-fe.sh), so the two copies are kept in step by hand. The
 * behaviour tests are ported with it (configurator/src/lib/session.test.ts).
 *
 * Pure logic with an injected clock, event target, interval and shared store, so
 * it can be tested without a browser.
 *
 * - The countdown is checked against the clock, not trusted to one setTimeout:
 *   background tabs throttle timers and a closed laptop stops them, so the check
 *   also runs on every activity event and when the user returns to the tab.
 *   Activity that arrives AFTER the limit signs out instead of restarting it.
 * - The last-activity time is SHARED through `shared` (a plain timestamp in
 *   localStorage, no credential): activity in any open tab keeps every tab
 *   alive, so a forgotten background tab cannot sign out the tab in use, and
 *   all tabs sign out together. It survives a reload or a "reopen closed tab",
 *   so a restored tab whose last activity is older than the limit signs out as
 *   soon as it loads instead of starting a fresh countdown.
 */

export const DEFAULT_IDLE_MINUTES = 15;
export const DEFAULT_IDLE_WARNING_SECONDS = 60;

export const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;
const RETURN_EVENTS = ['focus']; // on the window
const DOC_RETURN_EVENTS = ['visibilitychange']; // on the document

/** Where the last activity time lives (shared by the tabs). */
export interface ActivityStore {
  read(): number | null;
  write(t: number): void;
}

interface EventSource {
  addEventListener(type: string, fn: () => void, options?: AddEventListenerOptions): void;
  removeEventListener(type: string, fn: () => void): void;
}

/** Minutes from config → milliseconds. Missing/invalid → default; 0 or less → off (0). */
export function idleTimeoutMs(configuredMinutes: unknown): number {
  if (configuredMinutes == null || configuredMinutes === '') return DEFAULT_IDLE_MINUTES * 60 * 1000;
  const n = Number(configuredMinutes);
  if (!Number.isFinite(n)) return DEFAULT_IDLE_MINUTES * 60 * 1000;
  if (n <= 0) return 0;
  return Math.round(n * 60 * 1000);
}

/**
 * How long before the sign-out the user is warned. Seconds from config →
 * milliseconds. Missing/invalid → default; 0 or less → no warning. Always at most
 * half the idle limit, so a warning can never appear the moment a page loads.
 */
export function idleWarningMs(configuredSeconds: unknown, timeoutMs: number): number {
  if (!timeoutMs || timeoutMs <= 0) return 0;
  let seconds = DEFAULT_IDLE_WARNING_SECONDS;
  if (configuredSeconds != null && configuredSeconds !== '') {
    const n = Number(configuredSeconds);
    if (Number.isFinite(n)) seconds = n;
  }
  if (seconds <= 0) return 0;
  return Math.min(Math.round(seconds * 1000), Math.floor(timeoutMs / 2));
}

/** A last-activity store over a Storage, under `key`. Never throws. */
export function storageActivityStore(storage: Pick<Storage, 'getItem' | 'setItem'> | null | undefined, key: string): ActivityStore {
  return {
    read: () => {
      try {
        const v = Number(storage?.getItem(key));
        return Number.isFinite(v) && v > 0 ? v : null;
      } catch {
        return null;
      }
    },
    write: (t: number) => {
      try {
        storage?.setItem(key, String(t));
      } catch {
        /* blocked storage: the per-tab countdown still works */
      }
    },
  };
}

export interface IdleTimerOptions {
  timeoutMs: number;
  onIdle: () => void;
  warnBeforeMs?: number;
  onWarn?: ((signOutAt: number) => void) | null;
  onActive?: (() => void) | null;
  target?: EventSource | null;
  doc?: EventSource | null;
  now?: () => number;
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (id: unknown) => void;
  checkEveryMs?: number;
  warningCheckEveryMs?: number;
  shared?: ActivityStore | null;
  writeEveryMs?: number;
}

/** Stops the timer. keepAlive() counts as activity now, also in the other tabs. */
export type StopIdleTimer = (() => void) & { keepAlive: () => void };

/**
 * Starts the countdown. Calls onIdle once, then stops itself. If the shared last
 * activity is already older than the limit when it starts (restored tab),
 * onIdle fires immediately.
 *
 * With warnBeforeMs and onWarn, onWarn(signOutAt) is called once when the
 * sign-out is that close, and onActive() when it moves away again. While the
 * warning is up, activity in THIS tab no longer counts by itself: only
 * keepAlive() (the "Stay signed in" button) or activity in another tab does.
 * Otherwise reaching for the dialog's "Sign out now" button would count as
 * activity and close the dialog under the pointer. The clock is checked every
 * second during the warning, so the sign-out happens on time.
 */
export function startIdleTimer({
  timeoutMs,
  onIdle,
  warnBeforeMs = 0,
  onWarn = null,
  onActive = null,
  target = typeof window !== 'undefined' ? window : null,
  doc = typeof document !== 'undefined' ? document : null,
  now = () => Date.now(),
  setInterval: setIntervalFn = (fn, ms) => setInterval(fn, ms),
  clearInterval: clearIntervalFn = (id) => clearInterval(id as ReturnType<typeof setInterval>),
  checkEveryMs = 15 * 1000,
  warningCheckEveryMs = 1000,
  shared = null,
  writeEveryMs = 5 * 1000,
}: IdleTimerOptions): StopIdleTimer {
  if (!timeoutMs || timeoutMs <= 0 || !target) {
    const noop = (() => {}) as StopIdleTimer;
    noop.keepAlive = () => {};
    return noop;
  }
  const events = target;

  const sharedRead = () => (shared ? shared.read() : null);
  let last = sharedRead() ?? now();
  let lastWritten = 0;
  let done = false;
  let intervalId: unknown = null;
  let warning = false;
  let warningIntervalId: unknown = null;
  const warns = warnBeforeMs > 0 && typeof onWarn === 'function';

  const latestActivity = () => Math.max(last, sharedRead() || 0);
  const expired = () => now() - latestActivity() >= timeoutMs;

  const record = (t: number) => {
    last = t;
    if (shared && t - lastWritten >= writeEveryMs) {
      shared.write(t);
      lastWritten = t;
    }
  };

  const stopWarningChecks = () => {
    if (warningIntervalId != null) clearIntervalFn(warningIntervalId);
    warningIntervalId = null;
  };

  const stop = (() => {
    ACTIVITY_EVENTS.forEach((e) => events.removeEventListener(e, onActivity));
    RETURN_EVENTS.forEach((e) => events.removeEventListener(e, check));
    if (doc) DOC_RETURN_EVENTS.forEach((e) => doc.removeEventListener(e, check));
    if (intervalId != null) clearIntervalFn(intervalId);
    intervalId = null;
    stopWarningChecks();
  }) as StopIdleTimer;

  const fire = () => {
    if (done) return;
    done = true;
    stop();
    onIdle();
  };

  const updateWarning = () => {
    if (!warns || done) return;
    const signOutAt = latestActivity() + timeoutMs;
    const close = signOutAt - now() <= warnBeforeMs;
    if (close && !warning) {
      warning = true;
      warningIntervalId = setIntervalFn(check, warningCheckEveryMs);
      onWarn!(signOutAt);
    } else if (!close && warning) {
      warning = false;
      stopWarningChecks();
      if (typeof onActive === 'function') onActive();
    }
  };

  function check() {
    if (done) return;
    if (expired()) fire();
    else updateWarning();
  }

  function onActivity() {
    if (done) return;
    if (expired()) {
      fire();
      return;
    }
    if (warning) return; // only keepAlive() or another tab's activity ends the warning
    record(now());
  }

  stop.keepAlive = () => {
    if (done) return;
    if (expired()) {
      fire();
      return;
    }
    last = now();
    if (shared) {
      // Written at once (not throttled) so the warning closes in the other tabs too.
      shared.write(last);
      lastWritten = last;
    }
    updateWarning();
  };

  ACTIVITY_EVENTS.forEach((e) => events.addEventListener(e, onActivity, { passive: true }));
  RETURN_EVENTS.forEach((e) => events.addEventListener(e, check));
  if (doc) DOC_RETURN_EVENTS.forEach((e) => doc.addEventListener(e, check));
  intervalId = setIntervalFn(check, Math.min(checkEveryMs, timeoutMs));

  // A restored tab may already be past the limit; otherwise publish "active now"
  // if nothing was recorded yet. A tab restored inside the warning window warns
  // straight away.
  if (expired()) fire();
  else {
    if (shared && sharedRead() == null) record(now());
    updateWarning();
  }

  return stop;
}
