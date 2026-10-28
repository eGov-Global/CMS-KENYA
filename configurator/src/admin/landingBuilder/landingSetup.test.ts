import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/providers/bridge', () => ({ digitClient: {} }));
const { LANDING_SCHEMAS, LANDING_ACTIONS, isAccessDenied } = await import('./landingSetup');

const SEED = resolve(__dirname, '../../../../utilities/default-data-handler/src/main/resources');

describe('bundled landing schemas', () => {
  it('match the default-data-handler schema file', () => {
    const parsed = JSON.parse(readFileSync(`${SEED}/schema/rainmaker-pgr-landing.json`, 'utf8'));
    const source = (Array.isArray(parsed) ? parsed : [parsed]).map((s) => ({
      code: s.code, description: s.description || s.code, definition: s.definition,
    }));
    expect(LANDING_SCHEMAS).toEqual(source);
  });

  it('keep descriptions within the 512-character schema column (longer ones are accepted, then silently dropped by the persister)', () => {
    for (const s of LANDING_SCHEMAS) expect(s.description.length).toBeLessThanOrEqual(512);
  });

  it('cover both landing masters', () => {
    expect(LANDING_SCHEMAS.map((s) => s.code).sort()).toEqual(['RAINMAKER-PGR.LandingPageConfig', 'RAINMAKER-PGR.LandingSection']);
  });
});

describe('landing gateway actions', () => {
  it('are the same four the seed grants to MDMS_ADMIN', () => {
    const actions = JSON.parse(readFileSync(`${SEED}/mdmsData/ACCESSCONTROL-ACTIONS-TEST/ACCESSCONTROL-ACTIONS-TEST.actions-test.json`, 'utf8')) as { id: number; url: string }[];
    const grants = JSON.parse(readFileSync(`${SEED}/mdmsData/ACCESSCONTROL-ROLEACTIONS/ACCESSCONTROL-ROLEACTIONS.roleactions.json`, 'utf8')) as { rolecode: string; actionid: number }[];
    const seeded = actions.filter((a) => /RAINMAKER-PGR\.Landing/.test(a.url));
    expect(seeded.map((a) => a.url).sort()).toEqual(LANDING_ACTIONS.map((a) => a.url).sort());
    for (const a of seeded) {
      expect(grants.some((g) => g.actionid === a.id && g.rolecode === 'MDMS_ADMIN')).toBe(true);
    }
  });
});

describe('isAccessDenied', () => {
  it('recognises the gateway refusal by status or message', () => {
    expect(isAccessDenied(Object.assign(new Error('x'), { statusCode: 403 }))).toBe(true);
    expect(isAccessDenied(new Error('AccessDeniedException'))).toBe(true);
    expect(isAccessDenied(new Error('DUPLICATE_RECORD'))).toBe(false);
    expect(isAccessDenied(null)).toBe(false);
  });
});
