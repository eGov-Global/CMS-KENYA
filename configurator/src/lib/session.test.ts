// #232 / #233: the configurator's session rules. The idle timer and the
// sign-out broadcast in ui-shared/session are ports of digit-ui's (#224), so the
// core cases here mirror digit-ui-esbuild/tests/idleTimer.test.js,
// idleWarning.test.js and employeeSignOutBroadcast.test.js.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startIdleTimer,
  idleTimeoutMs,
  idleWarningMs,
  storageActivityStore,
  ACTIVITY_EVENTS,
  DEFAULT_IDLE_MINUTES,
  type ActivityStore,
} from '../../../ui-shared/session/idleTimer';
import { createSignOutBroadcast, userKey, type SignOutMessage } from '../../../ui-shared/session/signOutBroadcast';
import {
  readIdleSettings,
  markLoginActivity,
  rememberSignOutReason,
  takeSignOutReason,
  SEEN_LOGIN_KEY,
  SIGNED_OUT_MESSAGES,
  CONFIGURATOR_LAST_ACTIVITY_KEY,
  configuratorActivityClock,
} from './sessionGuard';
import { apiClient } from '@/api';

const MIN = 60 * 1000;
const SEC = 1000;

/** A fake window/document + clock + interval, driven by hand. */
function harness(timeoutMs: number, { shared = null as ActivityStore | null, start = 1_000_000, warnBeforeMs = 0 } = {}) {
  let t = start;
  const listeners = new Map<string, Array<() => void>>();
  const target = {
    addEventListener: (e: string, fn: () => void) => listeners.set(e, [...(listeners.get(e) || []), fn]),
    removeEventListener: (e: string, fn: () => void) => listeners.set(e, (listeners.get(e) || []).filter((f) => f !== fn)),
  };
  const ticks = new Map<number, () => void>();
  let nextId = 1;
  let idleCalls = 0;
  const warnings: number[] = [];
  let actives = 0;
  const stop = startIdleTimer({
    timeoutMs,
    onIdle: () => (idleCalls += 1),
    warnBeforeMs,
    onWarn: (at) => warnings.push(at),
    onActive: () => (actives += 1),
    target,
    doc: target,
    now: () => t,
    setInterval: (fn) => {
      const id = nextId++;
      ticks.set(id, fn);
      return id;
    },
    clearInterval: (id) => ticks.delete(id as number),
    shared,
  });
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
      [...ticks.values()].forEach((fn) => fn());
    },
    sleep: (ms: number) => {
      t += ms; // time passes with no interval tick (background tab / laptop asleep)
    },
    fire: (e: string) => (listeners.get(e) || []).forEach((fn) => fn()),
    listenerCount: () => [...listeners.values()].reduce((n, l) => n + l.length, 0),
    idle: () => idleCalls,
    warnings,
    actives: () => actives,
    intervals: () => ticks.size,
    stop,
  };
}

const memStore = (seed: Record<string, string> = {}) => {
  const m = new Map(Object.entries(seed));
  return { getItem: (k: string) => (m.has(k) ? m.get(k)! : null), setItem: (k: string, v: string) => void m.set(k, String(v)), m };
};

describe('idle timer (ui-shared, ported from digit-ui)', () => {
  it('defaults to 15 minutes; 0 or less turns it off', () => {
    expect(DEFAULT_IDLE_MINUTES).toBe(15);
    expect(idleTimeoutMs(undefined)).toBe(15 * MIN);
    expect(idleTimeoutMs('')).toBe(15 * MIN);
    expect(idleTimeoutMs('x')).toBe(15 * MIN);
    expect(idleTimeoutMs('3')).toBe(3 * MIN);
    expect(idleTimeoutMs(0)).toBe(0);
    expect(idleTimeoutMs(-1)).toBe(0);
  });

  it('warns 60 seconds before by default, never more than half the limit, 0 = no warning', () => {
    expect(idleWarningMs(undefined, 15 * MIN)).toBe(60 * SEC);
    expect(idleWarningMs('30', 15 * MIN)).toBe(30 * SEC);
    expect(idleWarningMs(600, 3 * MIN)).toBe(90 * SEC);
    expect(idleWarningMs(0, 15 * MIN)).toBe(0);
    expect(idleWarningMs(60, 0)).toBe(0);
  });

  it('signs out once after the full limit with no activity, then stops', () => {
    const h = harness(15 * MIN);
    h.advance(14 * MIN);
    expect(h.idle()).toBe(0);
    h.advance(1 * MIN);
    expect(h.idle()).toBe(1);
    h.advance(10 * MIN);
    expect(h.idle()).toBe(1);
    expect(h.intervals()).toBe(0);
  });

  it('any activity restarts the countdown', () => {
    const h = harness(15 * MIN);
    for (const e of ACTIVITY_EVENTS) {
      h.advance(10 * MIN);
      h.fire(e);
    }
    h.advance(14 * MIN);
    expect(h.idle()).toBe(0);
    h.advance(1 * MIN);
    expect(h.idle()).toBe(1);
  });

  it('coming back after the limit signs out, even if the first thing is a mouse move', () => {
    const h = harness(15 * MIN);
    h.sleep(2 * 60 * MIN);
    h.fire('mousemove');
    expect(h.idle()).toBe(1);
  });

  it('returning to the tab after the limit signs out at once; within it, keeps the session', () => {
    const late = harness(15 * MIN);
    late.sleep(20 * MIN);
    late.fire('visibilitychange');
    expect(late.idle()).toBe(1);
    const soon = harness(15 * MIN);
    soon.sleep(5 * MIN);
    soon.fire('focus');
    expect(soon.idle()).toBe(0);
  });

  it('a disabled timer attaches nothing; stopping removes every listener', () => {
    const off = harness(0);
    off.sleep(10 * 60 * MIN);
    off.fire('mousemove');
    expect(off.idle()).toBe(0);
    expect(off.listenerCount()).toBe(0);
    const on = harness(15 * MIN);
    expect(on.listenerCount()).toBeGreaterThan(0);
    on.stop();
    expect(on.listenerCount()).toBe(0);
    expect(on.intervals()).toBe(0);
  });

  it('activity in ANOTHER tab keeps this tab signed in (shared clock)', () => {
    const shared = storageActivityStore(memStore(), CONFIGURATOR_LAST_ACTIVITY_KEY);
    const h = harness(15 * MIN, { shared });
    for (let i = 0; i < 4; i += 1) {
      h.advance(10 * MIN);
      shared.write(h.now());
    }
    expect(h.idle()).toBe(0);
    h.advance(15 * MIN);
    expect(h.idle()).toBe(1);
  });

  it('a restored tab whose last activity is older than the limit signs out as soon as it loads', () => {
    const start = 10_000_000;
    const store = memStore({ [CONFIGURATOR_LAST_ACTIVITY_KEY]: String(start - 20 * MIN) });
    const h = harness(15 * MIN, { shared: storageActivityStore(store, CONFIGURATOR_LAST_ACTIVITY_KEY), start });
    expect(h.idle()).toBe(1);
  });

  it('warns once before the sign-out; Stay signed in (keepAlive) closes it and writes the shared clock at once', () => {
    const store = memStore();
    const shared = storageActivityStore(store, CONFIGURATOR_LAST_ACTIVITY_KEY);
    const h = harness(3 * MIN, { shared, warnBeforeMs: 60 * SEC });
    h.advance(2 * MIN);
    expect(h.warnings).toHaveLength(1);
    expect(h.warnings[0]).toBe(h.now() + 1 * MIN);
    h.fire('mousemove'); // reaching for the dialog does not count
    h.advance(1 * SEC);
    expect(h.actives()).toBe(0);
    h.stop.keepAlive();
    expect(h.actives()).toBe(1);
    expect(shared.read()).toBe(h.now());
    h.advance(2 * MIN + 59 * SEC);
    expect(h.idle()).toBe(0);
  });

  it('with the warning up and no answer, signs out on time', () => {
    const h = harness(3 * MIN, { warnBeforeMs: 60 * SEC });
    h.advance(2 * MIN);
    expect(h.warnings).toHaveLength(1);
    h.advance(59 * SEC);
    expect(h.idle()).toBe(0);
    h.advance(1 * SEC);
    expect(h.idle()).toBe(1);
  });

  it('the shared store never throws on blocked storage', () => {
    const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    const s = storageActivityStore(blocked, 'k');
    expect(s.read()).toBeNull();
    expect(() => s.write(1)).not.toThrow();
  });
});

/* ---------------- sign-out broadcast ---------------- */

/** A BroadcastChannel stand-in: delivers to every other channel object on the bus. */
function makeBus() {
  const channels = new Set<{ _deliver: (d: unknown) => void }>();
  return {
    make: () => {
      const listeners = new Set<(e: MessageEvent) => void>();
      const ch = {
        postMessage: (data: unknown) => channels.forEach((other) => other !== ch && other._deliver(data)),
        addEventListener: (_e: 'message', fn: (e: MessageEvent) => void) => listeners.add(fn),
        removeEventListener: (_e: 'message', fn: (e: MessageEvent) => void) => listeners.delete(fn),
        close: () => channels.delete(ch),
        _deliver: (data: unknown) => listeners.forEach((fn) => fn({ data } as MessageEvent)),
      };
      channels.add(ch);
      return ch;
    },
  };
}

function makeWindow() {
  const listeners = new Set<(e: StorageEvent) => void>();
  return {
    addEventListener: (_e: 'storage', fn: (e: StorageEvent) => void) => listeners.add(fn),
    removeEventListener: (_e: 'storage', fn: (e: StorageEvent) => void) => listeners.delete(fn),
    dispatchStorage: (key: string | null, newValue: string | null) => listeners.forEach((fn) => fn({ key, newValue } as StorageEvent)),
    count: () => listeners.size,
  };
}

const OPTS = { channelName: 'crs-test-session', storageKey: 'crs-test-signed-out', messageType: 'test-signed-out' };

describe('sign-out broadcast (ui-shared, ported from digit-ui)', () => {
  it('another tab of the same admin hears the sign-out; the announcing tab ignores its own', () => {
    const bus = makeBus();
    const a = createSignOutBroadcast({ ...OPTS, tabId: 'tab-a' });
    const b = createSignOutBroadcast({ ...OPTS, tabId: 'tab-b' });
    const heardA = vi.fn();
    const heardB = vi.fn();
    a.listen(heardA, { userId: 'uuid-admin', channel: bus.make(), target: makeWindow() });
    b.listen(heardB, { userId: 'uuid-admin', channel: bus.make(), target: makeWindow() });
    a.announce({ userId: 'uuid-admin', channel: bus.make(), local: memStore(), now: 1 });
    expect(heardB).toHaveBeenCalledTimes(1);
    expect(heardA).not.toHaveBeenCalled();
  });

  it('without BroadcastChannel the storage event carries it, with no credential and no raw id', () => {
    const a = createSignOutBroadcast({ ...OPTS, tabId: 'tab-a' });
    const b = createSignOutBroadcast({ ...OPTS, tabId: 'tab-b' });
    const local = memStore();
    const win = makeWindow();
    const heard = vi.fn();
    b.listen(heard, { userId: 'uuid-admin', channel: null, target: win });
    a.announce({ userId: 'uuid-admin', channel: null, local, now: 7 });
    const stored = local.getItem(OPTS.storageKey)!;
    expect(stored).toBeTruthy();
    expect(stored).not.toMatch(/token/i);
    expect(stored).not.toContain('uuid-admin');
    win.dispatchStorage(OPTS.storageKey, stored);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('a message arriving both ways is handled once; unrelated storage changes are ignored', () => {
    const bus = makeBus();
    const a = createSignOutBroadcast({ ...OPTS, tabId: 'tab-a' });
    const b = createSignOutBroadcast({ ...OPTS, tabId: 'tab-b' });
    const local = memStore();
    const win = makeWindow();
    const heard = vi.fn();
    b.listen(heard, { channel: bus.make(), target: win });
    a.announce({ channel: bus.make(), local, now: 42 });
    win.dispatchStorage(OPTS.storageKey, local.getItem(OPTS.storageKey));
    win.dispatchStorage('crs-configurator-last-activity', '123');
    win.dispatchStorage(null, null);
    win.dispatchStorage(OPTS.storageKey, 'not json');
    win.dispatchStorage(OPTS.storageKey, JSON.stringify({ type: 'other', tab: 'x', at: 1 }));
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('only the same admin signs out; another admin in another tab stays signed in', () => {
    const bus = makeBus();
    const a = createSignOutBroadcast({ ...OPTS, tabId: 'tab-a' });
    const same = vi.fn();
    const other = vi.fn();
    createSignOutBroadcast({ ...OPTS, tabId: 'tab-b' }).listen(same, { userId: 'uuid-alice', channel: bus.make(), target: makeWindow() });
    createSignOutBroadcast({ ...OPTS, tabId: 'tab-c' }).listen(other, { userId: 'uuid-bob', channel: bus.make(), target: makeWindow() });
    a.announce({ userId: 'uuid-alice', channel: bus.make(), local: memStore(), now: 5 });
    expect(same).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
  });

  it("another app's broadcast (different type) never signs the configurator out", () => {
    const bus = makeBus();
    const heard = vi.fn();
    createSignOutBroadcast({ ...OPTS, tabId: 'tab-b' }).listen(heard, { channel: bus.make(), target: makeWindow() });
    createSignOutBroadcast({ ...OPTS, messageType: 'employee-signed-out', tabId: 'tab-a' }).announce({ channel: bus.make(), local: memStore(), now: 1 });
    expect(heard).not.toHaveBeenCalled();
  });

  it('unsubscribe removes the listeners; announcing never throws', () => {
    const bus = makeBus();
    const win = makeWindow();
    const heard = vi.fn();
    const off = createSignOutBroadcast({ ...OPTS, tabId: 'tab-b' }).listen(heard, { channel: bus.make(), target: win });
    off();
    expect(win.count()).toBe(0);
    const a = createSignOutBroadcast({ ...OPTS, tabId: 'tab-a' });
    a.announce({ channel: bus.make(), local: memStore(), now: 1 });
    expect(heard).not.toHaveBeenCalled();
    const blocked = { setItem: () => { throw new Error('blocked'); } };
    expect(() => a.announce({ channel: null, local: blocked })).not.toThrow();
    const broken = { postMessage: () => { throw new Error('closed'); }, addEventListener() {}, removeEventListener() {} };
    expect(() => a.announce({ channel: broken, local: null })).not.toThrow();
  });

  it('userKey is a stable one-way hash', () => {
    expect(userKey('x')).toBe(userKey('x'));
    expect(userKey('uuid-alice')).not.toBe(userKey('uuid-bob'));
    expect(userKey('')).toBeNull();
    expect(userKey('uuid-alice')).not.toContain('alice');
  });

  it('the real BroadcastChannel route works between two broadcasts (jsdom)', async () => {
    if (typeof BroadcastChannel !== 'function') return; // older jsdom: covered by the fakes above
    const name = `crs-real-${Math.random()}`;
    const a = createSignOutBroadcast({ ...OPTS, channelName: name, tabId: 'tab-a' });
    const b = createSignOutBroadcast({ ...OPTS, channelName: name, tabId: 'tab-b' });
    let off = () => {};
    const got = new Promise<SignOutMessage>((resolve) => {
      off = b.listen(resolve, { userId: 'uuid-admin', target: null });
    });
    a.announce({ userId: 'uuid-admin', local: null });
    try {
      await expect(got).resolves.toMatchObject({ type: OPTS.messageType, tab: 'tab-a' });
    } finally {
      off(); // closes the channel, so the test worker can exit
    }
  });
});

/* ---------------- configurator settings ---------------- */

describe('configurator session settings', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("uses digit-ui's employee idle settings from globalConfigs (admins are employees)", () => {
    const configs: Record<string, unknown> = { EMPLOYEE_IDLE_TIMEOUT_MINUTES: 3, EMPLOYEE_IDLE_WARNING_SECONDS: 60 };
    const win = { globalConfigs: { getConfig: (k: string) => configs[k] } };
    expect(readIdleSettings(win)).toEqual({ timeoutMs: 3 * MIN, warnBeforeMs: 60 * SEC });
  });

  it('falls back to 15 minutes and 60 seconds without globalConfigs, and 0 turns it off', () => {
    expect(readIdleSettings({})).toEqual({ timeoutMs: 15 * MIN, warnBeforeMs: 60 * SEC });
    expect(readIdleSettings(undefined)).toEqual({ timeoutMs: 15 * MIN, warnBeforeMs: 60 * SEC });
    const off = { globalConfigs: { getConfig: (k: string) => (k === 'EMPLOYEE_IDLE_TIMEOUT_MINUTES' ? 0 : undefined) } };
    expect(readIdleSettings(off)).toEqual({ timeoutMs: 0, warnBeforeMs: 0 });
    const broken = { globalConfigs: { getConfig: () => { throw new Error('boom'); } } };
    expect(readIdleSettings(broken).timeoutMs).toBe(15 * MIN);
  });

  it('the configurator keeps its own clock, apart from digit-ui employees and citizens', () => {
    expect(CONFIGURATOR_LAST_ACTIVITY_KEY).not.toBe('Digit.EmployeeLastActivity');
    expect(CONFIGURATOR_LAST_ACTIVITY_KEY).not.toBe('Digit.CitizenLastActivity');
    configuratorActivityClock().write(1234);
    expect(localStorage.getItem(CONFIGURATOR_LAST_ACTIVITY_KEY)).toBe('1234');
  });

  it('a new login resets the shared clock once; the same login (reload) does not', () => {
    const clock = { read: vi.fn(), write: vi.fn() };
    markLoginActivity('token-1', clock, 100);
    expect(clock.write).toHaveBeenCalledWith(100);
    expect(sessionStorage.getItem(SEEN_LOGIN_KEY)).toBeTruthy();
    expect(sessionStorage.getItem(SEEN_LOGIN_KEY)).not.toContain('token-1');
    markLoginActivity('token-1', clock, 200);
    expect(clock.write).toHaveBeenCalledTimes(1);
    markLoginActivity('token-2', clock, 300);
    expect(clock.write).toHaveBeenLastCalledWith(300);
  });

  it('the sign-out reason is read once, and only known reasons count', () => {
    rememberSignOutReason('idle');
    expect(takeSignOutReason()).toBe('idle');
    expect(takeSignOutReason()).toBeNull();
    rememberSignOutReason('signed-out-elsewhere');
    expect(takeSignOutReason()).toBe('signed-out-elsewhere');
    sessionStorage.setItem('crs-signed-out-reason', '<script>');
    expect(takeSignOutReason()).toBeNull();
    expect(SIGNED_OUT_MESSAGES.idle).toMatch(/had not used the configurator/);
    expect(SIGNED_OUT_MESSAGES['signed-out-elsewhere']).toMatch(/another tab/);
  });
});

/* ---------------- server logout (#232) ---------------- */

describe('apiClient.endServerSession', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    apiClient.logout();
    apiClient.setSessionExpiredHandler(() => {});
  });

  const signIn = () => {
    apiClient.setEnvironment('https://example.test/');
    apiClient.setAuth('tok-123', {
      id: 1, uuid: 'uuid-admin', userName: 'ADMIN', name: 'Admin', mobileNumber: '', type: 'EMPLOYEE', roles: [], tenantId: 'nb',
    } as never);
  };

  it('calls /user/_logout with this login token, so the token stops working on the server', async () => {
    signIn();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    globalThis.fetch = fetchMock as never;
    const done = apiClient.endServerSession();
    apiClient.logout(); // the caller clears the client straight away
    await done;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.test/user/_logout?tenantId=nb');
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(init.headers.Authorization).toBe('Bearer tok-123');
    const body = JSON.parse(init.body);
    expect(body.access_token).toBe('tok-123');
    expect(body.RequestInfo.authToken).toBe('tok-123');
  });

  it('does nothing without a login, never throws, and never reports an expired session', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as never;
    await apiClient.endServerSession();
    expect(fetchMock).not.toHaveBeenCalled();

    signIn();
    const expired = vi.fn();
    apiClient.setSessionExpiredHandler(expired);
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as never;
    await expect(apiClient.endServerSession()).resolves.toBeUndefined();
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ Errors: [{ code: 'InvalidAccessTokenException' }] }) }) as never;
    await expect(apiClient.endServerSession()).resolves.toBeUndefined();
    expect(expired).not.toHaveBeenCalled();
  });
});
