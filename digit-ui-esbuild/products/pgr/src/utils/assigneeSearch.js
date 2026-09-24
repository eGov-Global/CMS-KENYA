// Filter the grouped assignee options (department -> employees) by a free-text
// query that may name either a DEPARTMENT or a PERSON. Pure so it is testable
// without the dropdown: a department whose name matches keeps all its people;
// otherwise only the people whose name matches survive, and empty departments
// are dropped so the picker never shows a header with nobody under it.

const norm = (s) => String(s || "").trim().toLowerCase();

/**
 * @param {Array<{code:string,name:string,options:Array<{name:string}>}>} groups
 * @param {string} query
 */
export function filterAssigneeGroups(groups, query) {
  const q = norm(query);
  if (!q) return groups || [];
  return (groups || [])
    .map((g) => {
      if (norm(g.name).includes(q) || norm(g.code).includes(q)) return g;
      const options = (g.options || []).filter((o) => norm(o.name).includes(q));
      return options.length ? { ...g, options } : null;
    })
    .filter(Boolean);
}

/** Number of people across all groups — for the "n employees" hint. */
export const countAssignees = (groups) => (groups || []).reduce((n, g) => n + (g.options?.length || 0), 0);
