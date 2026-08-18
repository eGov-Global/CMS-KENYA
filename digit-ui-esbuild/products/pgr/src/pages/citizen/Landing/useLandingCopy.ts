// i18n resolution hook for the landing page.
//
// Same convention as CreatePGRFlowV2's `tr()` helper: react-i18next echoes the
// key back when a translation is missing, so we detect that and fall back to
// the built-in copy deck. Seeding `PGR_LANDING_*` keys in MDMS localization
// overrides any built-in string without a code change.

import * as React from "react";
import { useTranslation } from "react-i18next";
import { LANDING_COPY, LandingCopyKey } from "./content";

export const LANDING_KEY_PREFIX = "PGR_LANDING_";

export interface LandingCopyApi {
  /** Resolve a landing copy key to display text. Accepts the built-in short
   *  keys and fully-qualified PGR_LANDING_* config keys alike; the optional
   *  second arg is the fallback key used when the first is empty/unresolved. */
  c: (key?: LandingCopyKey | string, fallbackKey?: LandingCopyKey | string) => string;
  /** "pt" | "en" — resolved from the active i18n language. */
  lang: "pt" | "en";
  /** Raw i18n handle for integrators (language switching etc.). */
  i18n: ReturnType<typeof useTranslation>["i18n"];
}

export function useLandingCopy(): LandingCopyApi {
  const { t, i18n } = useTranslation();
  // English-first (Bomet). A deployment whose deck carries `pt` values still
  // gets them when the active locale is Portuguese.
  const lang: "pt" | "en" = String(i18n?.language || "en")
    .toLowerCase()
    .startsWith("pt")
    ? "pt"
    : "en";

  const c = React.useCallback(
    // Resolve a copy key to text. Accepts BOTH the built-in short keys
    // ("HERO_TITLE") and fully-qualified config/MDMS keys
    // ("PGR_LANDING_HERO_TITLE") — config rows carry the prefixed form, so
    // re-prefixing would double it. The optional `fallbackKey` is the caller's
    // canonical default, resolved when the primary key is empty or unresolved
    // (missing from both the i18n store and the built-in deck).
    (key?: LandingCopyKey | string, fallbackKey?: LandingCopyKey | string): string => {
      const resolveOne = (k?: string): string | undefined => {
        if (!k) return undefined;
        const hasPrefix = k.startsWith(LANDING_KEY_PREFIX);
        const fullKey = hasPrefix ? k : LANDING_KEY_PREFIX + k;
        const shortKey = hasPrefix ? k.slice(LANDING_KEY_PREFIX.length) : k;
        const translated = t(fullKey);
        if (translated && translated !== fullKey) return translated;
        // `pt` is optional in the deck (English-only entries are the norm on an
        // English deployment), so fall back to `en` rather than surfacing a key.
        const entry = (LANDING_COPY as Record<string, { pt?: string; en: string }>)[shortKey];
        return entry?.[lang] ?? entry?.en;
      };
      // Ends at "", never the key: a bad or unseeded key must show nothing
      // rather than print PGR_LANDING_* on a public page.
      return resolveOne(key as string) ?? resolveOne(fallbackKey as string) ?? "";
    },
    [t, lang]
  );

  return { c, lang, i18n };
}
