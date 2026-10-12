// Landing page, top of the page: the language menu options, the active
// language, the strip's phone text and the slogan band's bold word.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");

const SRC = path.resolve(__dirname, "../products/pgr/src/pages/citizen/Landing/topOfPage.ts");
const { outputFiles } = esbuild.buildSync({ entryPoints: [SRC], bundle: true, write: false, format: "cjs", platform: "node", target: "es2018" });
const mod = { exports: {} };
vm.runInNewContext(outputFiles[0].text, { module: mod, exports: mod.exports });
const { languageOptions, pickLanguage, phoneDisplay, splitEmphasis } = mod.exports;

const plain = (v) => JSON.parse(JSON.stringify(v));

test("StateInfo languages become one option per locale, labelled by language", () => {
  assert.deepStrictEqual(plain(languageOptions([{ label: "ENGLISH", value: "en_IN" }, { label: "KISWAHILI", value: "sw_KE" }])), [
    { code: "en_IN", label: "EN" },
    { code: "sw_KE", label: "SW" },
  ]);
});

test("two locales of one language keep their region in the label", () => {
  assert.deepStrictEqual(plain(languageOptions([{ value: "en_IN" }, { value: "en_KE" }, { value: "sw_KE" }])).map((o) => o.label), ["EN-IN", "EN-KE", "SW"]);
});

test("missing or empty StateInfo languages give no options", () => {
  assert.strictEqual(languageOptions(undefined).length, 0);
  assert.strictEqual(languageOptions([null, {}, { value: "" }]).length, 0);
});

test("the active option is the exact locale, else the same language, else the first", () => {
  const opts = languageOptions([{ value: "en_IN" }, { value: "en_KE" }, { value: "sw_KE" }]);
  assert.strictEqual(pickLanguage(opts, "en_KE").code, "en_KE");
  assert.strictEqual(pickLanguage(opts, "EN_KE").code, "en_KE");
  assert.strictEqual(pickLanguage(opts, "sw").code, "sw_KE");
  assert.strictEqual(pickLanguage(opts, "en_US").code, "en_IN");
  assert.strictEqual(pickLanguage(opts, "pt_MZ").code, "en_IN");
  assert.strictEqual(pickLanguage(opts, undefined).code, "en_IN");
  assert.strictEqual(pickLanguage([], "en_IN"), undefined);
});

test("the phone text matches the number the link dials", () => {
  const contact = { hotline: "+254725624489", hotlineDisplay: "+254 725 624 489" };
  assert.strictEqual(phoneDisplay("tel:+254725624489", contact), "+254 725 624 489");
  assert.strictEqual(phoneDisplay("tel:+254730047047", contact), "+254730047047");
});

test("the band's bold word is found case-insensitively, in any position", () => {
  assert.deepStrictEqual(plain(splitEmphasis("Let's Make Nairobi Work", "Nairobi")), ["Let's Make ", "Nairobi", " Work"]);
  assert.deepStrictEqual(plain(splitEmphasis("Tufanye NAIROBI Ifanye Kazi", "nairobi")), ["Tufanye ", "NAIROBI", " Ifanye Kazi"]);
  assert.deepStrictEqual(plain(splitEmphasis("Nairobi first", "Nairobi")), ["", "Nairobi", " first"]);
});

test("no bold word when it is absent or not configured", () => {
  assert.strictEqual(splitEmphasis("Let's Make Bomet Work", "Nairobi"), null);
  assert.strictEqual(splitEmphasis("Let's Make Nairobi Work", ""), null);
  assert.strictEqual(splitEmphasis("", "Nairobi"), null);
});
