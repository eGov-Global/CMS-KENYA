// The sub-county offices handling complaints — shows citizens who is behind
// the service.

import * as React from "react";
import { Section } from "./Section";
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
      title={c(section?.titleKey, "INST_TITLE")}
      tone="surface"
    >
      {/* 3-up at desktop: five sub-counties lay out 3 + 2 instead of 2/2/1. */}
      <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-2 lg:grid-cols-3">
        {items.map((inst) => {
          const Icon = inst.icon;
          return (
            <li key={inst.id ?? inst.titleKey} className="m-0 p-0">
              <article className="flex h-full flex-col gap-4 rounded-[var(--pgrl-radius)] border border-solid border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-page))] p-6 sm:flex-row sm:items-start">
                <span
                  aria-hidden
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--pgrl-radius)] bg-[hsl(var(--pgrl-primary)/0.1)] text-[hsl(var(--pgrl-primary))]"
                >
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="m-0 text-lg font-bold leading-snug text-[hsl(var(--pgrl-ink-soft))]">{c(inst.titleKey, inst.titleKeyDefault)}</h3>
                  <p className="mb-0 mt-2 text-sm leading-relaxed text-[hsl(var(--pgrl-ink-soft))]">{c(inst.descKey, inst.descKeyDefault)}</p>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
