/** Media plumbing for the Builder (P4, CCSD-2009).
 *
 * Reuses the platform document-management flow only: uploads go through the
 * existing filestore endpoints via DigitApiClient (never a separate storage),
 * previews resolve through filestoreGetUrl. "Recent assets" is a
 * Builder-local convenience list (localStorage) — the filestore has no
 * listing API.
 *
 * An upload is stored by its public path (/file-store/.../pgr-landing/...),
 * which the published page shows before login. The rest of the file store
 * needs a login (VAPT #223), so a bare file-store id saved before that change
 * no longer renders on the public page; re-select the picture to fix it.
 */
import { digitClient } from '@/providers/bridge';

const RECENTS_KEY = 'pgrl-builder-recent-media';
const MAX_RECENTS = 24;

export interface MediaAsset {
  fileStoreId?: string;
  url?: string;       // resolved (signed) or user-pasted URL
  publicPath?: string; // anonymous path of an upload (see publicLandingPath)
  name: string;
  uploadedAt: number;
}

/** Folder (file-store module) landing pictures are uploaded to. It is the only
 *  part of the bucket anyone can read without logging in (minio-init policy,
 *  VAPT #223); every other file needs a login and a signed link. */
export const LANDING_MODULE = 'pgr-landing';

/** The stable, anonymous path of an uploaded landing picture, taken from the
 *  signed link the file store returns: the host and the signature are
 *  dropped, leaving /file-store/<bucket>/<tenant>/pgr-landing/<...>. Returns
 *  undefined for anything outside that public folder, so a private file can
 *  never be stored as if it were public. */
export function publicLandingPath(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const { pathname } = new URL(url, 'http://localhost');
    return new RegExp(`^/file-store/[^/]+/[^/]+/${LANDING_MODULE}/[^?#]+$`).test(pathname) ? pathname : undefined;
  } catch {
    return undefined;
  }
}

/** What the page config stores for a picture: the public path when there is
 *  one (renders before login), else the pasted URL or the file-store id. */
export const storedImageValue = (a: MediaAsset): string | undefined =>
  a.publicPath ?? publicLandingPath(a.url) ?? a.fileStoreId ?? a.url;

export function getRecents(): MediaAsset[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addRecent(asset: MediaAsset): void {
  const next = [asset, ...getRecents().filter((a) =>
    (asset.fileStoreId ? a.fileStoreId !== asset.fileStoreId : a.url !== asset.url))]
    .slice(0, MAX_RECENTS);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* quota — recents are a convenience only */
  }
}

export const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP' };
export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
export const IMAGE_RULES = 'JPG, PNG or WebP, up to 1.5 MB (about 1600 px wide is enough).';

/** Why a file cannot be used as a landing picture, or null when it can.
 *  Residents open the page on low-end phones over poor networks, so size is
 *  capped; SVG and other types are refused (an SVG can carry scripts). */
export function imageFileProblem(file: { type?: string; size?: number; name?: string }): string | null {
  if (!IMAGE_TYPES[file.type ?? '']) return `${file.name ?? 'This file'} is not a JPG, PNG or WebP picture.`;
  if ((file.size ?? 0) > MAX_IMAGE_BYTES) return `${file.name ?? 'This file'} is ${((file.size ?? 0) / 1024 / 1024).toFixed(1)} MB; the limit is 1.5 MB.`;
  return null;
}

export async function uploadImage(tenantId: string, file: File): Promise<MediaAsset> {
  const problem = imageFileProblem(file);
  if (problem) throw new Error(problem);
  const buf = new Uint8Array(await file.arrayBuffer());
  const fileStoreId = await digitClient.filestoreUpload(
    tenantId,
    LANDING_MODULE,
    file.name,
    buf,
    file.type || 'image/*',
  );
  const url = await resolveUrl(tenantId, fileStoreId);
  const asset: MediaAsset = { fileStoreId, url, publicPath: publicLandingPath(url), name: file.name, uploadedAt: Date.now() };
  addRecent(asset);
  return asset;
}

export async function resolveUrl(tenantId: string, fileStoreId: string): Promise<string | undefined> {
  try {
    const rows = await digitClient.filestoreGetUrl(tenantId, [fileStoreId]);
    const row = rows.find((r) => (r as { id?: string }).id === fileStoreId) ?? rows[0];
    const url = (row as { url?: string })?.url;
    // Some gateways return a comma-separated list of size variants.
    return typeof url === 'string' ? url.split(',')[0] : undefined;
  } catch {
    return undefined;
  }
}

export const isUrl = (v?: string): boolean => !!v && (/^https?:\/\//i.test(v) || v.startsWith('/'));
