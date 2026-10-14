import test from "node:test";
import assert from "node:assert/strict";
import { actionWindowState, resolveActionWindow } from "../products/pgr/src/utils/actionWindow.js";

const MIN = 60 * 1000;
const T0 = 1_791_500_000_000; // the complaint's resolve time
const audit = { createdTime: T0 - 10 * MIN, lastModifiedTime: T0 };
const bonga = { code: "DEFAULT", REOPENSLA: MIN, actionWindows: [{ action: "REOPEN", windowKey: "REOPENSLA", measuredFrom: "lastModifiedTime" }] };

test("REOPEN counts from the last update: open inside REOPENSLA, closed after it", () => {
  assert.deepEqual(actionWindowState({ layers: [bonga], action: "REOPEN", auditDetails: audit, now: T0 + 30_000 }), { open: true, known: true, deadline: T0 + MIN });
  assert.equal(actionWindowState({ layers: [bonga], action: "REOPEN", auditDetails: audit, now: T0 + MIN + 1 }).open, false);
});

test("boundary matches pgr-services: elapsed equal to the window is still open, one ms more is closed", () => {
  assert.equal(actionWindowState({ layers: [bonga], action: "REOPEN", auditDetails: audit, now: T0 + MIN }).open, true);
  assert.equal(actionWindowState({ layers: [bonga], action: "REOPEN", auditDetails: audit, now: T0 + MIN + 1 }).open, false);
});

test("no actionWindows rule: the deployment default applies (REOPENSLA from lastModifiedTime)", () => {
  const record = { code: "DEFAULT", REOPENSLA: 3 * MIN };
  assert.deepEqual(resolveActionWindow([record], "REOPEN"), { action: "REOPEN", measuredFrom: "lastModifiedTime", windowMs: 3 * MIN });
  assert.equal(actionWindowState({ layers: [record], action: "REOPEN", auditDetails: audit, now: T0 + 4 * MIN }).open, false);
});

test("a configured rule can count from filing instead (measuredFrom createdTime, case-insensitive)", () => {
  const record = { REOPENSLA: 15 * MIN, actionWindows: [{ action: "reopen", windowKey: "REOPENSLA", measuredFrom: " CREATEDTIME " }] };
  const s = actionWindowState({ layers: [record], action: "REOPEN", auditDetails: audit, now: T0 + 6 * MIN });
  assert.deepEqual(s, { open: false, known: true, deadline: audit.createdTime + 15 * MIN });
});

test("inline windowMs wins over windowKey", () => {
  const record = { REOPENSLA: 3 * 24 * 60 * MIN, actionWindows: [{ action: "REOPEN", windowKey: "REOPENSLA", windowMs: 2 * MIN, measuredFrom: "lastModifiedTime" }] };
  assert.equal(resolveActionWindow([record], "REOPEN").windowMs, 2 * MIN);
});

test("complaint tenant first, then the state record: rule and value fall through layer by layer", () => {
  const city = { code: "DEFAULT" }; // no value, no rule
  const state = { REOPENSLA: 5 * MIN, actionWindows: [{ action: "REOPEN", windowKey: "REOPENSLA", measuredFrom: "lastModifiedTime" }] };
  assert.equal(resolveActionWindow([city, state], "REOPEN").windowMs, 5 * MIN);
  const cityOverride = { REOPENSLA: MIN };
  assert.equal(resolveActionWindow([cityOverride, state], "REOPEN").windowMs, MIN, "the city value beats the state value");
});

test("unknowns defer to the server: no value anywhere, a non-positive value, or no timestamp keep the action", () => {
  assert.deepEqual(actionWindowState({ layers: [], action: "REOPEN", auditDetails: audit, now: T0 + 99 * MIN }), { open: true, known: false });
  assert.deepEqual(actionWindowState({ layers: [{ REOPENSLA: 0 }], action: "REOPEN", auditDetails: audit, now: T0 + 99 * MIN }), { open: true, known: false });
  assert.deepEqual(actionWindowState({ layers: [bonga], action: "REOPEN", auditDetails: {}, now: T0 + 99 * MIN }), { open: true, known: false });
});

test("a rule's fallbackMs is used when its windowKey has no value", () => {
  const record = { actionWindows: [{ action: "REOPEN", windowKey: "REOPENSLA", measuredFrom: "lastModifiedTime", fallbackMs: 2 * MIN }] };
  assert.equal(resolveActionWindow([record], "REOPEN").windowMs, 2 * MIN);
});

test("an unrecognised measuredFrom is closed, because pgr-services fails closed on it", () => {
  const record = { REOPENSLA: MIN, actionWindows: [{ action: "REOPEN", windowKey: "REOPENSLA", measuredFrom: "resolvedTime" }] };
  assert.deepEqual(actionWindowState({ layers: [record], action: "REOPEN", auditDetails: audit, now: T0 }), { open: false, known: true });
});

test("actions without a rule or default are not time-limited", () => {
  assert.equal(resolveActionWindow([bonga], "RATE"), null);
  assert.deepEqual(actionWindowState({ layers: [bonga], action: "RATE", auditDetails: audit, now: T0 + 999 * MIN }), { open: true, known: false });
});

test("WITHDRAW default counts from filing (WITHDRAWSLA, createdTime)", () => {
  assert.deepEqual(resolveActionWindow([{ WITHDRAWSLA: 3 * MIN }], "WITHDRAW"), { action: "WITHDRAW", measuredFrom: "createdTime", windowMs: 3 * MIN });
});
