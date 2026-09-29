// Every way to reach the service, in one place, closing with the page's final
// call to action — a deep-green band with a resident's photo and the report
// button.
//
// This is the canonical list — the hero chips and footer are shortcuts to it.
// The phone line matters most for citizens without a smartphone. On phones
// the four channels become a swipeable row of chips (prev/next buttons for
// non-touch users); md+ gets the full cards.

import * as React from "react";
import { ExternalLink, ArrowRight, ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { Section, revealIndex } from "./Section";
import { CtaLink } from "./CtaLink";
import { LandingLink } from "./LandingLink";
import { PhotoOrb, Swoosh } from "./Illustrations";
import { DotGrid, DOT_GRID_CORNER } from "./DotGrid";
import { CHANNELS } from "../content";
import { useLandingCopy } from "../useLandingCopy";
import { sectionDomId } from "../config/resolve";
import { LandingRoutes } from "../routes";
import { FOCUS_RING } from "../tokens";
import type { LandingSectionConfig } from "../config/types";

export interface ChannelsSectionProps {
  routes: LandingRoutes;
  /** Photo for the circular artwork beside the title. */
  orbImageUrl?: string;
  /** Portrait for the closing band; a megaphone tile stands in without it. */
  personImageUrl?: string;
  /** Config-driven overrides; absent => the built-in deck (unchanged). */
  section?: LandingSectionConfig;
}

export function ChannelsSection({ routes, orbImageUrl, personImageUrl, section }: ChannelsSectionProps) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "channels");
  const items: any[] = (section?.items as any[]) ?? CHANNELS;
  const scroller = React.useRef<HTMLUListElement>(null);

  const destination = (channel: any): string | undefined =>
    channel.href ?? (channel.route ? routes[channel.route] : undefined);

  const nudge = (dir: -1 | 1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <Section
      id={domId}
      code={section?.code}
      eyebrow={c("CHANNELS_EYEBROW")}
      title={c(section?.titleKey, "CHANNELS_TITLE")}
      intro={c(section?.subtitleKey, "CHANNELS_INTRO")}
      tone="surface"
      decor={
        orbImageUrl ? (
          <PhotoOrb src={orbImageUrl} tagline={c("ORB_TAGLINE")} tone="gold" className="mr-2 hidden w-44 sm:block lg:mr-6 lg:w-60" />
        ) : undefined
      }
    >
      {/* md+: full cards */}
      <ul className="m-0 hidden list-none grid-cols-2 gap-5 p-0 md:grid xl:grid-cols-4">
        {items.map((channel, i) => {
          const Icon = channel.icon;
          const to = destination(channel);
          const external = Boolean(channel.external) && to !== "#";
          return (
            <li key={channel.id} className="pgrl-reveal-item m-0 p-0" style={revealIndex(i + 1)}>
              <article
                className={
                  "pgrl-lift flex h-full flex-col rounded-2xl border border-solid " +
                  "border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-page))] p-6"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    aria-hidden
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--pgrl-primary)/0.1)] text-[hsl(var(--pgrl-primary))]"
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  {channel.badgeKey && (
                    <span className="rounded-full bg-[hsl(var(--pgrl-tint-gold))] px-2.5 py-1 text-xs font-bold text-[hsl(var(--pgrl-deep))]">
                      {c(channel.badgeKey)}
                    </span>
                  )}
                </div>

                <h3 className="mb-0 mt-5 text-lg font-bold leading-snug text-[hsl(var(--pgrl-ink))]">
                  {c(channel.titleKey, channel.titleKeyDefault)}
                </h3>
                <p className="mb-0 mt-2 flex-1 text-sm leading-relaxed text-[hsl(var(--pgrl-ink-soft))]">
                  {c(channel.descKey, channel.descKeyDefault)}
                </p>

                {channel.ctaKey && to && (
                  <CtaLink
                    to={to}
                    target={external ? "_blank" : undefined}
                    variant="outline"
                    className="mt-5 self-start !rounded-full text-sm"
                    trailing={
                      external ? (
                        <ExternalLink aria-hidden className="h-4 w-4" />
                      ) : (
                        <ArrowRight aria-hidden className="h-4 w-4" />
                      )
                    }
                  >
                    {c(channel.ctaKey)}
                  </CtaLink>
                )}
              </article>
            </li>
          );
        })}
      </ul>

      {/* Phones: swipeable chips */}
      <div className="pgrl-reveal-item relative md:hidden" style={revealIndex(1)}>
        <button
          type="button"
          aria-label={c("CAROUSEL_PREV")}
          onClick={() => nudge(-1)}
          className={cn(
            "absolute left-0 top-1/2 z-10 m-0 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full",
            "border border-solid border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-surface))] text-[hsl(var(--pgrl-ink-soft))] shadow-md",
            FOCUS_RING
          )}
        >
          <ChevronLeft aria-hidden className="h-5 w-5" />
        </button>
        <ul
          ref={scroller}
          className="pgrl-scroll m-0 flex list-none snap-x snap-mandatory gap-3 overflow-x-auto px-11 py-2"
        >
          {items.map((channel) => {
            const Icon = channel.icon;
            const to = destination(channel);
            const label = c(channel.titleKey, channel.titleKeyDefault);
            const body = (
              <>
                <span
                  aria-hidden
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--pgrl-primary)/0.1)] text-[hsl(var(--pgrl-primary))]"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold leading-tight">{label}</span>
              </>
            );
            const chip =
              "flex h-full w-[7.25rem] flex-col items-center gap-2 rounded-2xl border border-solid border-[hsl(var(--pgrl-line))] " +
              "bg-[hsl(var(--pgrl-page))] p-3 text-center text-[hsl(var(--pgrl-ink))]";
            return (
              <li key={channel.id} className="m-0 shrink-0 snap-start p-0">
                {to && to !== "#" ? (
                  <LandingLink to={to} className={cn(chip, "no-underline !text-[hsl(var(--pgrl-ink))]", FOCUS_RING)}>
                    {body}
                  </LandingLink>
                ) : (
                  <div className={chip}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          aria-label={c("CAROUSEL_NEXT")}
          onClick={() => nudge(1)}
          className={cn(
            "absolute right-0 top-1/2 z-10 m-0 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full",
            "border border-solid border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-surface))] text-[hsl(var(--pgrl-ink-soft))] shadow-md",
            FOCUS_RING
          )}
        >
          <ChevronRight aria-hidden className="h-5 w-5" />
        </button>
      </div>

      {/* Closing call to action. */}
      <div
        className="pgrl-reveal-item relative isolate mt-10 overflow-hidden rounded-3xl bg-[hsl(var(--pgrl-deep))] text-[hsl(var(--pgrl-on-primary))] md:mt-12"
        style={revealIndex(items.length + 1)}
      >
        <DotGrid id={`${domId}-band-dots`} className={DOT_GRID_CORNER} />
        <Swoosh className="absolute inset-x-0 bottom-0 -z-10 h-28 w-full" />
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-10 md:p-8 lg:px-12">
          {personImageUrl ? (
            <span
              aria-hidden
              className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-solid border-[hsl(var(--pgrl-accent)/0.8)] shadow-xl md:h-40 md:w-40"
            >
              <img src={personImageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </span>
          ) : (
            <span
              aria-hidden
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--pgrl-on-primary)/0.1)] text-[hsl(var(--pgrl-accent))]"
            >
              <Megaphone className="h-9 w-9" />
            </span>
          )}
          <div className="max-w-2xl flex-1">
            <h3 className="m-0 text-2xl font-bold leading-tight tracking-tight text-[hsl(var(--pgrl-on-primary))] md:text-3xl">
              {c("FINAL_TITLE")}
            </h3>
            <p className="mb-0 mt-3 text-base leading-relaxed text-[hsl(var(--pgrl-on-primary)/0.82)] md:text-lg">
              {c("FINAL_TEXT")}
            </p>
          </div>
          <CtaLink
            to={routes.REGISTER_COMPLAINT}
            variant="accent"
            size="lg"
            trailing={<ArrowRight aria-hidden className="h-5 w-5" />}
            className="w-full !rounded-full sm:w-auto md:shrink-0"
          >
            {c("FINAL_CTA")}
          </CtaLink>
        </div>
      </div>
    </Section>
  );
}
