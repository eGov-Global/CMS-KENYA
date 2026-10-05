// Five-point satisfaction scale behind the emoji rating. `value` is what
// pgr-services stores in service.rating (1–5, unchanged from the star days), so
// dashboards, exports and older bundles keep reading the same number; the face
// and the label are presentation only. Kept free of JSX so it is unit-testable.
export const RATING_SCALE = [
  { value: 1, emoji: "😠", key: "CS_RATING_LABEL_1", fallback: "Very unhappy" },
  { value: 2, emoji: "🙁", key: "CS_RATING_LABEL_2", fallback: "Unhappy" },
  { value: 3, emoji: "😐", key: "CS_RATING_LABEL_3", fallback: "Okay" },
  { value: 4, emoji: "🙂", key: "CS_RATING_LABEL_4", fallback: "Happy" },
  { value: 5, emoji: "😄", key: "CS_RATING_LABEL_5", fallback: "Very happy" },
];

export const ratingStep = (value) => RATING_SCALE.find((s) => s.value === Number(value)) || null;

/** t() with a fallback for unseeded keys, so a missing message never renders raw. */
export const trRating = (t, key, fallback) => {
  const v = typeof t === "function" ? t(key) : key;
  return v === key ? fallback : v;
};

export const ratingLabel = (t, value) => {
  const step = ratingStep(value);
  return step ? trRating(t, step.key, step.fallback) : "";
};
