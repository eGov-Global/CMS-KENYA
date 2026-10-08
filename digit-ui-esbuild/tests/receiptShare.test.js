import test from "node:test";
import assert from "node:assert/strict";
import { shareReceipt, buildShareLinks, canShareFiles } from "../products/pgr/src/utils/receiptShare.js";

const err = (name) => Object.assign(new Error(name), { name });
const harness = (nav, { downloads = [] } = {}) => ({
  nav,
  makeFile: () => ({ name: "X.pdf", type: "application/pdf" }),
  download: () => downloads.push("X.pdf"),
  title: "Complaint Receipt",
  downloads,
});

test("device can share files: the PDF itself goes to the share sheet, title only, nothing downloaded", async () => {
  const calls = [];
  const h = harness({ canShare: (d) => !!d.files, share: async (d) => calls.push(d) });
  assert.equal(await shareReceipt(h), "file");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].files[0].type, "application/pdf");
  assert.equal(calls[0].title, "Complaint Receipt");
  assert.equal(calls[0].text, undefined);
  assert.equal(calls[0].url, undefined);
  assert.deepEqual(h.downloads, []);
});

test("share sheet without file support: the PDF is downloaded and no link is shared instead", async () => {
  const calls = [];
  const h = harness({ canShare: () => false, share: async (d) => calls.push(d) });
  assert.equal(await shareReceipt(h), "downloaded");
  assert.deepEqual(h.downloads, ["X.pdf"]);
  assert.equal(calls.length, 0);
});

test("share() exists but canShare does not (older browsers): download only", async () => {
  const calls = [];
  const h = harness({ share: async (d) => calls.push(d) });
  assert.equal(await shareReceipt(h), "downloaded");
  assert.deepEqual(h.downloads, ["X.pdf"]);
  assert.equal(calls.length, 0);
});

test("nothing available at all (desktop): download only", async () => {
  const h = harness(null);
  assert.equal(await shareReceipt(h), "downloaded");
  assert.deepEqual(h.downloads, ["X.pdf"]);
});

test("a dismissed FILE share rethrows: nothing was saved, so the caller shows no confirmation", async () => {
  const h = harness({ canShare: () => true, share: async () => { throw err("AbortError"); } });
  await assert.rejects(shareReceipt(h), { name: "AbortError" });
  assert.deepEqual(h.downloads, []);
});

test("a file share that fails for another reason falls back to the download", async () => {
  let n = 0;
  const h = harness({ canShare: () => true, share: async () => { n++; throw err("DataError"); } });
  assert.equal(await shareReceipt(h), "downloaded");
  assert.equal(n, 1);
  assert.deepEqual(h.downloads, ["X.pdf"]);
});

test("a repeat tap does not download a second copy", async () => {
  const h = harness(null);
  assert.equal(await shareReceipt({ ...h, alreadyDownloaded: true }), "downloaded");
  assert.deepEqual(h.downloads, []);
});

test("channel links open the app empty: subject only, no complaint number, no tracking link", () => {
  const l = buildShareLinks({ subject: "Complaint Receipt" });
  assert.equal(l.email, "mailto:?subject=Complaint%20Receipt");
  assert.equal(l.whatsapp, "https://wa.me/");
  assert.equal(l.sms, "sms:");
  for (const v of Object.values(buildShareLinks({ subject: "Receipt PG-PGR-2026-10-08-000001" }))) assert.doesNotMatch(v, /text=|body=|complaints\//);
  assert.equal(buildShareLinks({}).email, "mailto:?subject=");
});

test("canShareFiles: true only when share() and canShare() accept a PDF file", () => {
  const probe = () => ({ name: "receipt.pdf", type: "application/pdf" });
  assert.equal(canShareFiles(null, probe), false);
  assert.equal(canShareFiles({ share: async () => {} }, probe), false);
  assert.equal(canShareFiles({ share: async () => {}, canShare: () => false }, probe), false);
  assert.equal(canShareFiles({ share: async () => {}, canShare: (d) => !!d.files }, probe), true);
  assert.equal(canShareFiles({ share: async () => {}, canShare: () => { throw new Error("x"); } }, probe), false);
});
