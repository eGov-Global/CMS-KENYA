// The six steps a complaint goes through.
//
// A real ordered list laid out three-up (compact on phones, roomy on desktop)
// beside a circular photo with the "Your Voice Matters" bubble, followed by
// the follow-up reassurances gathered into one callout. Sits on the soft green
// band with a faint dot pattern in the corner.

import * as React from "react";
import { Bell, Check } from "lucide-react";
import { Section, revealIndex } from "./Section";
import { PhotoOrb } from "./Illustrations";
import { HOW_STEPS } from "../content";
import { useLandingCopy } from "../useLandingCopy";
import { sectionDomId } from "../config/resolve";
import type { LandingSectionConfig } from "../config/types";

export interface HowItWorksSectionProps {
  /** Photo for the circular artwork beside the steps (desktop only). */
  orbImageUrl?: string;
  /** Config-driven overrides; absent => the built-in deck (unchanged). */
  section?: LandingSectionConfig;
}

export function HowItWorksSection({ orbImageUrl, section }: HowItWorksSectionProps = {}) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "steps");
  const items: any[] = (section?.items as any[]) ?? HOW_STEPS;

  const notes = [c("HOW_NOTE_NOTIFY"), c("HOW_NOTE_RECORD"), c("HOW_NOTE_CHANNELS")].filter(Boolean);

  return (
    <Section id={domId} code={section?.code} eyebrow={c("HOW_EYEBROW")} title={c(section?.titleKey, "HOW_TITLE")} tone="tint" dots>
      <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
        <ol className="m-0 grid list-none grid-cols-3 gap-2.5 p-0 sm:gap-4 lg:col-span-8 lg:gap-5">
          {items.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={step.id ?? step.titleKey ?? i}
                className={
                  "pgrl-reveal-item pgrl-lift m-0 flex flex-col gap-2 rounded-2xl border border-solid " +
                  "border-[hsl(var(--pgrl-primary)/0.08)] bg-[hsl(var(--pgrl-surface))] p-3 sm:gap-4 sm:p-5"
                }
                style={revealIndex(i + 1)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--pgrl-primary)/0.1)] text-[hsl(var(--pgrl-primary))] sm:h-11 sm:w-11 sm:rounded-xl"
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <span
                    aria-hidden
                    className="text-2xl font-bold leading-none tracking-tight text-[hsl(var(--pgrl-primary)/0.16)] sm:text-4xl"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <span className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--pgrl-primary))] sm:text-xs">
                    {c("HOW_STEP_LABEL")} {i + 1}
                  </span>
                  <span className="text-xs font-semibold leading-snug text-[hsl(var(--pgrl-ink))] sm:text-base">
                    {c(step.titleKey, step.titleKeyDefault)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>

        {orbImageUrl && (
          <div className="pgrl-reveal-item hidden lg:col-span-4 lg:block" style={revealIndex(3)}>
            <PhotoOrb src={orbImageUrl} tagline={c("ORB_TAGLINE")} className="mx-auto w-[80%]" />
          </div>
        )}
      </div>

      {/* Consolidated follow-up callout */}
      <aside
        aria-label={c("HOW_NOTE_TITLE")}
        className="pgrl-reveal-item mt-8 rounded-2xl border border-solid border-[hsl(var(--pgrl-primary)/0.08)] bg-[hsl(var(--pgrl-surface))] p-5 md:p-8"
        style={revealIndex(items.length + 1)}
      >
        <p className="m-0 flex items-center gap-3 text-base font-bold text-[hsl(var(--pgrl-deep))] md:text-lg">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--pgrl-tint-gold))] text-[hsl(var(--pgrl-deep))]"
          >
            <Bell className="h-4 w-4" />
          </span>
          {c("HOW_NOTE_TITLE")}
        </p>
        <ul className="m-0 mt-5 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
          {notes.map((note) => (
            <li key={note} className="m-0 flex items-start gap-2.5 p-0 text-sm leading-relaxed text-[hsl(var(--pgrl-ink-soft))]">
              <span
                aria-hidden
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--pgrl-primary)/0.1)] text-[hsl(var(--pgrl-primary))]"
              >
                <Check className="h-3 w-3" />
              </span>
              {note}
            </li>
          ))}
        </ul>
      </aside>
    </Section>
  );
}
