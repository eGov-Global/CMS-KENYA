// Signing out in one tab signs the employee out of every tab (#224 follow-up).
//
// Since #224 each tab holds its own employee login (sessionStorage), so the
// logout button in one tab used to leave the employee's other tabs signed in.
// The tab that logs out now announces it; every other tab of the same browser
// that has an employee signed in ends its own login and goes to the login page.
//
// Two channels, because neither alone reaches every browser and situation:
// BroadcastChannel (immediate, not stored) and a storage event on a
// localStorage key (holds only a timestamp, never a credential). A tab ignores
// its own announcement, and a message that arrives on both channels is handled
// once.

export const SIGN_OUT_CHANNEL = "digit-employee-session";
export const SIGN_OUT_KEY = "Digit.EmployeeSignedOut";
const MESSAGE_TYPE = "employee-signed-out";

// One id per page load: lets a tab recognise its own announcement when another
// BroadcastChannel object in the same tab receives it.
const makeTabId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
let thisTabId = makeTabId();

/** Test hook: pretend to be a different tab. */
export const setTabIdForTest = (id) => {
  thisTabId = id;
};

const defaultChannel = () => {
  try {
    return typeof BroadcastChannel === "function" ? new BroadcastChannel(SIGN_OUT_CHANNEL) : null;
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

/** Tells the employee's other tabs that they signed out here. Never throws. */
export const announceEmployeeSignOut = ({ channel = defaultChannel(), local = defaultLocal(), now = Date.now() } = {}) => {
  const message = { type: MESSAGE_TYPE, tab: thisTabId, at: now };
  try {
    if (channel) {
      channel.postMessage(message);
      if (typeof channel.close === "function") channel.close();
    }
  } catch (e) {
    /* no BroadcastChannel: the storage event below still reaches other tabs */
  }
  try {
    if (local) local.setItem(SIGN_OUT_KEY, JSON.stringify(message));
  } catch (e) {
    /* blocked storage: BroadcastChannel above is the only route */
  }
};

/**
 * Calls onSignOut once per announcement from ANOTHER tab.
 * @returns {() => void} unsubscribe
 */
export const onEmployeeSignOut = (
  onSignOut,
  { channel = defaultChannel(), target = typeof window !== "undefined" ? window : null } = {}
) => {
  const handled = new Set();
  const handle = (message) => {
    if (!message || message.type !== MESSAGE_TYPE || message.tab === thisTabId) return;
    const id = `${message.tab}:${message.at}`;
    if (handled.has(id)) return;
    handled.add(id);
    onSignOut(message);
  };

  const onMessage = (event) => handle(event && event.data);
  const onStorage = (event) => {
    if (!event || event.key !== SIGN_OUT_KEY || !event.newValue) return;
    try {
      handle(JSON.parse(event.newValue));
    } catch (e) {
      /* not ours */
    }
  };

  try {
    if (channel) channel.addEventListener("message", onMessage);
  } catch (e) {}
  if (target) target.addEventListener("storage", onStorage);

  return () => {
    try {
      if (channel) {
        channel.removeEventListener("message", onMessage);
        if (typeof channel.close === "function") channel.close();
      }
    } catch (e) {}
    if (target) target.removeEventListener("storage", onStorage);
  };
};
