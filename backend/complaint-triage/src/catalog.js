// Complaint-type details from MDMS, sent to the model as context so it can
// judge urgency even when the citizen wrote very little.
//
// Source: RAINMAKER-PGR.ComplaintHierarchy (code, name, path, parentCode,
// department, slaHours). Tenants on the older RAINMAKER-PGR.ServiceDefs
// (serviceCode, name, menuPath, department, slaHours) are read as a fallback.
// Nothing here is personal data: it's the county's own catalogue.

export function buildCatalog(hierarchy = [], serviceDefs = []) {
  const byCode = new Map();
  const names = new Map(hierarchy.map((h) => [h.code, h.name]));
  for (const h of hierarchy) {
    if (!h?.code) continue;
    const pathCodes = String(h.path || h.code).split('.');
    const parents = pathCodes.slice(0, -1).map((c) => names.get(c) || c);
    byCode.set(h.code, {
      name: h.name || h.code,
      category: parents.join(' > ') || null,
      department: h.department || (Array.isArray(h.departments) ? h.departments[0] : null) || null,
      slaHours: Number.isFinite(Number(h.slaHours)) && h.slaHours !== null ? Number(h.slaHours) : null,
      raw: h, // every attribute of the MDMS record, for catalog fields defined in TriageConfig
    });
  }
  for (const s of serviceDefs) {
    if (!s?.serviceCode || byCode.has(s.serviceCode)) continue;
    byCode.set(s.serviceCode, {
      name: s.name || s.serviceCode,
      category: s.menuPath || null,
      department: s.department || null,
      slaHours: Number.isFinite(Number(s.slaHours)) && s.slaHours !== null ? Number(s.slaHours) : null,
      raw: s,
    });
  }
  return byCode;
}

export function createComplaintCatalog(cfg, { fetchImpl = fetch, log = console, now = Date.now } = {}) {
  const cache = new Map(); // tenantId -> { catalog, at }

  async function fetchMasters(tenantId) {
    const res = await fetchImpl(`${cfg.host}${cfg.searchPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        RequestInfo: { apiId: 'complaint-triage' },
        MdmsCriteria: {
          tenantId,
          moduleDetails: [{ moduleName: 'RAINMAKER-PGR', masterDetails: [{ name: 'ComplaintHierarchy' }, { name: 'ServiceDefs' }] }],
        },
      }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });
    if (!res.ok) throw new Error(`MDMS ${res.status}`);
    const m = (await res.json())?.MdmsRes?.['RAINMAKER-PGR'] || {};
    return buildCatalog(m.ComplaintHierarchy || [], m.ServiceDefs || []);
  }

  async function get(tenantId) {
    const hit = cache.get(tenantId);
    if (hit && now() - hit.at < cfg.ttlMs) return hit.catalog;
    try {
      let catalog = await fetchMasters(tenantId);
      if (catalog.size === 0 && tenantId.includes('.')) catalog = await fetchMasters(tenantId.split('.')[0]);
      cache.set(tenantId, { catalog, at: now() });
      if (!hit) log.info?.(`complaint catalogue for ${tenantId}: ${catalog.size} types`);
      return catalog;
    } catch (err) {
      log.warn?.(`could not load complaint catalogue for ${tenantId}: ${err.message}`);
      const catalog = hit?.catalog || new Map();
      cache.set(tenantId, { catalog, at: now() - cfg.ttlMs + cfg.errorRetryMs });
      return catalog;
    }
  }

  return { get };
}

// ── Context fields sent to the model ──────────────────────────────────────
//
// A field is defined (in MDMS RAINMAKER-PGR.TriageConfig, or by built-in name) as:
//   { key, label, from: "catalog" | "complaint", path, transform }
//     from: catalog    any attribute of the complaint type's MDMS record
//                      (computed: name, category, department, slaHours; or any raw key)
//     from: complaint  any dotted path in the complaint event, e.g. "additionalDetail.department"
//     transform: value (default) | yesNo | count | hours
//
// Safety rules below live in code so no MDMS record can send personal data:
//   - "value" from the complaint is refused under personal roots and for any
//     path segment that looks personal or free-text. yesNo / count are allowed
//     (they reveal only presence or a number).
//   - Every value is capped and passed through the personal-detail scrubber;
//     if it isn't clean, the field is dropped.
//   - Objects are never sent as values.

export const TRANSFORMS = ['value', 'yesNo', 'count', 'hours'];
export const SOURCES = ['catalog', 'complaint'];

// Built-in fields, usable by name in MDMS or MODEL_CONTEXT_FIELDS.
export const BUILT_IN_FIELDS = {
  typeName: { key: 'typeName', label: 'Complaint type', from: 'catalog', path: 'name' },
  category: { key: 'category', label: 'Category', from: 'catalog', path: 'category' },
  department: { key: 'department', label: 'Department', from: 'complaint', path: 'additionalDetail.department', fallback: { from: 'catalog', path: 'department' } },
  sla: { key: 'sla', label: 'County target resolution time', from: 'catalog', path: 'slaHours', transform: 'hours' },
  photo: { key: 'photo', label: 'Photo attached', from: 'complaint', path: 'documents', transform: 'count' },
  channel: { key: 'channel', label: 'Channel', from: 'complaint', path: 'source' },
};
export const CONTEXT_FIELDS = Object.keys(BUILT_IN_FIELDS);

const DENY_ROOTS = new Set([
  'citizen', 'address', 'id', 'accountId', 'serviceRequestId', 'tenantId', 'auditDetails',
  'processInstance', 'workflow', 'documents', 'extendedAttributes', 'description',
]);
// Words in a field name that suggest personal data or citizen-written free text.
// Field names are split into words (camelCase, snake_case): "supervisorContactNumber"
// -> supervisor, contact, number; "escalationLevel" -> escalation, level.
const PERSONAL_WORDS = new Set([
  'name', 'names', 'phone', 'mobile', 'email', 'mail', 'contact', 'address', 'user', 'username', 'uuid',
  'id', 'ids', 'account', 'citizen', 'gps', 'geo', 'geolocation', 'lat', 'latitude', 'lon', 'lng',
  'longitude', 'location', 'locality', 'ward', 'landmark', 'street', 'door', 'plot', 'building',
  'pincode', 'national', 'passport', 'kra', 'pin', 'dob', 'birth', 'photo', 'image', 'file', 'filestore',
  'comment', 'comments', 'reason', 'feedback', 'remark', 'remarks', 'note', 'notes', 'description',
  'text', 'message', 'assignee', 'assignees', 'assignes', 'assigner', 'consent', 'consents', 'supervisor',
]);
// Also refused when they appear anywhere inside a field name.
const PERSONAL_SUBSTRINGS = /phone|mobile|email|address|contact|passport/i;

function words(segment) {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_\-]+/)
    .map((w) => w.toLowerCase())
    .filter(Boolean);
}

export function checkFieldSafety(def) {
  if (def.from === 'catalog') return { ok: true };
  if (def.transform === 'yesNo' || def.transform === 'count') return { ok: true };
  const segs = String(def.path).split('.');
  if (DENY_ROOTS.has(segs[0])) return { ok: false, why: `"${segs[0]}" holds personal or identifying data` };
  const bad = segs.find((s) => PERSONAL_SUBSTRINGS.test(s) || words(s).some((w) => PERSONAL_WORDS.has(w)));
  if (bad) return { ok: false, why: `"${bad}" looks personal or free text` };
  return { ok: true };
}

// Turn names / objects (from MDMS or env) into checked definitions.
// Returns { defs, rejected: [{ field, why }] }.
export function normalizeFields(list) {
  const defs = [];
  const rejected = [];
  for (const item of Array.isArray(list) ? list : []) {
    let def;
    if (typeof item === 'string') {
      def = BUILT_IN_FIELDS[item];
      if (!def) { rejected.push({ field: item, why: 'unknown built-in field name' }); continue; }
    } else if (item && typeof item === 'object') {
      const base = item.key && BUILT_IN_FIELDS[item.key] && !item.path ? BUILT_IN_FIELDS[item.key] : {};
      def = { ...base, ...item };
      def.transform = def.transform || 'value';
      if (!def.key || !def.path) { rejected.push({ field: item.key || JSON.stringify(item), why: 'needs key and path' }); continue; }
      if (!SOURCES.includes(def.from)) { rejected.push({ field: def.key, why: `from must be ${SOURCES.join(' or ')}` }); continue; }
      if (!TRANSFORMS.includes(def.transform)) { rejected.push({ field: def.key, why: `transform must be one of ${TRANSFORMS.join(', ')}` }); continue; }
      if (!/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(def.path)) { rejected.push({ field: def.key, why: 'path must be dotted field names' }); continue; }
    } else {
      continue;
    }
    const safe = checkFieldSafety(def);
    if (!safe.ok) { rejected.push({ field: def.key, why: safe.why }); continue; }
    if (defs.some((d) => d.key === def.key)) continue;
    defs.push({ label: def.key, transform: 'value', ...def });
  }
  return { defs, rejected };
}

const get = (obj, path) => String(path).split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), obj);

const clean = (v, max = 150) => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  return s || null;
};

function readValue(def, service, entry) {
  if (def.from === 'catalog') {
    const v = entry?.[def.path];
    return v !== undefined && v !== null && def.path !== 'raw' ? v : get(entry?.raw, def.path);
  }
  return get(service, def.path);
}

function format(def, v) {
  const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
  switch (def.transform) {
    case 'yesNo': return empty ? 'no' : 'yes';
    case 'count': return empty ? 'no' : `yes (${Array.isArray(v) ? v.length : 1})`;
    case 'hours': return Number.isFinite(Number(v)) && !empty ? `${Number(v)} hours` : null;
    default:
      if (empty || (typeof v === 'object' && !Array.isArray(v))) return null;
      if (Array.isArray(v)) return v.every((x) => typeof x !== 'object') ? clean(v.join(', ')) : null;
      return clean(v);
  }
}

// Builds the non-personal context for one complaint.
// `defs`: checked definitions (normalizeFields) or built-in names.
// `isClean(text)`: the personal-detail check; values that fail it are dropped.
export function buildContext(service, catalog, defs = CONTEXT_FIELDS, { isClean = () => true, log } = {}) {
  const list = defs.length && typeof defs[0] === 'string' ? normalizeFields(defs).defs : defs;
  const entry = catalog?.get?.(service.serviceCode);
  const items = [];
  for (const def of list) {
    let value = format(def, readValue(def, service, entry));
    if ((value === null || value === undefined) && def.fallback) value = format({ ...def, ...def.fallback }, readValue({ ...def, ...def.fallback }, service, entry));
    if (value === null || value === undefined) continue;
    if (def.transform === 'value' && !isClean(value)) {
      log?.warn?.(`context field "${def.key}" for ${service.serviceRequestId} may contain personal details; not sent`);
      continue;
    }
    items.push({ key: def.key, label: clean(def.label, 60) || def.key, value });
  }
  return { complaintType: clean(service.serviceCode, 200), items };
}

// Flat view for logs and reports: { complaintType, typeName: ..., sla: ... }.
export function contextToObject(ctx) {
  return { complaintType: ctx.complaintType, ...Object.fromEntries((ctx.items || []).map((i) => [i.key, i.value])) };
}
