// Service areas as a numbered list beside a sticky title column (Bomet): the
// heading, intro and highlands artwork stay put on desktop while the rows
// scroll; each row is one click target and tints on hover.

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeading, revealIndex } from "../../components/Section";
import { SkylineIllustration } from "../../components/Illustrations";
import { LandingLink } from "../../components/LandingLink";
import { MANIFESTATION_TYPES } from "../../content";
import { useLandingCopy } from "../../useLandingCopy";
import { sectionDomId } from "../../config/resolve";
import type { LandingRoutes } from "../../routes";
import type { LandingSectionConfig } from "../../config/types";

export interface EditorialTypesProps {
  routes: LandingRoutes;
  section?: LandingSectionConfig;
}

export function EditorialTypes({ routes, section }: EditorialTypesProps) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "types");
  const items: any[] = (section?.items as any[]) ?? MANIFESTATION_TYPES;

  return (
    <Section id={domId} code={section?.code} tone="surface" labelled>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="pgrl-reveal-item lg:col-span-4" style={revealIndex(0)}>
          <div className="lg:sticky lg:top-24">
            <SectionHeading
              id={domId}
              eyebrow={c("TYPES_EYEBROW")}
              title={c(section?.titleKey, "TYPES_TITLE")}
              intro={c(section?.subtitleKey, "TYPES_INTRO")}
            />
            <SkylineIllustration className="mt-8 hidden w-full max-w-xs lg:block" />
          </div>
        </div>

        <ol className="m-0 list-none border-0 border-t border-solid border-[hsl(var(--pgrl-line))] p-0 lg:col-span-8">
          {items.map((type, i) => {
            const Icon = type.icon;
            // Config items may carry no accent; fall back to the brand colour.
            const accentVar: string = type.accentVar ?? "--pgrl-primary";
            return (
              <li key={type.id} className="pgrl-reveal-item m-0 p-0" style={revealIndex(i + 1)}>
                <article
                  className={
                    "group relative -mx-2 flex items-start gap-4 rounded-2xl border-0 border-b border-solid border-[hsl(var(--pgrl-line))] " +
                    "px-2 py-6 motion-safe:transition-colors hover:bg-[hsl(var(--pgrl-tint)/0.55)] sm:-mx-4 sm:gap-6 sm:px-4 sm:py-7"
                  }
                >
                  <span aria-hidden className="hidden w-8 shrink-0 pt-1.5 text-sm font-bold tabular-nums text-[hsl(var(--pgrl-primary)/0.55)] sm:block">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    aria-hidden
                    className="pgrl-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14"
                    style={{ backgroundColor: `hsl(var(${accentVar}) / 0.12)`, color: `hsl(var(${accentVar}))` }}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="m-0 text-lg font-bold leading-snug text-[hsl(var(--pgrl-ink))] sm:text-xl">
                      {/* Stretched link: the whole row is the target, one tab stop. */}
                      <LandingLink
                        to={type.href ?? routes[type.route]}
                        className={
                          "!text-inherit no-underline after:absolute after:inset-0 after:rounded-2xl after:content-[''] " +
                          "focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[hsl(var(--pgrl-ring))]"
                        }
                      >
                        {c(type.titleKey, type.titleKeyDefault)}
                      </LandingLink>
                    </h3>
                    <p className="mb-0 mt-1.5 max-w-[60ch] text-sm leading-relaxed text-[hsl(var(--pgrl-ink-soft))] sm:text-[15px]">
                      {c(type.descKey, type.descKeyDefault)}
                    </p>
                  </div>
                  <span aria-hidden className="mt-1.5 hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-[hsl(var(--pgrl-primary))] sm:inline-flex">
                    {c("TYPE_CTA")}
                    <ArrowRight className="h-4 w-4 motion-safe:transition-transform group-hover:translate-x-1" />
                  </span>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </Section>
  );
}
