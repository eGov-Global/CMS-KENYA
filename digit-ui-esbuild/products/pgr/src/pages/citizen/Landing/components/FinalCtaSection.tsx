// Closing conversion band — last chance to act before the footer.

import * as React from "react";
import { Megaphone, Send, MessageCircle } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { CtaLink } from "./CtaLink";
import { useLandingCopy } from "../useLandingCopy";
import { sectionDomId } from "../config/resolve";
import { LandingRoutes } from "../routes";
import { CONTAINER } from "../tokens";
import type { LandingSectionConfig } from "../config/types";

export interface FinalCtaSectionProps {
  routes: LandingRoutes;
  /** Config-driven overrides; absent => the built-in deck (unchanged). */
  section?: LandingSectionConfig;
}

export function FinalCtaSection({ routes, section }: FinalCtaSectionProps) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "cta");

  return (
    <section
      id={domId}
      data-pgrl-code={section?.code}
      aria-labelledby={`${domId}-title`}
      className="bg-[hsl(var(--pgrl-surface))]"
    >
      <div className={cn(CONTAINER, "flex flex-col items-start gap-6 py-12 md:flex-row md:items-center md:justify-between md:py-14")}>
        <div className="max-w-2xl">
          {/* Primary tint + primary glyph: on a white band, accent-on-accent
              would sit under 3:1. */}
          <p className="m-0 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--pgrl-primary)/0.1)]">
            <Megaphone aria-hidden className="h-6 w-6 text-[hsl(var(--pgrl-primary))]" />
          </p>
          <h2
            id={`${domId}-title`}
            className="mb-0 mt-4 text-2xl font-bold leading-tight text-[hsl(var(--pgrl-deep))] md:text-3xl"
          >
            {c(section?.titleKey, "FINAL_TITLE")}
          </h2>
          <p className="mb-0 mt-3 text-base leading-relaxed text-[hsl(var(--pgrl-ink-soft))]">
            {c(section?.subtitleKey ?? section?.bodyKey, "FINAL_TEXT")}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row md:shrink-0">
          <CtaLink
            to={routes.REGISTER_COMPLAINT}
            variant="accent"
            size="lg"
            leading={<Send aria-hidden className="h-5 w-5" />}
            className="w-full sm:w-auto"
          >
            {c("FINAL_CTA")}
          </CtaLink>
          <CtaLink
            to={routes.WHATSAPP}
            target="_blank"
            variant="outline"
            size="lg"
            leading={<MessageCircle aria-hidden className="h-5 w-5" />}
            className="w-full sm:w-auto"
          >
            {c("CHANNEL_WA_CTA")}
          </CtaLink>
        </div>
      </div>
    </section>
  );
}
