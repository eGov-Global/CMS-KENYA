// The sub-county offices handling complaints — shows citizens who is behind
// the service. A faint skyline sits in the corner on desktop; phones get the
// skyline with a pin badge and a photo card repeating the report call to
// action before the footer.

import * as React from "react";
import { MapPin, ArrowRight } from "lucide-react";
import { Section, revealIndex } from "./Section";
import { CtaLink } from "./CtaLink";
import { SkylineIllustration } from "./Illustrations";
import { INSTITUTIONS } from "../content";
import { useLandingCopy } from "../useLandingCopy";
import { sectionDomId } from "../config/resolve";
import { LandingRoutes } from "../routes";
import type { LandingSectionConfig } from "../config/types";

export interface InstitutionsSectionProps {
  routes?: LandingRoutes;
  /** Photo for the phone-only closing card. */
  photoUrl?: string;
  /** Config-driven overrides; absent => the built-in deck (unchanged). */
  section?: LandingSectionConfig;
}

export function InstitutionsSection({ routes, photoUrl, section }: InstitutionsSectionProps = {}) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "institutions");
  const items: any[] = (section?.items as any[]) ?? INSTITUTIONS;
  const script = c("HERO_SCRIPT");

  return (
    <Section
      id={domId}
      code={section?.code}
      eyebrow={c("INST_EYEBROW")}
      title={c(section?.titleKey, "INST_TITLE")}
      intro={c(section?.subtitleKey, "INST_INTRO")}
      tone="surface"
    >
      <SkylineIllustration
        variant="silhouette"
        className="pointer-events-none absolute -bottom-2 right-0 -z-10 hidden w-[440px] opacity-[0.09] md:block lg:w-[560px]"
      />

      {/* Two pilot sub-counties today; three-up once more join. */}
      <ul
        className={`m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 md:gap-5 ${
          items.length >= 3 ? "lg:grid-cols-3" : ""
        }`}
      >
        {items.map((inst, i) => (
          <li key={inst.id ?? inst.titleKey} className="pgrl-reveal-item m-0 p-0" style={revealIndex(i + 1)}>
            <article
              className={
                "pgrl-lift flex h-full gap-4 rounded-2xl border border-solid items-start " +
                "border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-page))] p-5 sm:p-6"
              }
            >
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--pgrl-primary)/0.1)] text-[hsl(var(--pgrl-primary))]"
              >
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <h3 className="m-0 text-base font-bold leading-snug text-[hsl(var(--pgrl-ink))] sm:text-lg">
                  {c(inst.titleKey, inst.titleKeyDefault)}
                </h3>
                <p className="mb-0 mt-2 text-sm leading-relaxed text-[hsl(var(--pgrl-ink-soft))]">
                  {c(inst.descKey, inst.descKeyDefault)}
                </p>
              </div>
            </article>
          </li>
        ))}
      </ul>

      {/* Phones: skyline with a pin, then the photo card. */}
      <div className="mt-8 flex flex-col gap-6 md:hidden">
        <div className="pgrl-reveal-item relative mx-auto w-64" style={revealIndex(items.length + 1)}>
          <SkylineIllustration />
          <span
            aria-hidden
            className="pgrl-float absolute left-1/2 top-0 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-[hsl(var(--pgrl-primary))] text-[hsl(var(--pgrl-on-primary))] shadow-lg"
          >
            <MapPin className="h-6 w-6" />
          </span>
        </div>

        {photoUrl && routes && (
          <div
            className="pgrl-reveal-item relative isolate flex min-h-[250px] flex-col justify-end overflow-hidden rounded-3xl bg-[hsl(var(--pgrl-deep))] p-6 text-[hsl(var(--pgrl-on-primary))]"
            style={revealIndex(items.length + 2)}
          >
            <img src={photoUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover" />
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{ background: "linear-gradient(180deg, hsl(var(--pgrl-deep) / 0.1) 0%, hsl(var(--pgrl-deep) / 0.88) 100%)" }}
            />
            {script && (
              <p aria-hidden className="pgrl-script m-0 max-w-[11rem] rotate-[-5deg] text-4xl font-semibold leading-[0.95] text-[hsl(var(--pgrl-accent))] drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                {script}
              </p>
            )}
            <CtaLink
              to={routes.REGISTER_COMPLAINT}
              variant="inverse"
              className="mt-5 self-end !rounded-full bg-[hsl(var(--pgrl-deep)/0.35)] backdrop-blur-sm"
              leading={<ArrowRight aria-hidden className="h-4 w-4 rotate-[-45deg]" />}
            >
              {c("FINAL_CTA")}
            </CtaLink>
          </div>
        )}
      </div>
    </Section>
  );
}
