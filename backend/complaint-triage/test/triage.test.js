import test from 'node:test';
import assert from 'node:assert/strict';
import { scrub } from '../src/scrub.js';
import { combine, rulesLevel } from '../src/priority.js';
import { parseAnswer, createLlmClient } from '../src/llm.js';
import { createTriage } from '../src/triage.js';

// ── scrub ─────────────────────────────────────────────────────────────
test('scrub removes Kenyan phone numbers in common formats', () => {
  for (const p of ['0712345678', '0712 345 678', '+254712345678', '254 712 345 678', '0110123456']) {
    const r = scrub(`call me on ${p} please`);
    assert.ok(!/\d{3}/.test(r.text), `${p} -> ${r.text}`);
    assert.ok(r.clean);
  }
});

test('scrub removes email, KRA PIN, M-Pesa code, plate, ID and plot numbers', () => {
  const r = scrub(
    'Email jane.doe@example.com, PIN A012345678Z, paid QJK7X2ABCD, car KDA 123A, ID no 12345678, Plot 45 House B12',
  );
  assert.ok(r.clean, r.text);
  for (const tag of ['[EMAIL]', '[KRA_PIN]', '[MPESA_CODE]', '[PLATE]', '[NATIONAL_ID]', '[ADDRESS_NO]']) {
    assert.ok(r.text.includes(tag), `missing ${tag}: ${r.text}`);
  }
  assert.ok(!r.text.includes('12345678'));
});

test('scrub keeps ordinary complaint text intact', () => {
  const t = 'Sewage is overflowing into houses near the market for 3 days, children are getting sick';
  const r = scrub(t);
  assert.equal(r.text, t);
  assert.ok(r.clean);
});

test('scrub handles Swahili ID wording', () => {
  const r = scrub('kitambulisho namba 23456789 maji hakuna');
  assert.ok(r.text.includes('[NATIONAL_ID]'));
  assert.ok(r.clean);
});

// ── priority rules ────────────────────────────────────────────────────
test('rulesLevel uses basePriority map, then default', () => {
  const rules = { basePriority: { SewageOverflow: 'HIGH' }, defaultPriority: 'MEDIUM' };
  assert.equal(rulesLevel('SewageOverflow', rules), 'HIGH');
  assert.equal(rulesLevel('Other', rules), 'MEDIUM');
  assert.equal(rulesLevel('Other', { basePriority: {}, defaultPriority: 'bogus' }), 'MEDIUM');
});

test('combine: AI raises freely, lowers at most one level, ignored when unsure', () => {
  assert.deepEqual(combine('LOW', { priority: 'CRITICAL', confidence: 0.9 }, 0.5), { level: 'CRITICAL', source: 'ai' });
  assert.deepEqual(combine('CRITICAL', { priority: 'LOW', confidence: 0.9 }, 0.5), { level: 'HIGH', source: 'ai' });
  assert.deepEqual(combine('HIGH', { priority: 'MEDIUM', confidence: 0.9 }, 0.5), { level: 'MEDIUM', source: 'ai' });
  assert.deepEqual(combine('HIGH', { priority: 'LOW', confidence: 0.3 }, 0.5), { level: 'HIGH', source: 'rules' });
  assert.deepEqual(combine('MEDIUM', null, 0.5), { level: 'MEDIUM', source: 'rules' });
});

// ── llm ───────────────────────────────────────────────────────────────
test('parseAnswer accepts valid JSON, fenced JSON, rejects bad levels', () => {
  assert.deepEqual(parseAnswer('{"priority":"high","reason":"x","confidence":0.8}'), {
    priority: 'HIGH',
    reason: 'x',
    confidence: 0.8,
  });
  assert.equal(parseAnswer('```json\n{"priority":"LOW","reason":"r","confidence":2}\n```').confidence, 1);
  assert.equal(parseAnswer('{"priority":"URGENT"}'), null);
  assert.equal(parseAnswer('not json'), null);
});

const quiet = { info() {}, warn() {}, error() {} };

function fakeFetch(status, body) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts });
    return { status, ok: status >= 200 && status < 300, json: async () => body, text: async () => '' };
  };
  fn.calls = calls;
  return fn;
}

const llmCfg = { apiKey: 'k', baseUrl: 'https://llm.test/v1', model: 'm', timeoutMs: 1000, minConfidence: 0.5 };

test('llm client sends OpenAI-style request and parses answer', async () => {
  const f = fakeFetch(200, { choices: [{ message: { content: '{"priority":"HIGH","reason":"r","confidence":0.9}' } }] });
  const llm = createLlmClient(llmCfg, { fetchImpl: f, log: quiet });
  const out = await llm.classify('NoWaterSupply', 'no water');
  assert.equal(out.priority, 'HIGH');
  assert.equal(f.calls[0].url, 'https://llm.test/v1/chat/completions');
  assert.equal(f.calls[0].opts.headers.Authorization, 'Bearer k');
});

test('llm client returns null on 429 without retrying, and is disabled without key', async () => {
  const f = fakeFetch(429, {});
  const llm = createLlmClient(llmCfg, { fetchImpl: f, log: quiet });
  assert.equal(await llm.classify('x', 'y'), null);
  assert.equal(f.calls.length, 1);
  assert.equal(createLlmClient({ ...llmCfg, apiKey: '' }).enabled, false);
});

// ── triage flow ───────────────────────────────────────────────────────
function fakeStore(rows) {
  const writes = [];
  return {
    writes,
    rows,
    async getPriority(t, id) {
      return id in rows ? { exists: true, priority: rows[id] } : { exists: false, priority: null };
    },
    async setPriority(t, id, level) {
      if (!(id in rows)) return false;
      rows[id] = level;
      writes.push([id, level]);
      return true;
    },
  };
}

const cfg = {
  rules: { basePriority: {}, defaultPriority: 'MEDIUM' },
  llm: { minConfidence: 0.5, model: 'm' },
  createRetries: 3,
  createRetryDelayMs: 0,
  updateSettleMs: 0,
};
const aiSays = (priority) => ({ enabled: true, classify: async () => ({ priority, reason: 'r', confidence: 0.9 }) });
const svc = (extra = {}) => ({
  tenantId: 'ke.nairobi',
  serviceRequestId: 'PGR-1',
  serviceCode: 'NoWaterSupply',
  description: 'No water in the whole estate for 4 days',
  additionalDetail: { department: 'DEPT_01' },
  ...extra,
});

test('onCreate saves AI level', async () => {
  const store = fakeStore({ 'PGR-1': null });
  const t = createTriage({ cfg, store, llm: aiSays('HIGH'), log: quiet, wait: async () => {} });
  assert.equal(await t.onCreate(svc()), 'set');
  assert.deepEqual(store.writes, [['PGR-1', 'HIGH']]);
});

test('onCreate retries until the persister has inserted the row', async () => {
  const store = fakeStore({});
  let n = 0;
  const wait = async () => {
    if (++n === 2) store.rows['PGR-1'] = null;
  };
  const t = createTriage({ cfg, store, llm: aiSays('LOW'), log: quiet, wait });
  assert.equal(await t.onCreate(svc()), 'set');
});

test('onCreate does not send text to AI when personal details may remain', async () => {
  const store = fakeStore({ 'PGR-1': null });
  let called = false;
  const llm = { enabled: true, classify: async () => ((called = true), null) };
  const t = createTriage({ cfg, store, llm, log: quiet, wait: async () => {} });
  await t.onCreate(svc({ description: 'reach me at 7 1 2 3 4 5 6 7 8 9 call' }));
  assert.equal(called, false);
  assert.deepEqual(store.writes, [['PGR-1', 'MEDIUM']]);
});

test('onUpdate does nothing when the update still carries the priority', async () => {
  const store = fakeStore({ 'PGR-1': 'HIGH' });
  const t = createTriage({ cfg, store, llm: aiSays('LOW'), log: quiet, wait: async () => {} });
  assert.equal(await t.onUpdate(svc({ additionalDetail: { priority: 'HIGH' } })), 'kept');
  assert.equal(store.writes.length, 0);
});

test('onUpdate restores the previous level without calling AI when the update dropped it', async () => {
  const store = fakeStore({ 'PGR-1': 'CRITICAL' });
  let called = false;
  const llm = { enabled: true, classify: async () => ((called = true), null) };
  // Simulate the persister applying the update (wiping priority) during the settle wait.
  const wait = async () => {
    store.rows['PGR-1'] = null;
  };
  const t = createTriage({ cfg, store, llm, log: quiet, wait });
  assert.equal(await t.onUpdate(svc()), 'restored');
  assert.deepEqual(store.writes, [['PGR-1', 'CRITICAL']]);
  assert.equal(called, false);
});

test('onUpdate re-assesses when the old level is unknown', async () => {
  const store = fakeStore({ 'PGR-1': null });
  const t = createTriage({ cfg, store, llm: aiSays('HIGH'), log: quiet, wait: async () => {} });
  assert.equal(await t.onUpdate(svc()), 'restored');
  assert.deepEqual(store.writes, [['PGR-1', 'HIGH']]);
});

// ── MDMS-driven patterns ──────────────────────────────────────────────
import { compilePatterns } from '../src/scrub.js';
import { createPatternSource } from '../src/mdms.js';

test('compilePatterns skips inactive and invalid records and sorts by order', () => {
  const errs = [];
  const c = compilePatterns(
    [
      { code: 'B', kind: 'replace', tag: '[B]', regex: 'bbb', order: 20 },
      { code: 'A', kind: 'replace', tag: '[A]', regex: 'aaa', order: 10 },
      { code: 'OFF', kind: 'replace', tag: '[X]', regex: 'x', active: false },
      { code: 'BAD', kind: 'replace', tag: '[X]', regex: '(' },
      { code: 'BLK', kind: 'block', regex: 'secret' },
    ],
    { error: (m) => errs.push(m) },
  );
  assert.deepEqual(c.replace.map((r) => r.code), ['A', 'B']);
  assert.deepEqual(c.block.map((r) => r.code), ['BLK']);
  assert.equal(errs.length, 1);
});

test('scrub with custom patterns: new tag applied, block pattern stops AI, safety floor always on', () => {
  const p = compilePatterns([
    { code: 'NAME', kind: 'replace', tag: '[NAME]', regex: '\\bMama \\w+', order: 1 },
    { code: 'BLK', kind: 'block', regex: 'confidential' },
  ]);
  assert.equal(scrub('Mama Wanjiku says no water', p).text, '[NAME] says no water');
  assert.equal(scrub('this is confidential', p).clean, false);
  // No email/number rules configured, but the floor still blocks them.
  assert.equal(scrub('mail a@b.co', p).clean, false);
  assert.equal(scrub('call 0712345678', p).clean, false);
});

function mdmsFetch(byTenant, calls = []) {
  return async (url, opts) => {
    const t = JSON.parse(opts.body).MdmsCriteria.tenantId;
    calls.push(t);
    if (byTenant === 'fail') throw new Error('down');
    return { ok: true, json: async () => ({ MdmsRes: { 'RAINMAKER-PGR': { PiiPatterns: byTenant[t] || [] } } }) };
  };
}
const mdmsCfg = {
  host: 'http://mdms', searchPath: '/s', module: 'RAINMAKER-PGR', master: 'PiiPatterns',
  ttlMs: 1000, errorRetryMs: 100, timeoutMs: 1000,
};

test('pattern source falls back to the state tenant and caches until TTL', async () => {
  const calls = [];
  let t = 0;
  const src = createPatternSource(mdmsCfg, {
    fetchImpl: mdmsFetch({ ke: [{ code: 'X', kind: 'replace', tag: '[X]', regex: 'x' }] }, calls),
    log: quiet,
    now: () => t,
  });
  const p = await src.get('ke.nairobi');
  assert.equal(p.count, 1);
  assert.deepEqual(calls, ['ke.nairobi', 'ke']);
  await src.get('ke.nairobi');
  assert.equal(calls.length, 2); // cached
  t = 2000;
  await src.get('ke.nairobi');
  assert.equal(calls.length, 4); // refreshed after TTL
});

test('pattern source uses built-in defaults when MDMS is empty or down', async () => {
  const empty = createPatternSource(mdmsCfg, { fetchImpl: mdmsFetch({}), log: quiet });
  assert.ok((await empty.get('ke.nairobi')).count >= 8);
  const down = createPatternSource(mdmsCfg, { fetchImpl: mdmsFetch('fail'), log: quiet });
  const p = await down.get('ke.nairobi');
  assert.ok(scrub('call 0712345678', p).text.includes('[PHONE]'));
});
