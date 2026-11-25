import { describe, expect, it, vi } from 'vitest';

vi.mock('@/providers/bridge', () => ({ digitClient: {} }));

describe('public landing path (VAPT #223)', async () => {
  const { publicLandingPath, storedImageValue } = await import('./media');
  const signed = 'https://bgrm.example.go.ke/file-store/egov-rainmaker/bo/pgr-landing/November/23/1794xyz.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc';

  it('keeps only the path of a pgr-landing upload, dropping host and signature', () => {
    expect(publicLandingPath(signed)).toBe('/file-store/egov-rainmaker/bo/pgr-landing/November/23/1794xyz.png');
  });
  it('refuses anything outside the public folder', () => {
    expect(publicLandingPath('https://h/file-store/egov-rainmaker/bo/PGR/November/23/photo.jpg?X-Amz-Signature=a')).toBeUndefined();
    expect(publicLandingPath('https://h/file-store/egov-rainmaker/bo/pgr-landing-evil/x.png')).toBeUndefined();
    expect(publicLandingPath('https://h/filestore/v1/files/id?fileStoreId=x')).toBeUndefined();
    expect(publicLandingPath('https://cdn.example.com/hero.jpg')).toBeUndefined();
    expect(publicLandingPath(undefined)).toBeUndefined();
  });
  it('stores the public path for uploads, the URL for pasted images', () => {
    expect(storedImageValue({ fileStoreId: 'f1', url: signed, name: 'a', uploadedAt: 1 })).toBe('/file-store/egov-rainmaker/bo/pgr-landing/November/23/1794xyz.png');
    expect(storedImageValue({ url: 'https://cdn.example.com/hero.jpg', name: 'b', uploadedAt: 0 })).toBe('https://cdn.example.com/hero.jpg');
    expect(storedImageValue({ fileStoreId: 'f2', name: 'c', uploadedAt: 1 })).toBe('f2');
  });
});
