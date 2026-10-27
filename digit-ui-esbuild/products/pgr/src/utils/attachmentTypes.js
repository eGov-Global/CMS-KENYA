// What a citizen may attach to a complaint: photos, and the documents and
// videos the previous uploader took (CCSD-2082/2027). Kept apart from the
// picker so the rule is testable and the employee form can share it.
//
// filestore validates the extension AND the declared type against its
// ALLOWED_FORMATS_MAP, so a file is only offered when it carries both.
const IMAGE_TYPE = /^image\/(jpeg|png|jpg)$/i;
const IMAGE_EXT = /\.(jpe?g|png)$/i;
const FILE_EXT = /\.(pdf|docx?|xlsx?|mp4|mov|avi|mkv|webm)$/i;

/** The file input's accept list, in the order the hint names them. */
export const ACCEPT_ATTACHMENTS = "image/jpeg,image/png,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov,.avi,.mkv,.webm";

// The type to declare for a document or video a phone handed over with none:
// filestore rejects application/octet-stream for these extensions.
const MIME_BY_EXT = {
  pdf: "application/pdf",
  doc: "application/msword",
  // filestore's docx list takes msword (and Tika's own types), not the OOXML type.
  docx: "application/msword",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  webm: "video/webm",
};

/**
 * "image" for a JPG/PNG (by MIME type and extension, as the server checks
 * both), "file" for a document or video (by extension, since a phone often
 * reports no type for them), null for anything else.
 */
export function acceptedAttachmentKind(file) {
  const name = (file && file.name) || "";
  if (IMAGE_TYPE.test((file && file.type) || "") && IMAGE_EXT.test(name)) return "image";
  if (FILE_EXT.test(name)) return "file";
  return null;
}

/** The MIME type for an accepted document or video name, or "" when unknown. */
export function mimeForName(name) {
  const ext = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return (ext && MIME_BY_EXT[ext[1]]) || "";
}
