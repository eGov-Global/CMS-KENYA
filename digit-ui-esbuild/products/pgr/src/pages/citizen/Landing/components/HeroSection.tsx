// Hero: the city photograph on the right fading into deep county green on the
// left, the headline and two CTAs, frosted trust chips, the pilot note, a
// hand-lettered tagline, and a curved page-coloured sweep along the bottom.
// Four stat cards with icon tiles follow, their figures counting up on first
// view.
//
// The photo is optional — without `imageUrl` the same layout renders on a flat
// deep-green surface. Text is always white-on-green; the gradient is what
// guarantees contrast whatever the photo looks like.
//
// Slow networks: the <img> is `fetchpriority="high"` and carries a `srcSet`
// so phones download the small cut; the drift animation is CSS-only and
// switched off under prefers-reduced-motion, as is every other movement here.

import * as React from "react";
import { Send, Search, Lock, Hash, Bell, MapPin, Leaf, FileText, Users, Clock, FolderOpen } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { CtaLink } from "./CtaLink";
import { revealIndex } from "./Section";
import { HeroWave } from "./Illustrations";
import { useLandingCopy } from "../useLandingCopy";
import { useCountUp } from "../useCountUp";
import { sectionDomId } from "../config/resolve";
import { LandingRoutes } from "../routes";
import { CONTAINER } from "../tokens";
import type { LandingSectionConfig } from "../config/types";

export interface HeroSectionProps {
  routes: LandingRoutes;
  /** Photographic background, rendered under the brand gradient. */
  imageUrl?: string;
  /** Smaller cut of the same photo for narrow viewports (srcSet). */
  imageSmallUrl?: string;
  /** Config-driven overrides; absent => the built-in deck (unchanged). */
  section?: LandingSectionConfig;
}

const STATS = [
  { icon: FileText, value: "STAT_SUBCOUNTIES_VALUE", label: "STAT_SUBCOUNTIES_LABEL" },
  { icon: Users, value: "STAT_WARDS_VALUE", label: "STAT_WARDS_LABEL" },
  { icon: Clock, value: "STAT_SLA_VALUE", label: "STAT_SLA_LABEL" },
  { icon: FolderOpen, value: "STAT_DEPARTMENTS_VALUE", label: "STAT_DEPARTMENTS_LABEL" },
] as const;

function StatCard({ icon: Icon, value, label }: { icon: React.ComponentType<any>; value: string; label: string }) {
  const { ref, text } = useCountUp<HTMLElement>(value);
  return (
    <div className="pgrl-lift flex items-center gap-3 rounded-2xl border border-solid border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-surface))] p-4 shadow-[0_18px_40px_-24px_rgba(11,45,30,0.35)] md:gap-4 md:p-5">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--pgrl-tint))] text-[hsl(var(--pgrl-primary))]"
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex min-w-0 flex-col">
        <dd ref={ref} className="order-1 m-0 text-2xl font-bold leading-none tracking-tight text-[hsl(var(--pgrl-ink))] md:text-3xl">
          {text}
        </dd>
        <dt className="order-2 m-0 mt-1 text-xs leading-snug text-[hsl(var(--pgrl-ink-soft))] md:text-sm">{label}</dt>
      </div>
    </div>
  );
}

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

  const stats = STATS.map((s) => ({ ...s, value: c(s.value), label: c(s.label) })).filter((s) => s.value && s.label);
  const script = c("HERO_SCRIPT");
  const caption = c("HERO_PHOTO_CAPTION");

  return (
    <section id={domId} data-pgrl-code={section?.code} aria-labelledby={`${domId}-title`} className="relative">
      <div className="relative isolate bg-[hsl(var(--pgrl-deep))] text-[hsl(var(--pgrl-on-primary))]">
        {/* Photo and gradient live in their own clipped layer: the drift's
            scale must never spill, while the stat cards below overlap freely. */}
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          {imageUrl && (
            <img
              src={imageUrl}
              srcSet={imageSmallUrl ? `${imageSmallUrl} 760w, ${imageUrl} 1800w` : undefined}
              sizes="100vw"
              alt=""
              // @ts-expect-error fetchpriority is not in React 17's typings; browsers read the lowercase attribute.
              fetchpriority="high"
              className="pgrl-drift absolute inset-0 h-full w-full object-cover object-[68%_45%]"
            />
          )}
          {/* Solid green on the text side, thinning to the right so the city
              shows; a light top/bottom fade keeps the chips and wave legible. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, hsl(var(--pgrl-deep) / 0.97) 0%, hsl(var(--pgrl-deep) / 0.94) 36%, hsl(var(--pgrl-deep) / 0.6) 58%, hsl(var(--pgrl-deep) / 0.22) 82%, hsl(var(--pgrl-deep) / 0.12) 100%)," +
                "linear-gradient(180deg, hsl(var(--pgrl-deep) / 0.35) 0%, hsl(var(--pgrl-deep) / 0) 30%, hsl(var(--pgrl-deep) / 0.45) 100%)",
            }}
          />
        </div>

        <div className={cn(CONTAINER, "relative pb-28 pt-12 md:pb-36 md:pt-20 lg:pt-24")}>
          <div className="max-w-2xl lg:max-w-[46rem]">
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
              className="pgrl-rise mb-0 mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-[hsl(var(--pgrl-on-primary))] sm:text-5xl lg:text-6xl"
              style={revealIndex(1)}
            >
              {c(section?.titleKey, "HERO_TITLE")}
            </h1>

            <p
              className="pgrl-rise mb-0 mt-5 max-w-xl text-base leading-relaxed text-[hsl(var(--pgrl-on-primary)/0.88)] sm:text-lg"
              style={revealIndex(2)}
            >
              {c(section?.subtitleKey, "HERO_LEDE")}
            </p>

            <div className="pgrl-rise mt-7 flex flex-col gap-3 sm:flex-row sm:items-center" style={revealIndex(3)}>
              <CtaLink
                to={routes.REGISTER_COMPLAINT}
                variant="accent"
                size="lg"
                leading={<Send aria-hidden className="h-5 w-5" />}
                className="w-full !rounded-full sm:w-auto"
              >
                {c("HERO_CTA_SUBMIT")}
              </CtaLink>
              <CtaLink
                to={routes.TRACK_COMPLAINT}
                variant="inverse"
                size="lg"
                leading={<Search aria-hidden className="h-5 w-5" />}
                className="w-full !rounded-full sm:w-auto"
              >
                {c("HERO_CTA_TRACK")}
              </CtaLink>
            </div>

            {/* Trust markers as frosted chips. */}
            <ul className="pgrl-rise m-0 mt-7 flex list-none flex-wrap gap-2 p-0" style={revealIndex(4)}>
              {trust.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="m-0 inline-flex items-center gap-2 rounded-full border border-solid border-[hsl(var(--pgrl-on-primary)/0.16)] bg-[hsl(var(--pgrl-on-primary)/0.1)] px-3.5 py-2 text-sm text-[hsl(var(--pgrl-on-primary)/0.92)] backdrop-blur-sm"
                >
                  <Icon aria-hidden className="h-4 w-4 shrink-0 text-[hsl(var(--pgrl-accent))]" />
                  {label}
                </li>
              ))}
            </ul>

            {/* Pilot-phase notice: a wider chip with the pin, same family as above. */}
            <p
              role="note"
              className="pgrl-rise mb-0 mt-3 inline-flex max-w-xl items-start gap-2.5 rounded-2xl border border-solid border-[hsl(var(--pgrl-on-primary)/0.14)] bg-[hsl(var(--pgrl-on-primary)/0.08)] px-4 py-3 text-sm leading-relaxed text-[hsl(var(--pgrl-on-primary)/0.86)] backdrop-blur-sm"
              style={revealIndex(5)}
            >
              <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--pgrl-accent))]" />
              <span>{c("HERO_PILOT_NOTICE")}</span>
            </p>
          </div>

          {/* Hand-lettered tagline: in flow under the copy on phones, over the
              photo from md up. Decorative — the eyebrow and headline already
              carry the message for assistive tech. */}
          {script && (
            <p
              aria-hidden
              className="pgrl-script pgrl-rise relative m-0 ml-auto mt-6 w-max max-w-[11rem] rotate-[-6deg] text-right text-3xl font-semibold leading-[0.95] text-[hsl(var(--pgrl-accent))] drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] md:absolute md:bottom-28 md:right-[6%] md:mt-0 md:max-w-[12rem] md:rotate-[-8deg] md:text-5xl lg:bottom-32 lg:max-w-[14rem]"
              style={revealIndex(6)}
            >
              <Leaf className="mb-1 ml-auto h-6 w-6 rotate-[30deg] md:h-8 md:w-8" />
              {script}
            </p>
          )}

          {imageUrl && caption && (
            <p className="absolute right-4 top-3 m-0 hidden text-[11px] text-[hsl(var(--pgrl-on-primary)/0.55)] lg:block">
              {caption}
            </p>
          )}
        </div>

        <HeroWave className="absolute bottom-0 left-0 h-12 w-full md:h-20 lg:h-24" />
      </div>

      {/* Headline figures as cards riding the curve. */}
      {stats.length > 0 && (
        <div className={cn(CONTAINER, "relative z-10 -mt-5 md:-mt-8")}>
          <dl className="pgrl-rise m-0 grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4" style={revealIndex(7)}>
            {stats.map((s) => (
              <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label} />
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
