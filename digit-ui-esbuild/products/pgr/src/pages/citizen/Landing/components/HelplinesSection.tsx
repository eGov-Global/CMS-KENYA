// Customer Service help lines. At the county's request (2026-10-12) these are
// the only numbers on the page: no police, ambulance or fire lines.
//
// One deep-green panel: what a call gets you on the left, a tile per line on
// the right. Each tile is one tel: link, with the number as its biggest text.
// The tiles are full-width rows at every size, so a number never shares a
// cramped column (a misread digit is a misdial). Below lg they sit under the
// text.
//
// Content comes from the built-in HELPLINES deck unless the MDMS LandingSection
// row carries items (labelKey / descKey / navigationUrl "tel:…"). With several
// configured services, each tile names its service.
import * as React from "react";
import { Phone, Headset, ArrowRight, Info } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { revealIndex } from "./Section";
import { HELPLINES } from "../content";
import { useLandingCopy } from "../useLandingCopy";
import { useReveal } from "../useReveal";
import { sectionDomId } from "../config/resolve";
import { LandingRoutes } from "../routes";
import { CONTAINER, FOCUS_RING_DARK } from "../tokens";
import type { LandingSectionConfig } from "../config/types";

export interface HelplinesSectionProps {
  routes?: LandingRoutes;
  /** White-on-transparent skyline line art, set faintly under the panel text. */
  skylineUrl?: string;
  /** Config-driven overrides; absent => the built-in deck. */
  section?: LandingSectionConfig;
}

/** "tel:+254725624489" -> "+254725624489"; a config item without a display
 *  string shows the dialable number itself. */
const numberFromHref = (href?: string): string => String(href || "").replace(/^tel:/i, "");

interface Tile {
  href: string;
  display: string;
  label: string;
  service: string;
}

export function HelplinesSection({ section, skylineUrl }: HelplinesSectionProps = {}) {
  const { c } = useLandingCopy();
  const ref = useReveal<HTMLElement>();
  const domId = sectionDomId(section?.code, "helplines");
  const items: any[] = (section?.items as any[]) ?? HELPLINES;

  // A help line must dial. A config row without a tel: navigationUrl (a route
  // key, "#", a web link) is a misconfigured row — skipped, not shown as a
  // bogus number.
  const lines = items
    .map((line) => {
      const href: string | undefined = line.href ?? line.to;
      const numbers: Array<{ href: string; display: string; labelKey?: string }> = line.numbers?.length
        ? line.numbers.map((n: { tel: string; display: string; labelKey?: string }) => ({ href: `tel:${n.tel}`, display: n.display, labelKey: n.labelKey }))
        : [{ href: href ?? "", display: line.numberDisplay || numberFromHref(href) }];
      return {
        title: c(line.titleKey, line.titleKeyDefault),
        desc: c(line.descKey, line.descKeyDefault),
        numbers: numbers.filter((n) => /^tel:/i.test(n.href) && n.display),
      };
    })
    .filter((line) => line.numbers.length > 0);

  const tiles: Tile[] = lines.flatMap((line) =>
    line.numbers.map((n) => ({
      href: n.href,
      display: n.display,
      // A tile's own label ("Open 24/7"); with several services, the service.
      label: (n.labelKey && c(n.labelKey)) || (lines.length > 1 ? line.title : ""),
      service: line.title,
    }))
  );
  if (!tiles.length) return null;
  // One service: its description is the note under the panel text.
  const note = lines.length === 1 ? lines[0].desc : "";

  return (
    <section
      ref={ref}
      id={domId}
      data-pgrl-code={section?.code}
      aria-labelledby={`${domId}-title`}
      className="pgrl-reveal relative isolate bg-[hsl(var(--pgrl-tint))]"
    >
      <div className={cn(CONTAINER, "py-14 md:py-20")}>
        <div className="pgrl-reveal-item relative isolate grid overflow-hidden rounded-3xl bg-[hsl(var(--pgrl-top-band))] text-white shadow-[0_28px_60px_-34px_rgba(0,40,28,0.7)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="relative flex flex-col px-6 pb-6 pt-8 sm:px-10 sm:pt-10 lg:py-12">
            {skylineUrl && (
              <img
                src={skylineUrl}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                className="pointer-events-none absolute bottom-0 left-0 -z-10 w-full max-w-none opacity-[0.14]"
              />
            )}
            <span
              aria-hidden
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--pgrl-top-gold))] text-[hsl(var(--pgrl-top-band))] shadow-lg"
            >
              <Headset className="h-7 w-7" />
            </span>
            <p className="m-0 mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--pgrl-top-gold))]">
              <span aria-hidden className="inline-block h-[3px] w-6 rounded-full bg-[hsl(var(--pgrl-top-gold))]" />
              {c("HELPLINES_CS_EYEBROW")}
            </p>
            <h2
              id={`${domId}-title`}
              // Explicit colour: the vendored CSS paints bare h2 in the brand green.
              className="m-0 mt-3 text-[1.75rem] font-bold leading-tight tracking-tight text-white md:text-4xl"
            >
              {c(section?.titleKey, "HELPLINES_CS_TITLE")}
            </h2>
            <p className="mb-0 mt-4 max-w-[46ch] text-base leading-relaxed text-white/85 md:text-lg">
              {c(section?.subtitleKey, "HELPLINES_CS_INTRO")}
            </p>
            {note && (
              <p className="mb-0 mt-6 flex max-w-[46ch] items-start gap-2.5 rounded-xl bg-white/10 px-4 py-3 text-sm leading-relaxed text-white/90">
                <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--pgrl-top-gold))]" />
                {note}
              </p>
            )}
          </div>

          <ul className="m-0 flex list-none flex-col justify-center gap-3 p-0 px-4 pb-4 sm:px-10 sm:pb-10 lg:py-12 lg:pl-0 lg:pr-12">
            {tiles.map(({ href, display, label, service }, i) => (
              <li key={`${i}-${href}`} className="pgrl-reveal-item m-0 p-0" style={revealIndex(i + 1)}>
                <a
                  href={href}
                  aria-label={`${service}: ${c("HELPLINES_CALL")} ${display}${label ? ` (${label})` : ""}`}
                  className={cn(
                    "pgrl-lift group flex items-center gap-4 rounded-2xl bg-white px-4 py-3.5 no-underline shadow-sm sm:px-6 sm:py-5",
                    // The first line (the 24/7 one) leads, with a gold ring.
                    i === 0 && "ring-2 ring-[hsl(var(--pgrl-top-gold))]",
                    FOCUS_RING_DARK
                  )}
                >
                  <span
                    aria-hidden
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--pgrl-top-mint))] text-[hsl(var(--pgrl-top-green))] sm:h-14 sm:w-14"
                  >
                    <Phone className="h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                    {/* nowrap: a number broken across lines gets misdialled. */}
                    <span className="whitespace-nowrap text-2xl font-bold leading-none tracking-tight text-[hsl(var(--pgrl-top-green))] sm:text-[2rem]">
                      {display}
                    </span>
                    {label && (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-bold",
                          i === 0
                            ? "bg-[hsl(var(--pgrl-top-gold))] text-[hsl(var(--pgrl-top-band))]"
                            : "bg-[hsl(var(--pgrl-tint))] text-[hsl(var(--pgrl-top-green))]"
                        )}
                      >
                        {label}
                      </span>
                    )}
                  </span>
                  {/* "Call" pill from sm; a round arrow on phones, where the row is the target. */}
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--pgrl-top-green))] text-white motion-safe:transition-colors group-hover:bg-[hsl(var(--pgrl-top-band))] sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm sm:font-bold"
                  >
                    <span className="hidden sm:inline">{c("HELPLINES_CALL")}</span>
                    <ArrowRight className="h-4 w-4 motion-safe:transition-transform group-hover:translate-x-0.5" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
