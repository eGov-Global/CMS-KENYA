// Landing page layouts: the editorial layout (Bomet) swaps in its own section
// components and leaves every other type on the classic ones; an unknown
// layout name from MDMS is ignored rather than blanking the page.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");

const SRC = path.resolve(__dirname, "../products/pgr/src/pages/citizen/Landing/config/sectionRegistry.tsx");
// The component tree pulls in the v2 component library only for `cn`; the
// stub keeps the bundle free of its CSS and DOM-only modules.
const STUB = path.resolve(__dirname, "fixtures/cn-stub.js");
const { outputFiles } = esbuild.buildSync({
  entryPoints: [SRC],
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node",
  target: "es2018",
  jsx: "automatic",
  alias: { "@egovernments/digit-ui-components-v2": STUB },
  loader: { ".webp": "empty", ".jpg": "empty", ".png": "empty", ".svg": "empty" },
});
const mod = { exports: {} };
vm.runInNewContext(outputFiles[0].text, { module: mod, exports: mod.exports, require, process, console, window: undefined, document: undefined });
const { getEntry, isLandingLayout, LANDING_LAYOUTS, SECTION_REGISTRY } = mod.exports;

const RESTYLED = ["hero", "types", "steps", "channels", "helplines", "privacy", "institutions", "footer"];
const SHARED = ["navigation", "news", "cta"];

test("the layout catalogue is classic + editorial, and names are validated", () => {
  assert.deepEqual([...LANDING_LAYOUTS], ["classic", "editorial"]);
  assert.equal(isLandingLayout("editorial"), true);
  assert.equal(isLandingLayout("classic"), true);
  assert.equal(isLandingLayout("brutalist"), false);
  assert.equal(isLandingLayout(undefined), false);
});

test("classic resolves straight to the registry", () => {
  for (const type of Object.keys(SECTION_REGISTRY)) {
    assert.strictEqual(getEntry(type), SECTION_REGISTRY[type], type);
    assert.strictEqual(getEntry(type, "classic"), SECTION_REGISTRY[type], type);
  }
  assert.equal(getEntry("unknown", "editorial"), undefined);
  assert.equal(getEntry(undefined, "editorial"), undefined);
});

test("editorial restyles its sections in the same slot and keeps the rest", () => {
  for (const type of RESTYLED) {
    const classic = SECTION_REGISTRY[type];
    const editorial = getEntry(type, "editorial");
    assert.ok(editorial, type);
    assert.notStrictEqual(editorial.Component, classic.Component, `${type} should have its own component`);
    assert.equal(editorial.slot, classic.slot, `${type} slot`);
  }
  for (const type of SHARED) assert.strictEqual(getEntry(type, "editorial"), SECTION_REGISTRY[type], type);
});

test("editorial entries adapt the same config rows and media as classic", () => {
  const ctx = { routes: { REGISTER_COMPLAINT: "/r", HOME: "/" }, news: [], heroImageUrl: "/hero.webp", heroImageSmallUrl: "/hero-sm.webp", footerLogoUrl: "/logo.jpg", emblemUrl: "/crest.jpg" };
  const hero = getEntry("hero", "editorial").buildProps({ code: "hero", type: "hero" }, ctx);
  assert.equal(hero.imageUrl, "/hero.webp");
  assert.equal(hero.imageSmallUrl, "/hero-sm.webp");
  const configured = getEntry("hero", "editorial").buildProps({ code: "hero", type: "hero", media: { imageId: "https://x.test/a.jpg" } }, ctx);
  assert.equal(configured.imageUrl, "https://x.test/a.jpg");
  assert.equal(configured.imageSmallUrl, undefined, "a configured photo has no sibling cut");
  const types = getEntry("types", "editorial").buildProps({ code: "types", type: "types", items: [{ code: "HealthServices", enabled: true }] }, ctx);
  assert.equal(types.section.items.length, 1);
  assert.equal(types.section.items[0].id, "HealthServices");
  const footer = getEntry("footer", "editorial").buildProps({ code: "footer", type: "footer" }, ctx);
  assert.equal(footer.logoUrl, "/logo.jpg");
  assert.equal(footer.emblemUrl, "/crest.jpg");
});
