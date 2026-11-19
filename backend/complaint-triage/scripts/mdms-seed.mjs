// Registers the complaint-triage MDMS schemas and loads default records for one
// tenant. Idempotent: existing schemas and records (matched by `code`) are left
// untouched, so it never overwrites what a county has already edited.
//
// Runs inside the complaint-triage image on the DIGIT network (no curl/jq needed):
//   node scripts/mdms-seed.mjs --tenant bo --schemas /seed/schema.json \
//        --data RAINMAKER-PGR.PiiPatterns=/seed/PiiPatterns.json \
//        --data RAINMAKER-PGR.TriageConfig=/seed/TriageConfig.json [--dry-run]
//
// Env: MDMS_HOST (default http://egov-mdms-service:8094), MDMS_USER_UUID (audit createdBy).
// Exit code 0 = everything present at the end; 1 = something failed.

import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const all = (name) => args.flatMap((a, i) => (a === name ? [args[i + 1]] : []));
const tenant = opt('--tenant');
const schemaFile = opt('--schemas');
const dataSpecs = all('--data');
const dryRun = args.includes('--dry-run');
const only = opt('--only')?.split(',').map((s) => s.trim()).filter(Boolean); // schema codes to take from --schemas
const HOST = (process.env.MDMS_HOST || 'http://egov-mdms-service:8094').replace(/\/+$/, '');
const USER = process.env.MDMS_USER_UUID || '00000000-0000-0000-0000-000000000000';
const MAX_DESC = 512; // eg_mdms_schema_definition.description is varchar(512); longer is silently dropped

if (!tenant || !schemaFile) {
  console.error('usage: mdms-seed.mjs --tenant <tenant> --schemas <file> [--data <schemaCode>=<file>]... [--dry-run]');
  process.exit(2);
}

const RI = { apiId: 'complaint-triage-installer', userInfo: { uuid: USER, tenantId: tenant, type: 'SYSTEM', roles: [{ code: 'MDMS_ADMIN', tenantId: tenant }] } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;
const say = (s) => console.log(`  ${s}`);

async function post(path, body) {
  const res = await fetch(`${HOST}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ RequestInfo: RI, ...body }), signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}
const errText = (j) => (j?.Errors || []).map((e) => `${e.code}: ${String(e.message).slice(0, 160)}`).join(' | ');

async function schemaExists(code) {
  const { json } = await post('/mdms-v2/schema/v1/_search', { SchemaDefCriteria: { tenantId: tenant, codes: [code] } });
  return (json.SchemaDefinitions || []).some((s) => s.code === code);
}

async function existingCodes(schemaCode) {
  const [module, master] = schemaCode.split('.');
  const { json } = await post('/mdms-v2/v1/_search', {
    MdmsCriteria: { tenantId: tenant, moduleDetails: [{ moduleName: module, masterDetails: [{ name: master }] }] },
  });
  return new Set((json?.MdmsRes?.[module]?.[master] || []).map((r) => r.code));
}

// MDMS saves through Kafka + persister, so a 202 doesn't mean stored. Poll.
async function waitFor(check, what) {
  for (let i = 0; i < 15; i++) {
    if (await check()) return true;
    await sleep(2000);
  }
  say(`FAILED: ${what} was accepted but not stored after 30s (check egov-persister logs)`);
  failed = true;
  return false;
}

// ── schemas ──────────────────────────────────────────────────────────
const schemas = JSON.parse(fs.readFileSync(schemaFile, 'utf8')).filter((s) => !only || only.includes(s.code));
if (only && schemas.length !== only.length) {
  console.error(`schema file is missing: ${only.filter((c) => !schemas.some((s) => s.code === c)).join(', ')}`);
  process.exit(1);
}
console.log(`MDMS schemas for tenant ${tenant}:`);
for (const s of schemas) {
  if ((s.description || '').length > MAX_DESC) {
    say(`FAILED: ${s.code} description is ${s.description.length} chars (max ${MAX_DESC}); fix the schema file`);
    failed = true;
    continue;
  }
  if (await schemaExists(s.code)) { say(`exists   ${s.code}`); continue; }
  if (dryRun) { say(`would create ${s.code}`); continue; }
  const { status, json } = await post('/mdms-v2/schema/v1/_create', { SchemaDefinition: { ...s, tenantId: tenant } });
  if (status >= 300) { say(`FAILED   ${s.code}: HTTP ${status} ${errText(json)}`); failed = true; continue; }
  if (await waitFor(() => schemaExists(s.code), s.code)) say(`created  ${s.code}`);
}

// ── data ─────────────────────────────────────────────────────────────
for (const spec of dataSpecs) {
  const [schemaCode, file] = spec.split('=');
  const records = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`MDMS records ${schemaCode} for tenant ${tenant}:`);
  if (!dryRun && !(await schemaExists(schemaCode))) { say(`FAILED: schema ${schemaCode} is missing; records not loaded`); failed = true; continue; }
  const have = dryRun && !(await schemaExists(schemaCode)) ? new Set() : await existingCodes(schemaCode);
  let created = 0;
  let skipped = 0;
  for (const data of records) {
    if (have.has(data.code)) { skipped++; continue; }
    if (dryRun) { created++; continue; }
    const { status, json } = await post(`/mdms-v2/v2/_create/${schemaCode}`, {
      Mdms: { tenantId: tenant, schemaCode, uniqueIdentifier: data.code, data, isActive: true },
    });
    if (status >= 300) { say(`FAILED   ${data.code}: HTTP ${status} ${errText(json)}`); failed = true; continue; }
    created++;
  }
  const verb = dryRun ? 'would create' : 'created';
  say(`${verb} ${created}, already present ${skipped} (of ${records.length})`);
  if (!dryRun && created > 0) {
    await waitFor(async () => (await existingCodes(schemaCode)).size >= have.size + created, `${schemaCode} records`);
  }
}

process.exit(failed ? 1 : 0);
