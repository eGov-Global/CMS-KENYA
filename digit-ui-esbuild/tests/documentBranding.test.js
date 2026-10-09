import test from "node:test";
import assert from "node:assert/strict";
import { APP_TITLE_KEY, applyDocumentBranding, resolveDocumentBranding } from "../packages/modules/core/src/utils/documentBranding.js";

const fakeDoc = ({ title = "DIGIT", icon = "/digit-ui/brand/digit-logo.png" } = {}) => {
  const link = icon === null ? null : { attrs: { rel: "icon", href: icon }, getAttribute(k) { return this.attrs[k]; }, setAttribute(k, v) { this.attrs[k] = v; } };
  const head = { children: [], appendChild(el) { this.children.push(el); } };
  return {
    title, head, link,
    querySelector(sel) { return sel === 'link[rel="icon"]' ? this.link : null; },
    createElement() { const el = { attrs: {}, getAttribute(k) { return this.attrs[k]; }, setAttribute(k, v) { this.attrs[k] = v; } }; this.link = el; return el; },
  };
};
const tFor = (map) => (k) => (k in map ? map[k] : k);

test("seeded title and StateInfo logo replace the neutral defaults", () => {
  const b = resolveDocumentBranding({ t: tFor({ [APP_TITLE_KEY]: "Bomet Feedback Hub" }), stateInfo: { logoUrl: "https://bgrm.bomet.go.ke/static-assets/bomet-logo-round.png" } });
  assert.deepEqual(b, { title: "Bomet Feedback Hub", iconUrl: "https://bgrm.bomet.go.ke/static-assets/bomet-logo-round.png" });
  const d = fakeDoc(); applyDocumentBranding(d, b);
  assert.equal(d.title, "Bomet Feedback Hub"); assert.equal(d.link.getAttribute("href"), b.iconUrl);
});

test("unseeded key: the raw key never becomes the tab title", () => {
  const b = resolveDocumentBranding({ t: tFor({}), stateInfo: { logoUrl: "/digit-ui/nairobi-emblem.png" } });
  assert.equal(b.title, undefined); assert.equal(b.iconUrl, "/digit-ui/nairobi-emblem.png");
  const d = fakeDoc(); applyDocumentBranding(d, b);
  assert.equal(d.title, "DIGIT", "static title kept"); assert.equal(d.link.getAttribute("href"), "/digit-ui/nairobi-emblem.png");
});

test("blank or missing StateInfo logo keeps the bundled icon", () => {
  for (const stateInfo of [undefined, {}, { logoUrl: "" }, { logoUrl: "   " }]) {
    const d = fakeDoc(); applyDocumentBranding(d, resolveDocumentBranding({ t: tFor({ [APP_TITLE_KEY]: "Bonga Nai" }), stateInfo }));
    assert.equal(d.link.getAttribute("href"), "/digit-ui/brand/digit-logo.png"); assert.equal(d.title, "Bonga Nai");
  }
});

test("a page without an icon link gets one created", () => {
  const d = fakeDoc({ icon: null }); applyDocumentBranding(d, { iconUrl: "/x.png" });
  assert.equal(d.head.children.length, 1); assert.equal(d.link.getAttribute("href"), "/x.png");
});

test("whitespace around the seeded title is trimmed; an empty message is ignored", () => {
  assert.equal(resolveDocumentBranding({ t: tFor({ [APP_TITLE_KEY]: "  Bonga Nai " }) }).title, "Bonga Nai");
  assert.equal(resolveDocumentBranding({ t: tFor({ [APP_TITLE_KEY]: "   " }) }).title, undefined);
  assert.equal(resolveDocumentBranding({}).title, undefined);
});

test("idempotent: applying the same branding twice writes nothing new", () => {
  const d = fakeDoc(); const b = { title: "Bonga Nai", iconUrl: "/digit-ui/nairobi-emblem.png" };
  applyDocumentBranding(d, b); const before = JSON.stringify(d.link.attrs); applyDocumentBranding(d, b);
  assert.equal(JSON.stringify(d.link.attrs), before); assert.equal(d.head.children.length, 0);
});
