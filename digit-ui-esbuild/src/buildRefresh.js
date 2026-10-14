// Keeps open tabs on the build the server is serving, and drops what an older
// build cached in this browser.
//
// esbuild.build.js fingerprints every production build: the id goes into
// <meta name="digit-build-id"> in each HTML shell and into build-info.json next
// to them. Where nginx serves the shell `no-cache` (compose, Ansible), a page
// LOAD gets the deployed build — but nothing reloads a tab that is already open
// (the inbox stays open all day), and cached data outlives a deploy until its
// TTL runs out. So:
//  - the first load of a new build drops the localisation bundles (localStorage,
//    per browser) and the tab's session caches (per tab) before the app reads
//    them. MDMS in IndexedDB is tagged with the build that wrote it instead
//    (idbCache.js), because a tab still on the old build keeps writing there;
//  - an open tab re-reads build-info.json on load, when it comes back to the
//    foreground and every few minutes. A different id right after load means
//    the page itself came from a stale cache, so it reloads at once. Later on
//    it waits until the user next opens a hub screen (home, inbox, complaint
//    list or details), which render from the URL and the server alone. It
//    never reloads in the middle of a flow: login → OTP keeps the phone number
//    in memory, and the create / reopen flows end on a response page that
//    reads the result from memory.
// Dev builds carry no meta tag, so none of this runs there.

const LAST_BUILD_KEY = "Digit.lastBuildId"; // localStorage: the build that wrote the shared caches
const TAB_BUILD_KEY = "Digit.tabBuildId"; // sessionStorage: the build that wrote this tab's caches
const RELOAD_GUARD_KEY = "Digit.buildReloadAt";
// Localization/service.js caches each bundle under "Locale.*", and Storage.js
// prefixes every key with "Digit.".
const LOCALE_CACHE_PREFIX = "Digit.Locale.";
// useServiceDefs.js: the "serviceDefs" session cache must be cleared on deploy.
const SESSION_CACHES = ["Digit.serviceDefs"];

const CHECK_EVERY_MS = 5 * 60 * 1000;
const RECHECK_ON_FOCUS_AFTER_MS = 60 * 1000;
const BOOT_RELOAD_WINDOW_MS = 5000;
const RETRY_RELOAD_AFTER_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10 * 1000;
const ROUTE_POLL_MS = 400;

const HUB_SCREENS = [
  /\/(citizen|employee|landing|privacy-policy)$/,
  /\/citizen\/([a-z]+-home|all-services)$/,
  /\/citizen\/pgr\/complaints(\/.+)?$/,
  /\/employee\/pgr\/(inbox[^/]*|complaint-details\/.+|admin-search)$/,
  /\/employee\/dashboard(\/.*)?$/,
];

export const readBuildId = (doc) =>
  doc?.querySelector?.('meta[name="digit-build-id"]')?.getAttribute("content") || null;

// Same prefix rule as the analytics bootstrap in public/index.html: the file
// sits in the docroot this page was served from (/digit-ui or a test entrance).
export const buildInfoUrl = (pathname) => {
  const seg = /^\/(digit-ui[^/?#]*)/.exec(pathname || "");
  return `/${seg ? seg[1] : "digit-ui"}/build-info.json`;
};

export const isHubScreen = (pathname) => {
  const path = (pathname || "").replace(/\/+$/, "");
  return HUB_SCREENS.some((screen) => screen.test(path));
};

const forgetOtherBuild = (store, markerKey, buildId, isCache) => {
  try {
    if (!store || store.getItem(markerKey) === buildId) return;
    const stale = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key && isCache(key)) stale.push(key);
    }
    stale.forEach((key) => store.removeItem(key));
    store.setItem(markerKey, buildId);
  } catch (e) {
    /* storage blocked: nothing can have been cached in it either */
  }
};

export const dropCachesFromOtherBuild = ({ buildId, local, session }) => {
  if (!buildId) return;
  forgetOtherBuild(local, LAST_BUILD_KEY, buildId, (key) => key.startsWith(LOCALE_CACHE_PREFIX));
  forgetOtherBuild(session, TAB_BUILD_KEY, buildId, (key) => SESSION_CACHES.includes(key));
};

const fetchLatestBuildId = async (win, url, stamp) => {
  // A request that never answers must not keep the watcher waiting for good.
  const controller = typeof win.AbortController === "function" ? new win.AbortController() : null;
  const timer = controller && win.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // no-store plus a one-off query: neither the browser nor a proxy may answer
    // from a cache. same-origin, not omit: the password-protected test entrance
    // needs the browser's Basic credentials.
    const res = await win.fetch(`${url}?t=${stamp}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller ? controller.signal : undefined,
    });
    const type = (res.headers && res.headers.get("content-type")) || "";
    // A docroot without the file answers with the SPA shell (200 text/html).
    if (!res.ok || type.indexOf("json") === -1) return null;
    const info = await res.json();
    return typeof info?.buildId === "string" && info.buildId ? info.buildId : null;
  } catch (e) {
    return null; // offline, timed out or mid-deploy: the next check tries again
  } finally {
    if (timer) win.clearTimeout(timer);
  }
};

// At most one automatic reload per tab in RETRY_RELOAD_AFTER_MS, whatever the
// target: if the reload still lands on another build's shell (a caching proxy,
// a deploy still copying files, old and new pods answering in turn during a
// rolling update), the tab must not loop.
const claimReload = (win, at) => {
  try {
    const session = win.sessionStorage;
    const last = session.getItem(RELOAD_GUARD_KEY);
    if (last !== null && at - Number(last) < RETRY_RELOAD_AFTER_MS) return false;
    session.setItem(RELOAD_GUARD_KEY, String(at));
    return true;
  } catch (e) {
    return false; // without sessionStorage a loop could not be stopped, so never reload
  }
};

// reloadWhenFound: for a page with no flows to interrupt (the public dashboard),
// load a new build as soon as it is found instead of waiting for a hub screen.
export const startBuildWatcher = ({ buildId, win = window, now = () => Date.now(), reloadWhenFound = false }) => {
  if (!buildId || typeof win.fetch !== "function") return;
  const doc = win.document;
  const startedAt = now();
  const infoUrl = buildInfoUrl(win.location.pathname);
  let newBuildFound = false;
  let pathWhenFound = null;
  let lastCheckAt = 0;
  let checking = false;

  const reload = () => {
    if (!claimReload(win, now())) return false;
    win.location.reload();
    return true;
  };

  const check = async () => {
    if (checking) return;
    checking = true;
    lastCheckAt = now();
    const latest = await fetchLatestBuildId(win, infoUrl, lastCheckAt);
    checking = false;
    if (!latest || latest === buildId) {
      newBuildFound = false;
      return;
    }
    if ((reloadWhenFound || now() - startedAt < BOOT_RELOAD_WINDOW_MS) && reload()) return;
    if (!newBuildFound) {
      newBuildFound = true;
      pathWhenFound = win.location.pathname;
    }
  };

  win.setInterval(() => {
    if (!newBuildFound) return;
    const path = win.location.pathname;
    if (path === pathWhenFound) return;
    pathWhenFound = path;
    if (isHubScreen(path)) reload();
  }, ROUTE_POLL_MS);
  win.setInterval(() => {
    if (doc.visibilityState !== "hidden") check();
  }, CHECK_EVERY_MS);
  doc.addEventListener("visibilitychange", () => {
    if (doc.visibilityState === "visible" && now() - lastCheckAt >= RECHECK_ON_FOCUS_AFTER_MS) check();
  });
  win.addEventListener("pageshow", (event) => {
    if (event && event.persisted) check(); // restored from the back/forward cache
  });
  check();
};
