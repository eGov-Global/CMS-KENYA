// Per-tenant triage settings from MDMS (RAINMAKER-PGR.TriageConfig).
//
// `contextFields` lists the non-personal complaint details sent to the model.
// Each entry is a built-in name ("typeName", "sla", …) or a full definition:
//   { "key": "reopened", "label": "Complaint reopened", "from": "complaint",
//     "path": "additionalDetail.REOPEN_REASON", "transform": "yesNo" }
// so new fields can be added in MDMS without a code change. The safety rules in
// catalog.js (checkFieldSafety + the scrubber) still apply to every field: an
// entry that would send personal data is ignored and logged.
//
// Lookup: the complaint's tenant, then its state root. No record, or MDMS down:
// the MODEL_CONTEXT_FIELDS environment default is used.

import { normalizeFields } from './catalog.js';

export function pickContextFields(record, fallback, log = console, tenantId = '') {
  if (!record || !Array.isArray(record.contextFields)) return { fields: fallback, from: 'default' };
  const { defs, rejected } = normalizeFields(record.contextFields);
  for (const r of rejected) {
    log.warn?.(`TriageConfig for ${tenantId}: field "${r.field}" ignored (${r.why})`);
  }
  return { fields: defs, from: 'mdms' };
}

export function createTriageConfigSource(cfg, { fetchImpl = fetch, log = console, now = Date.now } = {}) {
  const cache = new Map(); // tenantId -> { value, at }
  const keys = (fields) => fields.map((f) => (typeof f === 'string' ? f : f.key)).join(', ');

  async function fetchRecord(tenantId) {
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
    const list = (await res.json())?.MdmsRes?.[cfg.module]?.[cfg.master];
    if (!Array.isArray(list)) return null;
    // One record per tenant; prefer code "default" if several exist.
    return list.find((r) => r?.code === 'default' && r.active !== false) || list.find((r) => r?.active !== false) || null;
  }

  async function load(tenantId) {
    const tenants = [tenantId];
    if (tenantId.includes('.')) tenants.push(tenantId.split('.')[0]);
    for (const t of tenants) {
      const record = await fetchRecord(t);
      if (record) return { ...pickContextFields(record, cfg.defaultContextFields, log, t), tenant: t };
    }
    return { fields: cfg.defaultContextFields, from: 'default' };
  }

  async function get(tenantId) {
    const hit = cache.get(tenantId);
    if (hit && now() - hit.at < cfg.ttlMs) return hit.value;
    let value;
    try {
      value = await load(tenantId);
    } catch (err) {
      log.warn?.(`could not load TriageConfig for ${tenantId}: ${err.message}`);
      value = hit?.value || { fields: cfg.defaultContextFields, from: 'default' };
      cache.set(tenantId, { value, at: now() - cfg.ttlMs + cfg.errorRetryMs });
      return value;
    }
    if (!hit || keys(hit.value.fields) !== keys(value.fields)) {
      log.info?.(`model context fields for ${tenantId} (${value.from}${value.tenant ? `:${value.tenant}` : ''}): ${keys(value.fields) || 'type code only'}`);
    }
    cache.set(tenantId, { value, at: now() });
    return value;
  }

  return { get };
}
