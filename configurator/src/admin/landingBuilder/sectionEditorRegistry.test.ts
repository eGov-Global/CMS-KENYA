import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getEditorEntry } from './sectionEditorRegistry';

// The landing page's own registry (digit-ui) is the list of section types a
// tenant's rows can carry. Every one of them needs a Builder entry, or the
// Builder refuses to save that page ("Unknown section type") — which is how
// the Kenya pages' tagline/helplines sections blocked Publish in Oct 2026.
const PAGE_REGISTRY = resolve(
  __dirname,
  '../../../../digit-ui-esbuild/products/pgr/src/pages/citizen/Landing/config/sectionRegistry.tsx',
);

describe('builder section catalog', () => {
  it('has an entry for every section type the landing page can render', () => {
    const src = readFileSync(PAGE_REGISTRY, 'utf8');
    const body = src.slice(src.indexOf('export const SECTION_REGISTRY'));
    const block = body.slice(0, body.indexOf('\n};'));
    const types = [...block.matchAll(/^ {2}([a-z]+): \{/gm)].map((m) => m[1]);
    expect(types.length).toBeGreaterThan(8);
    expect(types.filter((t) => !getEditorEntry(t))).toEqual([]);
  });

  it('validates structure-only rows (what the page runs by default) without errors', () => {
    for (const type of ['tagline', 'helplines', 'hero', 'footer']) {
      const entry = getEditorEntry(type)!;
      expect(entry.validate({ code: type, type, order: 10, enabled: true, status: 'PUBLISHED' })).toEqual([]);
    }
  });
});

describe('picture fields', () => {
  it('exist for every section type whose page entry reads media (click-to-replace)', () => {
    const src = readFileSync(PAGE_REGISTRY, 'utf8');
    const body = src.slice(src.indexOf('export const SECTION_REGISTRY'));
    const withImage = [...body.matchAll(/^ {2}([a-z]+): \{[^}]*?\n {4}image: true,/gm)].map((m) => m[1]);
    expect(withImage.length).toBeGreaterThan(4);
    for (const type of withImage) expect(getEditorEntry(type)!.fields.some((f) => f.widget === 'media'), type).toBe(true);
  });
});
