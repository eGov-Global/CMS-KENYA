// Language detection vocabulary built from DIGIT localization.
//
// 1. The tenant's languages come from MDMS common-masters.StateInfo (`languages`,
//    e.g. en_IN, sw_KE) — the same list the UI language picker shows.
// 2. For each locale, all localization messages are fetched (UI labels already
//    translated by the county, thousands of strings for a full locale).
// 3. Words that are frequent in one locale but rare in the others become that
//    language's detection words ("ya", "kwa", "malalamiko" for Swahili).
//
// So enabling a new locale for a tenant gives detection for it automatically.
// Used for detection only; personal-detail removal stays on the MDMS word lists.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Words in a message: letters only (Unicode), lowercased; placeholders like {0} dropped.
export function tokenize(message) {
  return String(message || '')
    .replace(/\{[^}]*\}/g, ' ')
    .toLowerCase()
    .match(/\p{L}[\p{L}'’]*/gu) || [];
}

// messagesByLang: Map(language -> array of message strings)
// Returns Map(language -> array of distinctive words), most frequent first.
export function distinctiveWords(messagesByLang, { maxWords = 150, minShare = 0.002, ratio = 4 } = {}) {
  // Document frequency: in how many messages of that language each word appears.
  const share = new Map(); // lang -> Map(word -> fraction of messages)
  for (const [lang, messages] of messagesByLang) {
    const df = new Map();
    for (const m of messages) for (const w of new Set(tokenize(m))) df.set(w, (df.get(w) || 0) + 1);
    const n = Math.max(messages.length, 1);
    share.set(lang, new Map([...df].map(([w, c]) => [w, c / n])));
  }

  const out = new Map();
  for (const [lang, words] of share) {
    const picked = [...words]
      .filter(([w, s]) => {
        if (s < minShare || w.length < 2) return false;
        // Must be clearly more common here than in every other language
        // (drops shared terms and untranslated English left in a partial locale).
        for (const [other, ow] of share) {
          if (other !== lang && (ow.get(w) || 0) * ratio > s) return false;
        }
        return true;
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxWords)
      .map(([w]) => w);
    if (picked.length) out.set(lang, picked);
  }
  return out;
}

export function createLocalizationVocabulary(cfg, { fetchImpl = fetch, log = console, now = Date.now } = {}) {
  const cache = new Map(); // stateTenant -> { vocab: Map, at }

  async function post(url, body) {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.json();
  }

  async function tenantLocales(stateTenant) {
    const data = await post(`${cfg.mdmsHost}${cfg.mdmsSearchPath}`, {
      RequestInfo: { apiId: 'complaint-triage' },
      MdmsCriteria: {
        tenantId: stateTenant,
        moduleDetails: [{ moduleName: 'common-masters', masterDetails: [{ name: 'StateInfo' }] }],
      },
    });
    const infos = data?.MdmsRes?.['common-masters']?.StateInfo || [];
    const locales = infos.flatMap((s) => (s.languages || []).map((l) => l.value)).filter(Boolean);
    return [...new Set(locales)];
  }

  async function messages(stateTenant, locale) {
    const q = new URLSearchParams({ locale, tenantId: stateTenant });
    const data = await post(`${cfg.host}${cfg.searchPath}?${q}`, { RequestInfo: { apiId: 'complaint-triage' } });
    return (data?.messages || []).map((m) => m.message);
  }

  async function load(stateTenant) {
    const locales = await tenantLocales(stateTenant);
    const byLang = new Map();
    for (const locale of locales) {
      const lang = locale.split(/[_-]/)[0].toLowerCase(); // sw_KE -> sw
      const msgs = await messages(stateTenant, locale);
      byLang.set(lang, [...(byLang.get(lang) || []), ...msgs]);
      await sleep(0); // let Kafka work interleave on big tenants
    }
    const vocab = distinctiveWords(byLang, cfg.selection);
    log.info?.(
      `language vocabulary for ${stateTenant} from localization: ` +
        ([...vocab].map(([l, w]) => `${l}=${w.length}`).join(', ') || 'none'),
    );
    return vocab;
  }

  // Returns Map(language -> words); empty Map if localization is unavailable.
  async function get(tenantId) {
    if (!cfg.enabled) return new Map();
    const stateTenant = String(tenantId).split('.')[0];
    const hit = cache.get(stateTenant);
    if (hit && now() - hit.at < cfg.ttlMs) return hit.vocab;
    try {
      const vocab = await load(stateTenant);
      cache.set(stateTenant, { vocab, at: now() });
      return vocab;
    } catch (err) {
      log.warn?.(`could not build language vocabulary from localization for ${stateTenant}: ${err.message}`);
      const vocab = hit?.vocab || new Map();
      cache.set(stateTenant, { vocab, at: now() - cfg.ttlMs + cfg.errorRetryMs });
      return vocab;
    }
  }

  return { get };
}
