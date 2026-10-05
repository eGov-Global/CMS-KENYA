import test from "node:test";
import assert from "node:assert/strict";
import { RATING_SCALE, ratingStep, ratingLabel } from "../products/pgr/src/utils/ratingScale.js";

test("the scale is the same 1–5 integer pgr-services already stores", () => {
  assert.deepEqual(RATING_SCALE.map((s) => s.value), [1, 2, 3, 4, 5]);
  assert.equal(new Set(RATING_SCALE.map((s) => s.emoji)).size, 5);
  assert.equal(new Set(RATING_SCALE.map((s) => s.key)).size, 5);
});

test("ratingStep accepts the number as stored or as a string, rejects anything else", () => {
  assert.equal(ratingStep(4).emoji, "🙂");
  assert.equal(ratingStep("2").value, 2);
  assert.equal(ratingStep(0), null);
  assert.equal(ratingStep(6), null);
  assert.equal(ratingStep(undefined), null);
});

test("ratingLabel prefers the seeded message and falls back to English when the key is unseeded", () => {
  const seeded = (k) => (k === "CS_RATING_LABEL_5" ? "Muito satisfeito" : k);
  assert.equal(ratingLabel(seeded, 5), "Muito satisfeito");
  assert.equal(ratingLabel(seeded, 1), "Very unhappy");
  assert.equal(ratingLabel(seeded, 9), "");
});
