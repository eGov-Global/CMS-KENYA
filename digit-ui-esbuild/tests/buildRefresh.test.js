import test from "node:test";
import assert from "node:assert/strict";
import { buildInfoUrl, dropCachesFromOtherBuild, isHubScreen, readBuildId, startBuildWatcher } from "../src/buildRefresh.js";

const MINUTE = 60 * 1000;
const T0 = Date.UTC(2026, 9, 12, 8, 0, 0);

const memoryStorage = (entries = {}) => {
  const map = new Map(Object.entries(entries));
  return {
    map,
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
};

// A window whose server currently serves `server.buildId`. Timers and listeners
// are captured so a test can fire them: every(ms) runs the intervals of that
// period, fire(target, type, event) the listeners, expireTimeouts() the timeouts.
const fakeWindow = ({ pathname = "/digit-ui/employee/pgr/inbox-v2", server, session = memoryStorage() }) => {
  const intervals = [];
  const timeouts = [];
  const listeners = {};
  const listen = (target) => (type, fn) => { (listeners[`${target}:${type}`] ||= []).push(fn); };
  const win = {
    reloads: 0,
    fetched: [],
    location: { pathname, reload: () => { win.reloads += 1; } },
    document: { visibilityState: "visible", addEventListener: listen("document") },
    sessionStorage: session,
    AbortController,
    fetch: (url, options) => {
      win.fetched.push({ url, options });
      if (server.hang) return new Promise((_, reject) => options.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
      if (server.offline) return Promise.reject(new TypeError("Failed to fetch"));
      if (server.html) return Promise.resolve({ ok: true, headers: { get: () => "text/html" }, json: async () => { throw new Error("not json"); } });
      return Promise.resolve({ ok: true, headers: { get: () => "application/json" }, json: async () => ({ buildId: server.buildId }) });
    },
    setInterval: (fn, ms) => { intervals.push({ fn, ms }); },
    setTimeout: (fn) => { timeouts.push({ fn }); return timeouts.length; },
    clearTimeout: (id) => { timeouts[id - 1].cleared = true; },
    addEventListener: listen("window"),
    every: (ms) => intervals.filter((i) => i.ms === ms).forEach((i) => i.fn()),
    fire: (target, type, event) => (listeners[`${target}:${type}`] || []).forEach((fn) => fn(event)),
    expireTimeouts: () => timeouts.filter((t) => !t.cleared && !t.done).forEach((t) => { t.done = true; t.fn(); }),
    navigate: (path) => { win.location.pathname = path; win.every(400); },
  };
  return win;
};
const settle = () => new Promise((resolve) => setImmediate(resolve));
const EVERY_FIVE_MINUTES = 5 * MINUTE;

const watch = async ({ buildId = "b1", server, clock, ...rest }) => {
  const win = fakeWindow({ server, ...rest });
  startBuildWatcher({ buildId, win, now: () => clock.t, reloadWhenFound: rest.reloadWhenFound });
  await settle();
  return win;
};

test("the build id comes from the page's meta tag; dev builds have none", () => {
  const doc = (content) => ({ querySelector: (sel) => (sel === 'meta[name="digit-build-id"]' && content ? { getAttribute: () => content } : null) });
  assert.equal(readBuildId(doc("3f9c2a1b7d4e")), "3f9c2a1b7d4e");
  assert.equal(readBuildId(doc(null)), null);
});

test("build-info.json is read from the docroot the page was served from", () => {
  assert.equal(buildInfoUrl("/digit-ui/employee/pgr/inbox-v2"), "/digit-ui/build-info.json");
  assert.equal(buildInfoUrl("/digit-ui-test/citizen"), "/digit-ui-test/build-info.json");
  assert.equal(buildInfoUrl("/"), "/digit-ui/build-info.json");
});

test("hub screens reload safely; screens inside a flow do not", () => {
  for (const path of [
    "/digit-ui/citizen", "/digit-ui/citizen/", "/digit-ui/employee", "/digit-ui/landing", "/digit-ui/privacy-policy",
    "/digit-ui/citizen/pgr-home", "/digit-ui/citizen/all-services", "/digit-ui/citizen/pgr/complaints",
    "/digit-ui/citizen/pgr/complaints/BFH-2026-128", "/digit-ui/employee/pgr/inbox-v2",
    "/digit-ui/employee/pgr/complaint-details/BFH-2026-128", "/digit-ui/employee/pgr/admin-search",
    "/digit-ui/employee/dashboard", "/digit-ui/no-top-bar/employee/pgr/inbox-v2",
  ]) assert.equal(isHubScreen(path), true, path);
  for (const path of [
    "/digit-ui/citizen/login", "/digit-ui/citizen/login/otp", "/digit-ui/citizen/register/name", "/digit-ui/employee/user/login",
    "/digit-ui/citizen/pgr/create-complaint/details", "/digit-ui/citizen/pgr/response", "/digit-ui/citizen/pgr/reopen/upload-photo/BFH-2026-128",
    "/digit-ui/citizen/pgr/rate/BFH-2026-128", "/digit-ui/employee/pgr/create-complaint", "/digit-ui/employee/pgr/complaint-success",
  ]) assert.equal(isHubScreen(path), false, path);
});

test("a new build drops the cached label bundles once per browser, and only those", () => {
  const local = memoryStorage({
    "Digit.lastBuildId": "old",
    "Digit.Locale.en_IN.List": "[]",
    "Digit.Locale.en_IN.rainmaker-pgr": "[]",
    "Digit.Locale.List": "[]",
    "Digit.User": "{}",
    "Citizen.locale": "en_IN",
    token: "t",
    "pgr.inbox.lastSeen.bo.MY.u1": "1",
  });
  dropCachesFromOtherBuild({ buildId: "new", local, session: memoryStorage() });
  assert.deepEqual([...local.map.keys()].sort(), ["Citizen.locale", "Digit.User", "Digit.lastBuildId", "pgr.inbox.lastSeen.bo.MY.u1", "token"]);
  assert.equal(local.getItem("Digit.lastBuildId"), "new");

  local.setItem("Digit.Locale.List", "[]"); // written by the new build afterwards
  dropCachesFromOtherBuild({ buildId: "new", local, session: memoryStorage() });
  assert.equal(local.getItem("Digit.Locale.List"), "[]", "same build: nothing dropped");
});

test("each tab drops its own session caches the first time it runs a new build", () => {
  const local = memoryStorage({ "Digit.lastBuildId": "new" }); // another tab already loaded the new build
  const session = memoryStorage({ "Digit.serviceDefs": "{\"value\":[]}", "Digit.PGR_CREATE_CITIZEN_DRAFT": "{}", "Digit.User": "{}" });
  dropCachesFromOtherBuild({ buildId: "new", local, session });
  assert.deepEqual([...session.map.keys()].sort(), ["Digit.PGR_CREATE_CITIZEN_DRAFT", "Digit.User", "Digit.tabBuildId"]);
  assert.equal(session.getItem("Digit.tabBuildId"), "new");
});

test("no build id (dev) or blocked storage: caches are left alone, nothing throws", () => {
  const local = memoryStorage({ "Digit.Locale.List": "[]" });
  dropCachesFromOtherBuild({ buildId: null, local, session: memoryStorage() });
  assert.equal(local.getItem("Digit.Locale.List"), "[]");
  const blocked = memoryStorage();
  blocked.getItem = () => { throw new Error("SecurityError"); };
  assert.doesNotThrow(() => dropCachesFromOtherBuild({ buildId: "new", local: blocked, session: blocked }));
});

test("no build id: the watcher never starts", async () => {
  const win = await watch({ buildId: null, server: { buildId: "b2" }, clock: { t: T0 } });
  win.every(EVERY_FIVE_MINUTES);
  assert.equal(win.fetched.length, 0);
});

test("same build on the server: no reload, ever", async () => {
  const clock = { t: T0 };
  const win = await watch({ server: { buildId: "b1" }, clock });
  win.navigate("/digit-ui/employee/pgr/complaint-details/BFH-2026-128");
  assert.equal(win.reloads, 0);
  const [{ url, options }] = win.fetched;
  assert.equal(url, `/digit-ui/build-info.json?t=${T0}`);
  assert.equal(options.cache, "no-store");
  assert.equal(options.credentials, "same-origin", "Basic credentials reach the test entrance");
});

test("page loaded from a stale cache: reloads at once, but only once", async () => {
  const clock = { t: T0 };
  const session = memoryStorage();
  const server = { buildId: "b2" };
  const first = await watch({ server, session, clock });
  assert.equal(first.reloads, 1);

  // The reload still came back with the old shell (proxy / deploy mid-copy).
  clock.t += 2000;
  const second = await watch({ server, session, clock });
  second.navigate("/digit-ui/employee/pgr/complaint-details/BFH-2026-128");
  assert.equal(second.reloads, 0, "no second reload inside the retry window");

  clock.t += 10 * MINUTE;
  second.navigate("/digit-ui/employee/pgr/inbox-v2");
  assert.equal(second.reloads, 1, "after the window, the next hub screen tries again");
});

test("old and new pods answering in turn: one reload, not a loop", async () => {
  const clock = { t: T0 };
  const session = memoryStorage();
  const first = await watch({ buildId: "new", server: { buildId: "old" }, session, clock });
  clock.t += 3000;
  const second = await watch({ buildId: "old", server: { buildId: "new" }, session, clock });
  clock.t += 3000;
  const third = await watch({ buildId: "new", server: { buildId: "old" }, session, clock });
  assert.deepEqual([first.reloads, second.reloads, third.reloads], [1, 0, 0]);
});

test("a deploy while the tab is open: waits for the next hub screen, never mid-flow", async () => {
  const clock = { t: T0 };
  const server = { buildId: "b1" };
  const win = await watch({ pathname: "/digit-ui/citizen", server, clock });

  clock.t += 5 * MINUTE;
  server.buildId = "b2";
  win.every(EVERY_FIVE_MINUTES);
  await settle();
  assert.equal(win.fetched.length, 2, "the five-minute check ran");
  win.every(400);
  assert.equal(win.reloads, 0, "the screen in use is never reloaded under the user");

  for (const path of ["/digit-ui/citizen/login", "/digit-ui/citizen/login/otp", "/digit-ui/citizen/pgr/create-complaint/complaint-type", "/digit-ui/citizen/pgr/response"]) {
    win.navigate(path);
    assert.equal(win.reloads, 0, path);
  }
  win.navigate("/digit-ui/citizen/pgr/complaints");
  assert.equal(win.reloads, 1);
});

test("coming back to the tab checks again, at most once a minute; a hidden tab skips the timer", async () => {
  const clock = { t: T0 };
  const server = { buildId: "b1" };
  const win = await watch({ server, clock });

  clock.t += 30 * 1000;
  win.fire("document", "visibilitychange");
  await settle();
  assert.equal(win.fetched.length, 1, "less than a minute since the last check");

  win.document.visibilityState = "hidden";
  win.every(EVERY_FIVE_MINUTES);
  await settle();
  assert.equal(win.fetched.length, 1, "hidden tab: the timer doesn't fetch");

  clock.t += 2 * MINUTE;
  server.buildId = "b2";
  win.document.visibilityState = "visible";
  win.fire("document", "visibilitychange");
  await settle();
  assert.equal(win.fetched.length, 2);
  win.navigate("/digit-ui/employee/pgr/complaint-details/BFH-2026-128");
  assert.equal(win.reloads, 1);
});

test("a page restored from the back/forward cache checks again", async () => {
  const clock = { t: T0 };
  const win = await watch({ server: { buildId: "b1" }, clock });
  win.fire("window", "pageshow", { persisted: false });
  await settle();
  assert.equal(win.fetched.length, 1);
  win.fire("window", "pageshow", { persisted: true });
  await settle();
  assert.equal(win.fetched.length, 2);
});

test("rolled back to the running build: the pending reload is cancelled", async () => {
  const clock = { t: T0 };
  const server = { buildId: "b1" };
  const win = await watch({ server, clock });
  clock.t += 5 * MINUTE;
  server.buildId = "b2";
  win.every(EVERY_FIVE_MINUTES);
  await settle();
  server.buildId = "b1";
  win.every(EVERY_FIVE_MINUTES);
  await settle();
  win.navigate("/digit-ui/employee/pgr/complaint-details/BFH-2026-128");
  assert.equal(win.reloads, 0);
});

test("public dashboard: a new build loads as soon as it is found", async () => {
  const clock = { t: T0 };
  const server = { buildId: "b1" };
  const win = await watch({ pathname: "/digit-ui/public-dashboard", server, clock, reloadWhenFound: true });
  clock.t += 5 * MINUTE;
  server.buildId = "b2";
  win.every(EVERY_FIVE_MINUTES);
  await settle();
  assert.equal(win.reloads, 1);
});

test("a request that never answers is abandoned, and the next check still runs", async () => {
  const clock = { t: T0 };
  const server = { buildId: "b1", hang: true };
  const win = await watch({ server, clock });
  win.expireTimeouts();
  await settle();
  server.hang = false;
  server.buildId = "b2";
  clock.t += 5 * MINUTE;
  win.every(EVERY_FIVE_MINUTES);
  await settle();
  assert.equal(win.fetched.length, 2, "not stuck behind the hung request");
  win.navigate("/digit-ui/employee/pgr/complaint-details/BFH-2026-128");
  assert.equal(win.reloads, 1);
});

test("SPA-fallback HTML, offline, or no / blocked sessionStorage: never reloads, never throws", async () => {
  const clock = { t: T0 };
  const html = await watch({ server: { buildId: "b2", html: true }, clock });
  const offline = await watch({ server: { buildId: "b2", offline: true }, clock });
  const blocked = memoryStorage();
  blocked.getItem = () => { throw new Error("SecurityError"); };
  const noSession = await watch({ server: { buildId: "b2" }, session: blocked, clock });
  const sandboxed = fakeWindow({ server: { buildId: "b2" } });
  Object.defineProperty(sandboxed, "sessionStorage", { get() { throw new Error("SecurityError"); } });
  startBuildWatcher({ buildId: "b1", win: sandboxed, now: () => clock.t });
  await settle();
  assert.deepEqual([html.reloads, offline.reloads, noSession.reloads, sandboxed.reloads], [0, 0, 0, 0]);
});
