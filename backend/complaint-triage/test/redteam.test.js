// Attempts to get personal details past the scrubber. A case "leaks" if the
// scrubber says the text is clean (safe to send to the AI) while the secret is
// still in it. Every case must be either removed or blocked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { scrub, compilePatterns, DEFAULT_PATTERNS, MAX_INPUT } from '../src/scrub.js';

// [label, input, secret that must not reach the AI]
const ATTACKS = [
  ['phone dots', 'call 0712.345.678', '345'],
  ['phone slashes', 'call 0712/345/678', '345'],
  ['phone brackets', 'call (0712) 345 678', '345'],
  ['phone underscores', 'call 0712_345_678', '345'],
  ['phone single spaced', 'call 0 7 1 2 . 3 4 5 . 6 7 8', '3 4 5'],
  ['phone +254 (0)', 'call +254 (0) 712 345 678', '345'],
  ['phone letter O', 'call O712345678', '712345678'],
  ['phone letter l', 'call 07l2345678', '2345678'],
  ['phone fullwidth digits', 'call ０７１２３４５６７８', '345'],
  ['phone Arabic-Indic digits', 'call ٠٧١٢٣٤٥٦٧٨', '345'],
  ['phone zero-width spaces', 'call 0712​345​678', '345'],
  ['phone split with +', 'call 0712 345 + 678', '345'],
  ['phone in English words', 'zero seven one two three four five six seven eight', 'three four five'],
  ['phone in Swahili words', 'sifuri saba moja mbili tatu nne tano sita saba nane', 'tatu nne'],
  ['phone tail', 'my number ends with 345678', '345678'],
  ['email', 'jane.doe@gmail.com', 'jane.doe'],
  ['email at/dot', 'jane.doe at gmail dot com', 'jane.doe'],
  ['email [at]', 'jane.doe[at]gmail.com', 'jane.doe'],
  ['email fullwidth @', 'jane.doe＠gmail.com', 'jane.doe'],
  ['id "is"', 'my id is 12345678', '12345678'],
  ['id split space', 'ID 1234 5678', '1234 5678'],
  ['id split dash', 'ID 1234-5678', '1234-5678'],
  ['passport', 'passport AK1234567', 'AK1234567'],
  ['mpesa lowercase', 'paid qjk7x2abcd', 'qjk7x2abcd'],
  ['plate lowercase', 'car kda 123a', 'kda 123a'],
  ['plate dash', 'car KDA-123A', 'KDA-123A'],
  ['kra lowercase', 'pin a012345678z', 'a012345678z'],
  ['address Swahili', 'nyumba nambari 45', '45'],
  ['address spelled out', 'house number forty five', 'forty five'],
  ['address unit', 'Block C, Unit 12', 'Unit 12'],
  ['name after Mama', 'Mama Wanjiku next door', 'Wanjiku'],
  ['name after I am', 'I am John Kamau Otieno', 'Kamau'],
  ['name after officer', 'Report officer Mwangi for bribes', 'Mwangi'],
  ['name after jina langu ni', 'jina langu ni Achieng Odhiambo', 'Achieng'],
  ['gps', 'I am at -0.7813, 35.3416', '35.3416'],
  ['6-digit account', 'account 012345 at Equity', '012345'],
  ['date of birth', 'born 12/03/1985', '1985'],
];

for (const [label, input, secret] of ATTACKS) {
  test(`no leak: ${label}`, () => {
    const r = scrub(input);
    assert.ok(!(r.clean && r.text.includes(secret)), `leaked: "${input}" -> "${r.text}"`);
  });
}

test('ordinary complaints pass through unchanged and clean', () => {
  for (const t of [
    'Sewage is overflowing into houses near the market for 3 days, children are getting sick',
    'Maji hakuna kwa wiki nzima, the whole estate has no water since Monday',
    'Streetlight on Moi Avenue near Kenyatta Market has been off for 2 weeks',
    'Garbage not collected for one or two weeks, smell is bad',
    'Officer at City Hall asked for 500 shillings bribe before processing permit',
    'Mimi ni mkazi wa Kibra, barabara imeharibika sana',
  ]) {
    const r = scrub(t);
    assert.equal(r.text, t);
    assert.ok(r.clean, t);
  }
});

test('languages are detected from MDMS word lists', () => {
  assert.ok(scrub('Shida ya maji imekuwa wiki tatu na hakuna mtu amekuja').languages.sw >= 3);
  assert.ok(scrub('There is no water and the road is bad').languages.en >= 3);
  const r = scrub('Maze msee, maji hakuna kwa mtaa, the road is bad');
  assert.ok(r.languages.sheng && r.languages.sw && r.languages.en);
});

test('a new language added in MDMS works without code changes', () => {
  const pt = compilePatterns([
    ...DEFAULT_PATTERNS,
    { code: 'NAME_TITLES_PT', kind: 'nameTitles', language: 'pt', words: ['Senhor', 'Dona', 'meu nome é'] },
    { code: 'NUMBER_WORDS_PT', kind: 'numberWords', language: 'pt',
      words: ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'] },
    { code: 'ADDRESS_WORDS_PT', kind: 'addressWords', language: 'pt', words: ['casa', 'quarteirão'], labels: ['número', 'nº'] },
  ]);
  assert.equal(scrub('A Dona Ana Machava não tem água', pt).text, 'A Dona [NAME] não tem água');
  assert.equal(scrub('meu nome é João Sitoe', pt).text, 'meu nome é [NAME]');
  assert.equal(scrub('ligue oito quatro um dois três quatro', pt).clean, false);
  assert.equal(scrub('casa número 23 sem água', pt).text, '[ADDRESS_NO] sem água');
  assert.ok(scrub('A Dona Ana não tem água', pt).languages.pt >= 1);
});

test('huge or hostile inputs are cut and stay fast', () => {
  for (const s of [' '.repeat(100000), '1-'.repeat(50000), 'id no '.repeat(20000), 'Mama '.repeat(20000), 'one '.repeat(30000)]) {
    const t = Date.now();
    scrub(s);
    assert.ok(Date.now() - t < 500, `slow on ${s.slice(0, 10)}…`);
  }
  assert.equal(MAX_INPUT, 2000);
});

test('MDMS seed files match the built-in defaults', async () => {
  const fs = await import('node:fs');
  const url = (p) => new URL(`../../../${p}`, import.meta.url);
  const generic = JSON.parse(fs.readFileSync(url('utilities/default-data-handler/src/main/resources/mdmsData/RAINMAKER-PGR/RAINMAKER-PGR.PiiPatterns.json'), 'utf8'));
  const nairobi = JSON.parse(fs.readFileSync(url('ansible/nairobi-mdms/mdms/RAINMAKER-PGR/PiiPatterns.json'), 'utf8')).map((r) => r.data);
  for (const seed of [generic, nairobi]) {
    assert.deepEqual(compilePatterns(seed).count, compilePatterns(DEFAULT_PATTERNS).count);
    assert.deepEqual(seed.map((r) => [r.code, r.regex, r.words]), DEFAULT_PATTERNS.map((r) => [r.code, r.regex, r.words]));
  }
});

test('triage MDMS schema descriptions fit the 512-character database column', async () => {
  const fs = await import('node:fs');
  const schemas = JSON.parse(fs.readFileSync(new URL('../../../utilities/default-data-handler/src/main/resources/schema/RAINMAKER-PGR.json', import.meta.url), 'utf8'));
  const ours = schemas.filter((s) => ['RAINMAKER-PGR.PiiPatterns', 'RAINMAKER-PGR.TriageConfig'].includes(s.code));
  assert.equal(ours.length, 2);
  for (const s of ours) {
    // eg_mdms_schema_definition.description is varchar(512); longer ones are silently dropped by the persister.
    assert.ok(s.description.length <= 512, `${s.code} description is ${s.description.length} chars`);
  }
});
