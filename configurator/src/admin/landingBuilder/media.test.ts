import { describe, expect, it, vi } from 'vitest';

vi.mock('@/providers/bridge', () => ({ digitClient: {} }));
const { imageFileProblem, MAX_IMAGE_BYTES } = await import('./media');

describe('landing picture rules', () => {
  it('accepts JPG, PNG and WebP within the size cap', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) expect(imageFileProblem({ type, size: 400_000, name: 'a' })).toBeNull();
  });
  it('refuses SVG, other types and oversized files with a reason', () => {
    expect(imageFileProblem({ type: 'image/svg+xml', size: 10, name: 'logo.svg' })).toMatch(/not a JPG, PNG or WebP/);
    expect(imageFileProblem({ type: 'application/pdf', size: 10, name: 'x.pdf' })).toMatch(/not a JPG/);
    expect(imageFileProblem({ type: 'image/jpeg', size: MAX_IMAGE_BYTES + 1, name: 'big.jpg' })).toMatch(/limit is 1.5 MB/);
  });
});
