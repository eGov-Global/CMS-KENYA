// Government footer: channels, help links, the legal surface (privacy, terms,
// accessibility) and both login entries, all routed through the route map.

import * as React from "react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { LandingLink } from "./LandingLink";
import { useLandingCopy } from "../useLandingCopy";
import { sectionDomId } from "../config/resolve";
import type { LandingSectionConfig } from "../config/types";
import { LandingCopyKey, CONTACT, SOCIAL_LINKS } from "../content";
import { LandingRoutes } from "../routes";
import { CONTAINER, FOCUS_RING } from "../tokens";

export interface LandingFooterProps {
  routes: LandingRoutes;
  /** Config-driven overrides; only `code` is read (DOM/pattern id derivation). */
  section?: LandingSectionConfig;
}

interface FooterGroup {
  titleKey: LandingCopyKey;
  links: Array<{ labelKey: LandingCopyKey; route: keyof LandingRoutes; external?: boolean }>;
}

// Links whose route is still the "#" placeholder are commented out rather than
// rendered inert: a greyed-out "Page being configured" row reads as an
// unfinished site to a citizen. Uncomment each one as the county supplies the
// destination and the matching route in routes.ts stops being "#".
const GROUPS: FooterGroup[] = [
  {
    titleKey: "FOOTER_CHANNELS",
    links: [
      { labelKey: "FOOTER_PORTAL_WEB", route: "HOME" },
      // { labelKey: "FOOTER_ANDROID", route: "ANDROID_APP", external: true },
      // { labelKey: "FOOTER_WHATSAPP", route: "WHATSAPP", external: true },
      { labelKey: "FOOTER_GREEN_LINE", route: "GREEN_LINE" },
    ],
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
  "inline-flex min-h-[32px] items-center text-sm !text-[hsl(var(--pgrl-ink-soft))] no-underline",
  "hover:!text-[hsl(var(--pgrl-primary-hover))] motion-safe:transition-colors",
  FOCUS_RING
);

export function LandingFooter({ routes, section }: LandingFooterProps) {
  const { c } = useLandingCopy();
  const domId = sectionDomId(section?.code, "footer");
  const year = new Date().getFullYear();

  return (
    <footer data-pgrl-code={section?.code} className="relative isolate overflow-hidden border-0 border-t border-solid border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-surface))]">
      <div className={cn(CONTAINER, "grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-6")}>
        {/* Identity */}
        <div className="sm:col-span-2">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--pgrl-ink-soft))]">
            {c("GOV_NAME")}
          </p>
          <p className="mb-0 mt-1 text-lg font-bold leading-snug text-[hsl(var(--pgrl-ink-soft))]">
            {c("PORTAL_NAME")}
          </p>
          <p className="mb-0 mt-2 text-sm text-[hsl(var(--pgrl-ink-soft))]">
            {c("FOOTER_ORG")} · {c("TAGLINE")}
          </p>
          <p className="mb-0 mt-3 inline-block rounded-full bg-[hsl(var(--pgrl-primary)/0.1)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[hsl(var(--pgrl-primary))]">
            {c("MOTTO_VALUES")}
          </p>

          {/* Contact details. <address> is the semantic element for an owner's
              contact info; it italicises by default, hence not-italic. */}
          <address className="mt-5 not-italic">
            <p className="m-0 text-sm font-bold uppercase tracking-wide text-[hsl(var(--pgrl-ink-soft))]">
              {c("FOOTER_CONTACT")}
            </p>
            <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-sm text-[hsl(var(--pgrl-ink-soft))]">
              <li className="m-0 p-0">
                <span className="text-[hsl(var(--pgrl-ink-soft))]">{c("CONTACT_HOTLINE")}: </span>
                <a href={`tel:${CONTACT.hotline}`} className={FOOT_LINK}>
                  {CONTACT.hotlineDisplay}
                </a>
              </li>
              <li className="m-0 p-0">
                <span className="text-[hsl(var(--pgrl-ink-soft))]">{c("CONTACT_EMAIL")}: </span>
                <a href={`mailto:${CONTACT.email}`} className={FOOT_LINK}>
                  {CONTACT.email}
                </a>
              </li>
              <li className="m-0 p-0">
                <span className="text-[hsl(var(--pgrl-ink-soft))]">{c("CONTACT_POST")}: </span>
                {CONTACT.poBox}
              </li>
            </ul>
          </address>

          {/* Social channels */}
          <p className="m-0 mt-5 text-sm font-bold uppercase tracking-wide text-[hsl(var(--pgrl-ink-soft))]">
            {c("FOOTER_FOLLOW")}
          </p>
          <ul className="m-0 mt-2 flex list-none flex-row items-center gap-2 p-0">
            {SOCIAL_LINKS.map((social) => (
              <li key={social.id} className="m-0 p-0">
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${c(social.labelKey)} (${c("EXTERNAL_LINK_NOTE")})`}
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full no-underline",
                    "bg-[hsl(var(--pgrl-primary)/0.1)] !text-[hsl(var(--pgrl-ink-soft))]",
                    "hover:bg-[hsl(var(--pgrl-accent))] hover:!text-[hsl(var(--pgrl-deep))]",
                    "motion-safe:transition-colors",
                    FOCUS_RING
                  )}
                >
                  <BrandMark id={social.id} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {GROUPS.map((group) => (
          <nav key={group.titleKey} aria-label={c(group.titleKey)}>
            <p className="m-0 text-sm font-bold uppercase tracking-wide text-[hsl(var(--pgrl-ink-soft))]">
              {c(group.titleKey)}
            </p>
            <ul className="m-0 mt-3 flex list-none flex-col gap-1 p-0">
              {group.links.map((link) => {
                const to = routes[link.route];
                return (
                  <li key={link.labelKey} className="m-0 p-0">
                    <LandingLink
                      to={to}
                      target={link.external && to !== "#" ? "_blank" : undefined}
                      className={FOOT_LINK}
                    >
                      {c(link.labelKey)}
                    </LandingLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-0 border-t border-solid border-[hsl(var(--pgrl-line))]">
        <div className={cn(CONTAINER, "py-4")}>
          <p className="m-0 text-center text-xs text-[hsl(var(--pgrl-ink-soft))]">
            © {year} {c("FOOTER_COPYRIGHT")}
          </p>
        </div>
      </div>
    </footer>
  );
}
