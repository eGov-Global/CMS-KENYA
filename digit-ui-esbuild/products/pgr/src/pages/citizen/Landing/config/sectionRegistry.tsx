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
import { TaglineBand } from "../components/TaglineBand";
import { HowItWorksSection } from "../components/HowItWorksSection";
import { ChannelsSection } from "../components/ChannelsSection";
import { HelplinesSection } from "../components/HelplinesSection";
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
  HELPLINES,
  INSTITUTIONS,
  NAV_ITEMS,
  NewsItem,
} from "../content";
import { LandingRoutes } from "../routes";
import { buildRichItems, safeMediaSrc, fileStoreImageUrl, isFileStoreId, defaultItems, taggedIcon, defaultKey } from "./resolve";
import type { LandingItemConfig, LandingMediaConfig, LandingSectionConfig } from "./types";

export type Slot = "header" | "main" | "footer";

/** Artwork for the top of the page, supplied by the deployment entry. */
export interface LandingArtwork {
  /** Faint pattern along the hero's left edge. */
  heroPattern?: string;
  /** Service-category card photos, keyed by category id (MANIFESTATION_TYPES). */
  categories?: Record<string, string>;
  /** Slogan band: the triangle mosaics at either end and the skyline line art. */
  bandLeft?: string;
  bandRight?: string;
  bandSkyline?: string;
}

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
  artwork?: LandingArtwork;
  /** Phone photo card of the areas section (falls back to the hero photo). */
  areasPhotoUrl?: string;
}

export interface SectionEntry {
  Component: React.ComponentType<any>;
  slot: Slot;
  buildProps: (section: LandingSectionConfig, ctx: RenderCtx) => Record<string, any>;
  /** true when buildProps reads `section.media` — the Builder lets the
   *  operator replace this section's picture by clicking it. */
  image?: true;
}

/** The state tenant the Builder uploads pictures under (the page only runs
 *  inside the DIGIT shell). */
function stateTenantId(): string | undefined {
  try {
    return (window as any).Digit?.ULBService?.getStateId?.() || undefined;
  } catch {
    return undefined;
  }
}

/** media.imageId is either a pasted URL (passed through safeMediaSrc) or the
 *  file-store id of an uploaded picture, served anonymously at a stable path. */
function mediaUrl(media?: LandingMediaConfig): string | undefined {
  const id = media?.imageId;
  const tenant = stateTenantId();
  if (isFileStoreId(id) && tenant) return fileStoreImageUrl(id as string, tenant);
  return safeMediaSrc(id);
}

/** A section's further picture by slot (media.images[slot]). */
function slotUrl(media: LandingMediaConfig | undefined, slot: string): string | undefined {
  const id = media?.images?.[slot];
  return id ? mediaUrl({ imageId: id }) : undefined;
}

/** Card pictures of the types section: slots named card-<type id>. */
function cardImages(media?: LandingMediaConfig): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(media?.images ?? {}).forEach(([slot, id]) => {
    const url = slot.startsWith("card-") ? mediaUrl({ imageId: id }) : undefined;
    if (url) out[slot.slice(5)] = url;
  });
  return out;
}

/** section with its items normalised to the rich runtime shape (or left absent
 *  so the leaf uses its default array). */
const withItems = (s: LandingSectionConfig, def: any[], routes: LandingRoutes): LandingSectionConfig => ({
  ...s,
  // Built-in items keep their shape; only the icon is wrapped so the Builder
  // preview can tell which item an icon click belongs to.
  items: (buildRichItems(s.items, def, routes as unknown as Record<string, string>)
    ?? (def || []).map((d) => ({ ...d, icon: taggedIcon(d.icon, defaultKey(d)) }))) as any,
});

export const SECTION_REGISTRY: Record<string, SectionEntry> = {
  navigation: {
    Component: LandingHeader,
    slot: "header",
    image: true,
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
    image: true,
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
        patternUrl: slotUrl(s.media, "pattern") ?? ctx.artwork?.heroPattern,
        section: withItems(s, [], ctx.routes),
      };
    },
  },
  types: {
    Component: TypesSection,
    slot: "main",
    image: true,
    buildProps: (s, ctx) => ({
      routes: ctx.routes,
      images: { ...(ctx.artwork?.categories ?? {}), ...cardImages(s.media) },
      section: withItems(s, MANIFESTATION_TYPES, ctx.routes),
    }),
  },
  tagline: {
    Component: TaglineBand,
    slot: "main",
    image: true,
    buildProps: (s, ctx) => ({
      artwork: {
        ...ctx.artwork,
        bandLeft: slotUrl(s.media, "left") ?? ctx.artwork?.bandLeft,
        bandRight: slotUrl(s.media, "right") ?? ctx.artwork?.bandRight,
        bandSkyline: slotUrl(s.media, "skyline") ?? ctx.artwork?.bandSkyline,
      },
      section: s,
    }),
  },
  steps: {
    Component: HowItWorksSection,
    slot: "main",
    image: true,
    // Square cut so the circular orb isn't a heavy crop of a wide photo;
    // falls back to the hero image when a deployment ships no square asset.
    buildProps: (s, ctx) => ({ orbImageUrl: mediaUrl(s.media) ?? ctx.stepsOrbImageUrl ?? ctx.heroImageUrl, section: withItems(s, HOW_STEPS, ctx.routes) }),
  },
  channels: {
    Component: ChannelsSection,
    slot: "main",
    image: true,
    buildProps: (s, ctx) => ({
      routes: ctx.routes,
      orbImageUrl: mediaUrl(s.media) ?? ctx.channelsOrbImageUrl ?? ctx.bandImageUrl,
      personImageUrl: slotUrl(s.media, "portrait") ?? ctx.personImageUrl,
      section: withItems(s, CHANNELS, ctx.routes),
    }),
  },
  helplines: {
    Component: HelplinesSection,
    slot: "main",
    image: true,
    buildProps: (s, ctx) => ({ routes: ctx.routes, skylineUrl: mediaUrl(s.media) ?? ctx.artwork?.bandSkyline, section: withItems(s, HELPLINES, ctx.routes) }),
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
    image: true,
    buildProps: (s, ctx) => ({
      routes: ctx.routes,
      // Phone-only photo card.
      photoUrl: mediaUrl(s.media) ?? ctx.areasPhotoUrl ?? ctx.heroImageSmallUrl ?? ctx.heroImageUrl,
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
    image: true,
    // Footer columns (GROUPS) stay the component default in v1 — their nested
    // group shape isn't expressible in the flat item schema; destinations are
    // already config-driven via `routes` and labels via PGR_LANDING_* keys.
    buildProps: (s, ctx) => ({
      routes: ctx.routes,
      logoUrl: mediaUrl(s.media) ?? ctx.footerLogoUrl,
      emblemUrl: slotUrl(s.media, "emblem") ?? ctx.emblemUrl,
      section: s,
    }),
  },
};

export function getEntry(type?: string): SectionEntry | undefined {
  if (!type) return undefined;
  return SECTION_REGISTRY[type];
}

/** Section types whose picture the operator can replace (entries flagged `image`). */
export function sectionTakesImage(type?: string): boolean {
  return !!(type && SECTION_REGISTRY[type]?.image);
}

/** Each section type's built-in items as config rows, for the Builder. */
export function defaultItemsByType(): Record<string, LandingItemConfig[]> {
  return {
    navigation: defaultItems(NAV_ITEMS),
    types: defaultItems(MANIFESTATION_TYPES),
    steps: defaultItems(HOW_STEPS),
    channels: defaultItems(CHANNELS),
    helplines: defaultItems(HELPLINES),
    institutions: defaultItems(INSTITUTIONS),
  };
}
