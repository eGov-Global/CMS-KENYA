// A–Z by the label the user actually reads, with the catch-all "Other(s)"
// entry kept last: alphabetical order would bury it mid-list, and it is the
// fallback people reach for when nothing else fits.
const OTHERS = /^\s*others?\s*$/i;

export const compareLabels = (a, b) => {
  const la = String(a || ""), lb = String(b || "");
  const ao = OTHERS.test(la), bo = OTHERS.test(lb);
  if (ao !== bo) return ao ? 1 : -1;
  return la.localeCompare(lb, undefined, { sensitivity: "base" });
};

export const sortByLabel = (items, label) => [...(items || [])].sort((a, b) => compareLabels(label(a), label(b)));
