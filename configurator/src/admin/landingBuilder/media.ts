/** Media plumbing for the Builder (P4, CCSD-2009).
 *
 * Reuses the platform document-management flow only: uploads go through the
 * existing filestore endpoints via DigitApiClient (never a separate storage),
 * previews resolve through filestoreGetUrl. "Recent assets" is a
 * Builder-local convenience list (localStorage) — the filestore has no
 * listing API.
 *
 * NOTE (honest scope): the P1 runtime passes through URL-valued
 * media.imageId and ignores bare filestore ids (signed-URL delivery is the
 * P2 media phase). Until P2 lands, an uploaded asset previews in the Builder
 * but the PUBLISHED page renders its built-in visual for that slot; a pasted
 * absolute URL renders everywhere today. The Media tab states this.
 */
import { digitClient } from '@/providers/bridge';

const RECENTS_KEY = 'pgrl-builder-recent-media';
const MAX_RECENTS = 24;

export interface MediaAsset {
  fileStoreId?: string;
  url?: string;       // resolved (signed) or user-pasted URL
  name: string;
  uploadedAt: number;
}

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
    'pgr-landing',
    file.name,
    buf,
    file.type || 'image/*',
  );
  const url = await resolveUrl(tenantId, fileStoreId);
  const asset: MediaAsset = { fileStoreId, url, name: file.name, uploadedAt: Date.now() };
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
