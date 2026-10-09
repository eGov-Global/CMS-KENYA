// The "editorial" layout — the Bomet Feedback Hub composition. Each entry
// replaces the classic component for its section type and nothing else: the
// same config row, copy keys, routes and media flow through buildProps, so the
// Builder, the seeds and the localisation are shared with the classic page.
// Types without an entry here (navigation, news, cta) render the classic
// component.

import type { SectionEntry } from "../../config/sectionRegistry";
import { mediaUrl, withItems } from "../../config/resolve";
import { MANIFESTATION_TYPES, HOW_STEPS, CHANNELS, HELPLINES, INSTITUTIONS } from "../../content";
import { EditorialHero } from "./EditorialHero";
import { EditorialTypes } from "./EditorialTypes";
import { EditorialSteps } from "./EditorialSteps";
import { EditorialChannels } from "./EditorialChannels";
import { EditorialHelplines } from "./EditorialHelplines";
import { EditorialPrivacy } from "./EditorialPrivacy";
import { EditorialInstitutions } from "./EditorialInstitutions";
import { EditorialFooter } from "./EditorialFooter";

export const EDITORIAL_SECTIONS: Partial<Record<string, SectionEntry>> = {
  hero: {
    Component: EditorialHero,
    slot: "main",
    buildProps: (s, ctx) => {
      const configured = mediaUrl(s.media);
      return {
        routes: ctx.routes,
        imageUrl: configured ?? ctx.heroImageUrl,
        imageSmallUrl: configured ? undefined : ctx.heroImageSmallUrl,
        section: withItems(s, [], ctx.routes),
      };
    },
  },
  types: {
    Component: EditorialTypes,
    slot: "main",
    buildProps: (s, ctx) => ({ routes: ctx.routes, section: withItems(s, MANIFESTATION_TYPES, ctx.routes) }),
  },
  steps: {
    Component: EditorialSteps,
    slot: "main",
    buildProps: (s, ctx) => ({ section: withItems(s, HOW_STEPS, ctx.routes) }),
  },
  channels: {
    Component: EditorialChannels,
    slot: "main",
    buildProps: (s, ctx) => ({ routes: ctx.routes, section: withItems(s, CHANNELS, ctx.routes) }),
  },
  helplines: {
    Component: EditorialHelplines,
    slot: "main",
    buildProps: (s, ctx) => ({ routes: ctx.routes, section: withItems(s, HELPLINES, ctx.routes) }),
  },
  privacy: {
    Component: EditorialPrivacy,
    slot: "main",
    buildProps: (s, ctx) => ({ routes: ctx.routes, section: s }),
  },
  institutions: {
    Component: EditorialInstitutions,
    slot: "main",
    buildProps: (s, ctx) => ({ routes: ctx.routes, section: withItems(s, INSTITUTIONS, ctx.routes) }),
  },
  footer: {
    Component: EditorialFooter,
    slot: "footer",
    buildProps: (s, ctx) => ({ routes: ctx.routes, logoUrl: mediaUrl(s.media) ?? ctx.footerLogoUrl, emblemUrl: ctx.emblemUrl, section: s }),
  },
};
