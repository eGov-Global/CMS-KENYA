/* eslint-disable @typescript-eslint/no-explicit-any */
// Complaint photos, as in the #2038 design: a sheet with "Take a photo" and
// "Choose from gallery" on a phone, a click-or-drop zone on desktop, and a
// list of what is attached with Remove.
//
// Uploads go to filestore the way ImageUploadHandler sends them
// ("property-upload", the complaint's tenant). Its 2 MB ceiling stays, but a
// phone camera's photo is usually over it, so larger images are scaled down
// in the browser first rather than refused.
//
// Besides photos, this tenant takes the documents and videos its previous
// uploader did (CCSD-2082/2027: PDF, DOC, XLS, MP4, MOV, AVI, MKV, WEBM, 5 MB
// each). Those go up as they are; only images are scaled.

import * as React from "react";
import { Button } from "@egovernments/digit-ui-components-v2";
import { useDialogFocus } from "./useDialogFocus";
import { trackEvent } from "../../../utils/analytics";
import { ACCEPT_ATTACHMENTS, acceptedAttachmentKind, mimeForName } from "../../../utils/attachmentTypes";

// filestore-scan-proxy rejections carry a stable code (as the previous
// uploader handled them): say what happened, and offer Retry only when a
// retry can succeed — re-sending an infected file just quarantines it again.
const SCAN_ERRORS: Record<string, { key: string; fallback: string; retryable: boolean }> = {
  VIRUS_DETECTED: { key: "CS_FILE_VIRUS_DETECTED", fallback: "This file failed a security scan. Please upload a different file.", retryable: false },
  FILE_NOT_SCANNABLE: {
    key: "CS_FILE_NOT_SCANNABLE",
    fallback: "This file could not be checked. Remove any password protection and try again.",
    retryable: false,
  },
  SCAN_UNAVAILABLE: { key: "CS_FILE_SCAN_UNAVAILABLE", fallback: "File upload is temporarily unavailable. Please try again later.", retryable: true },
};

declare const Digit: any;

export const MAX_PHOTOS = 5;
/** What a citizen may pick. Anything over the upload ceiling is scaled down. */
export const MAX_PICK_BYTES = 5 * 1024 * 1024;
/** filestore's ceiling for this module, as ImageUploadHandler enforces it. */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export interface PickedPhoto {
  id: string;
  name: string;
  size: number;
  /** Object URL of an image for its thumbnail; empty for a document or video. */
  previewUrl: string;
  kind: "image" | "file";
  status: "uploading" | "done" | "failed";
  fileStoreId?: string;
  /** Why the upload failed, in the citizen's words; absent for a plain network failure. */
  error?: string;
  /** false when retrying the same file cannot succeed (it failed the virus scan). */
  retryable?: boolean;
}


const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function loadImage(file: File): Promise<HTMLImageElement> {
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

/**
 * Fit a photo under the upload ceiling: longest side down to 1920px, then
 * JPEG quality down in steps. Files already under the ceiling pass through.
 */
async function fitForUpload(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES || acceptedAttachmentKind(file) !== "image") return file;
  const img = await loadImage(file);
  const scale = Math.min(1, 1920 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  // JPEG has no transparency: a transparent PNG (a screenshot) would come out
  // with a black background, so it is laid on white first.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.85, 0.75, 0.65, 0.55]) {
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= MAX_UPLOAD_BYTES) {
      const base = file.name.replace(/\.[^.]+$/, "") || "photo";
      return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
    }
  }
  return file;
}

const CameraGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);
const ImageGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
  </svg>
);
const RetryGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);
const UploadGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m17 8-5-5-5 5" />
    <path d="M12 3v12" />
  </svg>
);
// Stands in for the thumbnail of a document, a video, or a restored attachment.
const FileGlyph = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

interface PhotoPickerProps {
  photos: PickedPhoto[];
  onChange: (updater: (prev: PickedPhoto[]) => PickedPhoto[]) => void;
  tenantId: string;
  tr: (key: string, fallback: string) => string;
  /**
   * The picked files, by photo id, when the caller outlives this picker: a
   * wizard that unmounts the step while the photos stay in its state. Retry
   * then still has the file, and the previews are the caller's to revoke
   * (revokePreviews). Without it the picker keeps its own map and revokes
   * the previews when it unmounts.
   */
  fileStore?: Map<string, File>;
}

/** Releases the preview URLs of these photos; for a caller that owns the fileStore. */
export function revokePreviews(photos: PickedPhoto[]) {
  photos.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
}

export function PhotoPicker({ photos, onChange, tenantId, tr, fileStore }: PhotoPickerProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  // The picked files, kept so a failed upload can be retried.
  const ownFilesRef = React.useRef(new Map<string, File>());
  const filesRef = React.useRef(fileStore || ownFilesRef.current);
  // For revoking the previews when the picker goes away.
  const photosRef = React.useRef(photos);
  photosRef.current = photos;
  const full = photos.length >= MAX_PHOTOS;
  useDialogFocus(sheetOpen, sheetRef);

  React.useEffect(
    () => () => {
      if (!fileStore) revokePreviews(photosRef.current);
    },
    [fileStore]
  );

  React.useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const upload = React.useCallback(
    async (photo: PickedPhoto, file: File) => {
      try {
        // A phone often hands a document or video over with no type, which
        // filestore refuses; declare the one its extension implies.
        const typed = file.type ? file : new File([file], file.name, { type: mimeForName(file.name) });
        const ready = await fitForUpload(typed);
        const response = await Digit.UploadServices.Filestorage("property-upload", ready, tenantId);
        const fileStoreId = response?.data?.files?.[0]?.fileStoreId;
        if (!fileStoreId) throw new Error("no fileStoreId");
        trackEvent("pgr.file-complaint.photo.uploaded", { category: "pgr", label: ready === typed ? "original" : "scaled" });
        // Named as uploaded: a scaled photo went up as a .jpg.
        onChange((prev) =>
          prev.map((p) => (p.id === photo.id ? { ...p, status: "done", fileStoreId, size: ready.size, name: ready.name } : p))
        );
      } catch (err: any) {
        const status: number | undefined = err?.response?.status;
        const code = err?.response?.data?.Errors?.[0]?.code;
        const scan = code ? SCAN_ERRORS[code] : undefined;
        // Any other refusal (a format or content filestore won't take) is
        // final too: show its reason, and no Retry. Outages and lost
        // connections can be retried.
        const apiMessage: string | undefined = err?.response?.data?.Errors?.[0]?.message || err?.response?.data?.message;
        const refused = typeof status === "number" && status >= 400 && status < 500;
        // The code or status, never the file name, goes to analytics.
        trackEvent("pgr.file-complaint.photo.upload-failed", { category: "pgr", label: scan ? code : status ? `http-${status}` : "network" });
        onChange((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? {
                  ...p,
                  status: "failed",
                  error: scan ? tr(scan.key, scan.fallback) : refused ? apiMessage || tr("CS_PHOTO_REFUSED", "This file can't be attached.") : undefined,
                  retryable: scan ? scan.retryable : !refused,
                }
              : p
          )
        );
      }
    },
    [onChange, tenantId, tr]
  );

  const addFiles = (list: FileList | null) => {
    setNotice(null);
    const files = Array.from(list || []);
    const room = MAX_PHOTOS - photos.length;
    const accepted: File[] = [];
    for (const file of files) {
      if (!acceptedAttachmentKind(file)) {
        setNotice(tr("CS_PHOTO_TYPE", "That file type can't be attached. Use a JPG or PNG photo, a PDF, DOC or XLS document, or an MP4, MOV, AVI, MKV or WEBM video."));
        trackEvent("pgr.file-complaint.photo.rejected", { category: "pgr", label: "type" });
        continue;
      }
      if (file.size > MAX_PICK_BYTES) {
        setNotice(tr("CS_PHOTO_TOO_LARGE", "That file is over 5 MB. Choose a smaller one."));
        trackEvent("pgr.file-complaint.photo.rejected", { category: "pgr", label: "size" });
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length > room) {
      setNotice(tr("CS_PHOTO_LIMIT", `You can attach up to ${MAX_PHOTOS} files.`));
      trackEvent("pgr.file-complaint.photo.rejected", { category: "pgr", label: "limit" });
    }
    const picked = accepted.slice(0, Math.max(0, room)).map((file) => {
      const kind = acceptedAttachmentKind(file) || "file";
      return {
        file,
        photo: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          size: file.size,
          previewUrl: kind === "image" ? URL.createObjectURL(file) : "",
          kind,
          status: "uploading" as const,
        },
      };
    });
    if (picked.length === 0) return;
    onChange((prev) => [...prev, ...picked.map((p) => p.photo)]);
    picked.forEach(({ photo, file }) => {
      filesRef.current.set(photo.id, file);
      upload(photo, file);
    });
  };

  const retry = (photo: PickedPhoto) => {
    const file = filesRef.current.get(photo.id);
    if (!file) return;
    onChange((prev) => prev.map((p) => (p.id === photo.id ? { ...p, status: "uploading" } : p)));
    upload(photo, file);
  };

  const remove = (id: string) => {
    onChange((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone?.previewUrl) URL.revokeObjectURL(gone.previewUrl);
      filesRef.current.delete(id);
      return prev.filter((p) => p.id !== id);
    });
  };

  const onInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    // Picking the same file again must still fire change.
    event.target.value = "";
    setSheetOpen(false);
  };

  return (
    <div className="cms-photos">
      <input ref={cameraRef} type="file" accept="image/jpeg,image/png" capture="environment" hidden onChange={onInput} />
      <input ref={galleryRef} type="file" accept={ACCEPT_ATTACHMENTS} multiple hidden onChange={onInput} />

      {/* Phone: one button, then the choice of camera or gallery. */}
      <Button
        variant="outline"
        width="full"
        className="cms-photo-button"
        disabled={full}
        leading={<CameraGlyph />}
        onClick={() => setSheetOpen(true)}
        data-analytics-event="pgr.file-complaint.photo.open"
      >
        {tr("CS_PHOTO_ADD", "Add a photo or file")}
      </Button>

      {/* Desktop: click or drop. */}
      <div
        className={`cms-drop${dragging ? " dragging" : ""}${full ? " disabled" : ""}`}
        role="button"
        tabIndex={full ? -1 : 0}
        aria-disabled={full}
        data-analytics-event="pgr.file-complaint.photo.browse"
        onClick={() => !full && galleryRef.current?.click()}
        onKeyDown={(event) => {
          if (!full && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            galleryRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!full) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (full) return;
          // A drop is no click, so the shim cannot see it.
          trackEvent("pgr.file-complaint.photo.dropped", { category: "pgr", value: event.dataTransfer.files?.length || 0 });
          addFiles(event.dataTransfer.files);
        }}
      >
        <span className="cms-drop-icon">
          <UploadGlyph />
        </span>
        <span className="cms-drop-label">{tr("CS_PHOTO_DROP", "Click to upload or drag and drop a photo or file")}</span>
        <span className="cms-drop-hint">
          {tr("CS_PHOTO_RULES", "A photo helps us understand your concern better. JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, MP4, MOV, AVI, MKV or WEBM, up to 5 MB each")}
        </span>
      </div>

      {notice ? (
        <p className="cms-field-error" role="alert">
          {notice}
        </p>
      ) : null}

      {photos.length > 0 ? (
        <ul className="cms-photo-list">
          {photos.map((photo) => (
            <li key={photo.id} className="cms-photo-row">
              {photo.kind === "image" && photo.previewUrl ? (
                <img className="cms-photo-thumb" src={photo.previewUrl} alt="" />
              ) : (
                <span className="cms-photo-thumb" aria-hidden="true" style={{ display: "grid", placeItems: "center", color: "var(--cms-muted)" }}>
                  <FileGlyph />
                </span>
              )}
              <span className="cms-photo-meta">
                <span className="cms-photo-name" data-matomo-mask>
                  {photo.name}
                </span>
                <span className={`cms-photo-status ${photo.status}`}>
                  {photo.status === "uploading"
                    ? tr("CS_PHOTO_UPLOADING", "Uploading…")
                    : photo.status === "failed"
                    ? photo.error || tr("CS_PHOTO_FAILED", "Upload failed")
                    : photo.size
                    ? formatSize(photo.size)
                    : // A row restored from a draft: the file is long gone, only its id remains.
                      tr("CS_PHOTO_UPLOADED", "Uploaded")}
                </span>
              </span>
              {photo.status === "failed" && photo.retryable !== false ? (
                <button
                  type="button"
                  className="cms-link-button cms-retry"
                  onClick={() => retry(photo)}
                  data-analytics-event="pgr.file-complaint.photo.retry"
                >
                  <RetryGlyph />
                  {tr("CS_COMMON_RETRY", "Retry")}
                </button>
              ) : null}
              <button
                type="button"
                className="cms-link-button"
                onClick={() => remove(photo.id)}
                data-analytics-event="pgr.file-complaint.photo.remove"
              >
                {tr("CS_COMMON_REMOVE", "Remove")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {sheetOpen ? (
        <div className="cms-sheet-overlay" onMouseDown={(event) => event.target === event.currentTarget && setSheetOpen(false)}>
          <div ref={sheetRef} tabIndex={-1} className="cms-sheet cms-photo-sheet" role="dialog" aria-modal="true" aria-labelledby="cms-photo-title">
            <h2 id="cms-photo-title" className="cms-sheet-head">
              {tr("CS_PHOTO_SHEET_TITLE", "Add a photo or file")}
            </h2>
            <div className="cms-sheet-options">
              <button
                type="button"
                className="cms-sheet-option"
                onClick={() => cameraRef.current?.click()}
                data-analytics-event="pgr.file-complaint.photo.camera"
              >
                <CameraGlyph />
                {tr("CS_PHOTO_TAKE", "Take a photo")}
              </button>
              <button
                type="button"
                className="cms-sheet-option"
                onClick={() => galleryRef.current?.click()}
                data-analytics-event="pgr.file-complaint.photo.gallery"
              >
                <ImageGlyph />
                {tr("CS_PHOTO_GALLERY", "Choose a photo or file")}
              </button>
            </div>
            <Button
              variant="ghost"
              width="full"
              className="cms-sheet-cancel"
              onClick={() => setSheetOpen(false)}
              data-analytics-event="pgr.file-complaint.photo.cancel"
            >
              {tr("CS_COMMON_CANCEL", "Cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
