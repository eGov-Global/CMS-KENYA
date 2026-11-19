// All settings come from environment variables so the LLM provider can be
// swapped (Groq today, xAI / OpenRouter / self-hosted Ollama later) without
// a code change. Any OpenAI-compatible /chat/completions endpoint works.

function int(name, def) {
  const v = process.env[name];
  if (v === undefined || v === '') return def;
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) throw new Error(`${name} must be an integer, got "${v}"`);
  return n;
}

function json(name, def) {
  const v = process.env[name];
  if (!v) return def;
  try {
    return JSON.parse(v);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

export function loadConfig() {
  return {
    port: int('PORT', 8085),

    kafka: {
      brokers: (process.env.KAFKA_BROKERS || 'redpanda:9092').split(',').map((s) => s.trim()),
      groupId: process.env.KAFKA_GROUP_ID || 'complaint-triage',
      // Topics may carry a state prefix in central-instance mode (e.g. "ke-save-pgr-request").
      createTopic: new RegExp(process.env.CREATE_TOPIC_PATTERN || '^([a-zA-Z]+-)?save-pgr-request$'),
      updateTopic: new RegExp(process.env.UPDATE_TOPIC_PATTERN || '^([a-zA-Z]+-)?update-pgr-request$'),
    },

    db: {
      host: process.env.DB_HOST || 'postgres',
      port: int('DB_PORT', 5432),
      database: process.env.DB_NAME || 'egov',
      user: process.env.DB_USER || 'egov',
      password: process.env.DB_PASSWORD || '',
      max: int('DB_POOL_MAX', 3),
    },

    llm: {
      // Empty key = AI disabled; the rules level is still written.
      apiKey: process.env.LLM_API_KEY || '',
      baseUrl: (process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, ''),
      model: process.env.LLM_MODEL || 'openai/gpt-oss-20b',
      timeoutMs: int('LLM_TIMEOUT_MS', 15000),
      // Reasoning models (gpt-oss, qwen3) spend tokens thinking before the JSON;
      // too low a limit gives an empty answer.
      maxTokens: int('LLM_MAX_TOKENS', 600),
      // Sent only when set ("low" | "medium" | "high"); non-reasoning models may reject it.
      reasoningEffort: process.env.LLM_REASONING_EFFORT || '',
      // Below this confidence the AI answer is ignored and the rules level is used.
      minConfidence: Number(process.env.LLM_MIN_CONFIDENCE || '0.5'),
    },

    // PII patterns master: RAINMAKER-PGR.PiiPatterns
    mdms: {
      host: (process.env.MDMS_HOST || 'http://egov-mdms-service:8094').replace(/\/+$/, ''),
      searchPath: process.env.MDMS_SEARCH_PATH || '/mdms-v2/v1/_search',
      module: process.env.PII_MDMS_MODULE || 'RAINMAKER-PGR',
      master: process.env.PII_MDMS_MASTER || 'PiiPatterns',
      ttlMs: int('PII_PATTERNS_TTL_MS', 300000),
      errorRetryMs: int('PII_PATTERNS_ERROR_RETRY_MS', 30000),
      timeoutMs: int('MDMS_TIMEOUT_MS', 5000),
    },

    // Language detection vocabulary from DIGIT localization (StateInfo languages).
    localization: {
      enabled: (process.env.LANGUAGE_FROM_LOCALIZATION || 'true') !== 'false',
      host: (process.env.LOCALIZATION_HOST || 'http://egov-localization:8096').replace(/\/+$/, ''),
      searchPath: process.env.LOCALIZATION_SEARCH_PATH || '/localization/messages/v1/_search',
      mdmsHost: (process.env.MDMS_HOST || 'http://egov-mdms-service:8094').replace(/\/+$/, ''),
      mdmsSearchPath: process.env.MDMS_SEARCH_PATH || '/mdms-v2/v1/_search',
      ttlMs: int('LANGUAGE_VOCAB_TTL_MS', 6 * 60 * 60 * 1000), // translations change rarely
      errorRetryMs: int('LANGUAGE_VOCAB_ERROR_RETRY_MS', 5 * 60 * 1000),
      timeoutMs: int('LOCALIZATION_TIMEOUT_MS', 10000),
      selection: {
        maxWords: int('LANGUAGE_VOCAB_MAX_WORDS', 150),
        minShare: Number(process.env.LANGUAGE_VOCAB_MIN_SHARE || '0.002'),
        ratio: Number(process.env.LANGUAGE_VOCAB_RATIO || '4'),
      },
    },

    rules: {
      // Starting level per complaint type, e.g. {"SewageOverflow":"HIGH","StreetLightNotWorking":"LOW"}.
      basePriority: json('BASE_PRIORITY_JSON', {}),
      defaultPriority: process.env.DEFAULT_PRIORITY || 'MEDIUM',
    },

    // Complaint-type catalogue from MDMS (ComplaintHierarchy / ServiceDefs).
    catalog: {
      host: (process.env.MDMS_HOST || 'http://egov-mdms-service:8094').replace(/\/+$/, ''),
      searchPath: process.env.MDMS_SEARCH_PATH || '/mdms-v2/v1/_search',
      ttlMs: int('CATALOG_TTL_MS', 30 * 60 * 1000),
      errorRetryMs: int('CATALOG_ERROR_RETRY_MS', 60 * 1000),
      timeoutMs: int('MDMS_TIMEOUT_MS', 5000),
    },
    // Non-personal details sent to the model with the description. Any of:
    // typeName, category, department, sla, photo, channel. Empty = only the type code.
    // Per tenant this comes from MDMS RAINMAKER-PGR.TriageConfig; this is the
    // default when a tenant has no record or MDMS is unreachable.
    contextFields: (process.env.MODEL_CONTEXT_FIELDS ?? 'typeName,category,department,sla,photo,channel')
      .split(',').map((s) => s.trim()).filter(Boolean),
    triageConfig: {
      host: (process.env.MDMS_HOST || 'http://egov-mdms-service:8094').replace(/\/+$/, ''),
      searchPath: process.env.MDMS_SEARCH_PATH || '/mdms-v2/v1/_search',
      module: 'RAINMAKER-PGR',
      master: process.env.TRIAGE_CONFIG_MASTER || 'TriageConfig',
      ttlMs: int('TRIAGE_CONFIG_TTL_MS', 300000),
      errorRetryMs: int('TRIAGE_CONFIG_ERROR_RETRY_MS', 30000),
      timeoutMs: int('MDMS_TIMEOUT_MS', 5000),
    },

    // Log the scrubbed text sent to the model and the received field names.
    // For audits and testing; off by default.
    logModelInput: (process.env.LOG_MODEL_INPUT || 'false') === 'true',

    // New complaint: the persister may not have inserted the row yet, so retry.
    createRetries: int('CREATE_RETRIES', 6),
    createRetryDelayMs: int('CREATE_RETRY_DELAY_MS', 2000),
    // Complaint update: wait for the persister to apply the update before checking the priority.
    updateSettleMs: int('UPDATE_SETTLE_MS', 5000),
  };
}
