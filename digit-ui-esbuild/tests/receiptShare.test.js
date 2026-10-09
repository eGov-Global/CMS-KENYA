import test from "node:test";
import assert from "node:assert/strict";
import { shareReceipt, buildShareLinks, buildReceiptShareText, canShareFiles } from "../products/pgr/src/utils/receiptShare.js";

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

test("a refused FILE share (NotAllowedError: user activation ran out, Safari / desktop Chrome) falls back to the download", async () => {
  const nav = { share: async () => { throw err("NotAllowedError"); }, canShare: () => true };
  const h = harness(nav);
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

test("channel links open the app with the summary prefilled: subject + body / text, URL-encoded", () => {
  const text = "Complaint Receipt — Bomet\nComplaint No.: BFH-2026-120\nStatus: Pending";
  const l = buildShareLinks({ subject: "Complaint Receipt BFH-2026-120", text });
  assert.equal(l.email, `mailto:?subject=${encodeURIComponent("Complaint Receipt BFH-2026-120")}&body=${encodeURIComponent(text)}`);
  assert.equal(l.whatsapp, `https://wa.me/?text=${encodeURIComponent(text)}`);
  assert.equal(l.sms, `sms:?&body=${encodeURIComponent(text)}`);
  assert.deepEqual(buildShareLinks({ subject: "Complaint Receipt" }), { email: "mailto:?subject=Complaint%20Receipt", whatsapp: "https://wa.me/", sms: "sms:" });
});

test("the share text lists the receipt rows as 'label: value', skips blanks, trims a long description", () => {
  const text = buildReceiptShareText({
    title: "Complaint Receipt", tenantName: "Bomet",
    rows: [{ label: "Complaint No.", value: "BFH-2026-120" }, { label: "Status", value: " Pending at last mile  employee " }, { label: "Landmark", value: "" }, { label: "Description", value: "x".repeat(400) }],
    helpline: "0700000000", helplineLabel: "Helpline",
  });
  const lines = text.split("\n");
  assert.equal(lines[0], "Complaint Receipt — Bomet");
  assert.equal(lines[1], "Complaint No.: BFH-2026-120");
  assert.equal(lines[2], "Status: Pending at last mile employee");
  assert.ok(!lines.some((l) => l.startsWith("Landmark")));
  assert.ok(lines[3].startsWith("Description: ") && lines[3].endsWith("…") && lines[3].length < 260);
  assert.equal(lines[4], "Helpline: 0700000000");
  assert.equal(buildReceiptShareText({ title: "", rows: [] }), "");
  const noisy = buildReceiptShareText({ title: "T", rows: [{ label: "Landmark", value: "NA" }, { label: "Ward", value: "Ward 7" }], helpline: "0000000000" });
  assert.equal(noisy, "T\nWard: Ward 7", "placeholder 'NA' rows and an all-zero helpline are left out");
});

test("a file share passes title and text along with the PDF", async () => {
  const seen = []; const nav = { share: async (d) => { seen.push(d); }, canShare: () => true };
  await shareReceipt({ ...harness(nav), text: "Complaint No.: X" });
  assert.equal(seen[0].title, "Complaint Receipt"); assert.equal(seen[0].text, "Complaint No.: X"); assert.equal(seen[0].files.length, 1);
});

test("canShareFiles: true only when share() and canShare() accept a PDF file", () => {
  const probe = () => ({ name: "receipt.pdf", type: "application/pdf" });
  assert.equal(canShareFiles(null, probe), false);
  assert.equal(canShareFiles({ share: async () => {} }, probe), false);
  assert.equal(canShareFiles({ share: async () => {}, canShare: () => false }, probe), false);
  assert.equal(canShareFiles({ share: async () => {}, canShare: (d) => !!d.files }, probe), true);
  assert.equal(canShareFiles({ share: async () => {}, canShare: () => { throw new Error("x"); } }, probe), false);
});
