// The sub-county offices handling complaints — shows citizens who is behind
// the service.

import * as React from "react";
import { MapPin } from "lucide-react";
import { Section, revealIndex } from "./Section";
import { INSTITUTIONS } from "../content";
import { useLandingCopy } from "../useLandingCopy";
import { sectionDomId } from "../config/resolve";
import type { LandingSectionConfig } from "../config/types";

export interface InstitutionsSectionProps {
  /** Config-driven overrides; absent => the built-in deck (unchanged). */
  section?: LandingSectionConfig;
}

export function InstitutionsSection({ section }: InstitutionsSectionProps = {}) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "institutions");
  const items: any[] = (section?.items as any[]) ?? INSTITUTIONS;

  return (
    <Section
      id={domId}
      code={section?.code}
      eyebrow={c("INST_EYEBROW")}
      title={c(section?.titleKey, "INST_TITLE")}
      intro={c(section?.subtitleKey, "INST_INTRO")}
      tone="surface"
    >
      {/* Two pilot sub-counties today; three-up once more join. */}
      <ul
        className={`m-0 grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-2 ${
          items.length >= 3 ? "lg:grid-cols-3" : ""
        }`}
      >
        {items.map((inst, i) => {
          const Icon = inst.icon ?? MapPin;
          return (
            <li key={inst.id ?? inst.titleKey} className="pgrl-reveal-item m-0 p-0" style={revealIndex(i + 1)}>
              <article
                className={
                  "pgrl-lift flex h-full flex-col gap-4 rounded-[var(--pgrl-radius)] border border-solid " +
                  "border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-page))] p-6 sm:flex-row sm:items-start"
                }
              >
                <span
                  aria-hidden
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--pgrl-primary)/0.1)] text-[hsl(var(--pgrl-primary))]"
                >
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="m-0 text-lg font-bold leading-snug text-[hsl(var(--pgrl-ink))]">
                    {c(inst.titleKey, inst.titleKeyDefault)}
                  </h3>
                  <p className="mb-0 mt-2 text-sm leading-relaxed text-[hsl(var(--pgrl-ink-soft))]">
                    {c(inst.descKey, inst.descKeyDefault)}
                  </p>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
