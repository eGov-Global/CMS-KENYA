# complaint-triage

Sets a priority level on every new PGR complaint: `LOW`, `MEDIUM`, `HIGH` or `CRITICAL`.
The level is saved as `additionalDetail.priority` on the complaint, so pgr-services search
returns it with no backend change.

## What it does

| Kafka topic | Action |
|---|---|
| `save-pgr-request` (new complaint) | Remove personal details from the description → ask the LLM → save the level |
| `update-pgr-request` (complaint updated) | Check only that `priority` is still there; if the update wiped it, put it back |

It touches nothing else. pgr-services, egov-persister and their queries are unchanged.

The service writes directly to `eg_pgr_service_v2.additionaldetails`, merging only the
`priority` key (`additionaldetails || {"priority": ...}`), so other keys are kept.

### How the level is chosen

1. **Rules level**: `BASE_PRIORITY_JSON[serviceCode]`, otherwise `DEFAULT_PRIORITY` (MEDIUM).
2. **Personal details removed** using patterns from MDMS (see below): phone numbers, emails,
   KRA PINs, M-Pesa codes, vehicle plates, national IDs and passports, house/plot numbers, GPS,
   dates, long numbers, and names that follow a title ("Mama", "Mr", "my name is"…). If anything
   that looks personal is left, the AI is skipped. Names with no title in front are **not**
   detected.
3. **LLM**: gets the cleaned text plus non-personal complaint details (see "What is sent to the
   model"). It returns a level, a reason and a confidence. The AI can raise the level freely, but can lower it by **one level at most**.
   Below `LLM_MIN_CONFIDENCE` its answer is ignored.
4. **Fallback**: no API key, a timeout, rate limiting (429) or a bad answer → rules level.

The reason, source (`ai` / `rules` / `restored`) and confidence are written to the logs as JSON.
They are not stored in the database.

### What is sent to the model

| Sent | Source |
|---|---|
| Description, after personal details are removed | Complaint |
| Complaint type code and name, category (parent in the hierarchy), department, county target resolution time | MDMS `RAINMAKER-PGR.ComplaintHierarchy` (or `ServiceDefs`) |
| Channel (`source`), photo attached yes/no and count | Complaint |

**Never sent:** citizen details, address, ward, GPS, complaint, account and tenant IDs, photos,
`extendedAttributes`, workflow and audit fields.

**Choosing the details per tenant (MDMS `RAINMAKER-PGR.TriageConfig`):**

`contextFields` lists what is sent. Each entry is a built-in name (`typeName`, `category`,
`department`, `sla`, `photo`, `channel`) or a full definition, so **new fields can be added in
MDMS without a code change**:

```json
{ "code": "default", "active": true, "contextFields": [
  "typeName", "category", "sla",
  { "key": "reopened",   "label": "Complaint reopened", "from": "complaint", "path": "additionalDetail.REOPEN_REASON", "transform": "yesNo" },
  { "key": "escalation", "label": "Escalation level",   "from": "complaint", "path": "additionalDetail.escalationLevel" },
  { "key": "keywords",   "label": "Type keywords",      "from": "catalog",   "path": "keywords" }
] }
```

| Part | Meaning |
|---|---|
| `from: "catalog"` | Any attribute of the complaint type's MDMS record (`name`, `category`, `department`, `slaHours`, or any other key such as `keywords`) |
| `from: "complaint"` | A dotted path in the complaint event |
| `transform` | `value` (the text, default), `yesNo` (only whether it has a value), `count` (only how many), `hours` (a number shown as hours) |
| `label` | What the model sees in front of the value |

**Safety rules in code (MDMS cannot override them):**
- `value` from the complaint is refused under `citizen`, `address`, `id`, `accountId`,
  `serviceRequestId`, `tenantId`, `documents`, `extendedAttributes`, `description`, workflow and
  audit fields. It is also refused for any field whose name contains a personal or free-text word
  (name, phone, email, contact, ward, location, comment, reason, feedback, supervisor…). `yesNo` and
  `count` are allowed there, because they only reveal presence or a number.
- Every value goes through the personal-detail scrubber. If it isn't clean, the field is dropped
  and a warning is logged.
- Values are capped at 150 characters. Objects are never sent.
- A refused entry is ignored and logged (`TriageConfig for bo: field "x" ignored (...)`). The
  other fields still apply.

Changes apply within 5 minutes (`TRIAGE_CONFIG_TTL_MS`). The service looks under the complaint's
tenant, then its state root. No record, or MDMS is down: `MODEL_CONTEXT_FIELDS` (built-in names,
default all six) is used.

Seed data: `ansible/nairobi-mdms/mdms/RAINMAKER-PGR/TriageConfig.json` (Nairobi) and
`utilities/default-data-handler/.../mdmsData/RAINMAKER-PGR/RAINMAKER-PGR.TriageConfig.json`
(new tenants). Both list the six built-in fields as full definitions, ready to edit.

Set `LOG_MODEL_INPUT=true` to log exactly what is sent (cleaned text and details) and the field
names received from Kafka. The original text is never logged.

### Restoring after updates

When an update arrives without `priority`, the service reads the stored level straight away,
before the persister applies the update. It then waits `UPDATE_SETTLE_MS` and checks again. If
the level is gone, it writes the old one back, with no AI call. Only if the old level is unknown
does it assess the complaint again.

## Personal-detail patterns (MDMS)

Patterns live in MDMS master **`RAINMAKER-PGR.PiiPatterns`**, so they can be added, edited or
switched off without a redeploy. The service re-reads them every 5 minutes
(`PII_PATTERNS_TTL_MS`). It looks under the complaint's tenant (`ke.nairobi`), then its state root (`ke`).

### Record kinds

| `kind` | Fields | What it does |
|---|---|---|
| `replace` | `regex`, `flags`, `tag` | Swaps each match for `tag`, e.g. `[PHONE]` |
| `block` | `regex`, `flags` | If this still matches after replacing, the text is **not** sent to the AI (the rules level is used) |
| `numberWords` | `language`, `words` | Digit words ("zero, one…", "sifuri, moja…"). Five or more in a row count as a spelled-out number and block the AI. Also used for spelled-out house numbers |
| `nameTitles` | `language`, `words` | Words before a name ("Mama", "Mzee", "Mr", "jina langu ni"). The capitalised words after them become `[NAME]` |
| `addressWords` | `language`, `words`, `labels` | "house", "nyumba", with labels "number", "nambari". So "nyumba nambari 45" becomes `[ADDRESS_NO]` |
| `languageHints` | `language`, `words` | Common words, used **only** to detect the language. Never removes anything |

Common fields: `code` (unique), `order` (lower runs first), `active` (`false` switches a record off), `description`.

```json
{ "code": "NAME_TITLES_SW", "kind": "nameTitles", "language": "sw",
  "words": ["Mama", "Baba", "Mzee", "Bwana", "jina langu ni"], "active": true }
```

### Languages

Seeded languages: English (`en`), Swahili (`sw`) and Sheng (`sheng`, detection only). **To add a
language** (e.g. Portuguese for Mozambique), add `numberWords`, `nameTitles`, `addressWords`
and `languageHints` records with `"language": "pt"`. No code change is needed.

- **Removal uses every active language on every complaint**, not just the detected one.
  Complaints mix English, Swahili and Sheng, and a wrong guess would let details through.
- **Detection** counts word hits per language and logs them with each complaint
  (`"languages": {"sw": 3, "en": 2}`), so you can see which languages residents actually use.

### Language detection from DIGIT localization

Detection words come from two sources, merged per language:

1. **Localization (automatic).** The tenant's languages come from MDMS
   `common-masters.StateInfo.languages`, the same list as the UI language picker (Bomet:
   `en_IN`, `sw_KE`). For each locale the service fetches every localization message and keeps
   the up-to-150 words that are common in that language but rare in the others. For Bomet's
   Swahili that gives *ya, wa, malalamiko, kwa, na, maji, nambari, huduma, hakuna,
   tafadhali…*. Shared words and untranslated English in partial locales are dropped. Enable
   a new locale for a tenant and detection covers it, with no other change.
2. **MDMS `languageHints` and word lists.** For languages or slang that localization doesn't
   have, such as Sheng.

The vocabulary is rebuilt every 6 hours (`LANGUAGE_VOCAB_TTL_MS`). If localization is down,
detection uses the MDMS lists only. Set `LANGUAGE_FROM_LOCALIZATION=false` to switch this source off.
Localization is used **only for detection**. It has no number words, name titles or address
words, so removing personal details stays on MDMS.

### Hardening (in code, not configurable)

- Text is normalised before matching: fullwidth and other Unicode digits become 0–9, `＠` becomes
  `@`, and invisible characters (zero-width spaces, direction marks) are removed.
- Input is cut to 2000 characters (pgr-services allows 1000), so no pattern can be made slow.
- `test/redteam.test.js` holds known bypass attempts (split numbers, odd separators,
  number words, disguised emails…). Every new pattern change must keep them passing.

How the service handles problems:
- **A record has an invalid regex:** that record is skipped and an error is logged. The others still apply.
- **MDMS is down or has no active records:** the built-in list in `src/scrub.js` (`DEFAULT_PATTERNS`) is used. If MDMS fails after a good load, the last good set is kept.
- **Safety floor:** text still containing `@` or 7 or more digits in a row is never sent to the AI, whatever MDMS says.

Seed data, the same as the built-in list:
- Nairobi: `ansible/nairobi-mdms/mdms/RAINMAKER-PGR/PiiPatterns.json`
- New tenants: `utilities/default-data-handler/.../mdmsData/RAINMAKER-PGR/RAINMAKER-PGR.PiiPatterns.json`
- Schema: `utilities/default-data-handler/.../schema/RAINMAKER-PGR.json`

## Install on an existing production server

`scripts/install-prod.sh` adds the service to a DIGIT server that is already running. It
doesn't change any compose file, persister config, database schema or other container. It is
safe to run again: rerunning upgrades the service, and existing MDMS records are never overwritten.

```bash
# on the server, from a checkout of this repo
cd backend/complaint-triage
sudo ./scripts/install-prod.sh --tenant bo --dry-run                 # check everything, change nothing
sudo ./scripts/install-prod.sh --tenant bo --llm-key-file /root/groq.key
sudo ./scripts/install-prod.sh --tenant bo --no-ai                   # rules only, nothing sent outside
sudo ./scripts/install-prod.sh --uninstall
```

| Step | What happens |
|---|---|
| 1. Pre-flight | Docker, the DIGIT network, and Postgres, pgbouncer, Redpanda, MDMS, localization and the persister healthy |
| 2. Image | Builds `complaint-triage:local` (the old one is kept as `:previous`). Checks the service can reach Postgres, Kafka, MDMS and localization, and that the LLM key and model work |
| 3. MDMS | Registers `RAINMAKER-PGR.PiiPatterns` and `TriageConfig` for the tenant and loads the default records. Existing ones are skipped, and each write is confirmed as stored |
| 4. Settings | Writes `<digit-dir>/complaint-triage.env` (mode 600). The database password is read from `digit-pgbouncer`, and the previous file is kept as `.bak` |
| 5. Container | Starts or replaces `complaint-triage` on the DIGIT network with `--restart unless-stopped`. Kafka offsets are kept, so no complaint is skipped |
| 6. Verify | Waits until `/health` reports the database and Kafka up |

- The default `--digit-dir` is `/opt/digit`. Pass `--digit-dir /opt/digit-bomet` for the Bomet test copy.
- On first install the service only handles **new** complaints. Existing ones are not changed.
- **Rollback:** `docker tag complaint-triage:previous complaint-triage:local`, then rerun with `--skip-mdms`.
- The container is standalone, so `docker compose up` on the stack leaves it alone. The Ansible
  route (`enable_complaint_triage`) is the alternative for servers deployed by the playbook.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `LLM_API_KEY` | (empty) | Empty = rules only |
| `LLM_BASE_URL` | `https://api.groq.com/openai/v1` | Any OpenAI-compatible API |
| `LLM_MODEL` | `openai/gpt-oss-20b` | Check the provider's current model list |
| `LLM_TIMEOUT_MS` | `15000` | |
| `LLM_MIN_CONFIDENCE` | `0.5` | |
| `DEFAULT_PRIORITY` | `MEDIUM` | |
| `BASE_PRIORITY_JSON` | `{}` | e.g. `{"SewageOverflow":"HIGH"}` |
| `MDMS_HOST` | `http://egov-mdms-service:8094` | Source of PII patterns |
| `PII_PATTERNS_TTL_MS` | `300000` | How often patterns are re-read |
| `LANGUAGE_FROM_LOCALIZATION` | `true` | Build detection words from localization |
| `LOCALIZATION_HOST` | `http://egov-localization:8096` | |
| `LANGUAGE_VOCAB_TTL_MS` | `21600000` (6 h) | How often that vocabulary is rebuilt |
| `KAFKA_BROKERS` | `redpanda:9092` | |
| `CREATE_TOPIC_PATTERN` / `UPDATE_TOPIC_PATTERN` | `^([a-zA-Z]+-)?save-pgr-request$` / `…update…` | Regex; allows a state prefix |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | `postgres` `5432` `egov` `egov` | |
| `CREATE_RETRIES` / `CREATE_RETRY_DELAY_MS` | `6` / `2000` | Wait for the persister to insert the row |
| `UPDATE_SETTLE_MS` | `5000` | Wait for the persister to apply an update |

### Switching provider later

Change three variables. No code change is needed.

| Provider | `LLM_BASE_URL` | Example `LLM_MODEL` |
|---|---|---|
| Groq | `https://api.groq.com/openai/v1` | `openai/gpt-oss-20b` (set `LLM_REASONING_EFFORT=low`) |
| xAI Grok | `https://api.x.ai/v1` | a current Grok model |
| OpenRouter | `https://openrouter.ai/api/v1` | any listed model |
| Self-hosted Ollama | `http://<host>:11434/v1` | `qwen2.5:3b` (any key) |

## Run

```bash
# local stack
cd local-setup
LLM_API_KEY=gsk_... docker compose --profile triage up -d --build complaint-triage
curl localhost:18185/health
docker logs -f complaint-triage

# tests
cd backend/complaint-triage && npm install && npm test
```

## Privacy note

With a hosted provider (Groq), the cleaned complaint text leaves county infrastructure. Name,
phone, address, GPS position, complaint ID and photos are never sent. Get the Data Protection
Officer's approval before switching this on in production. To keep all data in county
infrastructure, point `LLM_BASE_URL` at a self-hosted model.
