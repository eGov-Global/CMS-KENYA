// node --test docs/migration/lib/*.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { planLocUpserts } = require('./loc-plan.cjs');

const row = (code, message, module = 'rainmaker-pgr') => ({ code, message, module, locale: 'en_IN' });
const codes = (rows) => rows.map((r) => r.code);

const SEED = [
  row('PGR_RECEIPT_TITLE', 'Complaint receipt'),
  row('CS_ACTION_ESCALATE', 'Escalate Complaint'),
  row('PGR_EXT_IS_CONFIDENTIAL_HINT', 'Your name and phone number are not shown to the county officers handling this complaint.'),
  row('CS_ACTION_RESOLVE', 'Resolve'),
  row('PGR_LANDING_HERO_TITLE', 'Report a problem'),
];

test('seed keys the tenant lacks are added; present ones are kept untouched', () => {
  const live = { CS_ACTION_RESOLVE: 'Resolve Complaint', PGR_EXT_IS_CONFIDENTIAL_HINT: 'old sentence' };
  const plan = planLocUpserts({ seed: SEED, live });
  assert.deepStrictEqual(codes(plan.add), ['PGR_RECEIPT_TITLE', 'CS_ACTION_ESCALATE']);
  assert.deepStrictEqual(plan.update, []);
  assert.strictEqual(plan.kept, 2);
});

test('an existing key is overwritten only when listed and only when its text differs', () => {
  const live = { CS_ACTION_RESOLVE: 'Resolve Complaint', PGR_EXT_IS_CONFIDENTIAL_HINT: 'old sentence', PGR_RECEIPT_TITLE: 'Complaint receipt', CS_ACTION_ESCALATE: 'Escalate Complaint' };
  const plan = planLocUpserts({ seed: SEED, live, updateKeys: ['PGR_EXT_IS_CONFIDENTIAL_HINT', 'PGR_RECEIPT_TITLE'] });
  assert.deepStrictEqual(codes(plan.update), ['PGR_EXT_IS_CONFIDENTIAL_HINT']);
  assert.deepStrictEqual(plan.add, []);
  // CS_ACTION_RESOLVE differs from the seed but was not listed: kept.
  assert.strictEqual(plan.kept, 3);
});

test('PGR_LANDING_* keys are never planned, even when missing or listed for update', () => {
  const plan = planLocUpserts({ seed: SEED, live: {}, updateKeys: ['PGR_LANDING_HERO_TITLE'] });
  assert.ok(!codes(plan.add).includes('PGR_LANDING_HERO_TITLE'));
  assert.deepStrictEqual(plan.update, []);
  assert.strictEqual(plan.excluded, 1);
  assert.deepStrictEqual(plan.unknownUpdate, []);
});

test('a listed key the seed does not define is reported, not silently ignored', () => {
  const plan = planLocUpserts({ seed: SEED, live: {}, updateKeys: ['PGR_EXT_IS_CONFIDENTAIL_HINT'] });
  assert.deepStrictEqual(plan.unknownUpdate, ['PGR_EXT_IS_CONFIDENTAIL_HINT']);
});

test('a listed key the tenant lacks is simply added', () => {
  const plan = planLocUpserts({ seed: SEED, live: {}, updateKeys: ['PGR_RECEIPT_TITLE'] });
  assert.ok(codes(plan.add).includes('PGR_RECEIPT_TITLE'));
  assert.deepStrictEqual(plan.update, []);
});

test('duplicate and malformed seed rows are planned once or skipped', () => {
  const seed = [row('A', 'one'), row('A', 'two'), { code: 'B' }, null, row('C', 'three')];
  const plan = planLocUpserts({ seed, live: {} });
  assert.deepStrictEqual(plan.add.map((r) => [r.code, r.message]), [['A', 'one'], ['C', 'three']]);
});

test('live may be a Map, and an empty seed plans nothing', () => {
  const plan = planLocUpserts({ seed: [row('A', 'one')], live: new Map([['A', 'one']]) });
  assert.deepStrictEqual(plan, { add: [], update: [], kept: 1, excluded: 0, unknownUpdate: [] });
  assert.deepStrictEqual(planLocUpserts({ seed: undefined, live: undefined }).add, []);
});
