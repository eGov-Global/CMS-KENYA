// How it works as a vertical timeline (Bomet): numbered nodes on a line that
// draws itself down as the steps reveal, with the "who handles your case"
// reassurances in a card that stays beside the list on desktop.

import * as React from "react";
import { Bell, Check } from "lucide-react";
import { Section, revealIndex } from "../../components/Section";
import { HOW_STEPS } from "../../content";
import { useLandingCopy } from "../../useLandingCopy";
import { sectionDomId } from "../../config/resolve";
import type { LandingSectionConfig } from "../../config/types";

export interface EditorialStepsProps {
  section?: LandingSectionConfig;
}

export function EditorialSteps({ section }: EditorialStepsProps = {}) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "steps");
  const items: any[] = (section?.items as any[]) ?? HOW_STEPS;
  const notes = [c("HOW_NOTE_NOTIFY"), c("HOW_NOTE_RECORD"), c("HOW_NOTE_CHANNELS")].filter(Boolean);

  return (
    <Section id={domId} code={section?.code} eyebrow={c("HOW_EYEBROW")} title={c(section?.titleKey, "HOW_TITLE")} tone="page" dots>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <ol className="relative m-0 list-none p-0 pl-14 sm:pl-16 lg:col-span-7">
          {/* The line: a hairline track with the brand fill drawing down it. */}
          <span aria-hidden className="pgrl-reveal-item absolute bottom-4 left-5 top-4 w-[3px] rounded-full bg-[hsl(var(--pgrl-line))] sm:left-6" style={revealIndex(0)}>
            <span className="pgrl-tl-fill block h-full w-full rounded-full bg-[hsl(var(--pgrl-primary))]" />
          </span>
          {items.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.id ?? step.titleKey ?? i} className="pgrl-reveal-item relative m-0 py-4 sm:py-5" style={revealIndex(i + 1)}>
                <span
                  aria-hidden
                  className={
                    "pgrl-step-num absolute -left-14 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--pgrl-primary))] " +
                    "text-sm font-bold text-[hsl(var(--pgrl-on-primary))] ring-4 ring-[hsl(var(--pgrl-page))] sm:-left-16 sm:top-5 sm:h-12 sm:w-12 sm:text-base"
                  }
                >
                  {i + 1}
                </span>
                <div className="flex items-start justify-between gap-4 rounded-2xl border border-solid border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-surface))] p-4 sm:p-5">
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--pgrl-primary))]">
                      {c("HOW_STEP_LABEL")} {i + 1}
                    </span>
                    <span className="text-base font-semibold leading-snug text-[hsl(var(--pgrl-ink))] sm:text-lg">
                      {c(step.titleKey, step.titleKeyDefault)}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--pgrl-tint))] text-[hsl(var(--pgrl-primary))]"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        <aside
          aria-label={c("HOW_NOTE_TITLE")}
          className="pgrl-reveal-item self-start rounded-3xl bg-[hsl(var(--pgrl-deep))] p-6 text-[hsl(var(--pgrl-on-primary))] md:p-8 lg:sticky lg:top-24 lg:col-span-5"
          style={revealIndex(2)}
        >
          <p className="m-0 flex items-center gap-3 text-lg font-bold leading-snug md:text-xl">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--pgrl-on-primary)/0.1)] text-[hsl(var(--pgrl-accent))]">
              <Bell className="h-5 w-5" />
            </span>
            {c("HOW_NOTE_TITLE")}
          </p>
          <ul className="m-0 mt-6 flex list-none flex-col gap-4 p-0">
            {notes.map((note) => (
              <li key={note} className="m-0 flex items-start gap-3 p-0 text-sm leading-relaxed text-[hsl(var(--pgrl-on-primary)/0.82)] md:text-[15px]">
                <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--pgrl-accent))] text-[hsl(var(--pgrl-deep))]">
                  <Check className="h-3 w-3" />
                </span>
                {note}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </Section>
  );
}
