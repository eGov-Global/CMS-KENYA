import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, distinctiveWords, createLocalizationVocabulary } from '../src/localization.js';
import { createTriage } from '../src/triage.js';

test('tokenize lowercases, keeps letters, drops placeholders and digits', () => {
  assert.deepEqual(tokenize('Ingiza {0} jina la Raia 123!'), ['ingiza', 'jina', 'la', 'raia']);
});

test('distinctiveWords keeps words typical of one language and drops shared/untranslated ones', () => {
  const byLang = new Map([
    ['en', ['Enter the complaint name', 'Search the complaint', 'Your complaint is open', 'PGR Admin']],
    ['sw', ['Ingiza jina la malalamiko', 'Tafuta malalamiko', 'Malalamiko yako yamefunguliwa', 'PGR Admin']],
    // Partial locale that is mostly untranslated English.
    ['pt', ['Enter the complaint name', 'Search the complaint', 'Reclamação aberta', 'PGR Admin']],
  ]);
  const v = distinctiveWords(byLang, { maxWords: 10, minShare: 0, ratio: 2 });
  assert.ok(v.get('sw').includes('malalamiko'));
  assert.ok(v.get('en').includes('your'));
  for (const l of ['en', 'sw', 'pt']) assert.ok(!v.get(l)?.includes('pgr'), `${l} kept shared word`);
  assert.ok(!v.get('en').includes('complaint'), 'word shared with untranslated pt must be dropped');
  assert.ok(v.get('pt').includes('reclamação'));
});

function fakeDigit({ locales = ['en_IN', 'sw_KE'], fail = false } = {}) {
  const calls = [];
  const msgs = {
    en_IN: ['Enter the complaint', 'Your water service', 'Search the complaint'],
    sw_KE: ['Ingiza malalamiko', 'Huduma ya maji yako', 'Tafuta malalamiko'],
  };
  const fetchImpl = async (url, opts) => {
    calls.push(url);
    if (fail) throw new Error('down');
    if (url.includes('mdms')) {
      return { ok: true, json: async () => ({ MdmsRes: { 'common-masters': { StateInfo: [{ languages: locales.map((value) => ({ value })) }] } } }) };
    }
    const locale = new URL(url).searchParams.get('locale');
    return { ok: true, json: async () => ({ messages: (msgs[locale] || []).map((message) => ({ message })) }) };
  };
  return { fetchImpl, calls };
}
const cfg = {
  enabled: true, host: 'http://loc', searchPath: '/s', mdmsHost: 'http://mdms', mdmsSearchPath: '/m',
  ttlMs: 1000, errorRetryMs: 100, timeoutMs: 1000, selection: { maxWords: 50, minShare: 0, ratio: 2 },
};
const quiet = { info() {}, warn() {}, error() {} };

test('vocabulary uses the state tenant, StateInfo locales, and caches', async () => {
  const d = fakeDigit();
  const v = createLocalizationVocabulary(cfg, { fetchImpl: d.fetchImpl, log: quiet, now: () => 0 });
  const m = await v.get('bo.bomet');
  assert.ok(m.get('sw').includes('malalamiko'));
  assert.ok(m.get('en').includes('the'));
  assert.ok(d.calls.every((u) => !u.includes('locale=') || u.includes('tenantId=bo')));
  const n = d.calls.length;
  await v.get('bo');
  assert.equal(d.calls.length, n, 'second call served from cache');
});

test('vocabulary returns empty when localization is down or disabled', async () => {
  const down = createLocalizationVocabulary(cfg, { fetchImpl: fakeDigit({ fail: true }).fetchImpl, log: quiet });
  assert.equal((await down.get('bo')).size, 0);
  const off = createLocalizationVocabulary({ ...cfg, enabled: false }, { fetchImpl: () => assert.fail('called') });
  assert.equal((await off.get('bo')).size, 0);
});

test('triage detection combines MDMS lists and localization vocabulary', async () => {
  const logs = [];
  const vocab = new Map([['sw', ['malalamiko', 'huduma']], ['xx', ['blorp']]]);
  const t = createTriage({
    cfg: { rules: { basePriority: {}, defaultPriority: 'MEDIUM' }, llm: { minConfidence: 0.5, model: 'm' }, createRetries: 1, createRetryDelayMs: 0, updateSettleMs: 0 },
    store: { setPriority: async () => true, getPriority: async () => ({ exists: true, priority: null }) },
    llm: { enabled: false },
    vocabulary: { get: async () => vocab },
    log: { info: (m) => logs.push(m), warn() {}, error() {} },
    wait: async () => {},
  });
  const r = await t.assess({ tenantId: 'bo', serviceRequestId: 'X', serviceCode: 'c', description: 'Malalamiko ya huduma: blorp, maze msee' });
  assert.ok(r.languages.sw >= 3, JSON.stringify(r.languages)); // malalamiko, huduma (localization) + ya (MDMS)
  assert.equal(r.languages.xx, 1); // language known only from localization
  assert.ok(r.languages.sheng >= 2); // language known only from MDMS hints
});
