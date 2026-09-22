// Government footer: channels, help links, the legal surface (privacy, terms,
// accessibility) and both login entries, all routed through the route map.
// Deep county green under a gold rule — the same pairing as the crest — so the
// page closes the way nairobi.go.ke does.

import * as React from "react";
import { Leaf, Mail } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { LandingLink } from "./LandingLink";
import { DotGrid, DOT_GRID_CORNER } from "./DotGrid";
import { useLandingCopy } from "../useLandingCopy";
import { sectionDomId } from "../config/resolve";
import type { LandingSectionConfig } from "../config/types";
import { LandingCopyKey, CONTACT, SOCIAL_LINKS } from "../content";
import { LandingRoutes } from "../routes";
import { CONTAINER, FOCUS_RING_DARK } from "../tokens";

export interface LandingFooterProps {
  routes: LandingRoutes;
  /** Wide logo lockup; used only when no emblem is available for the wordmark. */
  logoUrl?: string;
  /** County crest, set beside the typeset wordmark. */
  emblemUrl?: string;
  /** Config-driven overrides; only `code` is read (DOM/pattern id derivation). */
  section?: LandingSectionConfig;
}

interface FooterGroup {
  titleKey: LandingCopyKey;
  links: Array<{ labelKey: LandingCopyKey; route: keyof LandingRoutes; external?: boolean }>;
  taglineKey?: LandingCopyKey;
}

// Links whose route is still the "#" placeholder are commented out rather than
// rendered inert: a greyed-out "Page being configured" row reads as an
// unfinished site to a citizen. Uncomment each one as the county supplies the
// destination and the matching route in routes.ts stops being "#".
const GROUPS: FooterGroup[] = [
  {
    titleKey: "GOV_NAME",
    links: [
      { labelKey: "PORTAL_NAME", route: "HOME" },
      // { labelKey: "FOOTER_ANDROID", route: "ANDROID_APP", external: true },
      // { labelKey: "FOOTER_WHATSAPP", route: "WHATSAPP", external: true },
      { labelKey: "FOOTER_GREEN_LINE", route: "GREEN_LINE" },
    ],
    // Motto in gold under the county's own column.
    taglineKey: "MOTTO_VALUES",
  },
  {
    titleKey: "FOOTER_LINKS",
    links: [
      { labelKey: "NAV_SUBMIT", route: "REGISTER_COMPLAINT" },
      { labelKey: "NAV_TRACK", route: "TRACK_COMPLAINT" }
    ],
  },
  {
    titleKey: "FOOTER_ACCESS",
    links: [
      { labelKey: "FOOTER_CITIZEN_LOGIN", route: "CITIZEN_LOGIN" },
      { labelKey: "FOOTER_EMPLOYEE_LOGIN", route: "EMPLOYEE_LOGIN" },
    ],
  },
  // Legal — every entry is still "#", so the whole group is commented out.
  // Leaving the links out but keeping the group would ship a bare "Legal"
  // heading over an empty list, which looks worse than no column at all.
  // Restore this block once PRIVACY / TERMS / ACCESSIBILITY are real pages.
  // {
  //   titleKey: "FOOTER_LEGAL",
  //   links: [
  //     { labelKey: "FOOTER_PRIVACY", route: "PRIVACY" },
  //     { labelKey: "FOOTER_TERMS", route: "TERMS" },
  //     { labelKey: "FOOTER_ACCESSIBILITY", route: "ACCESSIBILITY" },
  //   ],
  // },
];

// Brand marks. lucide-react@1.x ships no brand logos (they were dropped for
// licensing), so the three marks are inlined rather than adding a dependency
// for one row of icons. Paths are the official 24x24 glyphs; `currentColor`
// lets them inherit the footer link colors.
const BRAND_PATHS: Record<SocialId, string> = {
  facebook:
    "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  youtube:
    "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
};

type SocialId = (typeof SOCIAL_LINKS)[number]["id"];

function BrandMark({ id }: { id: SocialId }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" className="h-4 w-4" fill="currentColor">
      <path d={BRAND_PATHS[id]} />
    </svg>
  );
}

// !important text colors: see CtaLink.tsx — legacy anchor rule collision.
const FOOT_LINK = cn(
  "inline-flex min-h-[32px] items-center text-sm !text-[hsl(var(--pgrl-on-primary)/0.78)] no-underline",
  "hover:!text-[hsl(var(--pgrl-accent))] motion-safe:transition-colors",
  FOCUS_RING_DARK
);
const FOOT_MUTED = "text-[hsl(var(--pgrl-on-primary)/0.62)]";
const FOOT_HEAD = "m-0 text-xs font-bold uppercase tracking-[0.14em] text-[hsl(var(--pgrl-on-primary))]";
const SOCIAL_BTN = cn(
  "inline-flex h-10 w-10 items-center justify-center rounded-full no-underline",
  "bg-[hsl(var(--pgrl-on-primary)/0.1)] !text-[hsl(var(--pgrl-on-primary))]",
  "hover:bg-[hsl(var(--pgrl-accent))] hover:!text-[hsl(var(--pgrl-deep))]",
  "motion-safe:transition-colors",
  FOCUS_RING_DARK
);

export function LandingFooter({ routes, logoUrl, emblemUrl, section }: LandingFooterProps) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "footer");
  const year = new Date().getFullYear();

  return (
    <footer
      data-pgrl-code={section?.code}
      className="relative isolate overflow-hidden bg-[hsl(var(--pgrl-deep))] text-[hsl(var(--pgrl-on-primary)/0.78)]"
    >
      <div aria-hidden className="h-1 w-full bg-[hsl(var(--pgrl-accent))]" />
      <DotGrid id={`${domId}-dots`} className={DOT_GRID_CORNER} />
      <Leaf aria-hidden className="pointer-events-none absolute -bottom-6 right-6 -z-10 h-40 w-40 rotate-[20deg] text-[hsl(var(--pgrl-on-primary)/0.06)]" />

      <div className={cn(CONTAINER, "grid grid-cols-1 gap-10 py-14 lg:grid-cols-12")}>
        {/* Wordmark: crest beside the county name set in type. */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-3">
            {emblemUrl ? (
              <img src={emblemUrl} alt="" className="h-16 w-16 shrink-0 object-contain" />
            ) : logoUrl ? (
              <span className="flex h-14 shrink-0 items-center rounded-lg bg-white px-2">
                <img src={logoUrl} alt="" className="h-full w-auto max-w-[150px] object-contain" />
              </span>
            ) : null}
            <div className="leading-none">
              <p className="m-0 text-[1.65rem] font-bold uppercase leading-none tracking-tight text-[hsl(var(--pgrl-on-primary))]">
                {c("WORDMARK_LINE1")}
              </p>
              <p className="m-0 mt-1 text-[0.8rem] font-bold uppercase leading-none tracking-[0.22em] text-[hsl(var(--pgrl-on-primary)/0.9)]">
                {c("WORDMARK_LINE2")}
              </p>
              <p className="m-0 mt-2.5 text-[11px] leading-none text-[hsl(var(--pgrl-accent))]">{c("MOTTO_VALUES")}</p>
            </div>
          </div>
          <p className={cn("mb-0 mt-5 max-w-xs text-sm leading-relaxed", FOOT_MUTED)}>
            {c("FOOTER_ORG")} · {c("TAGLINE")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:col-span-9 lg:grid-cols-4">
          {GROUPS.map((group) => (
            <nav key={group.titleKey} aria-label={c(group.titleKey)}>
              <p className={FOOT_HEAD}>{c(group.titleKey)}</p>
              <ul className="m-0 mt-4 flex list-none flex-col gap-1 p-0">
                {group.links.map((link) => {
                  const to = routes[link.route];
                  return (
                    <li key={link.labelKey} className="m-0 p-0">
                      <LandingLink to={to} target={link.external && to !== "#" ? "_blank" : undefined} className={FOOT_LINK}>
                        {c(link.labelKey)}
                      </LandingLink>
                    </li>
                  );
                })}
                {group.taglineKey && (
                  <li className="m-0 mt-1 p-0 text-sm font-semibold text-[hsl(var(--pgrl-accent))]">{c(group.taglineKey)}</li>
                )}
              </ul>
            </nav>
          ))}

          {/* Contact details. <address> is the semantic element for an owner's
              contact info; it italicises by default, hence not-italic. */}
          <address className="not-italic">
            <p className={FOOT_HEAD}>{c("FOOTER_CONTACT")}</p>
            <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0 text-sm">
              <li className="m-0 p-0">
                <span className={FOOT_MUTED}>{c("CONTACT_HOTLINE")}: </span>
                <a href={`tel:${CONTACT.hotline}`} className={FOOT_LINK}>
                  {CONTACT.hotlineDisplay}
                </a>
              </li>
              <li className="m-0 p-0">
                <span className={FOOT_MUTED}>{c("CONTACT_EMAIL")}: </span>
                <a href={`mailto:${CONTACT.email}`} className={FOOT_LINK}>
                  {CONTACT.email}
                </a>
              </li>
              <li className="m-0 p-0 leading-relaxed">
                <span className={FOOT_MUTED}>{c("CONTACT_POST")}: </span>
                {CONTACT.poBox}
              </li>
            </ul>
          </address>
        </div>
      </div>

      <div className="border-0 border-t border-solid border-[hsl(var(--pgrl-on-primary)/0.12)]">
        <div className={cn(CONTAINER, "flex flex-col-reverse items-start gap-4 py-5 sm:flex-row sm:items-center sm:justify-between")}>
          <p className={cn("m-0 text-xs", FOOT_MUTED)}>
            © {year} {c("FOOTER_COPYRIGHT")}
          </p>
          <div className="flex items-center gap-3">
            <p className={cn(FOOT_HEAD, "hidden sm:block")}>{c("FOOTER_FOLLOW")}</p>
            <ul className="m-0 flex list-none flex-row items-center gap-2 p-0">
              {SOCIAL_LINKS.map((social) => (
                <li key={social.id} className="m-0 p-0">
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${c(social.labelKey)} (${c("EXTERNAL_LINK_NOTE")})`}
                    className={SOCIAL_BTN}
                  >
                    <BrandMark id={social.id} />
                  </a>
                </li>
              ))}
              <li className="m-0 p-0">
                <a href={`mailto:${CONTACT.email}`} aria-label={c("CONTACT_EMAIL")} className={SOCIAL_BTN}>
                  <Mail aria-hidden className="h-4 w-4" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
