// Shrinks an oversized photo before upload so a phone-camera JPEG (routinely
// 6–12 MB) can be attached without raising the filestore's ceiling (#67):
// longest side down to 1920 px, then JPEG quality down in steps until the
// result fits `limit`. Files already under the limit, non-images and anything
// that fails to decode come back untouched, so the caller's normal size check
// still applies. A transparent PNG is laid on white first — JPEG has no alpha
// and would paint it black.

/** What a user may pick: scaled down from here to the upload ceiling. */
export const IMAGE_PICK_LIMIT_BYTES = 10 * 1024 * 1024;
/** filestore's ceiling for an image in this module (ImageUploadHandler). */
export const IMAGE_UPLOAD_LIMIT_BYTES = 2 * 1024 * 1024;

export const isImageFile = (file) => !!file && (file.type || "").toLowerCase().startsWith("image/");

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export async function fitImageForUpload(file, limit = IMAGE_UPLOAD_LIMIT_BYTES) {
  if (!isImageFile(file) || file.size <= limit) return file;
  let img;
  try {
    img = await loadImage(file);
  } catch (e) {
    return file;
  }
  const scale = Math.min(1, 1920 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.85, 0.75, 0.65, 0.55]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= limit) {
      const base = file.name.replace(/\.[^.]+$/, "") || "photo";
      return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
    }
  }
  return file;
}
