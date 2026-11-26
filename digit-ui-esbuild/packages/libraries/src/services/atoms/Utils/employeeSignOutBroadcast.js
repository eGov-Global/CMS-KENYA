// Signing out in one tab signs the user out of every tab of the same browser
// (#224 follow-up for employees, #231 for citizens).
//
// Since #224 each tab holds its own login (sessionStorage), so the logout button
// in one tab used to leave the user's other tabs signed in. The tab that logs
// out now announces it; every other tab of the same browser where the same user
// is signed in ends its own login and goes to the login page.
//
// Employees and citizens each have their own channel and storage key, so an
// employee's sign-out never reaches a citizen's tab, or the other way round.
// (The file keeps its old name: employees were the first to get this.)
//
// Two channels, because neither alone reaches every browser and situation:
// BroadcastChannel (immediate, not stored) and a storage event on a
// localStorage key (holds only a timestamp and a hash, never a credential). A
// tab ignores its own announcement, and a message that arrives on both channels
// is handled once.
//
// Only the SAME user's tabs sign out. Each tab holds its own login, so a
// different user may be signed in in another tab of a shared browser; that tab
// stays signed in. The announcement carries a one-way hash of the user's id,
// not the id itself.

const KINDS = {
  EMPLOYEE: { channel: "digit-employee-session", key: "Digit.EmployeeSignedOut", type: "employee-signed-out" },
  CITIZEN: { channel: "digit-citizen-session", key: "Digit.CitizenSignedOut", type: "citizen-signed-out" },
};

export const SIGN_OUT_CHANNEL = KINDS.EMPLOYEE.channel;
export const SIGN_OUT_KEY = KINDS.EMPLOYEE.key;
export const CITIZEN_SIGN_OUT_CHANNEL = KINDS.CITIZEN.channel;
export const CITIZEN_SIGN_OUT_KEY = KINDS.CITIZEN.key;

/** The channel settings for a user type, or null for any other type (no announcement, no listening). */
const kindFor = (userType) => {
  const type = String(userType || "").toUpperCase();
  return Object.prototype.hasOwnProperty.call(KINDS, type) ? KINDS[type] : null;
};

// One id per page load: lets a tab recognise its own announcement when another
// BroadcastChannel object in the same tab receives it.
const makeTabId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
let thisTabId = makeTabId();

/** Test hook: pretend to be a different tab. */
export const setTabIdForTest = (id) => {
  thisTabId = id;
};

const defaultChannel = (name) => {
  try {
    return typeof BroadcastChannel === "function" ? new BroadcastChannel(name) : null;
  } catch (e) {
    return null;
  }
};

const defaultLocal = () => {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch (e) {
    return null;
  }
};

/** A short one-way hash of a user id, so the announcement never carries the id itself. */
export const userKey = (userId) => {
  const s = String(userId || "");
  if (!s) return null;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}`;
};

/**
 * Tells the user's other tabs that they signed out here. `userType` is
 * "EMPLOYEE" or "CITIZEN" (any other type announces nothing); `userId` is the
 * user's uuid, and only tabs signed in as the same user react. Never throws.
 */
export const announceSignOut = ({ userType, userId = null, channel, local, now = Date.now() } = {}) => {
  const kind = kindFor(userType);
  if (!kind) return;
  const ch = channel === undefined ? defaultChannel(kind.channel) : channel;
  const store = local === undefined ? defaultLocal() : local;
  const message = { type: kind.type, tab: thisTabId, at: now, user: userKey(userId) };
  try {
    if (ch) {
      ch.postMessage(message);
      if (typeof ch.close === "function") ch.close();
    }
  } catch (e) {
    /* no BroadcastChannel: the storage event below still reaches other tabs */
  }
  try {
    if (store) store.setItem(kind.key, JSON.stringify(message));
  } catch (e) {
    /* blocked storage: BroadcastChannel above is the only route */
  }
};

/**
 * Calls onSignOut once per announcement from ANOTHER tab of the same user
 * (`userType` and `userId` are this tab's). An announcement without a user —
 * from an older build — signs out every tab of that user type, the safe default.
 * @returns {() => void} unsubscribe
 */
export const onSignOutElsewhere = (onSignOut, { userType, userId = null, channel, target } = {}) => {
  const kind = kindFor(userType);
  if (!kind) return () => {};
  const ch = channel === undefined ? defaultChannel(kind.channel) : channel;
  const win = target === undefined ? (typeof window !== "undefined" ? window : null) : target;
  const handled = new Set();
  const mine = userKey(userId);
  const handle = (message) => {
    if (!message || message.type !== kind.type || message.tab === thisTabId) return;
    if (message.user && mine && message.user !== mine) return; // a different user: stays signed in
    const id = `${message.tab}:${message.at}`;
    if (handled.has(id)) return;
    handled.add(id);
    onSignOut(message);
  };

  const onMessage = (event) => handle(event && event.data);
  const onStorage = (event) => {
    if (!event || event.key !== kind.key || !event.newValue) return;
    try {
      handle(JSON.parse(event.newValue));
    } catch (e) {
      /* not ours */
    }
  };

  try {
    if (ch) ch.addEventListener("message", onMessage);
  } catch (e) {}
  if (win) win.addEventListener("storage", onStorage);

  return () => {
    try {
      if (ch) {
        ch.removeEventListener("message", onMessage);
        if (typeof ch.close === "function") ch.close();
      }
    } catch (e) {}
    if (win) win.removeEventListener("storage", onStorage);
  };
};

/** The employee-only forms, kept for existing callers. */
export const announceEmployeeSignOut = (options = {}) => announceSignOut({ ...options, userType: "EMPLOYEE" });
export const onEmployeeSignOut = (onSignOut, options = {}) => onSignOutElsewhere(onSignOut, { ...options, userType: "EMPLOYEE" });
