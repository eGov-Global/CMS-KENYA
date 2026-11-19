import test from 'node:test';
import assert from 'node:assert/strict';
import { pickContextFields, createTriageConfigSource } from '../src/triageConfig.js';
import { CONTEXT_FIELDS } from '../src/catalog.js';
import { createTriage } from '../src/triage.js';

const quiet = { info() {}, warn() {}, error() {} };

test('built-in names and safe definitions survive; unsafe or unknown ones are ignored and logged', () => {
  const warns = [];
  const r = pickContextFields({ contextFields: ['sla', 'citizen.mobileNumber', { key: 'm', from: 'complaint', path: 'citizen.mobileNumber' }, 'typeName', 'sla'] }, CONTEXT_FIELDS, { warn: (m) => warns.push(m) }, 'bo');
  assert.deepEqual(r.fields.map((f) => f.key), ['sla', 'typeName']);
  assert.equal(r.from, 'mdms');
  assert.equal(warns.length, 2);
  assert.deepEqual(pickContextFields({ contextFields: [] }, CONTEXT_FIELDS).fields, []);
  assert.deepEqual(pickContextFields(null, ['sla']), { fields: ['sla'], from: 'default' });
});

function mdms(byTenant, calls = []) {
  return async (url, opts) => {
    const t = JSON.parse(opts.body).MdmsCriteria.tenantId;
    calls.push(t);
    if (byTenant === 'fail') throw new Error('down');
    return { ok: true, json: async () => ({ MdmsRes: { 'RAINMAKER-PGR': { TriageConfig: byTenant[t] || [] } } }) };
  };
}
const cfg = { host: 'h', searchPath: '/s', module: 'RAINMAKER-PGR', master: 'TriageConfig', ttlMs: 1000, errorRetryMs: 10, timeoutMs: 100, defaultContextFields: CONTEXT_FIELDS };

test('per-tenant record wins, state root is the fallback, then the env default', async () => {
  const calls = [];
  const src = createTriageConfigSource(cfg, {
    fetchImpl: mdms({ ke: [{ code: 'default', contextFields: ['typeName', 'sla'] }], 'ke.nairobi': [] }, calls), log: quiet, now: () => 0,
  });
  assert.deepEqual((await src.get('ke.nairobi')).fields.map((f) => f.key), ['typeName', 'sla']);
  assert.deepEqual(calls, ['ke.nairobi', 'ke']);
  await src.get('ke.nairobi');
  assert.equal(calls.length, 2, 'cached');
  const none = createTriageConfigSource(cfg, { fetchImpl: mdms({}), log: quiet });
  assert.deepEqual(await none.get('bo'), { fields: CONTEXT_FIELDS, from: 'default' });
  const down = createTriageConfigSource(cfg, { fetchImpl: mdms('fail'), log: quiet });
  assert.deepEqual((await down.get('bo')).fields, CONTEXT_FIELDS);
});

test('triage sends only the fields MDMS switched on', async () => {
  let ctx;
  const t = createTriage({
    cfg: { rules: { basePriority: {}, defaultPriority: 'MEDIUM' }, llm: { minConfidence: 0.5, model: 'm' }, contextFields: CONTEXT_FIELDS },
    store: {}, log: quiet,
    catalog: { get: async () => new Map([['X', { name: 'Type X', category: 'Cat', department: 'D', slaHours: 72 }]]) },
    triageConfig: { get: async () => ({ fields: ['sla'], from: 'mdms' }) },  // names still accepted
    llm: { enabled: true, classify: async (c) => ((ctx = c), null) },
  });
  await t.assess({ tenantId: 'bo', serviceRequestId: 'R', serviceCode: 'X', description: 'no water', source: 'web' });
  assert.deepEqual(ctx, { complaintType: 'X', items: [{ key: 'sla', label: 'County target resolution time', value: '72 hours' }] });
});
