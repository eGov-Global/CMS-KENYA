-- Generic time-limited workflow actions on RAINMAKER-PGR.UIConstants.
--
-- Adds two properties to the UIConstants schema:
--   WITHDRAWSLA    milliseconds after FILING during which a complaint may be withdrawn
--                  (by the citizen, or a counter/call-centre employee on their behalf).
--   actionWindows  rules that make any workflow action time-limited:
--                  [{ "action": "REOPEN",   "windowKey": "REOPENSLA",   "measuredFrom": "lastModifiedTime" },
--                   { "action": "WITHDRAW", "windowKey": "WITHDRAWSLA", "measuredFrom": "createdTime" }]
--                  windowKey names a millisecond property on the same record; windowMs gives it inline;
--                  message / notOwnerMessage (optional) are the error texts once the window has
--                  passed / when a citizen acts on someone else's complaint.
-- Read by pgr-services MDMSUtils.getActionWindow and enforced in
-- ServiceRequestValidator.validateActionWindow. Actions a tenant does not list fall back to the
-- pgr-services deployment defaults (pgr.action.windows.defaults — REOPEN and WITHDRAW as above),
-- so actionWindows itself is optional.
--
-- The schema is additionalProperties:false, so mdms-v2 rejects a record carrying either property
-- until it is declared — and schema/v1/_update is HTTP 501, so, as in
-- V20260827000000__uiconstants_recode_from_reopensla_key.sql, the schema can only be changed at
-- the DB level. Neither property is added to `required`: existing records stay valid as they are,
-- and pgr-services falls back to pgr.complain.withdraw.time (72h) when WITHDRAWSLA is absent.
--
-- The properties added below MUST stay identical to
-- utilities/default-data-handler/src/main/resources/schema/RAINMAKER-PGR.json.
-- When you change one, change the other.
--
-- Idempotent and guarded: each step only touches rows that lack the property, so a re-run and a
-- box that already carries it are both no-ops, and an operator-edited value is never overwritten.

BEGIN;

-- 1. Declare WITHDRAWSLA on every tenant's UIConstants schema that does not have it yet.
UPDATE eg_mdms_schema_definition
   SET definition = jsonb_set(
         definition,
         '{properties,WITHDRAWSLA}',
         $prop${"type": "number", "description": "Milliseconds after filing during which a complaint can still be withdrawn, by the citizen or by a counter/call-centre employee on their behalf. Shipped default 259200000 (72 hours)."}$prop$::jsonb,
         true),
       lastmodifiedby = 'egov-mdms-migration',
       lastmodifiedtime = (extract(epoch from now()) * 1000)::bigint
 WHERE code = 'RAINMAKER-PGR.UIConstants'
   AND definition ? 'properties'
   AND NOT (definition -> 'properties' ? 'WITHDRAWSLA');

-- 2. Declare actionWindows likewise.
UPDATE eg_mdms_schema_definition
   SET definition = jsonb_set(
         definition,
         '{properties,actionWindows}',
         $prop${"type": "array", "description": "Time-limited workflow actions. Each rule: action (workflow action code), windowKey (a millisecond property on this record, e.g. REOPENSLA) or windowMs (inline milliseconds), and measuredFrom (createdTime = filing, lastModifiedTime = last update). message / notOwnerMessage (optional) are the error texts once the window has passed / when a citizen acts on someone else's complaint. Actions not listed use the pgr-services deployment defaults (pgr.action.windows.defaults).", "items": {"type": "object", "required": ["action", "measuredFrom"], "properties": {"action": {"type": "string"}, "windowKey": {"type": "string"}, "windowMs": {"type": "number"}, "measuredFrom": {"type": "string", "enum": ["createdTime", "lastModifiedTime"]}, "message": {"type": "string"}, "notOwnerMessage": {"type": "string"}}, "additionalProperties": false}}$prop$::jsonb,
         true),
       lastmodifiedby = 'egov-mdms-migration',
       lastmodifiedtime = (extract(epoch from now()) * 1000)::bigint
 WHERE code = 'RAINMAKER-PGR.UIConstants'
   AND definition ? 'properties'
   AND NOT (definition -> 'properties' ? 'actionWindows');

-- 3. Seed the shipped 72h withdraw window onto active records that do not carry a value yet.
--    actionWindows is deliberately NOT seeded: the deployment defaults already express it, and
--    leaving it unset keeps REOPEN behaviour byte-for-byte unchanged on every existing tenant.
UPDATE eg_mdms_data
   SET data = data || '{"WITHDRAWSLA": 259200000}'::jsonb,
       lastmodifiedby = 'egov-mdms-migration',
       lastmodifiedtime = (extract(epoch from now()) * 1000)::bigint
 WHERE schemacode = 'RAINMAKER-PGR.UIConstants'
   AND isactive = true
   AND NOT (data ? 'WITHDRAWSLA');

COMMIT;
