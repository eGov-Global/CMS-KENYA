// Hero, as in the county's Bonga Nai design (2026-10-12): on a cream ground,
// the slogan, the "Bonga Nai" wordmark (its last word in gold, with rays over
// it), the headline, the lede, two CTAs and four benefits; the skyline artwork
// fills the right side behind a slanted edge with a notch that the last
// benefit sits in.
//
// xl+: the copy and the artwork overlap as in the design — the artwork panel is
// absolutely placed over the right 57 % and clipped to HERO_VISUAL_CLIP, and
// the type scales with the viewport so the copy keeps the design's proportions.
// Below xl the copy runs full width and the whole artwork follows it (a narrower
// panel beside the copy would crop the artwork's lettering).
//
// The artwork ships with everything outside the clip shape already painted
// cream (see assets/CREDITS.md), so whichever part of it object-fit leaves in
// view, no mock-up text can show.

import * as React from "react";
import { Send, Search, ArrowRight, Smartphone, Hash, MessageSquareMore, Clock } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { LandingLink } from "./LandingLink";
import { revealIndex } from "./Section";
import { NaiSparkle } from "./Illustrations";
import { useLandingCopy } from "../useLandingCopy";
import { sectionDomId } from "../config/resolve";
import { LandingRoutes } from "../routes";
import { FOCUS_RING } from "../tokens";
import type { LandingSectionConfig } from "../config/types";

export interface HeroSectionProps {
  routes: LandingRoutes;
  /** The skyline artwork. */
  imageUrl?: string;
  /** Smaller cut of the same artwork (srcSet). */
  imageSmallUrl?: string;
  /** Faint pattern along the left edge. */
  patternUrl?: string;
  /** Config-driven overrides; absent => the built-in deck (unchanged). */
  section?: LandingSectionConfig;
}

// The artwork panel's outline, in percent of the panel: the slanted left side,
// then the notch along the bottom. The same points cut the artwork file.
const HERO_VISUAL_CLIP =
  "polygon(18.6% 0, 100% 0, 100% 100%, 46.7% 100%, 44.6% 93.3%, 41.5% 86.1%, 37.8% 82.6%, 13.1% 81.5%, 9.5% 75.9%, 4.7% 64.7%, 0.6% 47%)";
// Below xl the artwork does not share its edge with the copy: keep only the slant.
const HERO_VISUAL_CLIP_STACKED = "polygon(18.6% 0, 100% 0, 100% 100%, 0 100%, 0 47%)";

const BENEFITS = [
  { icon: Smartphone, title: "HERO_BENEFIT_ID_TITLE", desc: "HERO_BENEFIT_ID_DESC" },
  { icon: Hash, title: "HERO_BENEFIT_CASE_TITLE", desc: "HERO_BENEFIT_CASE_DESC" },
  { icon: MessageSquareMore, title: "HERO_BENEFIT_SMS_TITLE", desc: "HERO_BENEFIT_SMS_DESC" },
  { icon: Clock, title: "HERO_BENEFIT_DEADLINE_TITLE", desc: "HERO_BENEFIT_DEADLINE_DESC" },
] as const;

const BTN =
  "inline-flex min-h-[48px] items-center justify-center gap-3 rounded-full px-6 font-bold no-underline select-none " +
  "text-[15px] xl:min-h-[clamp(48px,3.5vw,58px)] xl:px-[clamp(20px,1.6vw,30px)] xl:text-[clamp(15px,1.1vw,19px)] " +
  "motion-safe:transition-[background-color,border-color,transform] motion-safe:active:scale-[0.97] " +
  FOCUS_RING;

export function HeroSection({ routes, imageUrl, imageSmallUrl, patternUrl, section }: HeroSectionProps) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "hero");

  // Config-driven features (P4): items[] when provided (one line each), else
  // the design's four benefits.
  const configItems = (section?.items as any[]) || [];
  const benefits = configItems.length
    // Skip items with no text — otherwise an unseeded key leaves a bare icon.
    ? configItems
        .map((it) => ({ icon: it.icon ?? Hash, title: c(it.labelKey, it.labelKeyDefault), desc: "" }))
        .filter((it) => it.title)
    : BENEFITS.map((b) => ({ icon: b.icon, title: c(b.title), desc: c(b.desc) }));

  // The wordmark's last word is set in gold under the rays.
  const title = c(section?.titleKey, "HERO_TITLE").trim();
  const words = title.split(/\s+/);
  const wordmark = title.length <= 14;
  const lead = words.slice(0, -1).join(" ");
  const last = words[words.length - 1];

  return (
    <section
      id={domId}
      data-pgrl-code={section?.code}
      aria-labelledby={`${domId}-title`}
      className="pgrl-top-font relative isolate overflow-hidden bg-[hsl(var(--pgrl-top-cream))] text-[hsl(var(--pgrl-top-navy))] xl:min-h-[29.1vw]"
    >
      {patternUrl && (
        <img
          src={patternUrl}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 -z-10 h-full w-[6.3vw] min-w-[40px] object-cover"
        />
      )}

      <div className="relative z-10 px-5 pb-6 pt-7 sm:px-8 lg:px-[clamp(16px,5vw,76px)] lg:pb-8 lg:pt-10 xl:pb-[1vw] xl:pl-[6.7vw] xl:pr-0 xl:pt-[2.4vw]">
        <div className="max-w-[720px] xl:max-w-[36vw]">
          <p
            className="pgrl-rise m-0 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--pgrl-top-green))] sm:text-xs xl:text-[clamp(11px,0.85vw,14px)]"
            style={revealIndex(0)}
          >
            {c(section?.bodyKey, "HERO_SLOGAN")}
          </p>

          <h1
            id={`${domId}-title`}
            // Explicit colour and family: the vendored CSS styles bare h1.
            className={cn(
              "pgrl-rise pgrl-top-font mb-0 mt-5 font-black tracking-[-0.045em] text-[hsl(var(--pgrl-top-green))] xl:mt-[0.9vw]",
              // Wordmark size is for a short brand name; a configured long title
              // (e.g. "Complaints and Reports Portal") is set smaller.
              wordmark
                ? "text-[clamp(58px,15vw,78px)] xl:text-[clamp(58px,6.6vw,118px)]"
                : "text-[clamp(36px,9vw,52px)] xl:text-[clamp(40px,3.6vw,64px)]",
              // After the sizes: cn() (tailwind-merge) drops a line-height that
              // comes before a font-size.
              "leading-[0.93] xl:leading-[0.9]"
            )}
            style={revealIndex(1)}
          >
            {lead && <>{lead} </>}
            <span className="relative inline-block text-[hsl(var(--pgrl-top-gold))]">
              {last}
              <NaiSparkle className="absolute -right-[0.2em] -top-[0.36em] w-[0.42em]" />
            </span>
          </h1>

          <p
            className="pgrl-rise mb-0 mt-2 text-[28px] font-extrabold leading-[1.08] tracking-[-0.025em] text-[hsl(var(--pgrl-top-green))] xl:mt-[0.35vw] xl:whitespace-nowrap xl:leading-[1.05] xl:text-[clamp(28px,2.85vw,50px)]"
            style={revealIndex(2)}
          >
            {c("HERO_HEADLINE")}
          </p>

          <p
            className="pgrl-rise mb-0 mt-2.5 text-[15px] leading-[1.45] text-[hsl(var(--pgrl-top-navy))] xl:mt-[0.5vw] xl:text-[clamp(15px,1.15vw,20px)] xl:leading-[1.2]"
            style={revealIndex(3)}
          >
            {c(section?.subtitleKey, "HERO_LEDE")}
          </p>

          <div className="pgrl-rise mt-5 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap xl:mt-[1vw] xl:gap-[1.2vw]" style={revealIndex(4)}>
            <LandingLink
              to={routes.REGISTER_COMPLAINT}
              className={cn(
                BTN,
                "group/cta bg-[hsl(var(--pgrl-top-gold))] !text-[hsl(var(--pgrl-top-green))] hover:bg-[hsl(var(--pgrl-top-gold)/0.85)] xl:min-w-[17.3vw]"
              )}
            >
              <Send aria-hidden className="h-5 w-5" />
              {c("HERO_CTA_SUBMIT")}
              <ArrowRight aria-hidden className="h-5 w-5 motion-safe:transition-transform motion-safe:group-hover/cta:translate-x-1" />
            </LandingLink>
            <LandingLink
              to={routes.TRACK_COMPLAINT}
              className={cn(
                BTN,
                "border-2 border-solid border-[hsl(var(--pgrl-top-green))] bg-transparent !text-[hsl(var(--pgrl-top-navy))] hover:bg-[hsl(var(--pgrl-top-green)/0.06)] xl:min-w-[15.3vw]"
              )}
            >
              <Search aria-hidden className="h-5 w-5" />
              {c("HERO_CTA_TRACK")}
            </LandingLink>
          </div>
        </div>

        {/* xl+: the benefits run on past the copy column, into the artwork's
            notch; the cream backing keeps them legible should a long
            translation push the row above the notch's edge. */}
        <ul
          className="pgrl-rise m-0 mt-6 grid list-none grid-cols-2 gap-x-3 gap-y-4 p-0 lg:grid-cols-4 xl:mt-[1.3vw] xl:w-[60vw] xl:gap-0 xl:rounded-tr-[2rem] xl:bg-[hsl(var(--pgrl-top-cream))]"
          style={revealIndex(5)}
        >
          {benefits.map(({ icon: Icon, title: label, desc }, i) => (
            <li
              key={`${i}-${label}`}
              className={cn(
                "m-0 flex items-start gap-2.5 p-0 xl:items-center xl:gap-[0.7vw] xl:px-[0.8vw] xl:first:pl-0",
                i > 0 && "xl:border-0 xl:border-l xl:border-solid xl:border-[hsl(var(--pgrl-line))]"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[hsl(var(--pgrl-top-green))] xl:h-[clamp(36px,3vw,52px)] xl:w-[clamp(36px,3vw,52px)]",
                  i % 2 === 0 ? "bg-[hsl(var(--pgrl-top-mint))]" : "bg-[hsl(var(--pgrl-top-butter))]"
                )}
              >
                <Icon className="h-[55%] w-[55%]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold leading-snug text-[hsl(var(--pgrl-top-green))] xl:whitespace-nowrap xl:text-[clamp(12px,0.82vw,15px)]">
                  {label}
                </span>
                {desc && (
                  <span className="mt-0.5 block text-xs leading-snug text-[hsl(var(--pgrl-top-muted))] xl:text-[clamp(11.5px,0.78vw,14px)]">
                    {desc}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {imageUrl && (
        <div
          aria-hidden
          className="relative aspect-[1.943] w-full xl:absolute xl:inset-y-0 xl:left-[43.4%] xl:right-0 xl:aspect-auto xl:w-auto"
        >
          <div
            className="absolute inset-0 [clip-path:var(--pgrl-hero-clip-stacked)] xl:[clip-path:var(--pgrl-hero-clip)]"
            style={{ "--pgrl-hero-clip": HERO_VISUAL_CLIP, "--pgrl-hero-clip-stacked": HERO_VISUAL_CLIP_STACKED } as React.CSSProperties}
          >
            {/* Phones take the small cut by viewport, not by srcSet width: with
                w-descriptors a 3x phone picks the 1600 px file. */}
            <picture>
              {imageSmallUrl && <source media="(max-width: 767px)" srcSet={imageSmallUrl} />}
              <img
                src={imageUrl}
                alt=""
                // @ts-expect-error fetchpriority is not in React 17's typings; browsers read the lowercase attribute.
                fetchpriority="high"
                className="absolute inset-0 h-full w-full object-cover object-right"
              />
            </picture>
          </div>
        </div>
      )}
    </section>
  );
}
