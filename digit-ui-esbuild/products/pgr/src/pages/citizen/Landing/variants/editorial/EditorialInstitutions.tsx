// Where the service works, as columns (Bomet): one column per sub-county with
// an accent tick, the ward list beneath, hairlines between them on desktop.

import * as React from "react";
import { MapPin } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { Section, revealIndex } from "../../components/Section";
import { INSTITUTIONS } from "../../content";
import { useLandingCopy } from "../../useLandingCopy";
import { sectionDomId } from "../../config/resolve";
import type { LandingRoutes } from "../../routes";
import type { LandingSectionConfig } from "../../config/types";

export interface EditorialInstitutionsProps {
  routes?: LandingRoutes;
  photoUrl?: string;
  section?: LandingSectionConfig;
}

const COLS: Record<number, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-5",
};

export function EditorialInstitutions({ section }: EditorialInstitutionsProps = {}) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "institutions");
  const items: any[] = (section?.items as any[]) ?? INSTITUTIONS;
  const cols = COLS[items.length] ?? "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <Section
      id={domId}
      code={section?.code}
      eyebrow={c("INST_EYEBROW")}
      title={c(section?.titleKey, "INST_TITLE")}
      intro={c(section?.subtitleKey, "INST_INTRO")}
      tone="page"
    >
      <ul className={cn("m-0 grid list-none grid-cols-1 gap-x-8 gap-y-2 p-0", cols)}>
        {items.map((inst, i) => (
          <li
            key={inst.id ?? inst.titleKey}
            className={
              "pgrl-reveal-item relative m-0 border-0 border-t-2 border-solid border-[hsl(var(--pgrl-line))] p-0 pt-5 " +
              "before:absolute before:-top-[2px] before:left-0 before:h-[2px] before:w-12 before:bg-[hsl(var(--pgrl-primary))] before:content-['']"
            }
            style={revealIndex(i + 1)}
          >
            <h3 className="m-0 flex items-center gap-2 text-base font-bold leading-snug text-[hsl(var(--pgrl-deep))] sm:text-lg">
              <MapPin aria-hidden className="h-4 w-4 shrink-0 text-[hsl(var(--pgrl-primary))]" />
              {c(inst.titleKey, inst.titleKeyDefault)}
            </h3>
            <p className="mb-6 mt-2 text-sm leading-relaxed text-[hsl(var(--pgrl-ink-soft))]">{c(inst.descKey, inst.descKeyDefault)}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
