import test from "node:test";
import assert from "node:assert/strict";
import { shareReceipt } from "../products/pgr/src/utils/receiptShare.js";

const err = (name) => Object.assign(new Error(name), { name });
const harness = (nav, { downloads = [] } = {}) => ({
  nav,
  makeFile: () => ({ name: "X.pdf", type: "application/pdf" }),
  download: () => downloads.push("X.pdf"),
  title: "Complaint Receipt X",
  text: "Complaint X filed with Bomet. Track it here:",
  url: "https://example.test/digit-ui/citizen/pgr/complaints/X",
  downloads,
});

test("device can share files: the PDF itself goes to the share sheet with the link in the text, nothing downloaded", async () => {
  const calls = [];
  const h = harness({ canShare: (d) => !!d.files, share: async (d) => calls.push(d) });
  assert.equal(await shareReceipt(h), "file");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].files[0].type, "application/pdf");
  assert.match(calls[0].text, /complaints\/X$/);
  assert.deepEqual(h.downloads, []);
});

test("share sheet without file support: download first, then the link goes to the sheet", async () => {
  const calls = [];
  const h = harness({ canShare: () => false, share: async (d) => calls.push(d) });
  assert.equal(await shareReceipt(h), "downloaded-shared");
  assert.deepEqual(h.downloads, ["X.pdf"]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].files, undefined);
  assert.equal(calls[0].url, h.url);
});

test("share() exists but canShare does not (older browsers): skip the file attempt, download, share the link", async () => {
  const h = harness({ share: async () => {} });
  assert.equal(await shareReceipt(h), "downloaded-shared");
  assert.deepEqual(h.downloads, ["X.pdf"]);
});

test("link share dismissed after the download is not an error: the PDF is already saved", async () => {
  const h = harness({ canShare: () => false, share: async () => { throw err("AbortError"); } });
  assert.equal(await shareReceipt(h), "downloaded");
  assert.deepEqual(h.downloads, ["X.pdf"]);
});

test("any other link-share failure after the download also resolves to 'downloaded' (no false error)", async () => {
  const h = harness({ canShare: () => false, share: async () => { throw err("DataError"); } });
  assert.equal(await shareReceipt(h), "downloaded");
});

test("no share sheet (desktop): download, then copy the message to the clipboard", async () => {
  let copied = "";
  const h = harness({ clipboard: { writeText: async (s) => { copied = s; } } });
  assert.equal(await shareReceipt(h), "downloaded-copied");
  assert.deepEqual(h.downloads, ["X.pdf"]);
  assert.match(copied, /Track it here: https:\/\/example\.test/);
});

test("clipboard refused: still 'downloaded', never a thrown error", async () => {
  const h = harness({ clipboard: { writeText: async () => { throw err("NotAllowedError"); } } });
  assert.equal(await shareReceipt(h), "downloaded");
});

test("nothing available at all: download only", async () => {
  const h = harness(null);
  assert.equal(await shareReceipt(h), "downloaded");
  assert.deepEqual(h.downloads, ["X.pdf"]);
});

test("a dismissed FILE share rethrows: nothing was saved, so the caller shows no confirmation", async () => {
  const h = harness({ canShare: () => true, share: async () => { throw err("AbortError"); } });
  await assert.rejects(shareReceipt(h), { name: "AbortError" });
  assert.deepEqual(h.downloads, []);
});

test("a file share that fails for another reason falls back to the download path", async () => {
  let n = 0;
  const h = harness({ canShare: () => true, share: async (d) => { n++; if (d.files) throw err("DataError"); } });
  assert.equal(await shareReceipt(h), "downloaded-shared");
  assert.equal(n, 2);
  assert.deepEqual(h.downloads, ["X.pdf"]);
});

test("a repeat tap does not download a second copy", async () => {
  const h = harness({ clipboard: { writeText: async () => {} } });
  assert.equal(await shareReceipt({ ...h, alreadyDownloaded: true }), "downloaded-copied");
  assert.deepEqual(h.downloads, []);
});

test("share links carry the complaint text and tracking URL, encoded, for email / WhatsApp / SMS", async () => {
  const { buildShareLinks } = await import("../products/pgr/src/utils/receiptShare.js");
  const l = buildShareLinks({ subject: "Complaint Receipt X-1", text: "Complaint X-1 filed with Bomet. Track it here:", url: "https://h/digit-ui/citizen/pgr/complaints/X-1" });
  assert.ok(l.email.startsWith("mailto:?subject=Complaint%20Receipt%20X-1&body="));
  assert.match(decodeURIComponent(l.email.split("&body=")[1]), /^Complaint X-1 filed with Bomet\. Track it here:\nhttps:\/\/h\//);
  assert.equal(l.whatsapp, "https://wa.me/?text=" + encodeURIComponent("Complaint X-1 filed with Bomet. Track it here: https://h/digit-ui/citizen/pgr/complaints/X-1"));
  assert.ok(l.sms.startsWith("sms:?&body=Complaint%20X-1"));
  assert.equal(l.message, "Complaint X-1 filed with Bomet. Track it here: https://h/digit-ui/citizen/pgr/complaints/X-1");
  assert.equal(buildShareLinks({ subject: "S", text: "", url: "" }).message, "");
});
