// #224: an employee or citizen left idle is logged out. The timer is plain logic with an
// injected clock, events and interval, so every case below runs instantly.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "packages/libraries/src/services/atoms/Utils/idleTimer.js");
const { outputFiles } = esbuild.buildSync({ entryPoints: [SRC], bundle: true, write: false, format: "cjs", platform: "node", target: "es2018" });
const mod = { exports: {} };
vm.runInNewContext(outputFiles[0].text, { module: mod, exports: mod.exports });
const { startIdleTimer, idleTimeoutMs, DEFAULT_EMPLOYEE_IDLE_MINUTES, ACTIVITY_EVENTS, storageActivityStore, markEmployeeActive, LAST_ACTIVITY_KEY, CITIZEN_LAST_ACTIVITY_KEY, idleProfileFor, userActivityKey } = mod.exports;

const MIN = 60 * 1000;

/** A fake window/document + clock + interval, driven by hand. `shared` = the cross-tab activity store. */
function harness(timeoutMs, { shared = null, start = 1_000_000 } = {}) {
  let t = start;
  const listeners = new Map();
  const target = {
    addEventListener: (e, fn) => listeners.set(e, [...(listeners.get(e) || []), fn]),
    removeEventListener: (e, fn) => listeners.set(e, (listeners.get(e) || []).filter((f) => f !== fn)),
  };
  let tick = null;
  let cleared = false;
  let idleCalls = 0;
  const stop = startIdleTimer({
    timeoutMs,
    onIdle: () => (idleCalls += 1),
    target,
    doc: target,
    now: () => t,
    setInterval: (fn) => ((tick = fn), 1),
    clearInterval: () => (cleared = true),
    shared,
  });
  return {
    now: () => t,
    advance: (ms) => { t += ms; if (tick && !cleared) tick(); },
    sleep: (ms) => { t += ms; }, // time passes with no interval tick (background tab / laptop asleep)
    fire: (e) => (listeners.get(e) || []).forEach((fn) => fn()),
    listenerCount: () => [...listeners.values()].reduce((n, l) => n + l.length, 0),
    idle: () => idleCalls,
    stopped: () => cleared,
    stop,
  };
}

test("default idle limit is 15 minutes", () => {
  assert.strictEqual(DEFAULT_EMPLOYEE_IDLE_MINUTES, 15);
  assert.strictEqual(idleTimeoutMs(undefined), 15 * MIN);
  assert.strictEqual(idleTimeoutMs(""), 15 * MIN);
  assert.strictEqual(idleTimeoutMs("not a number"), 15 * MIN);
});

test("the limit can be configured, and 0 turns idle logout off", () => {
  assert.strictEqual(idleTimeoutMs(30), 30 * MIN);
  assert.strictEqual(idleTimeoutMs("5"), 5 * MIN);
  assert.strictEqual(idleTimeoutMs(0.5), 30 * 1000);
  assert.strictEqual(idleTimeoutMs(0), 0);
  assert.strictEqual(idleTimeoutMs(-1), 0);
});

test("no activity for the full limit logs the user out once", () => {
  const h = harness(15 * MIN);
  h.advance(14 * MIN);
  assert.strictEqual(h.idle(), 0, "not before the limit");
  h.advance(1 * MIN);
  assert.strictEqual(h.idle(), 1);
  h.advance(10 * MIN);
  assert.strictEqual(h.idle(), 1, "never twice");
  assert.ok(h.stopped(), "the timer stops itself after logging out");
});

test("any activity restarts the countdown", () => {
  const h = harness(15 * MIN);
  for (const e of ACTIVITY_EVENTS) {
    h.advance(10 * MIN);
    h.fire(e);
  }
  h.advance(14 * MIN);
  assert.strictEqual(h.idle(), 0);
  h.advance(1 * MIN);
  assert.strictEqual(h.idle(), 1);
});

test("mouse, keyboard, touch and scroll all count as activity", () => {
  for (const e of ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"]) assert.ok(ACTIVITY_EVENTS.includes(e), e);
});

test("coming back after the limit logs out, even if the first thing the user does is move the mouse", () => {
  const h = harness(15 * MIN);
  h.sleep(2 * 60 * MIN); // tab in the background / laptop closed: no interval ticks
  h.fire("mousemove");
  assert.strictEqual(h.idle(), 1, "activity after the limit must not reset it");
});

test("returning to the tab after the limit logs out immediately", () => {
  const h = harness(15 * MIN);
  h.sleep(20 * MIN);
  h.fire("visibilitychange");
  assert.strictEqual(h.idle(), 1);
});

test("returning to the tab within the limit keeps the session", () => {
  const h = harness(15 * MIN);
  h.sleep(5 * MIN);
  h.fire("visibilitychange");
  h.fire("focus");
  assert.strictEqual(h.idle(), 0);
});

test("a disabled timer (0) does nothing and attaches nothing", () => {
  const h = harness(0);
  h.sleep(10 * 60 * MIN);
  h.fire("mousemove");
  assert.strictEqual(h.idle(), 0);
  assert.strictEqual(h.listenerCount(), 0);
});

test("stopping the timer removes every listener (no leak on unmount)", () => {
  const h = harness(15 * MIN);
  assert.ok(h.listenerCount() > 0);
  h.stop();
  assert.strictEqual(h.listenerCount(), 0);
  assert.ok(h.stopped());
});

/* ---------------- shared last-activity (all of the employee's tabs) ---------------- */

const memStore = (seed = {}) => {
  const m = new Map(Object.entries(seed));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

test("activity in ANOTHER tab keeps this tab signed in", () => {
  const local = memStore();
  const shared = storageActivityStore(local);
  const h = harness(15 * MIN, { shared });
  for (let i = 0; i < 4; i += 1) {
    h.advance(10 * MIN);
    shared.write(h.now()); // the employee is working in a different tab
  }
  assert.strictEqual(h.idle(), 0, "40 minutes in, never 15 idle across tabs");
  h.advance(15 * MIN);
  assert.strictEqual(h.idle(), 1, "no tab active for 15 minutes → logged out");
});

test("a restored tab whose last activity is older than the limit logs out as soon as it loads", () => {
  const start = 10_000_000;
  const local = memStore({ [LAST_ACTIVITY_KEY]: String(start - 20 * MIN) }); // closed 20 minutes ago
  const h = harness(15 * MIN, { shared: storageActivityStore(local), start });
  assert.strictEqual(h.idle(), 1, "no fresh 15 minutes for a restored tab");
});

test("a reload within the limit keeps the session and its remaining time", () => {
  const start = 10_000_000;
  const local = memStore({ [LAST_ACTIVITY_KEY]: String(start - 10 * MIN) });
  const h = harness(15 * MIN, { shared: storageActivityStore(local), start });
  assert.strictEqual(h.idle(), 0);
  h.advance(5 * MIN);
  assert.strictEqual(h.idle(), 1, "the countdown continues from the last activity, not from the reload");
});

test("this tab's activity is published to the other tabs", () => {
  const local = memStore();
  const shared = storageActivityStore(local);
  const h = harness(15 * MIN, { shared });
  assert.ok(shared.read(), "a session with nothing recorded publishes 'active now' at start");
  h.advance(3 * MIN);
  h.fire("keydown");
  assert.strictEqual(shared.read(), h.now());
});

test("markEmployeeActive (called at login) resets the shared clock", () => {
  const local = memStore({ [LAST_ACTIVITY_KEY]: "1" });
  markEmployeeActive(local, 5_000_000);
  assert.strictEqual(local.getItem(LAST_ACTIVITY_KEY), "5000000");
});

test("the shared store never throws on blocked storage", () => {
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  const s = storageActivityStore(blocked);
  assert.strictEqual(s.read(), null);
  assert.doesNotThrow(() => s.write(1));
});

/* ---------------- employee and citizen ---------------- */

test("an employee on employee pages gets the employee rules and the shared clock", () => {
  const p = idleProfileFor({ pathname: "/digit-ui/employee/pgr/inbox", userType: "EMPLOYEE" });
  assert.strictEqual(p.userType, "EMPLOYEE");
  assert.strictEqual(p.timeoutConfig, "EMPLOYEE_IDLE_TIMEOUT_MINUTES");
  assert.strictEqual(p.warningConfig, "EMPLOYEE_IDLE_WARNING_SECONDS");
  assert.strictEqual(p.clockStorage, "localStorage");
  assert.strictEqual(p.activityKey, LAST_ACTIVITY_KEY);
});

test("a citizen on citizen pages gets the citizen rules and a clock shared by their tabs (#231)", () => {
  const p = idleProfileFor({ pathname: "/digit-ui/citizen/pgr/create-complaint/complaint-type", userType: "citizen" });
  assert.strictEqual(p.userType, "CITIZEN");
  assert.strictEqual(p.timeoutConfig, "CITIZEN_IDLE_TIMEOUT_MINUTES");
  assert.strictEqual(p.warningConfig, "CITIZEN_IDLE_WARNING_SECONDS");
  assert.strictEqual(p.clockStorage, "localStorage", "one clock for all the citizen's tabs, not a separate timer per tab");
  assert.strictEqual(p.activityKey, CITIZEN_LAST_ACTIVITY_KEY);
  assert.notStrictEqual(CITIZEN_LAST_ACTIVITY_KEY, LAST_ACTIVITY_KEY);
});

test("a signed-in citizen is timed on the public pages too, so time there is not counted as idle", () => {
  for (const pathname of ["/digit-ui/landing", "/digit-ui/privacy-policy"]) {
    assert.strictEqual(idleProfileFor({ pathname, userType: "CITIZEN" }).userType, "CITIZEN", pathname);
    assert.strictEqual(idleProfileFor({ pathname, userType: "EMPLOYEE" }), null, pathname);
  }
});

test("no idle rules on the other user type's pages, or for an unknown type", () => {
  assert.strictEqual(idleProfileFor({ pathname: "/digit-ui/employee/pgr/inbox", userType: "CITIZEN" }), null);
  assert.strictEqual(idleProfileFor({ pathname: "/digit-ui/citizen/pgr/complaints", userType: "EMPLOYEE" }), null);
  assert.strictEqual(idleProfileFor({ pathname: "/digit-ui/citizen", userType: "SYSTEM" }), null);
  assert.strictEqual(idleProfileFor({ pathname: "/digit-ui/citizen", userType: "constructor" }), null);
  assert.strictEqual(idleProfileFor({ pathname: "/digit-ui/citizen", userType: "" }), null);
  assert.strictEqual(idleProfileFor(), null);
});

test("a citizen's clock and an employee's clock never touch each other", () => {
  const store = memStore({ [LAST_ACTIVITY_KEY]: "1000" });
  storageActivityStore(store, CITIZEN_LAST_ACTIVITY_KEY).write(9000);
  assert.strictEqual(store.getItem(LAST_ACTIVITY_KEY), "1000");
  assert.strictEqual(storageActivityStore(store, CITIZEN_LAST_ACTIVITY_KEY).read(), 9000);
  assert.strictEqual(storageActivityStore(store).read(), 1000);
});

test("a citizen left idle is logged out by the same timer, on the citizen clock", () => {
  const store = memStore();
  const clock = storageActivityStore(store, CITIZEN_LAST_ACTIVITY_KEY);
  const h = harness(3 * MIN, { shared: clock });
  h.advance(2 * MIN);
  h.fire("touchstart");
  h.advance(2 * MIN);
  assert.strictEqual(h.idle(), 0, "touch restarted the countdown");
  h.advance(1 * MIN + 1);
  assert.strictEqual(h.idle(), 1);
  assert.strictEqual(store.getItem(LAST_ACTIVITY_KEY), null, "the employee clock is untouched");
});

/* ---------------- one clock per user (#235) ---------------- */

test("each user has their own clock key: a one-way hash of the uuid, stable, never the id", () => {
  const a = userActivityKey(LAST_ACTIVITY_KEY, "uuid-alice");
  const b = userActivityKey(LAST_ACTIVITY_KEY, "uuid-bob");
  assert.notStrictEqual(a, b);
  assert.strictEqual(a, userActivityKey(LAST_ACTIVITY_KEY, "uuid-alice"));
  assert.ok(a.startsWith(`${LAST_ACTIVITY_KEY}.`));
  assert.ok(!a.includes("alice"));
  assert.ok(userActivityKey(CITIZEN_LAST_ACTIVITY_KEY, "uuid-alice").startsWith(`${CITIZEN_LAST_ACTIVITY_KEY}.`));
  assert.strictEqual(userActivityKey(LAST_ACTIVITY_KEY, null), LAST_ACTIVITY_KEY, "no uuid: the plain key");
  assert.strictEqual(userActivityKey(LAST_ACTIVITY_KEY, ""), LAST_ACTIVITY_KEY);
});

test("two different users in one browser: one's activity never keeps the other signed in", () => {
  const local = memStore();
  const alice = storageActivityStore(local, userActivityKey(LAST_ACTIVITY_KEY, "uuid-alice"));
  const bob = storageActivityStore(local, userActivityKey(LAST_ACTIVITY_KEY, "uuid-bob"));
  const hBob = harness(3 * MIN, { shared: bob });
  for (let i = 0; i < 4; i += 1) {
    hBob.advance(50 * 1000);
    alice.write(hBob.now()); // Alice is working in her own tab
  }
  assert.strictEqual(hBob.idle(), 1, "Bob, idle for 3 minutes, is signed out although Alice was active");
});

test("two different users in one browser: one's idle sign-out leaves the other signed in", () => {
  const local = memStore();
  const start = 1_000_000;
  const hAlice = harness(3 * MIN, { shared: storageActivityStore(local, userActivityKey(LAST_ACTIVITY_KEY, "uuid-alice")), start });
  const bobClock = storageActivityStore(local, userActivityKey(LAST_ACTIVITY_KEY, "uuid-bob"));
  const hBob = harness(3 * MIN, { shared: bobClock, start });
  hAlice.advance(90 * 1000);
  hBob.advance(90 * 1000);
  bobClock.write(hBob.now()); // Bob works; Alice does not
  hAlice.advance(90 * 1000);
  hBob.advance(90 * 1000);
  assert.strictEqual(hAlice.idle(), 1, "Alice is signed out at her 3 minutes");
  assert.strictEqual(hBob.idle(), 0, "Bob stays signed in");
});

test("the same user's tabs still share one clock (#231)", () => {
  const local = memStore();
  const tab1 = storageActivityStore(local, userActivityKey(CITIZEN_LAST_ACTIVITY_KEY, "uuid-carol"));
  const tab2 = storageActivityStore(local, userActivityKey(CITIZEN_LAST_ACTIVITY_KEY, "uuid-carol"));
  const h = harness(3 * MIN, { shared: tab1 });
  for (let i = 0; i < 4; i += 1) {
    h.advance(50 * 1000);
    tab2.write(h.now());
  }
  assert.strictEqual(h.idle(), 0, "activity in the same citizen's other tab keeps this one alive");
});

/* ---------------- wiring ---------------- */

test("IdleLogout is mounted in the app next to SessionCollisionNotice", () => {
  const app = fs.readFileSync(path.join(ROOT, "packages/modules/core/src/App.js"), "utf8");
  assert.match(app, /import IdleLogout from "\.\/components\/IdleLogout"/);
  assert.match(app, /<IdleLogout \/>/);
});

test("IdleLogout: the user type's own pages only, DIGIT login only, its own clock, and a tab-only logout", () => {
  const c = fs.readFileSync(path.join(ROOT, "packages/modules/core/src/components/IdleLogout.js"), "utf8");
  assert.match(c, /idleProfileFor\(\{ pathname, userType: user\?\.info\?\.type \}\)/, "rules come from the shared profile");
  assert.match(c, /config\(profile\.timeoutConfig\)/);
  assert.match(c, /config\(profile\.warningConfig\)/);
  assert.match(c, /isKeycloakAuth\(\)/, "Keycloak mode is skipped");
  assert.match(
    c,
    /storageActivityStore\(window\[profile\.clockStorage\], userActivityKey\(profile\.activityKey, userId\)\)/,
    "uses the profile's last-activity clock, one per user (#235)"
  );
  assert.match(c, /\}, \[userType, token, userId\]\);/, "a different user signing in restarts the timer on their own clock");
  assert.match(
    c,
    /if \(userType !== "EMPLOYEE" && userType !== "CITIZEN"\) return undefined;\s*return onSignOutElsewhere\(\(\) => endThisLogin\(SIGN_OUT_REASONS\.OTHER_TAB\), \{ userType, userId \}\)/,
    "employees and citizens both hear a logout in another tab, each on their own channel (#231)"
  );
  assert.match(c, /Digit\.UserService\.logoutUser\(\)/, "ends the login on the server");
  // The automatic paths (idle, signed out in another tab) end only this tab's
  // login; only the user's own "Sign out now" click may run the full logout,
  // exactly as the Logout button does.
  const automatic = (c.match(/const endThisLogin = async \(reason\) => \{([\s\S]*?)\n\};/) || [])[1];
  assert.ok(automatic, "the automatic sign-out helper exists");
  assert.match(automatic, /redirectToLogin\(reason\)/, "clears only this tab's credentials");
  assert.doesNotMatch(automatic, /UserService\.logout\(\)/, "never the full logout, which runs localStorage.clear()");
  assert.match(c, /onIdle: \(\) => endThisLogin\(/, "idle uses the tab-only sign-out");
  assert.match(c, /onSignOutElsewhere\(\(\) => endThisLogin\(/, "a logout in another tab uses the tab-only sign-out");
});

test("the idle limits are deploy settings in globalConfigs (bundled, ansible and Helm)", () => {
  for (const f of ["public/globalConfigs.js", "../local-setup/ansible/templates/globalConfigs.js.j2", "../devops/deploy-as-code/charts/urban/digit-ui/files/globalConfigs.js.tpl"]) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const key of ["EMPLOYEE_IDLE_TIMEOUT_MINUTES", "EMPLOYEE_IDLE_WARNING_SECONDS", "CITIZEN_IDLE_TIMEOUT_MINUTES", "CITIZEN_IDLE_WARNING_SECONDS"]) {
      assert.match(src, new RegExp(key), `${f}: ${key}`);
    }
  }
  const values = fs.readFileSync(path.join(ROOT, "../devops/deploy-as-code/charts/urban/digit-ui/values.yaml"), "utf8");
  assert.match(values, /citizenIdleTimeoutMinutes: 15/);
  assert.match(values, /citizenIdleWarningSeconds: 60/);
});

test("the warning is a small centred card on phones, with a readable Sign out now", () => {
  const css = fs.readFileSync(path.join(ROOT, "public/vendor/overrides.css"), "utf8");
  const phone = css.slice(css.indexOf("@media (max-width: 47.99rem) {\n  .digit-popup-overlay .digit-popup-wrapper.digit-logout-popup-wrapper"));
  assert.match(phone.slice(0, 600), /\.digit-popup-wrapper\.digit-idle-warning-popup \{[\s\S]*?height: auto !important;/, "same card sizing as the logout confirm");
  assert.match(css, /\.digit-idle-warning-popup \.digit-button-secondary \.digit-button-label \{\s*color: var\(--color-button-secondary-text/);
  const c = fs.readFileSync(path.join(ROOT, "packages/modules/core/src/components/IdleLogout.js"), "utf8");
  assert.match(c, /className="digit-idle-warning-popup"/);
});

test("both login pages say why the user was signed out, through the one shared notice", () => {
  const notice = fs.readFileSync(path.join(ROOT, "packages/modules/core/src/components/SignedOutNotice.js"), "utf8");
  assert.match(notice, /readLoginRedirect\(/);
  for (const key of ["CORE_SIGNED_OUT_IDLE", "CORE_SIGNED_OUT_EXPIRED", "CORE_SIGNED_OUT_OTHER_TAB"]) assert.match(notice, new RegExp(key));
  for (const f of ["packages/modules/core/src/pages/employee/Login/login.js", "packages/modules/core/src/pages/citizen/Login/SelectMobileNumber.js"]) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.match(src, /import SignedOutNotice from "\.\.\/\.\.\/\.\.\/components\/SignedOutNotice"/, f);
    assert.match(src, /<SignedOutNotice \/>/, f);
    assert.doesNotMatch(src, /CORE_SIGNED_OUT_IDLE/, `${f} has no copy of its own`);
  }
});
