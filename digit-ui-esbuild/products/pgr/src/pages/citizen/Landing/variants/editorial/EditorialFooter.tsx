// Light footer (Bomet): the wordmark and contact on white under a brand rule,
// the link groups beside them, and a slim deep band for the copyright and the
// county's social accounts. Same groups, routes and copy as the classic footer.

import * as React from "react";
import { Mail } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { LandingLink } from "../../components/LandingLink";
import { FOOTER_GROUPS, BrandMark } from "../../components/LandingFooter";
import { useLandingCopy } from "../../useLandingCopy";
import { CONTACT, SOCIAL_LINKS } from "../../content";
import { CONTAINER, FOCUS_RING, FOCUS_RING_DARK } from "../../tokens";
import type { LandingRoutes } from "../../routes";
import type { LandingSectionConfig } from "../../config/types";

export interface EditorialFooterProps {
  routes: LandingRoutes;
  logoUrl?: string;
  emblemUrl?: string;
  section?: LandingSectionConfig;
}

// !important text colours: legacy overrides.css repaints bare anchors (see CtaLink).
const LINK = cn(
  "inline-flex min-h-[44px] items-center text-sm !text-[hsl(var(--pgrl-ink))] no-underline md:min-h-[32px]",
  "hover:!text-[hsl(var(--pgrl-primary))] motion-safe:transition-colors",
  FOCUS_RING
);
const MUTED = "text-[hsl(var(--pgrl-ink-soft))]";
const HEAD = "m-0 text-xs font-bold uppercase tracking-[0.14em] text-[hsl(var(--pgrl-deep))]";
const SOCIAL = cn(
  "inline-flex h-11 w-11 items-center justify-center rounded-full no-underline",
  "bg-[hsl(var(--pgrl-on-primary)/0.1)] !text-[hsl(var(--pgrl-on-primary))]",
  "hover:bg-[hsl(var(--pgrl-accent))] hover:!text-[hsl(var(--pgrl-deep))] motion-safe:transition-colors",
  FOCUS_RING_DARK
);

export function EditorialFooter({ routes, logoUrl, emblemUrl, section }: EditorialFooterProps) {
  const { c } = useLandingCopy();
  const year = new Date().getFullYear();

  return (
    <footer data-pgrl-code={section?.code} className="bg-[hsl(var(--pgrl-surface))] text-[hsl(var(--pgrl-ink))]">
      <div aria-hidden className="h-1 w-full bg-[hsl(var(--pgrl-primary))]" />
      <div className={cn(CONTAINER, "grid grid-cols-1 gap-10 py-12 lg:grid-cols-12 lg:py-14")}>
        <div className="lg:col-span-4">
          <div className="flex items-center gap-3">
            {emblemUrl ? (
              <img src={emblemUrl} alt="" className="h-16 w-16 shrink-0 object-contain" />
            ) : logoUrl ? (
              <img src={logoUrl} alt="" className="h-14 w-auto max-w-[150px] shrink-0 object-contain" />
            ) : null}
            <div className="leading-none">
              <p className="m-0 text-[1.65rem] font-bold uppercase leading-none tracking-tight text-[hsl(var(--pgrl-deep))]">{c("WORDMARK_LINE1")}</p>
              <p className="m-0 mt-1 text-[0.8rem] font-bold uppercase leading-none tracking-[0.22em] text-[hsl(var(--pgrl-primary))]">{c("WORDMARK_LINE2")}</p>
              <p className={cn("m-0 mt-2.5 text-[11px] leading-none", MUTED)}>{c("MOTTO_VALUES")}</p>
            </div>
          </div>
          <p className={cn("mb-0 mt-5 max-w-xs text-sm leading-relaxed", MUTED)}>
            {c("FOOTER_ORG")} · {c("TAGLINE")}
          </p>

          <address className="mt-6 not-italic">
            <p className={HEAD}>{c("FOOTER_CONTACT")}</p>
            <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0 text-sm">
              <li className="m-0 p-0">
                <span className={MUTED}>{c("CONTACT_HOTLINE")}: </span>
                {CONTACT.hotlines.map((line, i) => (
                  <React.Fragment key={line.tel}>
                    {i > 0 && (
                      <span aria-hidden className={MUTED}>
                        {" · "}
                      </span>
                    )}
                    <a href={`tel:${line.tel}`} className={cn(LINK, "whitespace-nowrap")}>
                      {line.display}
                    </a>
                  </React.Fragment>
                ))}
              </li>
              <li className="m-0 p-0">
                <span className={MUTED}>{c("CONTACT_EMAIL")}: </span>
                <a href={`mailto:${CONTACT.email}`} className={LINK}>
                  {CONTACT.email}
                </a>
              </li>
              <li className={cn("m-0 p-0 leading-relaxed", MUTED)}>
                <span>{c("CONTACT_POST")}: </span>
                <span className="text-[hsl(var(--pgrl-ink))]">{CONTACT.poBox}</span>
              </li>
            </ul>
          </address>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 lg:col-span-8 lg:pl-10">
          {FOOTER_GROUPS.map((group) => (
            <nav key={group.titleKey} aria-label={c(group.titleKey)}>
              <p className={HEAD}>{c(group.titleKey)}</p>
              <ul className="m-0 mt-3 flex list-none flex-col gap-1 p-0">
                {group.links.map((link) => {
                  const to = routes[link.route];
                  return (
                    <li key={link.labelKey} className="m-0 p-0">
                      <LandingLink to={to} target={link.external && to !== "#" ? "_blank" : undefined} className={LINK}>
                        {c(link.labelKey)}
                      </LandingLink>
                    </li>
                  );
                })}
                {group.taglineKey && (
                  <li className="m-0 mt-1 p-0 text-sm font-semibold text-[hsl(var(--pgrl-primary))]">{c(group.taglineKey)}</li>
                )}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="bg-[hsl(var(--pgrl-deep))] text-[hsl(var(--pgrl-on-primary)/0.78)]">
        <div className={cn(CONTAINER, "flex flex-col-reverse items-start gap-4 py-5 sm:flex-row sm:items-center sm:justify-between")}>
          <p className="m-0 text-xs">
            © {year} {c("FOOTER_COPYRIGHT")}
          </p>
          <div className="flex items-center gap-3">
            <p className="m-0 hidden text-xs font-bold uppercase tracking-[0.14em] text-[hsl(var(--pgrl-on-primary))] sm:block">{c("FOOTER_FOLLOW")}</p>
            <ul className="m-0 flex list-none flex-row items-center gap-2 p-0">
              {SOCIAL_LINKS.map((social) => (
                <li key={social.id} className="m-0 p-0">
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${c(social.labelKey)} (${c("EXTERNAL_LINK_NOTE")})`}
                    className={SOCIAL}
                  >
                    <BrandMark id={social.id} />
                  </a>
                </li>
              ))}
              <li className="m-0 p-0">
                <a href={`mailto:${CONTACT.email}`} aria-label={c("CONTACT_EMAIL")} className={SOCIAL}>
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
