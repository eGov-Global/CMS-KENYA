// Pure helpers behind the top of the landing page (utility strip and slogan
// band), kept apart from the components so they can be unit-tested.

export interface LanguageOption {
  /** i18n locale code, e.g. "en_IN" or "sw_KE". */
  code: string;
  /** Short visible label, e.g. "EN". */
  label: string;
}

const prefix = (code: string) => code.toLowerCase().split(/[-_]/)[0];

/** StateInfo languages ([{ value: "en_IN" }, …]) as menu options labelled by
 *  language ("EN"); two locales of one language keep their region ("EN-KE"). */
export function languageOptions(langs: Array<{ value?: string } | null | undefined> = []): LanguageOption[] {
  const codes = langs.map((l) => (l?.value ? String(l.value) : "")).filter(Boolean);
  return codes.map((code) => {
    const shared = codes.filter((c) => prefix(c) === prefix(code)).length > 1;
    return { code, label: (shared ? code.replace("_", "-") : prefix(code)).toUpperCase() };
  });
}

/** The option for the active i18n language: an exact locale match first, then
 *  the first option of the same language, then the first option. */
export function pickLanguage(options: LanguageOption[], active?: string): LanguageOption | undefined {
  const a = String(active || "").toLowerCase();
  return (
    options.find((o) => o.code.toLowerCase() === a) ??
    options.find((o) => a && prefix(o.code) === prefix(a)) ??
    options[0]
  );
}

/** What the strip shows for its phone link: the county's formatted number when
 *  the link dials it, otherwise the number the link actually dials. */
export function phoneDisplay(phoneHref: string, contact: { hotline: string; hotlineDisplay: string }): string {
  const dialled = String(phoneHref || "").replace(/^tel:/i, "");
  return dialled === contact.hotline ? contact.hotlineDisplay : dialled;
}

/** `text` split around the first case-insensitive occurrence of `word`, for
 *  setting that word in bold; null when it does not occur. */
export function splitEmphasis(text: string, word: string): [string, string, string] | null {
  const w = (word || "").trim();
  if (!text || !w) return null;
  const at = text.toLowerCase().indexOf(w.toLowerCase());
  if (at < 0) return null;
  return [text.slice(0, at), text.slice(at, at + w.length), text.slice(at + w.length)];
}
