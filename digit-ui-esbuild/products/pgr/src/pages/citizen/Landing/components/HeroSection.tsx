// Hero: headline, the two CTAs (report / track) and trust markers. The full
// list of channels lives in ChannelsSection.
//
// The background is plain white; text uses the same soft
// ink as the card headings. A deployment can layer a photo through `imageUrl`;
// it sits under a fixed white scrim so the dark text keeps its contrast
// whatever the photo looks like.

import * as React from "react";
import { Send, Search, Lock, Hash, Bell, Info } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { CtaLink } from "./CtaLink";
import { useLandingCopy } from "../useLandingCopy";
import { sectionDomId } from "../config/resolve";
import { LandingRoutes } from "../routes";
import { CONTAINER } from "../tokens";
import type { LandingSectionConfig } from "../config/types";

export interface HeroSectionProps {
  routes: LandingRoutes;
  /** Optional photographic background, rendered under the brand scrim. */
  imageUrl?: string;
  /** Config-driven overrides; absent => the built-in deck (unchanged). */
  section?: LandingSectionConfig;
}

export function HeroSection({ routes, imageUrl, section }: HeroSectionProps) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "hero");

  // Config-driven trust "features" (P4): items[] when provided, else the
  // built-in three — byte-identical when config is absent.
  const configItems = (section?.items as any[]) || [];
  const trust = configItems.length
    // Skip items with no text — otherwise an unseeded key leaves a bare icon.
    ? configItems
        .map((it) => ({ icon: it.icon ?? Lock, label: c(it.labelKey, it.labelKeyDefault) }))
        .filter((it) => it.label)
    : [
        { icon: Lock, label: c("HERO_TRUST_CONFIDENTIAL") },
        { icon: Hash, label: c("HERO_TRUST_CASE_NUMBER") },
        { icon: Bell, label: c("HERO_TRUST_NOTIFICATIONS") },
      ];

  return (
    <section
      id={domId}
      data-pgrl-code={section?.code}
      aria-labelledby={`${domId}-title`}
      className="relative isolate overflow-hidden bg-[hsl(var(--pgrl-surface))]"
    >
      {imageUrl && (
        <>
          <img src={imageUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-[hsl(var(--pgrl-surface)/0.85)]" />
        </>
      )}

      <div className={cn(CONTAINER, "py-14 md:py-20")}>
        <div className="max-w-3xl">
          <p className="m-0 text-xs font-bold uppercase tracking-widest text-[hsl(var(--pgrl-ink-soft))]">
            {c(section?.bodyKey, "HERO_EYEBROW")}
          </p>

          <h1
            id={`${domId}-title`}
            className="mb-0 mt-4 text-3xl font-bold leading-tight text-[hsl(var(--pgrl-ink-soft))] sm:text-4xl lg:text-5xl"
          >
            {c(section?.titleKey, "HERO_TITLE")}
          </h1>

          <p className="mb-0 mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--pgrl-ink-soft))] sm:text-lg">
            {c(section?.subtitleKey, "HERO_LEDE")}
          </p>

          {/* Pilot-phase notice: accent surface with dark on-accent text (the
              approved high-contrast pairing for accent surfaces). */}
          <div
            role="note"
            className="mt-4 flex items-start gap-2 rounded-lg bg-[hsl(var(--pgrl-accent))] px-4 py-3 text-sm font-medium text-[hsl(var(--pgrl-on-accent))] shadow-sm sm:text-base"
          >
            <Info aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{c("HERO_PILOT_NOTICE")}</span>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <CtaLink
              to={routes.REGISTER_COMPLAINT}
              variant="accent"
              size="lg"
              leading={<Send aria-hidden className="h-5 w-5" />}
              className="w-full sm:w-auto"
            >
              {c("HERO_CTA_SUBMIT")}
            </CtaLink>
            <CtaLink
              to={routes.TRACK_COMPLAINT}
              variant="outline"
              size="lg"
              leading={<Search aria-hidden className="h-5 w-5" />}
              className="w-full sm:w-auto"
            >
              {c("HERO_CTA_TRACK")}
            </CtaLink>
          </div>

          {/* Trust markers */}
          <ul className="m-0 mt-8 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
            {trust.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="m-0 flex items-center gap-2 p-0 text-sm text-[hsl(var(--pgrl-ink-soft))]"
              >
                <Icon aria-hidden className="h-4 w-4 text-[hsl(var(--pgrl-primary))]" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
