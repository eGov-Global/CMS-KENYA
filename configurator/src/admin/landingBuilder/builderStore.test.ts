import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LandingSectionData, MdmsRow } from './types';

const digitClient = {
  mdmsSchemaSearch: vi.fn(),
  mdmsSchemaCreate: vi.fn(),
  mdmsCreate: vi.fn(),
  mdmsUpdate: vi.fn(),
  mdmsSearch: vi.fn(),
};
vi.mock('@/providers/bridge', () => ({ digitClient }));

const { reducer, initialState, persist, PAGE_SCHEMA, SECTION_SCHEMA } = await import('./builderStore');
const { LANDING_SCHEMAS, LANDING_ACTIONS, ACTIONS_SCHEMA, ROLEACTIONS_SCHEMA } = await import('./landingSetup');

const DEFAULTS: LandingSectionData[] = [
  { code: 'footer', type: 'footer', order: 110, enabled: true, status: 'PUBLISHED' },
  { code: 'navigation', type: 'navigation', order: 10, enabled: true, status: 'PUBLISHED' },
  { code: 'hero', type: 'hero', order: 30, enabled: true, status: 'PUBLISHED' },
];
const PAGE = { code: 'default', enabled: true, showUtilityBar: true, showWhatsAppFab: true };
const row = (code: string, order: number): MdmsRow => ({
  id: `id-${code}`, tenantId: 'nb', schemaCode: SECTION_SCHEMA, uniqueIdentifier: code, isActive: true,
  data: { code, type: code, order, enabled: true, status: 'PUBLISHED' },
});
const loaded = (sections: MdmsRow[], page?: MdmsRow) => reducer(initialState, { type: 'hydrate', sections, page });
const seeded = () => reducer(loaded([]), { type: 'seedDefaults', sections: DEFAULTS, page: PAGE });

// A tenant as the Kenya sites are today: one unrelated action, one unrelated
// grant, nothing for the landing masters.
const EXISTING_ACTION = { data: { id: 4622, url: '/mdms-v2/v2/_create/common-masters.Department' }, isActive: true };
const EXISTING_GRANT = { data: { id: 2346, rolecode: 'MDMS_ADMIN', actionid: 4622 }, isActive: true };
function tenantHas(actions: unknown[], roleActions: unknown[]) {
  digitClient.mdmsSearch.mockImplementation(async (_t: string, schema: string, o?: { isActive?: boolean; uniqueIdentifiers?: string[] }) => {
    // The persisted-row check after creating actions: report them all as written.
    if (o?.uniqueIdentifiers) return o.uniqueIdentifiers.map((id) => ({ data: { id: Number(id) }, isActive: true }));
    if (o?.isActive === false) return [];
    if (schema === ACTIONS_SCHEMA) return actions;
    if (schema === ROLEACTIONS_SCHEMA) return roleActions;
    return [];
  });
}
// Schema search: the tenant has the section schema; once the page schema is created it shows up too.
function schemasAppearAfterCreate() {
  let created = false;
  digitClient.mdmsSchemaCreate.mockImplementation(async () => { created = true; return {}; });
  digitClient.mdmsSchemaSearch.mockImplementation(async () => (created ? [{ code: SECTION_SCHEMA }, { code: PAGE_SCHEMA }] : [{ code: SECTION_SCHEMA }]));
}
const creates = () => digitClient.mdmsCreate.mock.calls.map((c) => [c[1], c[2]]);

describe('seedDefaults', () => {
  it('turns the built-in layout into unsaved rows when the tenant has none', () => {
    const state = seeded();
    expect(state.sections.map((s) => s.draft.code)).toEqual(['navigation', 'hero', 'footer']);
    expect(state.sections.every((s) => s.state === 'created' && !s.record)).toBe(true);
    // Orders are kept as the page runs them, so what is saved is what is live.
    expect(state.sections.map((s) => s.draft.order)).toEqual([10, 30, 110]);
    expect(state.page).toEqual({ draft: PAGE, dirty: true });
  });

  it('leaves a tenant that already has rows alone', () => {
    const before = loaded([row('hero', 30)]);
    expect(reducer(before, { type: 'seedDefaults', sections: DEFAULTS, page: PAGE })).toBe(before);
  });

  it('keeps an existing page row and only seeds sections', () => {
    const page: MdmsRow = { id: 'p', tenantId: 'nb', schemaCode: PAGE_SCHEMA, uniqueIdentifier: 'default', isActive: true, data: { code: 'default', enabled: false } };
    const state = reducer(loaded([], page), { type: 'seedDefaults', sections: DEFAULTS, page: PAGE });
    expect(state.sections).toHaveLength(3);
    expect(state.page?.record).toBe(page);
    expect(state.page?.dirty).toBe(false);
  });
});

describe('persist on a tenant without the landing masters', () => {
  beforeEach(() => {
    Object.values(digitClient).forEach((fn) => fn.mockReset());
    schemasAppearAfterCreate();
    tenantHas([EXISTING_ACTION], [EXISTING_GRANT]);
  });

  it('creates the missing schema, the gateway actions, then the rows', async () => {
    await persist(seeded(), 'nb', { publish: true });

    const pageSchema = LANDING_SCHEMAS.find((s) => s.code === PAGE_SCHEMA)!;
    expect(digitClient.mdmsSchemaCreate.mock.calls).toEqual([['nb', PAGE_SCHEMA, pageSchema.description, pageSchema.definition]]);

    // 4 actions with fresh ids after the tenant's highest, all written before any grant references them.
    const actionCreates = digitClient.mdmsCreate.mock.calls.filter((c) => c[1] === ACTIONS_SCHEMA);
    expect(actionCreates.map((c) => [c[2], c[3].url])).toEqual([
      ['4623', '/mdms-v2/v2/_create/RAINMAKER-PGR.LandingSection'],
      ['4624', '/mdms-v2/v2/_update/RAINMAKER-PGR.LandingSection'],
      ['4625', '/mdms-v2/v2/_create/RAINMAKER-PGR.LandingPageConfig'],
      ['4626', '/mdms-v2/v2/_update/RAINMAKER-PGR.LandingPageConfig'],
    ]);
    expect(actionCreates[0][3]).toMatchObject({ id: 4623, name: 'MDMS', enabled: true, serviceCode: 'MDMS v2', displayName: 'create RAINMAKER-PGR.LandingSection' });
    const grants = digitClient.mdmsCreate.mock.calls.filter((c) => c[1] === ROLEACTIONS_SCHEMA);
    const order = digitClient.mdmsCreate.mock.calls.map((c) => c[1]);
    expect(order.lastIndexOf(ACTIONS_SCHEMA)).toBeLessThan(order.indexOf(ROLEACTIONS_SCHEMA));
    expect(grants.map((c) => [c[2], c[3].id, c[3].actionid, c[3].rolecode, c[3].tenantId])).toEqual([
      ['MDMS_ADMIN.4623', 2347, 4623, 'MDMS_ADMIN', 'nb'],
      ['MDMS_ADMIN.4624', 2348, 4624, 'MDMS_ADMIN', 'nb'],
      ['MDMS_ADMIN.4625', 2349, 4625, 'MDMS_ADMIN', 'nb'],
      ['MDMS_ADMIN.4626', 2350, 4626, 'MDMS_ADMIN', 'nb'],
    ]);

    // Then the seeded sections and, for a tenant with no page row, the page row.
    expect(creates().slice(8)).toEqual([
      [SECTION_SCHEMA, 'navigation'], [SECTION_SCHEMA, 'hero'], [SECTION_SCHEMA, 'footer'], [PAGE_SCHEMA, 'default'],
    ]);
    expect(digitClient.mdmsCreate.mock.calls[11][3]).toEqual(PAGE);
    expect(digitClient.mdmsUpdate).not.toHaveBeenCalled();
  });

  it('explains a refusal right after setting up permissions', async () => {
    digitClient.mdmsCreate.mockImplementation(async (_t: string, schema: string) => {
      if (schema === SECTION_SCHEMA) throw Object.assign(new Error('AccessDeniedException'), { statusCode: 403 });
      return {};
    });
    await expect(persist(seeded(), 'nb', { publish: true })).rejects.toThrow(/take up to 15 minutes/);
  });

  it('passes any other save error through unchanged', async () => {
    digitClient.mdmsCreate.mockImplementation(async (_t: string, schema: string) => {
      if (schema === SECTION_SCHEMA) throw new Error('DUPLICATE_RECORD');
      return {};
    });
    await expect(persist(seeded(), 'nb')).rejects.toThrow('DUPLICATE_RECORD');
  });
});

describe('persist on a tenant that is already set up', () => {
  beforeEach(() => {
    Object.values(digitClient).forEach((fn) => fn.mockReset());
    digitClient.mdmsSchemaSearch.mockResolvedValue([{ code: SECTION_SCHEMA }, { code: PAGE_SCHEMA }]);
    tenantHas(
      [EXISTING_ACTION, ...LANDING_ACTIONS.map((a, i) => ({ data: { id: 100 + i, url: a.url }, isActive: true }))],
      [EXISTING_GRANT, ...LANDING_ACTIONS.map((_a, i) => ({ data: { id: 50 + i, rolecode: 'MDMS_ADMIN', actionid: 100 + i }, isActive: true }))],
    );
  });

  it('creates nothing extra and a 403 is reported as it is', async () => {
    await persist(loaded([row('hero', 30)]), 'nb');
    expect(digitClient.mdmsSchemaCreate).not.toHaveBeenCalled();
    expect(digitClient.mdmsCreate).not.toHaveBeenCalled();

    digitClient.mdmsCreate.mockRejectedValue(Object.assign(new Error('AccessDeniedException'), { statusCode: 403 }));
    await expect(persist(seeded(), 'nb')).rejects.toThrow('AccessDeniedException');
  });

  it('grants a missing permission for an action that already exists', async () => {
    tenantHas([EXISTING_ACTION, { data: { id: 7, url: LANDING_ACTIONS[0].url }, isActive: true }], [EXISTING_GRANT]);
    await persist(loaded([row('hero', 30)]), 'nb');
    const grants = digitClient.mdmsCreate.mock.calls.filter((c) => c[1] === ROLEACTIONS_SCHEMA).map((c) => c[2]);
    expect(grants[0]).toBe('MDMS_ADMIN.7');
    expect(grants).toHaveLength(4);
    expect(digitClient.mdmsCreate.mock.calls.filter((c) => c[1] === ACTIONS_SCHEMA)).toHaveLength(3);
  });
});

describe('icons chosen on the page', () => {
  const pageItems = { steps: [{ code: 'step-1', labelKey: 'HOW_STEP_1' }, { code: 'step-2', labelKey: 'HOW_STEP_2' }] };
  it('materialise the built-in items and set the icon on the clicked one', () => {
    let state = reducer(loaded([row('steps', 50)]), { type: 'setPageItems', items: pageItems });
    state = reducer(state, { type: 'setItemIcon', code: 'steps', item: 'step-2', iconId: 'Bell' });
    const items = state.sections[0].draft.items!;
    expect(items.map((i) => [i.code, i.iconId ?? null, i.order])).toEqual([['step-1', null, 10], ['step-2', 'Bell', 20]]);
    expect(state.sections[0].state).toBe('dirty');
  });
  it('ignore an item the section does not have', () => {
    const before = reducer(loaded([row('steps', 50)]), { type: 'setPageItems', items: pageItems });
    expect(reducer(before, { type: 'setItemIcon', code: 'steps', item: 'nope', iconId: 'Bell' })).toBe(before);
  });
});

describe('hover', () => {
  it('remembers whether the hover came from the page, so the preview is not scrolled under the pointer', () => {
    const fromList = reducer(initialState, { type: 'hover', code: 'hero' });
    expect(fromList.hovered).toBe('hero');
    expect(fromList.hoveredFromPage).toBe(false);
    const fromPage = reducer(fromList, { type: 'hover', code: 'hero', source: 'page' });
    expect(fromPage.hoveredFromPage).toBe(true);
    expect(reducer(fromPage, { type: 'hover', code: null, source: 'page' }).hovered).toBeNull();
  });
});
