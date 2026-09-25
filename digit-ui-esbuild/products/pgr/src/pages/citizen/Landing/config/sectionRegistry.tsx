// type -> component registry + config->props adapter (P1, CCSD-2006).
//
// The frozen v1 catalog (scope A) is enforced HERE, not by the MDMS schema: an
// unknown `type` simply has no entry and is skipped by the renderer (config is
// untrusted). Each entry declares a DOM `slot` so the renderer reproduces the
// exact page structure — navigation sits above <main>, footer below it, every
// other section inside <main> — while still honouring per-section ordering.
//
// buildProps performs the two adapter responsibilities the leaf components must
// NOT know about: (1) icon-id string -> lucide component + cosmetic-field
// inheritance (via buildRichItems), (2) media-id -> url. When a section carries
// no items, buildRichItems returns undefined and the leaf falls back to its
// built-in deck array — so an unconfigured section renders identically to today.

import { HeroSection } from "../components/HeroSection";
import { TypesSection } from "../components/TypesSection";
import { HowItWorksSection } from "../components/HowItWorksSection";
import { ChannelsSection } from "../components/ChannelsSection";
import { PrivacySection } from "../components/PrivacySection";
import { NewsSection } from "../components/NewsSection";
import { InstitutionsSection } from "../components/InstitutionsSection";
import { FinalCtaSection } from "../components/FinalCtaSection";
import { LandingHeader } from "../components/LandingHeader";
import { LandingFooter } from "../components/LandingFooter";

import {
  MANIFESTATION_TYPES,
  HOW_STEPS,
  CHANNELS,
  INSTITUTIONS,
  NAV_ITEMS,
  NewsItem,
} from "../content";
import { LandingRoutes } from "../routes";
import { buildRichItems, safeMediaSrc } from "./resolve";
import type { LandingMediaConfig, LandingSectionConfig } from "./types";

export type Slot = "header" | "main" | "footer";

export interface RenderCtx {
  routes: LandingRoutes;
  news: NewsItem[];
  heroImageUrl?: string;
  /** Narrow-viewport cut of the hero photo (srcSet); only used with heroImageUrl. */
  heroImageSmallUrl?: string;
  /** Photo for the circular artwork beside the channels title. */
  bandImageUrl?: string;
  /** Portrait of a resident for the closing call to action. */
  personImageUrl?: string;
  /** Square cuts for the two circular photo orbs. */
  stepsOrbImageUrl?: string;
  channelsOrbImageUrl?: string;
  emblemUrl?: string;
  footerLogoUrl?: string;
}

export interface SectionEntry {
  Component: React.ComponentType<any>;
  slot: Slot;
  buildProps: (section: LandingSectionConfig, ctx: RenderCtx) => Record<string, any>;
}

/** media.imageId as a direct URL passes through (see safeMediaSrc); a bare
 *  filestore id is left for the P2 media phase and ignored here, so the
 *  section falls back to its default (no image). */
function mediaUrl(media?: LandingMediaConfig): string | undefined {
  return safeMediaSrc(media?.imageId);
}

/** section with its items normalised to the rich runtime shape (or left absent
 *  so the leaf uses its default array). */
const withItems = (s: LandingSectionConfig, def: any[], routes: LandingRoutes): LandingSectionConfig => ({
  ...s,
  items: buildRichItems(s.items, def, routes as unknown as Record<string, string>) as any,
});

export const SECTION_REGISTRY: Record<string, SectionEntry> = {
  navigation: {
    Component: LandingHeader,
    slot: "header",
    buildProps: (s, ctx) => ({
      routes: ctx.routes,
      emblemUrl: mediaUrl(s.media) ?? ctx.emblemUrl,
      navItems: buildRichItems(s.items, NAV_ITEMS, ctx.routes as unknown as Record<string, string>),
      code: s.code,
    }),
  },
  hero: {
    Component: HeroSection,
    slot: "main",
    // P4 (approved adapter tweak): hero trust "features" are items-driven when
    // config provides items[]; icons resolve through the whitelist. CTAs stay
    // application behavior (fixed destinations).
    buildProps: (s, ctx) => {
      const configured = mediaUrl(s.media);
      return {
        routes: ctx.routes,
        imageUrl: configured ?? ctx.heroImageUrl,
        // The small cut belongs to the shipped photo only; a configured image
        // has no sibling, so it is dropped rather than mismatched.
        imageSmallUrl: configured ? undefined : ctx.heroImageSmallUrl,
        section: withItems(s, [], ctx.routes),
      };
    },
  },
  types: {
    Component: TypesSection,
    slot: "main",
    buildProps: (s, ctx) => ({ routes: ctx.routes, section: withItems(s, MANIFESTATION_TYPES, ctx.routes) }),
  },
  steps: {
    Component: HowItWorksSection,
    slot: "main",
    // Square cut so the circular orb isn't a heavy crop of a wide photo;
    // falls back to the hero image when a deployment ships no square asset.
    buildProps: (s, ctx) => ({ orbImageUrl: mediaUrl(s.media) ?? ctx.stepsOrbImageUrl ?? ctx.heroImageUrl, section: withItems(s, HOW_STEPS, ctx.routes) }),
  },
  channels: {
    Component: ChannelsSection,
    slot: "main",
    buildProps: (s, ctx) => ({
      routes: ctx.routes,
      orbImageUrl: mediaUrl(s.media) ?? ctx.channelsOrbImageUrl ?? ctx.bandImageUrl,
      personImageUrl: ctx.personImageUrl,
      section: withItems(s, CHANNELS, ctx.routes),
    }),
  },
  privacy: {
    Component: PrivacySection,
    slot: "main",
    buildProps: (s, ctx) => ({ routes: ctx.routes, section: s }),
  },
  news: {
    Component: NewsSection,
    slot: "main",
    buildProps: (s, ctx) => ({ routes: ctx.routes, items: ctx.news, section: s }),
  },
  institutions: {
    Component: InstitutionsSection,
    slot: "main",
    buildProps: (s, ctx) => ({
      routes: ctx.routes,
      // Phone-only photo card: the small hero cut phones already downloaded.
      photoUrl: ctx.heroImageSmallUrl ?? ctx.heroImageUrl,
      section: withItems(s, INSTITUTIONS, ctx.routes),
    }),
  },
  cta: {
    Component: FinalCtaSection,
    slot: "main",
    buildProps: (s, ctx) => ({ routes: ctx.routes, section: s }),
  },
  footer: {
    Component: LandingFooter,
    slot: "footer",
    // Footer columns (GROUPS) stay the component default in v1 — their nested
    // group shape isn't expressible in the flat item schema; destinations are
    // already config-driven via `routes` and labels via PGR_LANDING_* keys.
    buildProps: (s, ctx) => ({
      routes: ctx.routes,
      logoUrl: mediaUrl(s.media) ?? ctx.footerLogoUrl,
      emblemUrl: ctx.emblemUrl,
      section: s,
    }),
  },
};

export function getEntry(type?: string): SectionEntry | undefined {
  if (!type) return undefined;
  return SECTION_REGISTRY[type];
}
