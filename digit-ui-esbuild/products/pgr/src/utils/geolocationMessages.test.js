// Unit tests for the geolocation toast copy resolver.
// Run from digit-ui-esbuild/:  node --test products/pgr/src/utils/geolocationMessages.test.js
//
// The bug these guard (#54) is invisible to a build and to a type check: the
// code was correct, the MESSAGE was missing, and t() answers with the key
// itself — so the failure only ever showed up as a raw constant on a citizen's
// screen. The load-bearing assertion in this file is therefore the negative
// one: no resolved label may ever equal its own key.
// Same node --test + esbuild-to-CJS idiom as workflowStates.test.js.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");
const esbuild = require("esbuild");

function bundle(entry) {
  const out = path.join(os.tmpdir(), `${path.basename(entry, ".js")}.cjs.${process.pid}.js`);
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, entry)],
    bundle: true,
    format: "cjs",
    platform: "neutral",
    outfile: out,
  });
  process.on("exit", () => {
    try {
      fs.unlinkSync(out);
    } catch (e) {
      /* already gone */
    }
  });
  return require(out);
}

const { trFallback, geolocationErrorLabel, KEY_BY_CODE, GEOLOCATION_FALLBACKS } = bundle("geolocationMessages.js");

// An unseeded key: i18next hands the key straight back.
const tUnseeded = (k) => k;
// A seeded locale: pretend every key resolves to real copy.
const tSeeded = (k) => `translated:${k}`;

test("unseeded key falls back to English copy, never the raw key", () => {
  const label = trFallback(tUnseeded, "CS_GEOLOCATION_ERROR", GEOLOCATION_FALLBACKS.CS_GEOLOCATION_ERROR);
  assert.equal(label, GEOLOCATION_FALLBACKS.CS_GEOLOCATION_ERROR);
  assert.notEqual(label, "CS_GEOLOCATION_ERROR");
});

test("seeded message wins over the fallback", () => {
  assert.equal(trFallback(tSeeded, "CS_GEOLOCATION_ERROR", "fallback"), "translated:CS_GEOLOCATION_ERROR");
});

test("each error code maps to its specific message", () => {
  assert.equal(geolocationErrorLabel(tUnseeded, 1), GEOLOCATION_FALLBACKS.CS_GEOLOCATION_PERMISSION_DENIED);
  assert.equal(geolocationErrorLabel(tUnseeded, 2), GEOLOCATION_FALLBACKS.CS_GEOLOCATION_UNAVAILABLE);
  assert.equal(geolocationErrorLabel(tUnseeded, 3), GEOLOCATION_FALLBACKS.CS_GEOLOCATION_TIMEOUT);
});

// The reported symptom: permission denied on a tenant with nothing seeded.
test("#54: denied permission never renders a raw key", () => {
  const label = geolocationErrorLabel(tUnseeded, 1);
  assert.doesNotMatch(label, /^CS_GEOLOCATION/);
  assert.match(label, /map/i); // always offers the manual way out
});

test("unknown, absent and malformed codes fall back to the generic message", () => {
  // NB "1" is deliberately NOT here: object keys are strings, so KEY_BY_CODE["1"]
  // legitimately resolves to the permission-denied message — a numeric-string
  // code from a non-conforming browser is handled, not malformed.
  for (const code of [undefined, null, 0, 99, {}]) {
    const label = geolocationErrorLabel(tUnseeded, code);
    assert.equal(label, GEOLOCATION_FALLBACKS.CS_GEOLOCATION_ERROR, `code ${String(code)}`);
    assert.doesNotMatch(label, /^CS_GEOLOCATION/);
  }
});

test("a non-function t does not throw", () => {
  assert.equal(geolocationErrorLabel(undefined, 1), GEOLOCATION_FALLBACKS.CS_GEOLOCATION_PERMISSION_DENIED);
});

// Guards the whole family at once, including CS_GEOLOCATION_NOT_SUPPORTED,
// which has no error code and so is not reachable via geolocationErrorLabel.
test("every declared fallback is real copy, not a key echo", () => {
  const keys = Object.keys(GEOLOCATION_FALLBACKS);
  assert.ok(keys.length >= 5, "expected all five geolocation messages");
  for (const k of keys) {
    const v = GEOLOCATION_FALLBACKS[k];
    assert.ok(typeof v === "string" && v.length > 20, `${k} needs a real sentence`);
    assert.notEqual(v, k);
    assert.doesNotMatch(v, /^CS_/);
  }
});

test("every code in KEY_BY_CODE has matching fallback copy", () => {
  for (const code of Object.keys(KEY_BY_CODE)) {
    const key = KEY_BY_CODE[code];
    assert.ok(GEOLOCATION_FALLBACKS[key], `${key} (code ${code}) has no fallback`);
  }
});

test("a numeric-string code resolves like its number (object keys are strings)", () => {
  assert.equal(geolocationErrorLabel(tUnseeded, "1"), GEOLOCATION_FALLBACKS.CS_GEOLOCATION_PERMISSION_DENIED);
});
