// Ways to reach the service as a dark band (Bomet): four frosted tiles on the
// deep brand colour, then the closing ask in one row — the report button and
// the call-centre number side by side. No carousel: the tiles stack two-up on
// phones.

import * as React from "react";
import { ExternalLink, ArrowRight, Phone } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { Section, revealIndex } from "../../components/Section";
import { CtaLink } from "../../components/CtaLink";
import { CHANNELS, CONTACT } from "../../content";
import { useLandingCopy } from "../../useLandingCopy";
import { sectionDomId } from "../../config/resolve";
import { FOCUS_RING_DARK } from "../../tokens";
import type { LandingRoutes } from "../../routes";
import type { LandingSectionConfig } from "../../config/types";

export interface EditorialChannelsProps {
  routes: LandingRoutes;
  section?: LandingSectionConfig;
}

export function EditorialChannels({ routes, section }: EditorialChannelsProps) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "channels");
  const items: any[] = (section?.items as any[]) ?? CHANNELS;

  const destination = (channel: any): string | undefined =>
    channel.href ?? (channel.route ? routes[channel.route] : undefined);

  const hotline = CONTACT.hotlines[0];

  return (
    <Section
      id={domId}
      code={section?.code}
      eyebrow={c("CHANNELS_EYEBROW")}
      title={c(section?.titleKey, "CHANNELS_TITLE")}
      intro={c(section?.subtitleKey, "CHANNELS_INTRO")}
      tone="deep"
    >
      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((channel, i) => {
          const Icon = channel.icon;
          const to = destination(channel);
          const external = Boolean(channel.external) && to !== "#";
          return (
            <li key={channel.id} className="pgrl-reveal-item m-0 p-0" style={revealIndex(i + 1)}>
              <article
                className={
                  "pgrl-lift flex h-full flex-col rounded-2xl border border-solid border-[hsl(var(--pgrl-on-primary)/0.14)] " +
                  "bg-[hsl(var(--pgrl-on-primary)/0.06)] p-5 backdrop-blur-sm sm:p-6"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    aria-hidden
                    className="pgrl-icon flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--pgrl-accent)/0.18)] text-[hsl(var(--pgrl-accent))]"
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  {channel.badgeKey && (
                    <span className="rounded-full bg-[hsl(var(--pgrl-accent))] px-2.5 py-1 text-xs font-bold text-[hsl(var(--pgrl-deep))]">
                      {c(channel.badgeKey)}
                    </span>
                  )}
                </div>
                <h3 className="mb-0 mt-5 text-lg font-bold leading-snug text-[hsl(var(--pgrl-on-primary))]">
                  {c(channel.titleKey, channel.titleKeyDefault)}
                </h3>
                <p className="mb-0 mt-2 flex-1 text-sm leading-relaxed text-[hsl(var(--pgrl-on-primary)/0.74)]">
                  {c(channel.descKey, channel.descKeyDefault)}
                </p>
                {channel.ctaKey && to && (
                  <CtaLink
                    to={to}
                    target={external ? "_blank" : undefined}
                    variant="inverse"
                    className="mt-5 self-start !rounded-full text-sm"
                    trailing={external ? <ExternalLink aria-hidden className="h-4 w-4" /> : <ArrowRight aria-hidden className="h-4 w-4" />}
                  >
                    {c(channel.ctaKey)}
                  </CtaLink>
                )}
              </article>
            </li>
          );
        })}
      </ul>

      {/* The closing ask, as a row rather than a band of its own. */}
      <div
        className={
          "pgrl-reveal-item mt-10 flex flex-col gap-5 rounded-2xl border border-solid border-[hsl(var(--pgrl-on-primary)/0.14)] " +
          "bg-[hsl(var(--pgrl-on-primary)/0.06)] p-6 md:mt-12 md:flex-row md:items-center md:justify-between md:p-8"
        }
        style={revealIndex(items.length + 1)}
      >
        <div className="max-w-2xl">
          <h3 className="m-0 text-xl font-bold leading-tight tracking-tight text-[hsl(var(--pgrl-on-primary))] md:text-2xl">{c("FINAL_TITLE")}</h3>
          <p className="mb-0 mt-2 max-w-[56ch] text-sm leading-relaxed text-[hsl(var(--pgrl-on-primary)/0.78)] md:text-base">{c("FINAL_TEXT")}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:shrink-0">
          <CtaLink
            to={routes.REGISTER_COMPLAINT}
            variant="accent"
            size="lg"
            trailing={<ArrowRight aria-hidden className="h-5 w-5" />}
            className="w-full !rounded-full sm:w-auto"
          >
            {c("FINAL_CTA")}
          </CtaLink>
          {hotline && (
            // ! colour: legacy overrides.css repaints bare anchors (see CtaLink).
            <a
              href={`tel:${hotline.tel}`}
              className={cn(
                "inline-flex min-h-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-base font-semibold no-underline",
                "!text-[hsl(var(--pgrl-on-primary))] hover:!text-[hsl(var(--pgrl-accent))] motion-safe:transition-colors",
                FOCUS_RING_DARK
              )}
            >
              <Phone aria-hidden className="h-5 w-5 text-[hsl(var(--pgrl-accent))]" />
              {hotline.display}
            </a>
          )}
        </div>
      </div>
    </Section>
  );
}
