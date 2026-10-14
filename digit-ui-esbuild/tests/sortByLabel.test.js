import test from "node:test";
import assert from "node:assert/strict";
import { compareLabels, sortByLabel } from "../products/pgr/src/utils/sortByLabel.js";

test("sorts A–Z by label, case-insensitively", () => {
  const items = [{ l: "Water" }, { l: "abuse of office" }, { l: "Roads" }];
  assert.deepEqual(sortByLabel(items, (i) => i.l).map((i) => i.l), ["abuse of office", "Roads", "Water"]);
});

test("keeps the catch-all Other / Others last", () => {
  const labels = ["Others", "Garbage", "Other", "Animals"].sort(compareLabels);
  assert.deepEqual(labels, ["Animals", "Garbage", "Other", "Others"]);
});

test("tolerates missing labels (treated as empty, kept in input order) and does not mutate its input", () => {
  const items = [{ l: undefined }, { l: "Beta" }, { l: "" }, { l: "Alpha" }];
  const sorted = sortByLabel(items, (i) => i.l);
  assert.deepEqual(sorted.map((i) => i.l), [undefined, "", "Alpha", "Beta"]);
  assert.deepEqual(items.map((i) => i.l), [undefined, "Beta", "", "Alpha"], "input untouched");
});
