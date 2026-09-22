// Masthead + primary navigation — a single translucent white bar.
//
// Desktop: emblem + portal identity on the left, the primary nav on the right,
// both inside one sticky bar that blurs the page scrolling beneath it. Nav
// state is carried by a gold bottom bar alone — no background fill — with the
// label recoloured: soft ink by default, brand green on hover and on the
// current page. The bar lives in ::after so switching it on never shifts the
// row. The "report" destination renders as a filled pill on md+ so the page's
// primary action is always one click away while scrolling.
// Mobile: the nav wraps to its own full-width row, collapsed behind an
// accessible disclosure menu (aria-expanded / aria-controls, Escape closes and
// restores focus to the trigger).
//
// The <header> itself is the sticky box (not an inner <nav>): sticky
// positioning is constrained to the parent, so a sticky child of a static
// header would have zero travel and never stick. The element also carries
// font-condensed explicitly — the vendored legacy CSS has a bare
// `header { font-family: ... }` element rule that direct-targets the element,
// so the masthead states its family rather than relying on inheritance.
//
// In-shell mounting: if the page renders under an app chrome with its own
// fixed topbar, set `--pgrl-nav-offset` (e.g. "82px") so the bar pins below it
// instead of underneath it.

import * as React from "react";
import { Menu, X, Landmark } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { __RouterContext } from "react-router";
import { LandingLink } from "./LandingLink";
import { CtaLink } from "./CtaLink";
import { NAV_ITEMS } from "../content";
import { useLandingCopy } from "../useLandingCopy";
import { LandingRoutes } from "../routes";
import { CONTAINER, FOCUS_RING } from "../tokens";

export interface LandingHeaderProps {
  routes: LandingRoutes;
  /** Emblem/crest image URL; falls back to a Landmark glyph when absent. */
  emblemUrl?: string;
  /** Config-driven nav items; absent => the built-in NAV_ITEMS (unchanged). */
  navItems?: any[];
  /** Config row code, exposed to the Builder preview bridge for hit-testing. */
  code?: string;
}

const MENU_ID = "pgr-landing-nav-menu";

export function LandingHeader({ routes, emblemUrl, navItems, code }: LandingHeaderProps) {
  const items: any[] = navItems ?? NAV_ITEMS;
  const { c } = useLandingCopy();
  const router = React.useContext(__RouterContext as React.Context<any>);
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const currentPath: string =
    router?.location?.pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");

  // Exact match, or a true path-segment prefix ("/x/y" matches "/x/y/z" but
  // never a sibling like "/x/y-other").
  const isActive = (to: string) =>
    to !== "#" && (currentPath === to || currentPath.startsWith(to + "/"));

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      data-pgrl-code={code}
      className={cn(
        "sticky top-[var(--pgrl-nav-offset,0px)] z-40 font-condensed",
        // Translucent + blur: the hero photo shows faintly through as it
        // scrolls under; falls back to a solid bar where backdrop-filter is
        // unsupported (the alpha is high enough to stay legible either way).
        "bg-[hsl(var(--pgrl-surface)/0.92)] text-[hsl(var(--pgrl-ink))] backdrop-blur-md",
        // Hairline: the page background is nearly white, so the shadow alone
        // doesn't reliably separate the bar from the content.
        "border-0 border-b border-solid border-[hsl(var(--pgrl-line))]"
      )}
    >
      {/* flex-wrap: on mobile the nav drops to its own full-width row below
          the brand; on md it sits inline, right-aligned. */}
      <div className={cn(CONTAINER, "flex min-h-[64px] flex-wrap items-center justify-between gap-x-4")}>
        <LandingLink
          to={routes.HOME}
          className={cn(
            "flex items-center gap-3 py-2 no-underline",
            "!text-[hsl(var(--pgrl-ink))]",
            FOCUS_RING,
            "rounded-[var(--pgrl-radius)]"
          )}
        >
          {emblemUrl ? (
            // object-contain keeps the crest's ribbon text uncropped.
            <span className="flex h-12 w-12 shrink-0 items-center justify-center md:h-14 md:w-14">
              <img src={emblemUrl} alt="" className="h-full w-full object-contain" />
            </span>
          ) : (
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--pgrl-primary)/0.1)]"
            >
              <Landmark className="h-5 w-5 text-[hsl(var(--pgrl-primary))]" />
            </span>
          )}
          <span className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-[hsl(var(--pgrl-ink-soft))]">
              {c("GOV_NAME")}
            </span>
            <span className="text-lg font-bold leading-tight tracking-tight text-[hsl(var(--pgrl-primary))] sm:text-xl">
              {c("PORTAL_NAME")}
            </span>
            {/* lg+ only: the bar stays two lines tall on phones and tablets. */}
            <span className="hidden text-[11px] leading-tight text-[hsl(var(--pgrl-ink-soft))] lg:block">
              {c("MOTTO_VALUES")}
            </span>
          </span>
        </LandingLink>

        {/* Mobile menu trigger */}
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-controls={MENU_ID}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "m-0 flex h-11 w-11 cursor-pointer items-center justify-center rounded-[var(--pgrl-radius)]",
            "border border-solid border-[hsl(var(--pgrl-line))] bg-transparent",
            "text-[hsl(var(--pgrl-ink-soft))] md:hidden",
            FOCUS_RING
          )}
        >
          {open ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
          <span className="sr-only">{open ? c("NAV_MENU_CLOSE") : c("NAV_MENU_OPEN")}</span>
        </button>

        <nav
          id={MENU_ID}
          aria-label={c("ARIA_MAIN_NAV")}
          className={cn(
            "w-full basis-full md:block md:w-auto md:basis-auto md:self-stretch",
            open ? "block" : "hidden"
          )}
        >
          <ul className="m-0 flex list-none flex-col gap-0 p-0 pb-2 md:h-full md:flex-row md:items-center md:gap-1 md:pb-0">
            {items.map((item) => {
              const to = item.href ?? routes[item.route];
              const active = isActive(to);
              // The page's primary action gets a filled pill on md+; on the
              // phone menu it is a plain row like the others.
              const isPrimary = item.route === "REGISTER_COMPLAINT";
              const label = c(item.labelKey, item.labelKeyDefault);
              return (
                <li key={item.code ?? item.labelKey} className={cn("m-0 p-0", isPrimary && "md:ml-3")}>
                  {isPrimary ? (
                    <>
                      <LandingLink
                        to={to}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "relative flex min-h-[48px] items-center px-4 text-[15px] font-semibold no-underline md:hidden",
                          "!text-[hsl(var(--pgrl-primary))]",
                          FOCUS_RING
                        )}
                      >
                        {label}
                      </LandingLink>
                      <CtaLink
                        to={to}
                        variant="primary"
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className="hidden !rounded-full md:inline-flex"
                      >
                        {label}
                      </CtaLink>
                    </>
                  ) : (
                    <LandingLink
                      to={to}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "relative flex min-h-[48px] items-center px-4 text-[15px] font-semibold no-underline md:min-h-[64px]",
                        "motion-safe:transition-colors",
                        // The state bar. Always present, transparent when idle,
                        // so turning it on never reflows the row.
                        "after:absolute after:inset-x-4 after:bottom-0 after:h-[3px] after:rounded-t-full after:content-['']",
                        FOCUS_RING,
                        // ! beats legacy overrides.css a:not(...):not(...) color rule
                        active
                          ? "!text-[hsl(var(--pgrl-primary))] after:bg-[hsl(var(--pgrl-accent))]"
                          : "!text-[hsl(var(--pgrl-ink-soft))] after:bg-transparent " +
                              "hover:!text-[hsl(var(--pgrl-primary))] hover:after:bg-[hsl(var(--pgrl-accent)/0.6)]"
                      )}
                    >
                      {label}
                    </LandingLink>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
