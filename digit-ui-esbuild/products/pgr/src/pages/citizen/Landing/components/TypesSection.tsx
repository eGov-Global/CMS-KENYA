// What citizens can report, as cards.
//
// Each card carries its service area's tint on the icon tile (content.ts
// assigns the accent var per department); the title reads in body ink and the
// "report" link in brand green. The whole card is one clickable target
// (stretched link), so it is a single tab stop. Cards lift on hover and reveal
// in sequence as the section scrolls into view.

import * as React from "react";
import { ArrowRight, FileText } from "lucide-react";
import { Section, revealIndex } from "./Section";
import { SkylineIllustration } from "./Illustrations";
import { LandingLink } from "./LandingLink";
import { MANIFESTATION_TYPES } from "../content";
import { useLandingCopy } from "../useLandingCopy";
import { sectionDomId } from "../config/resolve";
import { LandingRoutes } from "../routes";
import { FOCUS_RING } from "../tokens";
import type { LandingSectionConfig } from "../config/types";

export interface TypesSectionProps {
  routes: LandingRoutes;
  /** Config-driven overrides; absent => the built-in deck (unchanged). */
  section?: LandingSectionConfig;
}

export function TypesSection({ routes, section }: TypesSectionProps) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "types");
  const items: any[] = (section?.items as any[]) ?? MANIFESTATION_TYPES;

  return (
    <Section
      id={domId}
      code={section?.code}
      eyebrow={c("TYPES_EYEBROW")}
      title={c(section?.titleKey, "TYPES_TITLE")}
      intro={c(section?.subtitleKey, "TYPES_INTRO")}
      tone="page"
      // Extra top room: the hero's stat cards ride into this section.
      className="pt-4 md:pt-6"
      decor={
        <div className="relative w-36 sm:w-60 lg:w-80">
          <SkylineIllustration />
          <span
            aria-hidden
            className="pgrl-float absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--pgrl-primary))] text-[hsl(var(--pgrl-on-primary))] shadow-lg sm:h-11 sm:w-11"
          >
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
        </div>
      }
    >
      <ul
        className={`m-0 grid list-none grid-cols-2 gap-3 p-0 sm:gap-5 ${
          items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
        }`}
      >
        {items.map((type, i) => {
          const Icon = type.icon;
          // Config items may carry no accent; fall back to the brand green.
          const accentVar: string = type.accentVar ?? "--pgrl-primary";
          return (
            <li key={type.id} className="pgrl-reveal-item m-0 p-0" style={revealIndex(i + 1)}>
              <article
                className={
                  "pgrl-lift group relative flex h-full flex-col rounded-2xl border border-solid " +
                  "border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-surface))] p-4 sm:p-6 " +
                  "hover:border-[hsl(var(--pgrl-primary)/0.35)]"
                }
              >
                <span
                  aria-hidden
                  className="flex h-12 w-12 items-center justify-center rounded-xl motion-safe:transition-transform group-hover:scale-105"
                  style={{ backgroundColor: `hsl(var(${accentVar}) / 0.12)`, color: `hsl(var(${accentVar}))` }}
                >
                  <Icon className="h-6 w-6" />
                </span>

                <h3 className="mb-0 mt-4 text-base font-bold leading-snug text-[hsl(var(--pgrl-ink))] sm:mt-5 sm:text-lg">
                  {/* Stretched link: one big click target, single tab stop. */}
                  <LandingLink
                    to={type.href ?? routes[type.route]}
                    className={
                      "!text-inherit no-underline after:absolute after:inset-0 after:content-[''] " +
                      "rounded-[var(--pgrl-radius)] " +
                      FOCUS_RING
                    }
                  >
                    {c(type.titleKey, type.titleKeyDefault)}
                  </LandingLink>
                </h3>

                <p className="mb-0 mt-2 flex-1 text-[13px] leading-relaxed text-[hsl(var(--pgrl-ink-soft))] sm:text-sm">
                  {c(type.descKey, type.descKeyDefault)}
                </p>

                <span
                  aria-hidden
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--pgrl-primary))]"
                >
                  {c("TYPE_CTA")}
                  <ArrowRight className="h-4 w-4 motion-safe:transition-transform group-hover:translate-x-1" />
                </span>
              </article>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
