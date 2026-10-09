// Emergency helpline numbers. The portal handles county service
// complaints, so people in an emergency must find the right number to call
// without reading anything else: one card per service, the number as the
// biggest text on the card, and the whole card dials it on phones (a service
// with two numbers gets one link per number instead).
//
// Content comes from the built-in HELPLINES deck unless the MDMS LandingSection
// row carries items (labelKey / descKey / navigationUrl "tel:…").
import * as React from "react";
import { Phone } from "lucide-react";
import { Section, revealIndex } from "./Section";
import { HELPLINES } from "../content";
import { useLandingCopy } from "../useLandingCopy";
import { sectionDomId } from "../config/resolve";
import { LandingRoutes } from "../routes";
import { FOCUS_RING } from "../tokens";
import type { LandingSectionConfig } from "../config/types";

export interface HelplinesSectionProps {
  routes?: LandingRoutes;
  /** Config-driven overrides; absent => the built-in deck. */
  section?: LandingSectionConfig;
}

/** "tel:+254725624489" -> "+254725624489"; a config item without a display
 *  string shows the dialable number itself. */
const numberFromHref = (href?: string): string => String(href || "").replace(/^tel:/i, "");

/** Columns follow the number of cards so a row never ends in an empty slot
 *  (four cards in a five-wide grid left a blank column on desktop). Four go
 *  2×2 until xl: four-up below that is too narrow for a full mobile number. */
const GRID_COLS: Record<number, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
};
const gridCols = (n: number): string => GRID_COLS[n] ?? "sm:grid-cols-2 lg:grid-cols-3";

const CARD = "flex h-full flex-col gap-3 rounded-2xl border border-solid border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-page))] p-5";
// nowrap: a number broken across lines ("020 222 / 4281") gets misdialled.
const NUMBER = "whitespace-nowrap text-2xl font-extrabold tracking-tight";

interface Line {
  key: string;
  Icon: React.ComponentType<any>;
  title: string;
  desc: string;
  numbers: Array<{ href: string; display: string }>;
}

export function HelplinesSection({ section }: HelplinesSectionProps = {}) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "helplines");
  const items: any[] = (section?.items as any[]) ?? HELPLINES;

  // A helpline must dial. A config row without a tel: navigationUrl (a route
  // key, "#", a web link) is a misconfigured row — skipped, not shown as a
  // bogus number.
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
    <span className="flex items-center gap-3">
      <span
        aria-hidden
        className="pgrl-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--pgrl-primary)/0.1)] text-[hsl(var(--pgrl-primary))]"
      >
        <Icon className="h-6 w-6" />
      </span>
      <span className="text-base font-bold leading-snug text-[hsl(var(--pgrl-ink))]">{title}</span>
    </span>
  );
  const description = (desc: string) => (
    <span className="text-sm leading-relaxed text-[hsl(var(--pgrl-ink-soft))]">{desc}</span>
  );

  return (
    <Section
      id={domId}
      code={section?.code}
      eyebrow={c("HELPLINES_EYEBROW")}
      title={c(section?.titleKey, "HELPLINES_TITLE")}
      intro={c(section?.subtitleKey, "HELPLINES_INTRO")}
      tone="tint"
    >
      <ul className={`m-0 grid list-none grid-cols-1 gap-3 p-0 ${gridCols(lines.length)}`}>
        {lines.map(({ key, Icon, title, desc, numbers }, i) => (
          <li key={key} className="pgrl-reveal-item m-0 p-0" style={revealIndex(i + 1)}>
            {numbers.length === 1 ? (
              // One number: the whole card dials it — the biggest target there is.
              <a
                href={numbers[0].href}
                className={`pgrl-lift no-underline ${CARD} ${FOCUS_RING}`}
                aria-label={`${title}: ${c("HELPLINES_CALL")} ${numbers[0].display}`}
              >
                {heading(Icon, title)}
                <span className={`${NUMBER} text-[hsl(var(--pgrl-primary))]`}>{numbers[0].display}</span>
                {description(desc)}
              </a>
            ) : (
              // Several numbers: each one is its own link (a card-wide link
              // could only dial the first), and the card itself stays still.
              <div className={CARD}>
                {heading(Icon, title)}
                <span className="flex flex-wrap gap-x-5">
                  {numbers.map((n) => (
                    <a
                      key={n.href}
                      href={n.href}
                      aria-label={`${title}: ${c("HELPLINES_CALL")} ${n.display}`}
                      // ! colours: legacy overrides.css repaints bare anchors (see CtaLink).
                      className={`inline-flex min-h-[44px] items-center rounded-[var(--pgrl-radius)] no-underline !text-[hsl(var(--pgrl-primary))] hover:!text-[hsl(var(--pgrl-primary-hover))] ${NUMBER} ${FOCUS_RING}`}
                    >
                      {n.display}
                    </a>
                  ))}
                </span>
                {description(desc)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}
