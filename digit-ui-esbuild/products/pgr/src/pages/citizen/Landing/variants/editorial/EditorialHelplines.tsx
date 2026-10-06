// Emergency numbers as one strip (Bomet): three cells divided by hairlines,
// the number set as the largest text on the page after the headline, and each
// cell dials its number. Content and the tel: rules match the classic section.

import * as React from "react";
import { Phone } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { Section, revealIndex } from "../../components/Section";
import { HELPLINES } from "../../content";
import { useLandingCopy } from "../../useLandingCopy";
import { sectionDomId } from "../../config/resolve";
import { FOCUS_RING } from "../../tokens";
import type { LandingRoutes } from "../../routes";
import type { LandingSectionConfig } from "../../config/types";

export interface EditorialHelplinesProps {
  routes?: LandingRoutes;
  section?: LandingSectionConfig;
}

const numberFromHref = (href?: string): string => String(href || "").replace(/^tel:/i, "");

interface Line {
  key: string;
  Icon: React.ComponentType<any>;
  title: string;
  desc: string;
  numbers: Array<{ href: string; display: string }>;
}

// Hairlines between cells live on the <li>s: stacked rows get a top rule,
// the sm+ strip a left rule, and the first cell none.
const ROW =
  "m-0 border-0 border-t border-solid border-[hsl(var(--pgrl-line))] p-0 first:border-t-0 " +
  "sm:border-l sm:border-t-0 sm:first:border-l-0";
const CELL = "flex h-full flex-col gap-2 px-1 py-6 sm:px-6 sm:py-7 sm:first:pl-0";
// nowrap: a number broken across lines gets misdialled.
const NUMBER = "whitespace-nowrap text-4xl font-extrabold leading-none tracking-tight md:text-5xl";

export function EditorialHelplines({ section }: EditorialHelplinesProps = {}) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "helplines");
  const items: any[] = (section?.items as any[]) ?? HELPLINES;

  // A helpline must dial: rows without a tel: destination are skipped.
  const lines: Line[] = items
    .map((line, i): Line => {
      const href: string | undefined = line.href ?? line.to;
      const numbers: Line["numbers"] = line.numbers?.length
        ? line.numbers.map((n: { tel: string; display: string }) => ({ href: `tel:${n.tel}`, display: n.display }))
        : [{ href: href ?? "", display: line.numberDisplay || numberFromHref(href) }];
      return {
        key: line.id || String(i),
        Icon: line.icon || Phone,
        title: c(line.titleKey, line.titleKeyDefault),
        desc: c(line.descKey, line.descKeyDefault),
        numbers: numbers.filter((n) => /^tel:/i.test(n.href) && n.display),
      };
    })
    .filter((line) => line.numbers.length > 0);

  const heading = (Icon: Line["Icon"], title: string) => (
    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[hsl(var(--pgrl-ink-soft))]">
      <Icon aria-hidden className="h-4 w-4 text-[hsl(var(--pgrl-primary))]" />
      {title}
    </span>
  );
  const call = (
    <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--pgrl-primary))]">
      <Phone aria-hidden className="h-3.5 w-3.5" />
      {c("HELPLINES_CALL")}
    </span>
  );

  return (
    <Section
      id={domId}
      code={section?.code}
      eyebrow={c("HELPLINES_EYEBROW")}
      title={c(section?.titleKey, "HELPLINES_TITLE")}
      intro={c(section?.subtitleKey, "HELPLINES_INTRO")}
      tone="surface"
    >
      <ul className={cn("m-0 grid list-none grid-cols-1 p-0", lines.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {lines.map(({ key, Icon, title, desc, numbers }, i) => (
          <li key={key} className={cn("pgrl-reveal-item", ROW)} style={revealIndex(i + 1)}>
            {numbers.length === 1 ? (
              <a
                href={numbers[0].href}
                aria-label={`${title}: ${c("HELPLINES_CALL")} ${numbers[0].display}`}
                className={cn("group no-underline", CELL, FOCUS_RING, "rounded-xl")}
              >
                {heading(Icon, title)}
                <span className={cn(NUMBER, "text-[hsl(var(--pgrl-deep))] motion-safe:transition-colors group-hover:text-[hsl(var(--pgrl-primary))]")}>
                  {numbers[0].display}
                </span>
                <span className="text-sm leading-relaxed text-[hsl(var(--pgrl-ink-soft))]">{desc}</span>
                {call}
              </a>
            ) : (
              <div className={CELL}>
                {heading(Icon, title)}
                <span className="flex flex-wrap gap-x-5 gap-y-1">
                  {numbers.map((n) => (
                    <a
                      key={n.href}
                      href={n.href}
                      aria-label={`${title}: ${c("HELPLINES_CALL")} ${n.display}`}
                      // ! colours: legacy overrides.css repaints bare anchors (see CtaLink).
                      className={cn("inline-flex min-h-[44px] items-center rounded-[var(--pgrl-radius)] no-underline !text-[hsl(var(--pgrl-deep))] hover:!text-[hsl(var(--pgrl-primary))]", NUMBER, FOCUS_RING)}
                    >
                      {n.display}
                    </a>
                  ))}
                </span>
                <span className="text-sm leading-relaxed text-[hsl(var(--pgrl-ink-soft))]">{desc}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}
