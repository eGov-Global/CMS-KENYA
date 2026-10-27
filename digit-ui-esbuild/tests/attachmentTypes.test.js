const test = require("node:test");
const assert = require("node:assert/strict");
const { acceptedAttachmentKind, mimeForName, ACCEPT_ATTACHMENTS } = require("../products/pgr/src/utils/attachmentTypes.js");

test("photos need an image type and a jpg/png name, as filestore checks both", () => {
  assert.equal(acceptedAttachmentKind({ name: "IMG_0001.jpg", type: "image/jpeg" }), "image");
  assert.equal(acceptedAttachmentKind({ name: "shot.PNG", type: "image/png" }), "image");
  assert.equal(acceptedAttachmentKind({ name: "IMG_0001", type: "image/jpeg" }), null, "no extension");
  assert.equal(acceptedAttachmentKind({ name: "anim.gif", type: "image/gif" }), null);
  assert.equal(acceptedAttachmentKind({ name: "fake.png", type: "application/pdf" }), null, "name says image, type does not");
});

test("documents and videos are files by extension, even with no type", () => {
  for (const name of ["letter.pdf", "report.DOC", "notes.docx", "sheet.xls", "sheet.xlsx", "clip.mp4", "clip.MOV", "clip.avi", "clip.mkv", "clip.webm"]) {
    assert.equal(acceptedAttachmentKind({ name, type: "" }), "file", name);
  }
});

test("anything else is refused", () => {
  assert.equal(acceptedAttachmentKind({ name: "setup.exe", type: "application/octet-stream" }), null);
  assert.equal(acceptedAttachmentKind({ name: "notes.txt", type: "text/plain" }), null);
  assert.equal(acceptedAttachmentKind({ name: "page.html", type: "text/html" }), null);
  assert.equal(acceptedAttachmentKind({ name: "", type: "" }), null);
  assert.equal(acceptedAttachmentKind(null), null);
});

test("the accept list names every accepted extension and nothing more", () => {
  const listed = ACCEPT_ATTACHMENTS.split(",").filter((x) => x.startsWith("."));
  for (const ext of listed) assert.equal(acceptedAttachmentKind({ name: `x${ext}`, type: "" }), "file", ext);
  assert.ok(ACCEPT_ATTACHMENTS.includes("image/jpeg") && ACCEPT_ATTACHMENTS.includes("image/png"));
});

test("a typeless document or video gets the type its extension implies", () => {
  assert.equal(mimeForName("letter.PDF"), "application/pdf");
  assert.equal(mimeForName("clip.mov"), "video/quicktime");
  assert.equal(mimeForName("sheet.xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(mimeForName("memo.docx"), "application/msword", "what filestore's docx allowlist takes");
  assert.equal(mimeForName("photo.jpg"), "", "images always come with a type");
  assert.equal(mimeForName("noext"), "");
});
