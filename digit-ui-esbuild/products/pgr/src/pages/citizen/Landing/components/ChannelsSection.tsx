// Every way to reach the service, in one place, closing with the page's final
// call to action — a photo band of the city with the report button.
//
// This is the canonical list — the hero chips and footer are shortcuts to it.
// The phone line matters most for citizens without a smartphone.

import * as React from "react";
import { ExternalLink, ChevronRight, Send } from "lucide-react";
import { Section, revealIndex } from "./Section";
import { CtaLink } from "./CtaLink";
import { CHANNELS } from "../content";
import { useLandingCopy } from "../useLandingCopy";
import { sectionDomId } from "../config/resolve";
import { LandingRoutes } from "../routes";
import type { LandingSectionConfig } from "../config/types";

export interface ChannelsSectionProps {
  routes: LandingRoutes;
  /** Photo behind the closing call to action; a flat deep-green band without it. */
  bandImageUrl?: string;
  /** Config-driven overrides; absent => the built-in deck (unchanged). */
  section?: LandingSectionConfig;
}

export function ChannelsSection({ routes, bandImageUrl, section }: ChannelsSectionProps) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "channels");
  const items: any[] = (section?.items as any[]) ?? CHANNELS;

  return (
    <Section
      id={domId}
      code={section?.code}
      eyebrow={c("CHANNELS_EYEBROW")}
      title={c(section?.titleKey, "CHANNELS_TITLE")}
      intro={c(section?.subtitleKey, "CHANNELS_INTRO")}
      tone="surface"
    >
      <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((channel, i) => {
          const Icon = channel.icon;
          const to = channel.href ?? (channel.route ? routes[channel.route] : undefined);
          const external = Boolean(channel.external) && to !== "#";
          return (
            <li key={channel.id} className="pgrl-reveal-item m-0 p-0" style={revealIndex(i + 1)}>
              <article
                className={
                  "pgrl-lift flex h-full flex-col rounded-[var(--pgrl-radius)] border border-solid " +
                  "border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-page))] p-6"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    aria-hidden
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--pgrl-primary)/0.1)] text-[hsl(var(--pgrl-primary))]"
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  {channel.badgeKey && (
                    <span className="rounded-full bg-[hsl(var(--pgrl-tint-gold))] px-2.5 py-1 text-xs font-bold text-[hsl(var(--pgrl-deep))]">
                      {c(channel.badgeKey)}
                    </span>
                  )}
                </div>

                <h3 className="mb-0 mt-5 text-lg font-bold leading-snug text-[hsl(var(--pgrl-ink))]">
                  {c(channel.titleKey, channel.titleKeyDefault)}
                </h3>
                <p className="mb-0 mt-2 flex-1 text-sm leading-relaxed text-[hsl(var(--pgrl-ink-soft))]">
                  {c(channel.descKey, channel.descKeyDefault)}
                </p>

                {channel.ctaKey && to && (
                  <CtaLink
                    to={to}
                    target={external ? "_blank" : undefined}
                    variant="outline"
                    className="mt-5 w-full text-sm"
                    trailing={
                      external ? (
                        <ExternalLink aria-hidden className="h-4 w-4" />
                      ) : (
                        <ChevronRight aria-hidden className="h-4 w-4" />
                      )
                    }
                  >
                    {c(channel.ctaKey)}
                  </CtaLink>
                )}
              </article>
            </li>
          );
        })}
      </ul>

      {/* Closing call to action on a photo of the city. */}
      <div
        className="pgrl-reveal-item relative isolate mt-12 overflow-hidden rounded-[calc(var(--pgrl-radius)*1.3)] bg-[hsl(var(--pgrl-deep))] text-[hsl(var(--pgrl-on-primary))]"
        style={revealIndex(items.length + 1)}
      >
        {bandImageUrl && (
          <img
            src={bandImageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--pgrl-deep) / 0.95) 0%, hsl(var(--pgrl-deep) / 0.74) 48%, hsl(var(--pgrl-deep) / 0.32) 100%)",
          }}
        />
        <div className="flex flex-col items-start gap-6 p-7 md:flex-row md:items-center md:justify-between md:p-12">
          <div className="max-w-2xl">
            <h3 className="m-0 text-2xl font-bold leading-tight tracking-tight text-[hsl(var(--pgrl-on-primary))] md:text-3xl">
              {c("FINAL_TITLE")}
            </h3>
            <p className="mb-0 mt-3 text-base leading-relaxed text-[hsl(var(--pgrl-on-primary)/0.82)] md:text-lg">
              {c("FINAL_TEXT")}
            </p>
          </div>
          <CtaLink
            to={routes.REGISTER_COMPLAINT}
            variant="accent"
            size="lg"
            leading={<Send aria-hidden className="h-5 w-5" />}
            className="w-full sm:w-auto md:shrink-0"
          >
            {c("FINAL_CTA")}
          </CtaLink>
        </div>
      </div>
    </Section>
  );
}
