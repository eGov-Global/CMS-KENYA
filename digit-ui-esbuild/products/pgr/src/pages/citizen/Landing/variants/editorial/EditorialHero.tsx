// Editorial hero (Bomet): the copy sits on the light page at left, the county
// photograph at right in a rounded frame with the motto riding over it, and a
// dark band of headline figures closes the block. Same inputs as the classic
// hero — routes, the hero photo and its small cut, config items for the trust
// list, the HERO_* and STAT_* copy keys — composed differently.
//
// Motion: the copy rises in sequence on load (pgrl-rise), the frame settles
// in from the right (pgrl-arch), the motto ribbon floats, the figures count
// up on first view. All of it is off under prefers-reduced-motion.

import * as React from "react";
import { Send, Search, Lock, Hash, Bell, MapPin, Leaf, FileText, Users, Clock, FolderOpen } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { CtaLink } from "../../components/CtaLink";
import { DotGrid } from "../../components/DotGrid";
import { revealIndex } from "../../components/Section";
import { useLandingCopy } from "../../useLandingCopy";
import { useCountUp } from "../../useCountUp";
import { sectionDomId } from "../../config/resolve";
import { CONTAINER } from "../../tokens";
import type { LandingRoutes } from "../../routes";
import type { LandingSectionConfig } from "../../config/types";

export interface EditorialHeroProps {
  routes: LandingRoutes;
  /** County photograph for the frame; without it a flat brand panel stands in. */
  imageUrl?: string;
  /** Smaller cut of the same photo for narrow viewports. */
  imageSmallUrl?: string;
  /** Config-driven overrides; absent => the built-in deck. */
  section?: LandingSectionConfig;
}

const STATS = [
  { icon: FileText, value: "STAT_SUBCOUNTIES_VALUE", label: "STAT_SUBCOUNTIES_LABEL" },
  { icon: Users, value: "STAT_WARDS_VALUE", label: "STAT_WARDS_LABEL" },
  { icon: Clock, value: "STAT_SLA_VALUE", label: "STAT_SLA_LABEL" },
  { icon: FolderOpen, value: "STAT_DEPARTMENTS_VALUE", label: "STAT_DEPARTMENTS_LABEL" },
] as const;

function Figure({ icon: Icon, value, label }: { icon: React.ComponentType<any>; value: string; label: string }) {
  const { ref, text } = useCountUp<HTMLElement>(value);
  return (
    // Two-up until xl: four cells across a 1024 px band left the figures and
    // their labels wrapping at different heights. The icon is dropped on
    // phones so "1–30 days" keeps to one line in a half-width cell. Top-aligned
    // so every figure shares one baseline whatever its label wraps to.
    <div className="flex items-start gap-4 py-3 xl:border-0 xl:border-l xl:border-solid xl:border-[hsl(var(--pgrl-on-primary)/0.14)] xl:py-0 xl:pl-8 xl:first:border-l-0 xl:first:pl-0">
      <span
        aria-hidden
        className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--pgrl-on-primary)/0.08)] text-[hsl(var(--pgrl-accent))] sm:flex"
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex min-w-0 flex-col">
        <dd ref={ref} className="order-1 m-0 whitespace-nowrap text-[1.75rem] font-bold leading-none tracking-tight text-[hsl(var(--pgrl-on-primary))] md:text-4xl">
          {/* The count-up is decoration: assistive tech reads the final figure at once. */}
          <span aria-hidden>{text}</span>
          <span className="sr-only">{value}</span>
        </dd>
        <dt className="order-2 m-0 mt-1.5 text-[11px] uppercase leading-snug tracking-[0.12em] text-[hsl(var(--pgrl-on-primary)/0.7)] md:text-xs">{label}</dt>
      </div>
    </div>
  );
}

export function EditorialHero({ routes, imageUrl, imageSmallUrl, section }: EditorialHeroProps) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "hero");

  // Trust markers: config items when provided, else the built-in three.
  const configItems = (section?.items as any[]) || [];
  const trust = configItems.length
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
  const notice = c("HERO_PILOT_NOTICE");

  const frame = "rounded-[2rem] rounded-tl-[5rem] sm:rounded-tl-[6rem]";

  return (
    <section id={domId} data-pgrl-code={section?.code} aria-labelledby={`${domId}-title`} className="relative isolate overflow-hidden">
      {/* A soft wash of the brand tint behind the photo side; the page stays light. */}
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 lg:block"
        style={{ background: "radial-gradient(70% 70% at 70% 30%, hsl(var(--pgrl-tint)) 0%, hsl(var(--pgrl-tint) / 0) 72%)" }}
      />
      <DotGrid id={`${domId}-dots`} className="absolute -right-8 top-8 -z-10 hidden h-56 w-56 text-[hsl(var(--pgrl-primary)/0.14)] lg:block" />

      <div className={cn(CONTAINER, "grid items-center gap-10 pb-12 pt-10 md:pt-14 lg:grid-cols-12 lg:gap-12 lg:pb-20 lg:pt-20")}>
        <div className="lg:col-span-6">
          <p
            className="pgrl-rise m-0 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--pgrl-primary))]"
            style={revealIndex(0)}
          >
            <span aria-hidden className="pgrl-dash inline-block h-[3px] w-6 rounded-full bg-[hsl(var(--pgrl-primary))]" />
            {c(section?.bodyKey, "HERO_EYEBROW")}
          </p>

          <h1
            id={`${domId}-title`}
            // Explicit colour: the vendored CSS paints bare h1 in the brand colour.
            className="pgrl-rise mb-0 mt-4 text-4xl font-bold leading-[1.04] tracking-tight text-[hsl(var(--pgrl-deep))] sm:text-5xl lg:text-[3.6rem]"
            style={revealIndex(1)}
          >
            {c(section?.titleKey, "HERO_TITLE")}
          </h1>

          <p
            className="pgrl-rise mb-0 mt-5 max-w-[56ch] text-base leading-relaxed text-[hsl(var(--pgrl-ink-soft))] sm:text-lg"
            style={revealIndex(2)}
          >
            {c(section?.subtitleKey, "HERO_LEDE")}
          </p>

          <div className="pgrl-rise mt-7 flex flex-col gap-3 sm:flex-row sm:items-center" style={revealIndex(3)}>
            {/* The halo (pgrl-pulse) marks the page's one primary ask. */}
            <CtaLink
              to={routes.REGISTER_COMPLAINT}
              variant="primary"
              size="lg"
              leading={
                <Send
                  aria-hidden
                  className="h-5 w-5 motion-safe:transition-transform motion-safe:group-hover/cta:-translate-y-0.5 motion-safe:group-hover/cta:translate-x-0.5"
                />
              }
              className="pgrl-pulse w-full !rounded-full sm:w-auto"
            >
              {c("HERO_CTA_SUBMIT")}
            </CtaLink>
            <CtaLink
              to={routes.TRACK_COMPLAINT}
              variant="outline"
              size="lg"
              leading={<Search aria-hidden className="h-5 w-5" />}
              className="w-full !rounded-full sm:w-auto"
            >
              {c("HERO_CTA_TRACK")}
            </CtaLink>
          </div>

          {/* Trust markers as a checklist rather than chips. */}
          <ul className="pgrl-rise m-0 mt-8 flex list-none flex-col gap-2.5 p-0" style={revealIndex(4)}>
            {trust.map(({ icon: Icon, label }) => (
              <li key={label} className="m-0 flex items-center gap-3 p-0 text-sm text-[hsl(var(--pgrl-ink))] sm:text-[15px]">
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--pgrl-tint))] text-[hsl(var(--pgrl-primary))]"
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {label}
              </li>
            ))}
          </ul>

          {notice && (
            <p
              role="note"
              className="pgrl-rise mb-0 mt-6 flex max-w-xl items-start gap-2.5 border-0 border-l-[3px] border-solid border-[hsl(var(--pgrl-accent))] pl-4 text-sm leading-relaxed text-[hsl(var(--pgrl-ink-soft))]"
              style={revealIndex(5)}
            >
              <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--pgrl-primary))]" />
              <span>{notice}</span>
            </p>
          )}
        </div>

        <div className="relative lg:col-span-6">
          {/* Portrait on phones (the small cut), a landscape band under the copy on
              tablets, portrait again beside the copy from lg. */}
          <figure className="pgrl-arch relative m-0 w-full">
            {/* Offset plate behind the frame, in the accent tint. */}
            <span aria-hidden className={cn("absolute -bottom-3 -right-3 h-full w-full bg-[hsl(var(--pgrl-accent)/0.4)] lg:-bottom-5 lg:-right-5", frame)} />
            {imageUrl ? (
              // The small cut is a portrait crop, chosen by viewport rather than
              // by srcSet width (see the classic hero for why).
              <picture>
                {imageSmallUrl && <source media="(max-width: 767px)" srcSet={imageSmallUrl} />}
                <img
                  src={imageUrl}
                  alt=""
                  // @ts-expect-error fetchpriority is not in React 17's typings; browsers read the lowercase attribute.
                  fetchpriority="high"
                  className={cn(
                    "relative block aspect-[4/5] w-full object-cover object-[60%_45%] shadow-[0_30px_60px_-30px_hsl(var(--pgrl-deep)/0.6)] md:aspect-[16/10] lg:aspect-square",
                    frame
                  )}
                />
              </picture>
            ) : (
              <span aria-hidden className={cn("relative block aspect-[4/5] w-full bg-[hsl(var(--pgrl-deep))] md:aspect-[16/10] lg:aspect-square", frame)} />
            )}
            {imageUrl && caption && (
              <figcaption className="absolute right-4 top-4 m-0 rounded-full bg-[hsl(var(--pgrl-deep)/0.72)] px-3 py-1 text-[11px] text-[hsl(var(--pgrl-on-primary))] backdrop-blur-sm">
                {caption}
              </figcaption>
            )}
            {/* The county motto rides the frame's lower-left corner. Decorative:
                the heading already carries the message for assistive tech. */}
            {script && (
              <p
                aria-hidden
                className="pgrl-float absolute -left-2 bottom-8 m-0 flex max-w-[15rem] items-center gap-3 rounded-2xl bg-[hsl(var(--pgrl-deep))] px-4 py-3 text-sm font-semibold leading-snug text-[hsl(var(--pgrl-on-primary))] shadow-xl sm:max-w-[18rem] sm:text-base lg:-left-6"
              >
                <Leaf className="h-5 w-5 shrink-0 text-[hsl(var(--pgrl-accent))]" />
                {script}
              </p>
            )}
          </figure>
        </div>
      </div>

      {/* Headline figures as one dark band, divided by hairlines on desktop. */}
      {stats.length > 0 && (
        <div className="pgrl-rise bg-[hsl(var(--pgrl-deep))] text-[hsl(var(--pgrl-on-primary))]" style={revealIndex(6)}>
          <dl className={cn(CONTAINER, "m-0 grid grid-cols-2 gap-x-6 gap-y-1 py-5 xl:grid-cols-4 xl:gap-x-10 xl:py-8")}>
            {stats.map((s) => (
              <Figure key={s.label} icon={s.icon} value={s.value} label={s.label} />
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
