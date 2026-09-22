// Shared section shell: spacing, container width, landmark labelling and the
// heading treatment. Every section renders through it so the page stays even.
//
// Also owns the scroll-reveal: the shell observes itself (useReveal) and the
// children opt in per element with `pgrl-reveal-item` + `--pgrl-i` for the
// stagger order. The CSS lives in src/index.css and is inert under
// prefers-reduced-motion.

import * as React from "react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { CONTAINER } from "../tokens";
import { useReveal } from "../useReveal";
import { DotGrid } from "./DotGrid";

export interface SectionProps {
  /** Stable id — becomes the aria-labelledby anchor (`${id}-title`). Derived
   *  per config row (see sectionDomId), so it is unique even for repeated types. */
  id: string;
  /** Config row code, exposed to the Builder preview bridge for hit-testing. */
  code?: string;
  /** Small caps line above the title — names the section's theme. */
  eyebrow?: string;
  title?: string;
  intro?: string;
  /** Optional element rendered to the right of the title (e.g. "view all"). */
  action?: React.ReactNode;
  /** Artwork beside the title block — sits to the right, shrinks on phones. */
  decor?: React.ReactNode;
  /** Faint dot pattern in the top-left corner. */
  dots?: boolean;
  /** page = transparent over the off-white page; surface = white band;
   *  tint = soft brand-green band. Alternate them so the page has rhythm. */
  tone?: "page" | "surface" | "tint";
  className?: string;
  children: React.ReactNode;
}

const TONE: Record<NonNullable<SectionProps["tone"]>, string> = {
  page: "",
  surface: "bg-[hsl(var(--pgrl-surface))]",
  tint: "bg-[hsl(var(--pgrl-tint))]",
};

/** Inline style for a staggered reveal child. */
export const revealIndex = (i: number): React.CSSProperties =>
  ({ "--pgrl-i": String(i) } as React.CSSProperties);

export function Section({ id, code, eyebrow, title, intro, action, decor, dots, tone = "page", className, children }: SectionProps) {
  const ref = useReveal<HTMLElement>();
  return (
    <section
      ref={ref}
      id={id}
      data-pgrl-code={code}
      aria-labelledby={title ? `${id}-title` : undefined}
      // relative + isolate: decorative children position against the section
      // and a -z-10 child paints above its background, below its content.
      className={cn("pgrl-reveal relative isolate", TONE[tone], className)}
    >
      {dots && (
        <DotGrid
          id={`${id}-dots`}
          className="absolute -left-10 -top-10 -z-10 h-64 w-64 text-[hsl(var(--pgrl-primary)/0.12)]"
        />
      )}
      <div className={cn(CONTAINER, "py-14 md:py-20")}>
        {title && (
          <div className="pgrl-reveal-item mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="min-w-0 flex-1 basis-[12rem]">
              {eyebrow && (
                <p className="m-0 mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--pgrl-primary))]">
                  <span aria-hidden className="inline-block h-[3px] w-6 rounded-full bg-[hsl(var(--pgrl-accent))]" />
                  {eyebrow}
                </p>
              )}
              <h2
                id={`${id}-title`}
                className="m-0 text-[1.75rem] font-bold leading-tight tracking-tight text-[hsl(var(--pgrl-deep))] md:text-4xl"
              >
                {title}
              </h2>
              {intro && (
                <p className="mb-0 mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--pgrl-ink-soft))] md:text-lg">
                  {intro}
                </p>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
            {decor && <div className="shrink-0 self-end">{decor}</div>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
