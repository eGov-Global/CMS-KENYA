// "What would you like to report?" — the service categories as photo cards
// (county design, 2026-10-12): a round icon and the title, a line of examples
// and an arrow on the left, the category photo on the right. Each card is one
// stretched link to the complaint form (a single tab stop), as is "View all
// categories": the form is where every complaint type is listed. The
// pilot-phase notice closes the section.

import * as React from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { revealIndex } from "./Section";
import { LandingLink } from "./LandingLink";
import { MANIFESTATION_TYPES } from "../content";
import { useLandingCopy } from "../useLandingCopy";
import { useReveal } from "../useReveal";
import { sectionDomId } from "../config/resolve";
import { LandingRoutes } from "../routes";
import { FOCUS_RING, TOP_GUTTER } from "../tokens";
import type { LandingSectionConfig } from "../config/types";

export interface TypesSectionProps {
  routes: LandingRoutes;
  /** Card photos keyed by category id. */
  images?: Record<string, string>;
  /** Config-driven overrides; absent => the built-in deck (unchanged). */
  section?: LandingSectionConfig;
}

export function TypesSection({ routes, images, section }: TypesSectionProps) {
  const { c } = useLandingCopy();
  const ref = useReveal<HTMLElement>();
  const domId = sectionDomId(section?.code, "types");
  const items: any[] = (section?.items as any[]) ?? MANIFESTATION_TYPES;
  const pilot = c("HERO_PILOT_NOTICE");
  // "Pilot phase: …" — the label before the colon is set in bold.
  const colon = pilot.indexOf(":");

  return (
    <section
      ref={ref}
      id={domId}
      data-pgrl-code={section?.code}
      aria-labelledby={`${domId}-title`}
      className="pgrl-reveal pgrl-top-font relative bg-white text-[hsl(var(--pgrl-top-navy))]"
    >
      <div className={cn(TOP_GUTTER, "pb-6 pt-6 xl:pb-[clamp(20px,1.4vw,28px)] xl:pt-[clamp(16px,1.1vw,24px)]")}>
        <div className="pgrl-reveal-item">
          <p className="m-0 flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.03em] text-[hsl(var(--pgrl-top-green))] xl:text-[clamp(12px,0.85vw,15px)]">
            <span aria-hidden className="inline-block h-[3px] w-[30px] rounded-full bg-[hsl(var(--pgrl-top-gold))]" />
            {c("TYPES_KICKER")}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <h2
              id={`${domId}-title`}
              className="pgrl-top-font m-0 text-[25px] font-extrabold leading-tight tracking-[-0.02em] text-[hsl(var(--pgrl-top-navy))] xl:text-[clamp(25px,2.05vw,36px)]"
            >
              {c(section?.titleKey, "TYPES_HEADING")}
            </h2>
            <LandingLink
              to={routes.REGISTER_COMPLAINT}
              className={cn(
                "group inline-flex shrink-0 items-center gap-3 whitespace-nowrap text-xs font-extrabold sm:text-[13px] xl:text-[clamp(13px,0.95vw,16px)]",
                "!text-[hsl(var(--pgrl-top-green))] underline decoration-2 underline-offset-[6px] hover:!text-[hsl(var(--pgrl-top-navy))]",
                FOCUS_RING
              )}
            >
              {c("TYPES_VIEW_ALL")}
              <ArrowRight aria-hidden className="h-4 w-4 motion-safe:transition-transform group-hover:translate-x-1" />
            </LandingLink>
          </div>
          <p className="mb-0 mt-1 text-[13px] leading-snug text-[hsl(var(--pgrl-top-muted))] sm:text-[15px] xl:text-[clamp(15px,1.05vw,18px)]">
            {c(section?.subtitleKey, "TYPES_SUBHEADING")}
          </p>
        </div>

        <ul className="m-0 mt-5 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:mt-[1.3vw] xl:grid-cols-4 xl:gap-[clamp(14px,1.5vw,26px)]">
          {items.map((type, i) => {
            const Icon = type.icon;
            const photo = images?.[type.id];
            // Config items may carry no accent; fall back to the design gold.
            const accentVar: string = type.accentVar ?? "--pgrl-top-gold";
            const onGold = accentVar === "--pgrl-top-gold";
            return (
              <li key={type.id} className="pgrl-reveal-item m-0 p-0" style={revealIndex(i + 1)}>
                <article
                  className={cn(
                    "pgrl-lift group relative grid h-full min-h-[136px] overflow-hidden rounded-xl border border-solid border-[hsl(var(--pgrl-line)/0.6)] bg-white",
                    "shadow-[0_4px_16px_rgba(10,50,35,0.06)] hover:border-[hsl(var(--pgrl-top-green)/0.3)] xl:min-h-[clamp(136px,8.5vw,150px)]",
                    photo ? "grid-cols-[1fr_34%] xl:grid-cols-[1fr_31%]" : "grid-cols-1"
                  )}
                >
                  <div className="grid min-w-0 grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-x-2.5 gap-y-2 py-3.5 pl-3.5 pr-2.5 xl:gap-x-[clamp(10px,0.8vw,16px)] xl:py-[clamp(12px,1vw,18px)] xl:pl-[clamp(12px,0.9vw,16px)]">
                    <span
                      aria-hidden
                      className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full xl:h-[clamp(38px,3.1vw,56px)] xl:w-[clamp(38px,3.1vw,56px)]"
                      style={{ backgroundColor: `hsl(var(${accentVar}))`, color: onGold ? "hsl(var(--pgrl-top-green))" : "#fff" }}
                    >
                      <Icon className="h-[52%] w-[52%]" />
                    </span>
                    <h3 className="pgrl-top-font m-0 self-center text-sm font-bold leading-snug text-[hsl(var(--pgrl-top-navy))] xl:text-[clamp(14px,1vw,18px)]">
                      {/* Stretched link: one big click target, single tab stop.
                          The focus ring is drawn on the stretched ::after so it
                          outlines the whole card. */}
                      <LandingLink
                        to={type.href ?? routes[type.route]}
                        className={
                          "!text-inherit no-underline after:absolute after:inset-0 after:rounded-xl after:content-[''] " +
                          "focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[hsl(var(--pgrl-ring))] " +
                          "focus-visible:after:ring-offset-2"
                        }
                      >
                        {c(type.titleKey, type.titleKeyDefault)}
                      </LandingLink>
                    </h3>
                    <span
                      aria-hidden
                      className="flex h-9 w-9 items-center justify-center self-end justify-self-center rounded-full border border-solid border-[hsl(var(--pgrl-line))] bg-white text-[hsl(var(--pgrl-top-navy))] shadow-sm xl:h-[clamp(32px,2.6vw,44px)] xl:w-[clamp(32px,2.6vw,44px)]"
                    >
                      <ArrowRight className="h-[50%] w-[50%] motion-safe:transition-transform group-hover:translate-x-0.5" />
                    </span>
                    <p className="m-0 text-xs leading-[1.4] text-[hsl(var(--pgrl-top-muted))] xl:text-[clamp(11.5px,0.8vw,14px)] xl:leading-[1.35]">
                      {c(type.descKey, type.descKeyDefault)}
                    </p>
                  </div>
                  {/* Absolutely placed so the photo fills the card's height instead of
                      setting it; click-through, so a tap on it follows the card's link. */}
                  {photo && (
                    <div className="pointer-events-none relative">
                      <img data-pgrl-image={`card-${type.id}`} src={photo} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ul>

        {pilot && (
          <p
            role="note"
            className="pgrl-reveal-item mb-0 mt-4 flex items-start gap-3.5 rounded-[10px] bg-[hsl(var(--pgrl-tint))] p-3.5 text-xs leading-[1.45] sm:items-center sm:px-[18px] sm:text-[13px]"
          >
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--pgrl-top-green))] text-white sm:h-[42px] sm:w-[42px]"
            >
              <MapPin className="h-[50%] w-[50%]" />
            </span>
            <span>
              {colon > 0 ? (
                <>
                  <strong className="text-[hsl(var(--pgrl-top-green))]">{pilot.slice(0, colon + 1)}</strong>
                  {pilot.slice(colon + 1)}
                </>
              ) : (
                pilot
              )}
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
