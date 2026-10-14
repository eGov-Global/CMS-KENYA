'use strict';
/**
 * Pure planner for the runner's `loc` phase: which seed messages to send to a
 * tenant whose localisation has drifted behind the repository seeds.
 *
 *   - a seed key the tenant lacks           -> add
 *   - a seed key the tenant has             -> kept, UNLESS it is listed in
 *     `updateKeys` and its live text differs -> update (explicit overwrite)
 *   - PGR_LANDING_* (and any `excludePrefixes`) -> never touched here: the
 *     landing phase owns those, and on forks whose landing copy lives in code
 *     (Nairobi) seeding them would override the built-in text.
 *
 * `live` maps code -> message as served by /localization/messages/v1/_search.
 * Duplicate codes in a seed file are planned once (first occurrence wins).
 * `unknownUpdate` lists requested overwrite keys the seed does not define, so
 * a typo in --loc-update is reported instead of silently doing nothing.
 */
const LANDING_PREFIX = 'PGR_LANDING_';

function planLocUpserts({ seed, live, updateKeys = [], excludePrefixes = [LANDING_PREFIX] }) {
  const liveMap = live instanceof Map ? live : new Map(Object.entries(live || {}));
  const wanted = new Set(updateKeys);
  const add = [];
  const update = [];
  const seen = new Set();
  let kept = 0;
  let excluded = 0;
  for (const m of Array.isArray(seed) ? seed : []) {
    if (!m || typeof m.code !== 'string' || typeof m.message !== 'string') continue;
    if (seen.has(m.code)) continue;
    seen.add(m.code);
    if (excludePrefixes.some((p) => m.code.startsWith(p))) { excluded++; continue; }
    if (!liveMap.has(m.code)) add.push(m);
    else if (wanted.has(m.code) && liveMap.get(m.code) !== m.message) update.push(m);
    else kept++;
  }
  const unknownUpdate = [...wanted].filter((k) => !seen.has(k));
  return { add, update, kept, excluded, unknownUpdate };
}

module.exports = { planLocUpserts, LANDING_PREFIX };
