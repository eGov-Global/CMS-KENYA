import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Every sidebar link must lead somewhere: an explicit <Resource name="x">, a
// generic MDMS resource (App.tsx registers those in a loop) or a custom
// <Route path="/x"> under /manage. A link without a route renders an empty
// page with no error (the Landing Page screens, Sept–Oct 2026).
const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');

// Resource names App.tsx registers through its generic loop: registry entries
// of type 'mdms' that are not `dedicated`. Read from the source so this test
// needs nothing the type checker cannot resolve.
function genericMdmsResources(): string[] {
  const src = read('../../packages/data-provider/src/providers/resourceRegistry.ts');
  const body = src.slice(src.indexOf('export const REGISTRY'));
  const entries = body.split(/\n(?= {2}'?[a-z0-9-]+'?:\s*\{)/);
  return entries
    .map((e) => ({ name: e.match(/^ {2}'?([a-z0-9-]+)'?:/)?.[1], text: e }))
    .filter((e) => e.name && /type:\s*'mdms'/.test(e.text) && !/dedicated:\s*true/.test(e.text))
    .map((e) => e.name as string);
}

describe('sidebar links and routes', () => {
  it('every /manage/<x> link in DigitLayout has a route in App.tsx', () => {
    const layout = read('./DigitLayout.tsx');
    const app = read('../App.tsx');
    const links = [...layout.matchAll(/path:\s*['"]\/manage\/([a-z0-9-]+)['"]/g)].map((m) => m[1]);
    const routed = new Set([
      ...[...app.matchAll(/<Resource[^>]*\bname="([a-z0-9-]+)"/g)].map((m) => m[1]),
      ...[...app.matchAll(/<Route[^>]*\bpath="\/([a-z0-9-]+)"/g)].map((m) => m[1]),
      ...genericMdmsResources(),
    ]);
    expect(links.length).toBeGreaterThan(10);
    expect(links.filter((l) => !routed.has(l))).toEqual([]);
  });

  it('would have caught the Landing Page screens losing their routes', () => {
    const app = read('../App.tsx').replace(/.*name="landing-(sections|page-config)".*\n/g, '');
    const resources = new Set([...app.matchAll(/<Resource[^>]*\bname="([a-z0-9-]+)"/g)].map((m) => m[1]));
    expect(resources.has('landing-sections')).toBe(false);
    expect(['landing-sections', 'landing-page-config'].filter((l) => !resources.has(l))).toHaveLength(2);
  });
});
