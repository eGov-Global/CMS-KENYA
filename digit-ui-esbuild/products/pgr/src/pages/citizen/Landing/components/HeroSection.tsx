// Hero: a full-bleed photograph of the city under a deep-green gradient scrim,
// with the headline, the two CTAs (report / track), the trust markers and a
// strip of headline figures overlapping the bottom edge.
//
// The photo is optional — without `imageUrl` the same layout renders on a flat
// deep-green surface, so a tenant with no photography still gets a complete
// hero. Text is always white-on-green; the scrim is what guarantees contrast
// whatever the photo looks like (it darkens to ~90% on the text side).
//
// Slow networks: the <img> is `fetchpriority="high"` and carries a `srcSet`
// so phones download the 960 px cut, not the 1920 px one; the drift animation
// is CSS-only and switched off under prefers-reduced-motion.

import * as React from "react";
import { Send, Search, Lock, Hash, Bell, Info } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { CtaLink } from "./CtaLink";
import { revealIndex } from "./Section";
import { useLandingCopy } from "../useLandingCopy";
import { sectionDomId } from "../config/resolve";
import { LandingRoutes } from "../routes";
import { CONTAINER } from "../tokens";
import type { LandingSectionConfig } from "../config/types";

export interface HeroSectionProps {
  routes: LandingRoutes;
  /** Photographic background, rendered under the brand scrim. */
  imageUrl?: string;
  /** Smaller cut of the same photo for narrow viewports (srcSet). */
  imageSmallUrl?: string;
  /** Config-driven overrides; absent => the built-in deck (unchanged). */
  section?: LandingSectionConfig;
}

const STATS = [
  { value: "STAT_SUBCOUNTIES_VALUE", label: "STAT_SUBCOUNTIES_LABEL" },
  { value: "STAT_WARDS_VALUE", label: "STAT_WARDS_LABEL" },
  { value: "STAT_SLA_VALUE", label: "STAT_SLA_LABEL" },
  { value: "STAT_DEPARTMENTS_VALUE", label: "STAT_DEPARTMENTS_LABEL" },
] as const;

export function HeroSection({ routes, imageUrl, imageSmallUrl, section }: HeroSectionProps) {
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

  const stats = STATS.map((s) => ({ value: c(s.value), label: c(s.label) })).filter((s) => s.value && s.label);
  const caption = c("HERO_PHOTO_CAPTION");

  return (
    <section
      id={domId}
      data-pgrl-code={section?.code}
      aria-labelledby={`${domId}-title`}
      className="relative isolate bg-[hsl(var(--pgrl-deep))] text-[hsl(var(--pgrl-on-primary))]"
    >
      {/* Photo and scrim live in their own clipped layer: the drift's scale
          must never spill, but the section itself stays unclipped so the stats
          strip can hang over its bottom edge. */}
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        {imageUrl && (
          <img
            src={imageUrl}
            srcSet={imageSmallUrl ? `${imageSmallUrl} 960w, ${imageUrl} 1920w` : undefined}
            sizes="100vw"
            alt=""
            // @ts-expect-error fetchpriority is not in React 17's typings; browsers read the lowercase attribute.
            fetchpriority="high"
            className="pgrl-drift absolute inset-0 h-full w-full object-cover object-center"
          />
        )}
        {/* Scrim: opaque on the text side, thinning towards the photo so the
            city stays visible; a bottom fade eases into the stats strip. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--pgrl-deep) / 0.94) 0%, hsl(var(--pgrl-deep) / 0.86) 42%, hsl(var(--pgrl-deep) / 0.42) 78%, hsl(var(--pgrl-deep) / 0.28) 100%)," +
              "linear-gradient(180deg, hsl(var(--pgrl-deep) / 0.25) 0%, hsl(var(--pgrl-deep) / 0) 40%, hsl(var(--pgrl-deep) / 0.55) 100%)",
          }}
        />
      </div>

      <div className={cn(CONTAINER, "relative pb-24 pt-14 md:pb-32 md:pt-24 lg:pt-28")}>
        <div className="max-w-2xl lg:max-w-3xl">
          <p
            className="pgrl-rise m-0 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--pgrl-accent))]"
            style={revealIndex(0)}
          >
            <span aria-hidden className="inline-block h-[3px] w-6 rounded-full bg-[hsl(var(--pgrl-accent))]" />
            {c(section?.bodyKey, "HERO_EYEBROW")}
          </p>

          <h1
            id={`${domId}-title`}
            // Explicit colour: the vendored CSS paints bare h1 in the brand green.
            className="pgrl-rise mb-0 mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-[hsl(var(--pgrl-on-primary))] sm:text-5xl lg:text-6xl"
            style={revealIndex(1)}
          >
            {c(section?.titleKey, "HERO_TITLE")}
          </h1>

          <p
            className="pgrl-rise mb-0 mt-5 max-w-xl text-base leading-relaxed text-[hsl(var(--pgrl-on-primary)/0.86)] sm:text-lg"
            style={revealIndex(2)}
          >
            {c(section?.subtitleKey, "HERO_LEDE")}
          </p>

          <div className="pgrl-rise mt-8 flex flex-col gap-3 sm:flex-row sm:items-center" style={revealIndex(3)}>
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
              variant="inverse"
              size="lg"
              leading={<Search aria-hidden className="h-5 w-5" />}
              className="w-full sm:w-auto"
            >
              {c("HERO_CTA_TRACK")}
            </CtaLink>
          </div>

          {/* Trust markers as frosted chips. */}
          <ul className="pgrl-rise m-0 mt-8 flex list-none flex-wrap gap-2 p-0" style={revealIndex(4)}>
            {trust.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="m-0 inline-flex items-center gap-2 rounded-full border border-solid border-[hsl(var(--pgrl-on-primary)/0.18)] bg-[hsl(var(--pgrl-on-primary)/0.1)] px-3 py-1.5 text-sm text-[hsl(var(--pgrl-on-primary)/0.92)] backdrop-blur-sm"
              >
                <Icon aria-hidden className="h-4 w-4 text-[hsl(var(--pgrl-accent))]" />
                {label}
              </li>
            ))}
          </ul>

          {/* Pilot-phase notice: quiet line, gold marker, not a block. */}
          <p
            role="note"
            className="pgrl-rise mb-0 mt-6 flex max-w-xl items-start gap-2 text-sm leading-relaxed text-[hsl(var(--pgrl-on-primary)/0.78)]"
            style={revealIndex(5)}
          >
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--pgrl-accent))]" />
            <span>{c("HERO_PILOT_NOTICE")}</span>
          </p>
        </div>

        {imageUrl && caption && (
          <p className="absolute bottom-3 right-4 m-0 hidden text-[11px] text-[hsl(var(--pgrl-on-primary)/0.55)] md:block">
            {caption}
          </p>
        )}
      </div>

      {/* Headline figures: a white strip that overlaps the hero's bottom edge
          and carries into the next section. */}
      {stats.length > 0 && (
        <div className={cn(CONTAINER, "relative z-10 -mb-12 md:-mb-14")}>
          <dl
            className="pgrl-rise m-0 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--pgrl-radius)] bg-[hsl(var(--pgrl-line))] shadow-[0_18px_40px_-20px_rgba(11,45,30,0.45)] md:grid-cols-4"
            style={revealIndex(6)}
          >
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-1 bg-[hsl(var(--pgrl-surface))] px-5 py-5 md:px-6">
                <dt className="order-2 m-0 text-xs font-medium leading-snug text-[hsl(var(--pgrl-ink-soft))] sm:text-sm">
                  {s.label}
                </dt>
                <dd className="order-1 m-0 text-2xl font-bold leading-none tracking-tight text-[hsl(var(--pgrl-primary))] md:text-3xl">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
