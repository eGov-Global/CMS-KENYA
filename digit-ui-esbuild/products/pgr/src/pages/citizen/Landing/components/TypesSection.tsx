// What citizens can report, as cards.
//
// Every card carries the secondary green on its top border and icon tile; the
// title and the "report" link share the soft ink colour and bold weight; the
// link turns green when the card is hovered. The whole card is one
// clickable target (stretched link), so it is a single tab stop.

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Section } from "./Section";
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
      title={c(section?.titleKey, "TYPES_TITLE")}
      intro={c(section?.subtitleKey, "TYPES_INTRO")}
      tone="page"
    >
      {/* 3-up at desktop: the deck ships three configured departments. */}
      <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((type) => {
          const Icon = type.icon;
          const accent = "hsl(var(--pgrl-secondary))";
          return (
            <li key={type.id} className="m-0 p-0">
              <article
                className="group relative flex h-full flex-col rounded-[var(--pgrl-radius)] border border-solid border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-surface))] p-6 shadow-sm motion-safe:transition-shadow hover:shadow-md"
                style={{ borderTopWidth: 4, borderTopColor: accent }}
              >
                <span
                  aria-hidden
                  className="flex h-12 w-12 items-center justify-center rounded-[var(--pgrl-radius)]"
                  style={{ backgroundColor: "hsl(var(--pgrl-secondary)/0.12)", color: accent }}
                >
                  <Icon className="h-6 w-6" />
                </span>

                <h3 className="mb-0 mt-4 text-lg font-bold text-[hsl(var(--pgrl-ink-soft))]">
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

                <p className="mb-0 mt-2 flex-1 text-sm leading-relaxed text-[hsl(var(--pgrl-ink-soft))]">
                  {c(type.descKey, type.descKeyDefault)}
                </p>

                <span
                  aria-hidden
                  className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[hsl(var(--pgrl-ink-soft))] motion-safe:transition-colors group-hover:text-[hsl(var(--pgrl-secondary))]"
                >
                  {c("TYPE_CTA")}
                  <ChevronRight className="h-4 w-4 motion-safe:transition-transform group-hover:translate-x-0.5" />
                </span>
              </article>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
