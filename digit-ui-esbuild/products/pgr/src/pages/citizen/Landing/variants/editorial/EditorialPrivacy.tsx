// Data-protection block as a statement (Bomet): the promise set large behind
// a brand rule, the detail beside it, and the notice link when one exists.

import * as React from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Section, revealIndex } from "../../components/Section";
import { CtaLink } from "../../components/CtaLink";
import { useLandingCopy } from "../../useLandingCopy";
import { sectionDomId } from "../../config/resolve";
import type { LandingRoutes } from "../../routes";
import type { LandingSectionConfig } from "../../config/types";

export interface EditorialPrivacyProps {
  routes: LandingRoutes;
  section?: LandingSectionConfig;
}

export function EditorialPrivacy({ routes, section }: EditorialPrivacyProps) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "privacy");
  const link = c("PRIVACY_LINK");

  return (
    <Section id={domId} code={section?.code} eyebrow={c("PRIVACY_EYEBROW")} title={c(section?.titleKey, "PRIVACY_TITLE")} tone="tint">
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-14">
        <blockquote
          className="pgrl-reveal-item m-0 border-0 border-l-4 border-solid border-[hsl(var(--pgrl-primary))] pl-5 sm:pl-7 lg:col-span-6"
          style={revealIndex(1)}
        >
          <ShieldCheck aria-hidden className="mb-4 h-8 w-8 text-[hsl(var(--pgrl-primary))]" />
          <p className="m-0 text-xl font-semibold leading-snug text-[hsl(var(--pgrl-deep))] md:text-2xl">{c(section?.bodyKey, "PRIVACY_P1")}</p>
        </blockquote>
        <div className="pgrl-reveal-item lg:col-span-6" style={revealIndex(2)}>
          <p className="m-0 max-w-[60ch] text-base leading-relaxed text-[hsl(var(--pgrl-ink))] md:text-[17px]">{c(section?.subtitleKey, "PRIVACY_P2")}</p>
          {link && routes.PRIVACY && routes.PRIVACY !== "#" && (
            <CtaLink to={routes.PRIVACY} variant="subtle" className="mt-5 text-base" trailing={<ArrowRight aria-hidden className="h-4 w-4" />}>
              {link}
            </CtaLink>
          )}
        </div>
      </div>
    </Section>
  );
}
