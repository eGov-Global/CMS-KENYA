// Data-protection block. Copy states only what the service enforces — no
// confidentiality claim (see content.ts). The "read the privacy notice" link is
// left out until the county supplies a real notice (routes.PRIVACY is still "#").

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { Section, revealIndex } from "./Section";
import { useLandingCopy } from "../useLandingCopy";
import { sectionDomId } from "../config/resolve";
import { LandingRoutes } from "../routes";
import type { LandingSectionConfig } from "../config/types";

export interface PrivacySectionProps {
  routes: LandingRoutes;
  /** Config-driven overrides; absent => the built-in deck (unchanged). */
  section?: LandingSectionConfig;
}

export function PrivacySection({ routes, section }: PrivacySectionProps) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "privacy");

  return (
    <Section id={domId} code={section?.code} title={c(section?.titleKey, "PRIVACY_TITLE")} tone="page">
      <div
        className={
          "pgrl-reveal-item flex flex-col gap-6 rounded-[var(--pgrl-radius)] border border-solid " +
          "border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-surface))] p-6 sm:flex-row sm:items-start md:p-8"
        }
        style={revealIndex(1)}
      >
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--pgrl-tint))] text-[hsl(var(--pgrl-primary))]"
        >
          <ShieldCheck className="h-7 w-7" />
        </span>
        <div className="max-w-3xl">
          <p className="m-0 text-base font-semibold leading-relaxed text-[hsl(var(--pgrl-ink))] md:text-lg">
            {c(section?.bodyKey, "PRIVACY_P1")}
          </p>
          <p className="mb-0 mt-3 text-sm leading-relaxed text-[hsl(var(--pgrl-ink-soft))] md:text-base">
            {c(section?.subtitleKey, "PRIVACY_P2")}
          </p>
        </div>
      </div>
    </Section>
  );
}
