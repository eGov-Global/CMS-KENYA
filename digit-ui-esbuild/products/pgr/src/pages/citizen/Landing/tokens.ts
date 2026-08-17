// Design tokens for the PGR public landing page.
//
// Every color is an HSL channel triple (same convention as the v2 layer's
// `--v2-*` tokens) so Tailwind arbitrary values can apply alpha:
//   bg-[hsl(var(--pgrl-primary))]        -> solid
//   bg-[hsl(var(--pgrl-primary)/0.85)]   -> 85% alpha
//
// The tokens are written as inline CSS custom properties on the landing root,
// each one deferring to an optional document-level `--pgrl-*-brand` override:
//
//   --pgrl-primary: var(--pgrl-primary-brand, 155 55% 32%)
//
// so a tenant theme (MDMS -> applyTheme.js writes vars onto :root) can retint
// the whole page without touching this file, while the page still renders a
// complete government identity with zero configuration.
//
// Default palette: Republic of Mozambique government identity taken from the
// approved prototype (green 155 55% 32%, yellow 48 95% 52%), contrast-checked
// for WCAG 2.2 AA — see docs/pgr-landing/LANDING_PAGE_REDESIGN.md §8.

import * as React from "react";

export interface LandingTokens {
  /** Brand green — headers, nav, primary emphasis. AA on white for normal text. */
  primary: string;
  /** Deep green — hero, footer, final CTA band. */
  deep: string;
  /** Government yellow — primary CTAs, active nav indicator. Dark text only. */
  accent: string;
  /** Accent hover state (slightly darker yellow). */
  accentHover: string;
  /** Text on primary/deep surfaces. */
  onPrimary: string;
  /** Text on accent surfaces. */
  onAccent: string;
  /** Main body text. */
  ink: string;
  /** Secondary/meta text. AA (>=4.5:1) on white and on the page background. */
  inkSoft: string;
  /** Card / raised surface. */
  surface: string;
  /** Page background. */
  page: string;
  /** Hairline borders. */
  line: string;
  /** Focus ring on light surfaces. */
  ring: string;
  /** Manifestation-type accents. */
  typeComplaint: string; // Reclamação
  typeGrievance: string; // Queixa
  typePetition: string; // Petição
  typeReport: string; // Denúncia
  /** Corner radius (CSS length, not an HSL triple). */
  radius: string;
}

export const DEFAULT_LANDING_TOKENS: LandingTokens = {
  primary: "200.4 75.8% 48.6%", // #1E9ADA  header, nav, section titles
  deep: "198 80% 17%",          // #093B50  hero, footer, CTA band
  accent: "204 72% 71%",        // #7FC0EA  buttons, accent bars, active nav
  accentHover: "204 71% 63%",   // #5FAFE4
  onPrimary: "0 0% 100%",       // white text on blue
  onAccent: "198 80% 17%",      // #093B50  deep navy on the light-blue accent —
                                // 6.06:1, softer than a neutral near-black and
                                // tonally part of the blue palette. ink-soft
                                // would only reach 3.33:1 here.
  ink: "221 28% 16%",           // #1D2433  body text
  inkSoft: "270 3% 37%",        // #5F5C62
  surface: "0 0% 100%",         // white cards
  page: "0 0% 98%",             // #FAFAFA
  line: "30 2% 84%",            // #D6D5D4
  ring: "207 78% 37%",
  typeComplaint: "210 60% 36%",
  typeGrievance: "28 85% 38%",
  typePetition: "275 45% 42%",  // was green
  typeReport: "0 65% 42%",
  radius: "0.375rem",
};

/** kebab-case CSS var name for a token key, e.g. typeReport -> --pgrl-type-report */
const cssVar = (key: string): string =>
  "--pgrl-" + key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

/**
 * Build the inline style that seeds the token custom properties on the landing
 * root. Each var defers to a `--pgrl-<name>-brand` override that tenants can
 * set at :root (via MDMS theme), then falls back to the shipped default.
 */
export function buildTokenStyle(overrides?: Partial<LandingTokens>): React.CSSProperties {
  const tokens = { ...DEFAULT_LANDING_TOKENS, ...overrides };
  const style: Record<string, string> = {};
  (Object.keys(tokens) as Array<keyof LandingTokens>).forEach((key) => {
    const name = cssVar(key);
    style[name] = `var(${name}-brand, ${tokens[key]})`;
  });
  return style as React.CSSProperties;
}

/**
 * Page container. Deliberately NOT Tailwind's `container` class: the app's
 * always-loaded vendored legacy CSS defines a global
 * `.container { display:flex; flex-direction:row; gap:1.5rem }` which Tailwind's
 * container (width/margin/padding only) does not override — every titled
 * section would collapse into a flex row in-app. Equivalent metrics to the
 * repo config: centered, 1rem gutter, capped at the xl breakpoint.
 */
export const CONTAINER = "mx-auto w-full max-w-screen-xl px-4";

/**
 * House style: no anchor underlines on hover, anywhere on the landing page.
 *
 * This can't be done with `no-underline` on each link — the vendored legacy
 * overrides.css has `a:not(.digit-button):not(.button):hover { text-decoration:
 * underline }` at 0-3-1, which outranks the utility (0-1-0). One descendant
 * rule on the landing root settles it for every anchor, including the ones that
 * don't go through LandingLink (skip link, WhatsApp FAB, utility strip).
 */
export const NO_HOVER_UNDERLINE = "[&_a:hover]:!no-underline";

/** Focus ring for interactive elements on light surfaces. */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--pgrl-ring))] focus-visible:ring-offset-2";

/** Focus ring for interactive elements on dark (green) surfaces. */
export const FOCUS_RING_DARK =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--pgrl-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
