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
// Default palette: Nairobi City County brand — the green and gold of the county
// crest and of nairobi.go.ke, softened for long-form reading (lighter brand
// green, warmed gold, green-tinted charcoal text, off-white page) with the
// site's burgundy as a categorical accent. Contrast-checked for WCAG 2.2 AA;
// hex and role noted inline below.

import * as React from "react";

export interface LandingTokens {
  /** Brand green — headers, nav, primary emphasis. AA on white for normal text. */
  primary: string;
  /** Hover state for primary-coloured buttons and links (darker green). */
  primaryHover: string;
  /** Secondary burgundy. Reserved; nothing on the page uses it at the moment. */
  secondary: string;
  /** Deepest green — hero, footer, final CTA band. */
  deep: string;
  /** County gold — primary CTAs, active nav indicator. Dark text only. */
  accent: string;
  /** Accent hover state (slightly darker gold). */
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
  /** Soft brand tint — section bands, icon tiles, hover fills. */
  tint: string;
  /** Soft gold tint — highlights that should not shout. */
  tintGold: string;
  /** Card accent tints. Names are historical; content.ts decides which service
   *  area uses which one (see MANIFESTATION_TYPES accentVar). */
  typeComplaint: string;
  typeGrievance: string;
  typePetition: string;
  typeReport: string;
  /** Corner radius (CSS length, not an HSL triple). */
  radius: string;
}

export const DEFAULT_LANDING_TOKENS: LandingTokens = {
  primary: "152 62% 22%",       // #15583A  brand green, one step lighter than the crest's #003D1E so large
                                //          text areas read calm rather than heavy; still 7.9:1 on white
  primaryHover: "152 70% 16%",  // #0C4529
  secondary: "334 62% 36%",     // #94245A  softened burgundy from nairobi.go.ke — reserved
  deep: "153 60% 11%",          // #0B2D1E  footer, closing band, hero scrim base
  accent: "47 92% 56%",         // #F5C842  county gold, slightly warmed and desaturated from the crest's
                                //          #FBE116 so it sits with photography without glaring
  accentHover: "45 85% 49%",    // #E6B420
  onPrimary: "0 0% 100%",       // white on green
  onAccent: "153 60% 11%",      // #0B2D1E  deep green on gold — 10.6:1
  ink: "160 14% 15%",           // #21302A  body text, green-tinted charcoal instead of near-black
  inkSoft: "155 9% 36%",        // #546560  secondary text — 6.3:1 on white, 5.6:1 on the page tint
  surface: "0 0% 100%",         // white cards
  page: "120 14% 97%",          // #F6F8F6  warm off-white page
  line: "140 10% 88%",          // #DCE3DF
  ring: "152 62% 22%",
  tint: "150 32% 93%",          // #E7F1EB  soft green band / icon tiles
  tintGold: "47 90% 93%",       // #FEF6DC  soft gold highlight
  typeComplaint: "152 62% 22%",    // Urban Development & Planning — brand green
  typeGrievance: "334 62% 36%",    // Finance & Economic Planning — burgundy
  typePetition: "120 45% 35%",     // Environment / Green Nairobi — leaf green
  typeReport: "36 70% 40%",        // Boroughs & Sub-County Administration — earth
  radius: "0.875rem",           // 14px — rounder cards, in keeping with current government portals
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

/** Focus ring for interactive elements on the dark green surfaces. */
export const FOCUS_RING_DARK =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--pgrl-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
