/**
 * The configurator's session rules (#224 follow-ups #232 and #233), on top of
 * the shared logic in ui-shared/session/:
 *
 * - Idle sign-out with a warning first (#233). The limits are digit-ui's
 *   EMPLOYEE_IDLE_TIMEOUT_MINUTES / EMPLOYEE_IDLE_WARNING_SECONDS from
 *   /digit-ui/globalConfigs.js, which index.html already loads: configurator
 *   admins are employees, so one setting covers both apps (default 15 minutes
 *   and 60 seconds; 0 turns it off). The configurator's tabs share their own
 *   activity clock, separate from digit-ui's.
 * - Logging out in one tab signs the same admin out of the configurator's other
 *   tabs in this browser (#232), on the configurator's own channel.
 * - The login page says why the admin was signed out.
 */
import { createSignOutBroadcast } from '../../../ui-shared/session/signOutBroadcast';
import { idleTimeoutMs, idleWarningMs, storageActivityStore, type ActivityStore } from '../../../ui-shared/session/idleTimer';

/** localStorage key holding the configurator's last activity time (epoch ms). Not a secret. */
export const CONFIGURATOR_LAST_ACTIVITY_KEY = 'crs-configurator-last-activity';

/** sessionStorage key: which login this tab last reset the activity clock for. */
export const SEEN_LOGIN_KEY = 'crs-idle-login';

/** sessionStorage key: why this tab was signed out, read once by the login page. */
export const SIGNED_OUT_REASON_KEY = 'crs-signed-out-reason';

export type SignOutReason = 'idle' | 'signed-out-elsewhere';
const REASONS: SignOutReason[] = ['idle', 'signed-out-elsewhere'];

export const SIGNED_OUT_MESSAGES: Record<SignOutReason, string> = {
  idle: 'You were signed out because you had not used the configurator for a while. Please log in again to continue.',
  'signed-out-elsewhere': 'You logged out in another tab. Please log in again to continue.',
};

export const configuratorSignOut = createSignOutBroadcast({
  channelName: 'crs-configurator-session',
  storageKey: 'crs-configurator-signed-out',
  messageType: 'configurator-signed-out',
});

type GlobalConfigs = { getConfig?: (key: string) => unknown };

/** The idle limits from digit-ui's globalConfigs (see above). */
export function readIdleSettings(win: { globalConfigs?: GlobalConfigs } | undefined = typeof window !== 'undefined' ? (window as unknown as { globalConfigs?: GlobalConfigs }) : undefined): {
  timeoutMs: number;
  warnBeforeMs: number;
} {
  const get = (key: string) => {
    try {
      return win?.globalConfigs?.getConfig?.(key);
    } catch {
      return undefined;
    }
  };
  const timeoutMs = idleTimeoutMs(get('EMPLOYEE_IDLE_TIMEOUT_MINUTES'));
  return { timeoutMs, warnBeforeMs: idleWarningMs(get('EMPLOYEE_IDLE_WARNING_SECONDS'), timeoutMs) };
}

/** The activity clock shared by the configurator's tabs. */
export function configuratorActivityClock(): ActivityStore {
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    /* blocked storage: each tab counts on its own */
  }
  return storageActivityStore(storage, CONFIGURATOR_LAST_ACTIVITY_KEY);
}

const fingerprint = (token: string) => {
  let h = 0;
  for (let i = 0; i < token.length; i += 1) h = (h * 31 + token.charCodeAt(i)) | 0;
  return String(h);
};

/**
 * A NEW login in this tab counts as fresh activity, so it never starts out
 * stale. A reloaded or restored tab keeps its token, so a stale clock still
 * signs it out.
 */
export function markLoginActivity(token: string, clock: ActivityStore, now: number = Date.now()): void {
  try {
    const current = fingerprint(token);
    if (sessionStorage.getItem(SEEN_LOGIN_KEY) !== current) {
      clock.write(now);
      sessionStorage.setItem(SEEN_LOGIN_KEY, current);
    }
  } catch {
    /* blocked storage: the per-tab countdown still works */
  }
}

export function rememberSignOutReason(reason: SignOutReason): void {
  try {
    sessionStorage.setItem(SIGNED_OUT_REASON_KEY, reason);
  } catch {
    /* blocked storage: the login page shows no reason */
  }
}

/** Why this tab was signed out, once; then forgotten. Null if unknown. */
export function takeSignOutReason(): SignOutReason | null {
  try {
    const value = sessionStorage.getItem(SIGNED_OUT_REASON_KEY);
    sessionStorage.removeItem(SIGNED_OUT_REASON_KEY);
    return REASONS.includes(value as SignOutReason) ? (value as SignOutReason) : null;
  } catch {
    return null;
  }
}
