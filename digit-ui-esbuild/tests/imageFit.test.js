import test from "node:test";
import assert from "node:assert/strict";
import { fitImageForUpload, isImageFile, IMAGE_PICK_LIMIT_BYTES, IMAGE_UPLOAD_LIMIT_BYTES } from "../products/pgr/src/utils/imageFit.js";

// The canvas path needs a browser; these pin the contract around it: what is
// an image, what passes through untouched, and the two limits the uploader
// relies on (#67).
test("limits: pick up to 10 MB, upload ceiling 2 MB", () => {
  assert.equal(IMAGE_PICK_LIMIT_BYTES, 10 * 1024 * 1024);
  assert.equal(IMAGE_UPLOAD_LIMIT_BYTES, 2 * 1024 * 1024);
});

test("isImageFile keys on the MIME type, case-insensitively", () => {
  assert.equal(isImageFile(new File(["x"], "a.jpg", { type: "image/jpeg" })), true);
  assert.equal(isImageFile(new File(["x"], "a.JPG", { type: "IMAGE/JPEG" })), true);
  assert.equal(isImageFile(new File(["x"], "a.pdf", { type: "application/pdf" })), false);
  assert.equal(isImageFile(null), false);
});

test("a non-image or an image already under the ceiling is returned as-is", async () => {
  const pdf = new File([new Uint8Array(3 * 1024 * 1024)], "a.pdf", { type: "application/pdf" });
  assert.equal(await fitImageForUpload(pdf), pdf);
  const small = new File([new Uint8Array(1024)], "a.png", { type: "image/png" });
  assert.equal(await fitImageForUpload(small), small);
});

test("an oversized image that cannot be decoded here comes back untouched for the size check", async () => {
  // Node has no Image/canvas: loadImage rejects (ReferenceError) and the file passes through.
  const big = new File([new Uint8Array(IMAGE_UPLOAD_LIMIT_BYTES + 1)], "a.jpg", { type: "image/jpeg" });
  assert.equal(await fitImageForUpload(big), big);
});
