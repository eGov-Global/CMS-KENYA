// Shared section shell: spacing, container width, landmark labelling and the
// heading treatment. Every section renders through it so the page stays even.
//
// Also owns the scroll-reveal: the shell's useReveal watches the children that
// opt in with `pgrl-reveal-item` (+ `--pgrl-i` for the stagger order) and
// reveals each as it scrolls into view. The CSS lives in src/index.css and is
// inert under prefers-reduced-motion.

import * as React from "react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { CONTAINER } from "../tokens";
import { useReveal } from "../useReveal";
import { DotGrid } from "./DotGrid";

export type SectionTone = "page" | "surface" | "tint" | "deep";

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
  /** The children render the heading themselves (a SectionHeading with this
   *  section's `${id}-title`), so the landmark is still labelled. */
  labelled?: boolean;
  /** page = transparent over the off-white page; surface = white band;
   *  tint = soft brand band; deep = the dark brand band with light text.
   *  Alternate them so the page has rhythm. */
  tone?: SectionTone;
  className?: string;
  children: React.ReactNode;
}

const TONE: Record<SectionTone, string> = {
  page: "",
  surface: "bg-[hsl(var(--pgrl-surface))]",
  tint: "bg-[hsl(var(--pgrl-tint))]",
  deep: "bg-[hsl(var(--pgrl-deep))] text-[hsl(var(--pgrl-on-primary))]",
};

/** Inline style for a staggered reveal child. */
export const revealIndex = (i: number): React.CSSProperties =>
  ({ "--pgrl-i": String(i) } as React.CSSProperties);

export interface SectionHeadingProps {
  /** The section id; the h2 gets `${id}-title`. */
  id: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  /** Light-on-dark colours for the deep tone. */
  dark?: boolean;
  className?: string;
}

/** Eyebrow + title + intro, the same block whether the shell lays it out
 *  above the content (default) or a layout places it in its own column. */
export function SectionHeading({ id, eyebrow, title, intro, dark, className }: SectionHeadingProps) {
  return (
    <div className={cn("min-w-0", className)}>
      {eyebrow && (
        <p
          className={cn(
            "m-0 mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]",
            dark ? "text-[hsl(var(--pgrl-accent))]" : "text-[hsl(var(--pgrl-primary))]"
          )}
        >
          <span aria-hidden className="pgrl-dash inline-block h-[3px] w-6 rounded-full bg-[hsl(var(--pgrl-accent))]" />
          {eyebrow}
        </p>
      )}
      <h2
        id={`${id}-title`}
        className={cn(
          "m-0 text-[1.75rem] font-bold leading-tight tracking-tight md:text-4xl",
          dark ? "text-[hsl(var(--pgrl-on-primary))]" : "text-[hsl(var(--pgrl-deep))]"
        )}
      >
        {title}
      </h2>
      {/* 56ch: Roboto Condensed is narrow, so rem widths let intros
          run to ~95 characters a line; this holds them near 70. */}
      {intro && (
        <p
          className={cn(
            "mb-0 mt-4 max-w-[56ch] text-base leading-relaxed md:text-lg",
            dark ? "text-[hsl(var(--pgrl-on-primary)/0.8)]" : "text-[hsl(var(--pgrl-ink-soft))]"
          )}
        >
          {intro}
        </p>
      )}
    </div>
  );
}

export function Section({ id, code, eyebrow, title, intro, action, decor, dots, labelled, tone = "page", className, children }: SectionProps) {
  const ref = useReveal<HTMLElement>();
  const dark = tone === "deep";
  return (
    <section
      ref={ref}
      id={id}
      data-pgrl-code={code}
      aria-labelledby={title || labelled ? `${id}-title` : undefined}
      // relative + isolate: decorative children position against the section
      // and a -z-10 child paints above its background, below its content.
      className={cn("pgrl-reveal relative isolate", TONE[tone], className)}
    >
      {dots && (
        <DotGrid
          id={`${id}-dots`}
          className={cn(
            "absolute -left-10 -top-10 -z-10 h-64 w-64",
            dark ? "text-[hsl(var(--pgrl-on-primary)/0.1)]" : "text-[hsl(var(--pgrl-primary)/0.12)]"
          )}
        />
      )}
      <div className={cn(CONTAINER, "py-14 md:py-20")}>
        {title && (
          <div className="pgrl-reveal-item mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <SectionHeading id={id} eyebrow={eyebrow} title={title} intro={intro} dark={dark} className="flex-1 basis-[12rem]" />
            {action && <div className="shrink-0">{action}</div>}
            {decor && <div className="shrink-0 self-end">{decor}</div>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
