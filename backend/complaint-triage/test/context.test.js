import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCatalog, buildContext, contextToObject, createComplaintCatalog, normalizeFields, checkFieldSafety, CONTEXT_FIELDS,
} from '../src/catalog.js';
import { buildMessages } from '../src/llm.js';
import { createTriage } from '../src/triage.js';
import { scrub } from '../src/scrub.js';

const hierarchy = [
  { code: 'Sewage', name: 'Sewage Pollution Posing Health Risk', path: 'Sewage', parentCode: null },
  { code: 'SewageOverflow', name: 'Open sewage flow / Sewer overflow', path: 'Sewage.SewageOverflow',
    department: 'WATER&SEWAGE', slaHours: 72, keywords: 'sewage flow, overflow' },
];
const catalog = buildCatalog(hierarchy, [
  { serviceCode: 'NoWaterSupply', name: 'No water supply', menuPath: 'WaterRelated', department: 'DEPT_01', slaHours: 48 },
]);
const isClean = (v) => { const r = scrub(v); return r.clean && r.found.length === 0; };

const service = (extra = {}) => ({
  serviceRequestId: 'R1', serviceCode: 'SewageOverflow', source: 'inperson', documents: null,
  additionalDetail: { department: 'WATER&SEWAGE', serviceName: 'Open sewage flow / Sewer overflow', REOPEN_REASON: 'Mama Wanjiku says still flowing 0712345678', escalationLevel: 2, supervisorContactNumber: '0722000000' },
  citizen: { name: 'Jane Doe', mobileNumber: '0712345678' },
  address: { locality: { code: 'WARD_008' }, geoLocation: { latitude: -0.95, longitude: 35.28 } },
  ...extra,
});

test('catalog reads names, parent path, department, SLA and keeps raw MDMS attributes', () => {
  const e = catalog.get('SewageOverflow');
  assert.equal(e.category, 'Sewage Pollution Posing Health Risk');
  assert.equal(e.slaHours, 72);
  assert.equal(e.raw.keywords, 'sewage flow, overflow');
  assert.equal(catalog.get('NoWaterSupply').category, 'WaterRelated');
});

test('built-in fields produce the same context as before, with labels', () => {
  const ctx = buildContext(service(), catalog, CONTEXT_FIELDS, { isClean });
  assert.deepEqual(contextToObject(ctx), {
    complaintType: 'SewageOverflow', typeName: 'Open sewage flow / Sewer overflow',
    category: 'Sewage Pollution Posing Health Risk', department: 'WATER&SEWAGE',
    sla: '72 hours', photo: 'no', channel: 'inperson',
  });
  assert.equal(ctx.items.find((i) => i.key === 'sla').label, 'County target resolution time');
  const s = JSON.stringify(ctx);
  for (const secret of ['Jane', '0712345678', 'WARD_008', '-0.95', 'Wanjiku']) assert.ok(!s.includes(secret), secret);
});

test('new fields can be defined in MDMS without code: catalog attribute, yes/no, number', () => {
  const { defs, rejected } = normalizeFields([
    { key: 'keywords', label: 'Type keywords', from: 'catalog', path: 'keywords' },
    { key: 'reopened', label: 'Complaint reopened', from: 'complaint', path: 'additionalDetail.REOPEN_REASON', transform: 'yesNo' },
    { key: 'escalation', label: 'Escalation level', from: 'complaint', path: 'additionalDetail.escalationLevel' },
  ]);
  assert.deepEqual(rejected, []);
  const o = contextToObject(buildContext(service(), catalog, defs, { isClean }));
  assert.equal(o.keywords, 'sewage flow, overflow');
  assert.equal(o.reopened, 'yes');
  assert.equal(o.escalation, '2');
  assert.ok(!JSON.stringify(o).includes('Wanjiku'));
});

test('fields that would send personal data are refused, whatever MDMS says', () => {
  const tries = [
    { key: 'a', from: 'complaint', path: 'citizen.mobileNumber' },
    { key: 'b', from: 'complaint', path: 'citizen' },
    { key: 'c', from: 'complaint', path: 'address.locality.code' },
    { key: 'd', from: 'complaint', path: 'additionalDetail.REOPEN_REASON' },
    { key: 'e', from: 'complaint', path: 'additionalDetail.supervisorContactNumber' },
    { key: 'f', from: 'complaint', path: 'additionalDetail.serviceName' },
    { key: 'g', from: 'complaint', path: 'extendedAttributes.email' },
    { key: 'h', from: 'complaint', path: 'accountId' },
    { key: 'i', from: 'complaint', path: 'description' },
    { key: 'j', from: 'complaint', path: 'additionalDetail.department', transform: 'hours' },
    'mobileNumber',
    { key: 'k', from: 'database', path: 'x' },
    { key: 'l', from: 'complaint', path: 'a[0]' },
    { key: 'm', from: 'complaint', path: 'source', transform: 'raw' },
  ];
  const { defs, rejected } = normalizeFields(tries);
  assert.deepEqual(defs.map((d) => d.key), ['j']); // department as hours is harmless (non-number -> dropped)
  assert.equal(rejected.length, tries.length - 1);
  assert.equal(checkFieldSafety({ from: 'complaint', path: 'citizen.mobileNumber', transform: 'yesNo' }).ok, true);
});

test('a value that still looks personal is dropped by the scrubber check', () => {
  const warns = [];
  const { defs } = normalizeFields([{ key: 'status', label: 'Status', from: 'complaint', path: 'applicationStatus' }]);
  const ctx = buildContext(service({ applicationStatus: 'call 0712345678' }), catalog, defs, { isClean, log: { warn: (m) => warns.push(m) } });
  assert.deepEqual(ctx.items, []);
  assert.equal(warns.length, 1);
});

test('objects are never sent as values; long values are capped', () => {
  const { defs } = normalizeFields([
    { key: 'pi', from: 'complaint', path: 'processState' },
    { key: 'st', from: 'complaint', path: 'applicationStatus' },
  ]);
  const o = contextToObject(buildContext(service({ processState: { a: 1 }, applicationStatus: 'X'.repeat(400) }), catalog, defs, { isClean }));
  assert.equal(o.pi, undefined);
  assert.equal(o.st.length, 150);
});

test('buildMessages renders labels from the definitions', () => {
  const { defs } = normalizeFields(['typeName', 'sla', { key: 'reopened', label: 'Complaint reopened', from: 'complaint', path: 'additionalDetail.REOPEN_REASON', transform: 'yesNo' }]);
  const m = buildMessages(buildContext(service(), catalog, defs, { isClean }), 'sewage everywhere');
  assert.equal(m[1].content, [
    'Complaint type: Open sewage flow / Sewer overflow',
    'Complaint type code: SewageOverflow',
    'County target resolution time: 72 hours',
    'Complaint reopened: yes',
    '<complaint>', 'sewage everywhere', '</complaint>',
  ].join('\n'));
  assert.equal(buildMessages('NoWaterSupply', 'x')[1].content, 'Complaint type code: NoWaterSupply\n<complaint>\nx\n</complaint>');
});

test('catalogue source caches and survives MDMS errors', async () => {
  let calls = 0;
  const cfg = { host: 'h', searchPath: '/s', ttlMs: 1000, errorRetryMs: 10, timeoutMs: 100 };
  const ok = createComplaintCatalog(cfg, {
    fetchImpl: async () => (calls++, { ok: true, json: async () => ({ MdmsRes: { 'RAINMAKER-PGR': { ComplaintHierarchy: hierarchy } } }) }),
    log: { info() {}, warn() {} }, now: () => 0,
  });
  assert.equal((await ok.get('bo')).size, 2);
  await ok.get('bo');
  assert.equal(calls, 1);
  const down = createComplaintCatalog(cfg, { fetchImpl: async () => { throw new Error('down'); }, log: { info() {}, warn() {} } });
  assert.equal((await down.get('bo')).size, 0);
});

test('triage sends context even when the description is empty, and drops unclean values', async () => {
  let got;
  const { defs } = normalizeFields([...CONTEXT_FIELDS, { key: 'status', label: 'Status', from: 'complaint', path: 'applicationStatus' }]);
  const t = createTriage({
    cfg: { rules: { basePriority: {}, defaultPriority: 'MEDIUM' }, llm: { minConfidence: 0.5, model: 'm' }, contextFields: CONTEXT_FIELDS },
    store: {}, catalog: { get: async () => catalog }, triageConfig: { get: async () => ({ fields: defs }) },
    llm: { enabled: true, classify: async (ctx, text) => ((got = { ctx, text }), { priority: 'HIGH', reason: 'type', confidence: 0.6 }) },
    log: { info() {}, warn() {}, error() {} },
  });
  const r = await t.assess({ ...service({ applicationStatus: 'Mama Wanjiku' }), tenantId: 'bo', description: '' });
  assert.equal(got.text, '');
  const o = contextToObject(got.ctx);
  assert.equal(o.sla, '72 hours');
  assert.equal(o.status, undefined);
  assert.equal(r.level, 'HIGH');
});
