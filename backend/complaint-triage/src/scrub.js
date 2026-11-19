// Removes personal details from complaint text before it is sent to the LLM.
//
// Patterns come from MDMS (RAINMAKER-PGR.PiiPatterns, see mdms.js) so they can be
// added, changed or switched off without a redeploy. DEFAULT_PATTERNS below is
// used only when MDMS is unreachable or has no active records; it is also the
// seed data for that master.
//
// Record kinds:
//   replace      regex; each match is swapped for `tag`
//   block        regex; if it still matches after replacing, the text is NOT sent to the AI
//   numberWords  words (per language) for digits; 5+ in a row = a spelled-out number -> block
//   nameTitles   words/phrases (per language) that come before a name ("Mama", "Mr",
//                "my name is"); the capitalised words after them become [NAME]
//   addressWords words (per language) for house/plot/unit, plus optional `labels`
//                ("number", "nambari"); "<word> <label> 45" becomes [ADDRESS_NO]
//
// Every active language is applied to every complaint (complaints mix English,
// Swahili and Sheng; guessing one language would let details through). The
// languages actually seen are reported for logging.
//
// Common fields: code (unique), order (lower runs first), active, language, description.

const SEP = '[\\s.\\-_/()+]{0,3}'; // separators people put inside numbers

export const DEFAULT_PATTERNS = [
  { code: 'EMAIL', kind: 'replace', tag: '[EMAIL]', order: 10, active: true,
    description: 'Email addresses',
    regex: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}' },
  { code: 'EMAIL_OBFUSCATED', kind: 'replace', tag: '[EMAIL]', order: 11, active: true, flags: 'i',
    description: 'Disguised emails: "jane at gmail dot com", "jane[at]gmail.com"',
    regex: '[A-Za-z0-9._%+-]+\\s*(?:\\[at\\]|\\(at\\)|\\s+at\\s+)\\s*[A-Za-z0-9-]+(?:\\s*(?:\\.|\\[dot\\]|\\(dot\\)|\\s+dot\\s+)\\s*[A-Za-z]{2,})+' },
  { code: 'PHONE_KE', kind: 'replace', tag: '[PHONE]', order: 20, active: true,
    description: 'Kenyan phone numbers (+254 / 254 / 0, optional "(0)", then 7xx or 1xx and 8 digits); any of . - _ / ( ) + or spaces between digits',
    regex: `(?:\\+?254|(?<!\\d)0)(?:${SEP}0)?${SEP}[17](?:${SEP}\\d){8}(?!\\d)` },
  { code: 'KRA_PIN', kind: 'replace', tag: '[KRA_PIN]', order: 30, active: true, flags: 'i',
    description: 'KRA PIN: A or P, 9 digits, a letter (e.g. A012345678Z)',
    regex: '\\b[AP]\\d{9}[A-Z]\\b' },
  { code: 'MPESA_CODE', kind: 'replace', tag: '[MPESA_CODE]', order: 40, active: true, flags: 'i',
    description: 'M-Pesa transaction code: 10 letters and digits containing both (any case)',
    regex: '\\b(?=[A-Z0-9]{10}\\b)(?=[A-Z0-9]*\\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{10}\\b' },
  { code: 'VEHICLE_PLATE', kind: 'replace', tag: '[PLATE]', order: 50, active: true, flags: 'i',
    description: 'Vehicle plates: KDA 123A, KDA-123A, kda123a, GK 123A',
    regex: '\\b(?:K[A-Z]{2}|GK)[\\s-]?\\d{3}[\\s-]?[A-Z]?\\b' },
  { code: 'NATIONAL_ID', kind: 'replace', tag: '[NATIONAL_ID]', order: 60, active: true, flags: 'i',
    description: 'ID / passport number after an ID word (English / Swahili); separators allowed inside the number',
    regex: '\\b(?:national\\s+id|id\\s+no\\.?|i\\.d\\.|id|passport|kitambulisho|pasipoti)\\s*(?:no\\.?|number|namba|nambari)?\\s*(?:is|ni)?\\s*[:#-]?\\s*[A-Z]{0,2}\\d(?:[\\s.\\-]?\\d){5,8}\\b' },
  { code: 'GPS', kind: 'replace', tag: '[GPS]', order: 65, active: true,
    description: 'GPS coordinate pairs: -0.7813, 35.3416',
    regex: '-?\\d{1,3}\\.\\d{3,}\\s*,\\s*-?\\d{1,3}\\.\\d{3,}' },
  { code: 'DATE', kind: 'replace', tag: '[DATE]', order: 66, active: true,
    description: 'Dates like 12/03/1985, 12-03-85, 12.03.1985 (could be a date of birth)',
    regex: '\\b\\d{1,2}[/.\\-]\\d{1,2}[/.\\-]\\d{2,4}\\b' },
  { code: 'LONG_NUMBER', kind: 'replace', tag: '[NUMBER]', order: 90, active: true,
    description: 'Any remaining run of 6+ digits (ID, account or phone in another format)',
    regex: '\\b\\d{6,}\\b' },
  { code: 'BLOCK_CLOSE_DIGITS', kind: 'block', order: 100, active: true,
    description: 'Do not send to AI if 7+ digits remain close together, whatever separates them',
    regex: '\\d(?:[^\\dA-Za-z\\n]{0,3}\\d){6,}' },
  { code: 'BLOCK_MANY_DIGITS', kind: 'block', order: 101, active: true,
    description: 'Do not send to AI if 10+ digits remain anywhere in the text (number split into parts)',
    regex: '^(?:\\D*\\d){10}' },

  // ── language word lists ──
  { code: 'NUMBER_WORDS_EN', kind: 'numberWords', language: 'en', order: 200, active: true,
    description: 'English digit words',
    words: ['zero', 'oh', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'eleven', 'twelve', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
      'hundred', 'double', 'triple'] },
  { code: 'NUMBER_WORDS_SW', kind: 'numberWords', language: 'sw', order: 201, active: true,
    description: 'Swahili digit words',
    words: ['sifuri', 'moja', 'mbili', 'tatu', 'nne', 'tano', 'sita', 'saba', 'nane', 'tisa', 'kumi',
      'ishirini', 'thelathini', 'arobaini', 'hamsini', 'sitini', 'sabini', 'themanini', 'tisini', 'mia', 'na'] },
  { code: 'NAME_TITLES_EN', kind: 'nameTitles', language: 'en', order: 210, active: true,
    description: 'English words that come before a person\'s name',
    words: ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Madam', 'Sir', 'officer', 'Pastor', 'Chief', 'Hon', 'my name is', 'I am', 'named'] },
  { code: 'NAME_TITLES_SW', kind: 'nameTitles', language: 'sw', order: 211, active: true,
    description: 'Swahili words that come before a person\'s name',
    words: ['Mama', 'Baba', 'Mzee', 'Bwana', 'Bi', 'Mwalimu', 'Shangazi', 'Mjomba', 'jina langu ni', 'naitwa', 'mimi ni', 'anaitwa'] },
  { code: 'ADDRESS_WORDS_EN', kind: 'addressWords', language: 'en', order: 220, active: true,
    description: 'English house/plot words and number labels',
    words: ['plot', 'house', 'hse', 'stall', 'door', 'flat', 'apartment', 'apt', 'room', 'unit', 'block', 'gate'],
    labels: ['no', 'no.', 'number', '#'] },
  { code: 'ADDRESS_WORDS_SW', kind: 'addressWords', language: 'sw', order: 221, active: true,
    description: 'Swahili house/plot words and number labels',
    words: ['nyumba', 'chumba', 'kibanda', 'mlango', 'ploti', 'shamba'],
    labels: ['namba', 'nambari'] },
  // Detection only (logged with each complaint); never used to remove anything.
  { code: 'LANGUAGE_HINTS_EN', kind: 'languageHints', language: 'en', order: 300, active: true,
    description: 'Common English words, used to detect the language of a complaint',
    words: ['the', 'is', 'are', 'and', 'for', 'not', 'has', 'have', 'been', 'there', 'water', 'road', 'near', 'since', 'please', 'no'] },
  { code: 'LANGUAGE_HINTS_SW', kind: 'languageHints', language: 'sw', order: 301, active: true,
    description: 'Common Swahili words, used to detect the language of a complaint',
    words: ['na', 'ya', 'wa', 'kwa', 'ni', 'hakuna', 'maji', 'sana', 'imekuwa', 'mtu', 'wiki', 'barabara', 'tafadhali', 'hii', 'kuna', 'siku'] },
  { code: 'LANGUAGE_HINTS_SHENG', kind: 'languageHints', language: 'sheng', order: 302, active: true,
    description: 'Common Sheng words, used to detect the language of a complaint',
    words: ['maze', 'manze', 'msee', 'mbogi', 'form', 'poa', 'sare', 'mtaa', 'doh', 'ganji', 'keja', 'mathe'] },
];

// Always applied, whatever MDMS says, so removing records can never let an
// obvious email or long number reach the AI.
const SAFETY_FLOOR = [/@/, /\d{7,}/];

// ── normalisation ──────────────────────────────────────────────────────
// Map every Unicode decimal digit (Arabic-Indic, Devanagari, …) to 0-9.
// Built once: Nd characters come in runs of ten starting at zero.
const DIGIT_MAP = (() => {
  const map = new Map();
  const isNd = /\p{Nd}/u;
  let runStart = -1;
  for (let cp = 0x80; cp <= 0x1fbff; cp++) {
    const nd = isNd.test(String.fromCodePoint(cp));
    if (nd && runStart < 0) runStart = cp;
    if (!nd && runStart >= 0) {
      for (let c = runStart; c < cp; c++) map.set(String.fromCodePoint(c), String((c - runStart) % 10));
      runStart = -1;
    }
  }
  return map;
})();

export function normalize(input) {
  return String(input ?? '')
    .normalize('NFKC') // fullwidth ０-９ and ＠ -> ASCII, ligatures, etc.
    .replace(/\p{Cf}/gu, '') // zero-width spaces/joiners, soft hyphens, direction marks
    .replace(/\p{Nd}/gu, (d) => DIGIT_MAP.get(d) ?? d);
}

// ── compiling records ──────────────────────────────────────────────────
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const phrase = (w) => esc(String(w).trim()).replace(/\s+/g, '\\s+');
const alt = (words) => [...new Set(words.map(phrase).filter(Boolean))].sort((a, b) => b.length - a.length).join('|');
// Unicode-aware word edges (\b is ASCII-only in JS).
const L = '(?<![\\p{L}\\p{N}])';
const R = '(?![\\p{L}\\p{N}])';

function wordsOf(records, kind) {
  return records.filter((r) => r.kind === kind && Array.isArray(r.words));
}

function buildWordPatterns(records) {
  const out = { replace: [], block: [], languages: [], languageWords: new Map() };

  const numberLists = wordsOf(records, 'numberWords');
  const numWords = numberLists.flatMap((r) => r.words);
  if (numWords.length) {
    const unit = `(?:${alt(numWords)}|\\d)`;
    out.block.push({
      code: 'NUMBER_WORDS',
      re: new RegExp(`${L}${unit}${R}(?:[\\s,.\\-]+${unit}${R}){4,}`, 'iu'),
    });
  }

  const titles = wordsOf(records, 'nameTitles').flatMap((r) => r.words);
  if (titles.length) {
    // Title is case-insensitive; the name after it must start with a capital,
    // so the regex can't use the "i" flag. Build [mM][aA]… per letter instead.
    const ciWord = (w) =>
      String(w)
        .trim()
        .split(/\s+/)
        .map((part) =>
          [...part]
            .map((c) => {
              const lo = c.toLowerCase();
              const up = c.toUpperCase();
              return lo === up ? esc(c) : `[${lo}${up}]`;
            })
            .join(''),
        )
        .join('\\s+');
    const ci = [...new Set(titles.map(ciWord).filter(Boolean))].sort((a, b) => b.length - a.length).join('|');
    const name = "\\p{Lu}[\\p{L}'’\\-]+";
    out.replace.push({
      code: 'NAME_AFTER_TITLE',
      tag: '[NAME]',
      re: new RegExp(`${L}(${ci})\\.?\\s+${name}(?:\\s+${name}){0,2}`, 'gu'),
      keepGroup: true,
    });
  }

  const addr = wordsOf(records, 'addressWords');
  const aWords = addr.flatMap((r) => r.words);
  if (aWords.length) {
    const labels = addr.flatMap((r) => r.labels || []);
    const label = labels.length ? `(?:\\s*(?:${alt(labels)}))?` : '';
    // The number may be digits ("45", "B12") or spelled out ("forty five").
    const spelled = numWords.length ? `|(?:${alt(numWords)})(?:[\\s-]+(?:${alt(numWords)})){0,3}${R}` : '';
    out.replace.push({
      code: 'ADDRESS_NUMBER',
      tag: '[ADDRESS_NO]',
      re: new RegExp(`${L}(?:${alt(aWords)})${label}\\s*[:#-]?\\s*(?:\\p{L}?\\d+\\p{L}?${R}${spelled})`, 'giu'),
    });
  }

  // For language detection: every language-tagged word, grouped by language.
  const byLang = new Map();
  for (const r of records) {
    if (!r.language || !Array.isArray(r.words)) continue;
    byLang.set(r.language, [...(byLang.get(r.language) || []), ...r.words]);
  }
  out.languageWords = byLang;
  out.languages = buildLanguageMatchers(byLang);
  return out;
}

// One whole-word, case-insensitive matcher per language from any number of
// Map(language -> words) sources (MDMS word lists, localization vocabulary).
export function buildLanguageMatchers(...sources) {
  const merged = new Map();
  for (const src of sources) {
    for (const [language, words] of src || []) {
      const set = merged.get(language) || new Set();
      for (const w of words) set.add(String(w).toLowerCase());
      merged.set(language, set);
    }
  }
  const out = [];
  for (const [language, words] of merged) {
    const pattern = alt([...words]);
    if (pattern) out.push({ language, re: new RegExp(`${L}(?:${pattern})${R}`, 'giu') });
  }
  return out;
}

// Turn records into ready-to-use regexes. Invalid or inactive records are skipped.
export function compilePatterns(records, log = console) {
  const replace = [];
  const block = [];
  const active = [...(records || [])]
    .filter((r) => r && r.active !== false && r.code)
    .sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000));

  for (const r of active) {
    if (r.kind !== 'replace' && r.kind !== 'block') continue;
    if (typeof r.regex !== 'string' || !r.regex) continue;
    const flags = String(r.flags || '').replace(/[^imsu]/g, '');
    try {
      if (r.kind === 'block') block.push({ code: r.code, re: new RegExp(r.regex, flags) });
      else replace.push({ code: r.code, tag: r.tag || '[REDACTED]', re: new RegExp(r.regex, `${flags}g`) });
    } catch (err) {
      log.error?.(`PII pattern ${r.code} has an invalid regex and was skipped: ${err.message}`);
    }
  }

  let words = { replace: [], block: [], languages: [], languageWords: new Map() };
  try {
    words = buildWordPatterns(active);
  } catch (err) {
    log.error?.(`PII word lists could not be compiled and were skipped: ${err.message}`);
  }

  // Word-list replacements run first: names and addresses before the generic
  // number patterns would eat their digits.
  return {
    replace: [...words.replace, ...replace],
    block: [...block, ...words.block],
    languages: words.languages,
    languageWords: words.languageWords,
    count: replace.length + block.length + words.replace.length + words.block.length,
  };
}

export const DEFAULT_COMPILED = compilePatterns(DEFAULT_PATTERNS);

// `matchers` defaults to the MDMS word lists; triage passes MDMS + localization.
export function detectLanguages(text, patterns = DEFAULT_COMPILED, matchers = patterns.languages) {
  const hits = {};
  for (const { language, re } of matchers || []) {
    re.lastIndex = 0;
    const n = (text.match(re) || []).length;
    if (n) hits[language] = n;
  }
  return hits;
}

// pgr-services caps descriptions at 1000 characters; anything longer is cut
// here too, so no pattern can be made slow by a huge input.
export const MAX_INPUT = 2000;

export function scrub(input, patterns = DEFAULT_COMPILED, { languageMatchers } = {}) {
  let text = normalize(String(input ?? '').slice(0, MAX_INPUT));
  const languages = detectLanguages(text, patterns, languageMatchers || patterns.languages);
  const found = [];
  for (const { tag, re, keepGroup } of patterns.replace) {
    re.lastIndex = 0;
    text = text.replace(re, (...m) => {
      found.push(tag);
      // Keep the title ("Mama [NAME]") so the AI still knows a person is meant.
      return keepGroup && m[1] ? `${m[1]} ${tag}` : tag;
    });
  }
  const blockers = [...patterns.block.map((b) => b.re), ...SAFETY_FLOOR];
  const clean = !blockers.some((re) => {
    re.lastIndex = 0;
    return re.test(text);
  });
  return { text, clean, found, languages };
}
