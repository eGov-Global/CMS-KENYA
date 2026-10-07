import test from "node:test";
import assert from "node:assert/strict";
import { isWithdrawOpen } from "../products/pgr/src/utils/withdraw.js";

const MIN = 60_000;
const filed = 1_000_000_000;

test("inside the window, not reopened: offered", () => {
  assert.equal(isWithdrawOpen({ createdTime: filed, windowMs: 3 * MIN, processInstances: [{ action: "APPLY" }], now: filed + 2 * MIN }), true);
});

test("once the window has passed: hidden", () => {
  assert.equal(isWithdrawOpen({ createdTime: filed, windowMs: 3 * MIN, processInstances: [{ action: "APPLY" }], now: filed + 3 * MIN + 1 }), false);
});

test("reopened complaint: hidden even inside the window", () => {
  const history = [{ action: "REOPEN" }, { action: "RESOLVE" }, { action: "APPLY" }];
  assert.equal(isWithdrawOpen({ createdTime: filed, windowMs: 3 * MIN, processInstances: history, now: filed + MIN }), false);
});

test("window unknown (MDMS not loaded or unusable): defer to the server, offered", () => {
  for (const windowMs of [undefined, null, 0, -1, NaN, "180000"]) {
    assert.equal(isWithdrawOpen({ createdTime: filed, windowMs, processInstances: [], now: filed + 10 * MIN }), true, String(windowMs));
  }
});

test("known window but no usable filing time: hidden (nothing to measure from)", () => {
  assert.equal(isWithdrawOpen({ createdTime: undefined, windowMs: 3 * MIN, processInstances: [] }), false);
});
