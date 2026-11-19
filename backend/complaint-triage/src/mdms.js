// Loads PII patterns from MDMS (RAINMAKER-PGR.PiiPatterns) and caches them per
// tenant. Changes in MDMS take effect within `ttlMs`, no restart needed.
// If MDMS fails or has no active records, the built-in defaults are used.

import { DEFAULT_COMPILED, compilePatterns } from './scrub.js';

export function createPatternSource(cfg, { fetchImpl = fetch, log = console, now = Date.now } = {}) {
  const cache = new Map(); // tenantId -> { patterns, at }

  async function fetchRecords(tenantId) {
    const res = await fetchImpl(`${cfg.host}${cfg.searchPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        RequestInfo: { apiId: 'complaint-triage' },
        MdmsCriteria: {
          tenantId,
          moduleDetails: [{ moduleName: cfg.module, masterDetails: [{ name: cfg.master }] }],
        },
      }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });
    if (!res.ok) throw new Error(`MDMS ${res.status}`);
    const data = await res.json();
    const list = data?.MdmsRes?.[cfg.module]?.[cfg.master];
    return Array.isArray(list) ? list : [];
  }

  async function load(tenantId) {
    // Try the city tenant first, then its state root (records are usually seeded at "ke").
    const tenants = [tenantId];
    if (tenantId.includes('.')) tenants.push(tenantId.split('.')[0]);
    for (const t of tenants) {
      const records = await fetchRecords(t);
      const compiled = compilePatterns(records, log);
      if (compiled.count > 0) return { patterns: compiled, from: `mdms:${t}` };
    }
    return { patterns: DEFAULT_COMPILED, from: 'built-in (no active MDMS records)' };
  }

  async function get(tenantId) {
    const hit = cache.get(tenantId);
    if (hit && now() - hit.at < cfg.ttlMs) return hit.patterns;

    let result;
    try {
      result = await load(tenantId);
    } catch (err) {
      // Keep the last good set if we had one; otherwise built-in defaults.
      log.warn?.(`could not load PII patterns from MDMS for ${tenantId}: ${err.message}`);
      result = { patterns: hit?.patterns || DEFAULT_COMPILED, from: hit ? 'previous' : 'built-in (MDMS error)' };
      // Retry sooner than the full TTL.
      cache.set(tenantId, { patterns: result.patterns, at: now() - cfg.ttlMs + cfg.errorRetryMs });
      return result.patterns;
    }
    if (!hit || hit.from !== result.from || hit.patterns.count !== result.patterns.count) {
      log.info?.(`PII patterns for ${tenantId}: ${result.patterns.count} from ${result.from}`);
    }
    cache.set(tenantId, { patterns: result.patterns, at: now(), from: result.from });
    return result.patterns;
  }

  return { get };
}
