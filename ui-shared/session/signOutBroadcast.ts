/**
 * "Signed out in one tab → signed out in every tab of the same browser" for the
 * Vite SPAs (the configurator today) — #232.
 *
 * A TypeScript port of digit-ui's
 *   digit-ui-esbuild/packages/libraries/src/services/atoms/Utils/employeeSignOutBroadcast.js
 * (employees #224, citizens #231), made generic: each app creates its own
 * broadcast with its own channel, storage key and message type, so one app's
 * sign-out never reaches another app's tabs. digit-ui cannot import this folder
 * (its server build copies only digit-ui-esbuild/), so the two are kept in step
 * by hand; the behaviour tests are ported too (configurator/src/lib/session.test.ts).
 *
 * Two routes, because neither alone reaches every browser and situation:
 * BroadcastChannel (immediate, not stored) and a storage event on a localStorage
 * key (holds only a timestamp and a hash, never a credential). A tab ignores its
 * own announcement, and a message that arrives both ways is handled once.
 *
 * Only the SAME user's tabs sign out: each tab holds its own login, so another
 * user may be signed in in another tab of a shared browser, and that tab stays
 * signed in. The announcement carries a one-way hash of the user's id, never the
 * id itself.
 */

export interface SignOutMessage {
  type: string;
  tab: string;
  at: number;
  user: string | null;
}

interface MessageChannelLike {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', fn: (event: MessageEvent) => void): void;
  removeEventListener(type: 'message', fn: (event: MessageEvent) => void): void;
  close?(): void;
}

interface StorageEventSource {
  addEventListener(type: 'storage', fn: (event: StorageEvent) => void): void;
  removeEventListener(type: 'storage', fn: (event: StorageEvent) => void): void;
}

export interface SignOutBroadcastOptions {
  /** BroadcastChannel name. */
  channelName: string;
  /** localStorage key used for the storage-event route. */
  storageKey: string;
  /** Message type; anything else on the channel or key is ignored. */
  messageType: string;
  /** This tab's id (tests); one random id per page load by default. */
  tabId?: string;
}

/** A short one-way hash of a user id, so the announcement never carries the id itself. */
export function userKey(userId: unknown): string | null {
  const s = String(userId || '');
  if (!s) return null;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}`;
}

const pageTabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function openChannel(name: string): MessageChannelLike | null {
  try {
    return typeof BroadcastChannel === 'function' ? new BroadcastChannel(name) : null;
  } catch {
    return null;
  }
}

function localStore(): Pick<Storage, 'setItem'> | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function createSignOutBroadcast({ channelName, storageKey, messageType, tabId = pageTabId }: SignOutBroadcastOptions) {
  /** Tells the user's other tabs that they signed out here. Never throws. */
  function announce({
    userId = null,
    channel,
    local,
    now = Date.now(),
  }: {
    userId?: string | null;
    channel?: MessageChannelLike | null;
    local?: Pick<Storage, 'setItem'> | null;
    now?: number;
  } = {}): void {
    const ch = channel === undefined ? openChannel(channelName) : channel;
    const store = local === undefined ? localStore() : local;
    const message: SignOutMessage = { type: messageType, tab: tabId, at: now, user: userKey(userId) };
    try {
      if (ch) {
        ch.postMessage(message);
        ch.close?.();
      }
    } catch {
      /* no BroadcastChannel: the storage event below still reaches other tabs */
    }
    try {
      store?.setItem(storageKey, JSON.stringify(message));
    } catch {
      /* blocked storage: BroadcastChannel above is the only route */
    }
  }

  /**
   * Calls onSignOut once per announcement from ANOTHER tab of the same user
   * (`userId` is this tab's user). An announcement without a user signs out
   * every tab, the safe default. Returns an unsubscribe function.
   */
  function listen(
    onSignOut: (message: SignOutMessage) => void,
    {
      userId = null,
      channel,
      target,
    }: { userId?: string | null; channel?: MessageChannelLike | null; target?: StorageEventSource | null } = {},
  ): () => void {
    const ch = channel === undefined ? openChannel(channelName) : channel;
    const win: StorageEventSource | null = target === undefined ? (typeof window !== 'undefined' ? window : null) : target;
    const handled = new Set<string>();
    const mine = userKey(userId);

    const handle = (message: Partial<SignOutMessage> | null | undefined) => {
      if (!message || message.type !== messageType || message.tab === tabId) return;
      if (message.user && mine && message.user !== mine) return; // a different user: stays signed in
      const id = `${message.tab}:${message.at}`;
      if (handled.has(id)) return;
      handled.add(id);
      onSignOut(message as SignOutMessage);
    };
    const onMessage = (event: MessageEvent) => handle(event?.data);
    const onStorage = (event: StorageEvent) => {
      if (!event || event.key !== storageKey || !event.newValue) return;
      try {
        handle(JSON.parse(event.newValue));
      } catch {
        /* not ours */
      }
    };

    try {
      ch?.addEventListener('message', onMessage);
    } catch {
      /* channel unusable: the storage route still works */
    }
    win?.addEventListener('storage', onStorage);

    return () => {
      try {
        ch?.removeEventListener('message', onMessage);
        ch?.close?.();
      } catch {
        /* already closed */
      }
      win?.removeEventListener('storage', onStorage);
    };
  }

  return { announce, listen };
}
