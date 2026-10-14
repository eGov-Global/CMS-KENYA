// Masthead + primary navigation — one sticky white bar (county design,
// 2026-10-12).
//
// Desktop (xl+, where five links and the search icon fit): crest + county name
// and motto on the left, the nav on the right, then a divider and a search
// icon that opens complaint tracking. The current page carries a gold bar
// under its label; the bar lives in ::after so switching it on never shifts
// the row.
// Below xl: the nav wraps to its own full-width row, collapsed behind an
// accessible disclosure menu (aria-expanded / aria-controls, Escape closes and
// restores focus to the trigger).
//
// The <header> itself is the sticky box (not an inner <nav>): sticky
// positioning is constrained to the parent, so a sticky child of a static
// header would have zero travel and never stick. The element also carries
// its font stack (pgrl-top-font) explicitly — the vendored legacy CSS has a
// bare `header { font-family: ... }` element rule that direct-targets the
// element, so the masthead states its family rather than relying on inheritance.
//
// In-shell mounting: if the page renders under an app chrome with its own
// fixed topbar, set `--pgrl-nav-offset` (e.g. "82px") so the bar pins below it
// instead of underneath it.

import * as React from "react";
import { Menu, X, Landmark, Search } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { __RouterContext } from "react-router";
import { LandingLink } from "./LandingLink";
import { NAV_ITEMS } from "../content";
import { useLandingCopy } from "../useLandingCopy";
import { LandingRoutes } from "../routes";
import { FOCUS_RING, TOP_GUTTER } from "../tokens";

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
        "pgrl-top-font sticky top-[var(--pgrl-nav-offset,0px)] z-40",
        "bg-white text-[hsl(var(--pgrl-top-navy))]",
        // Hairline: separates the white bar from the white-ish content below
        // once the page scrolls under it.
        "border-0 border-b border-solid border-[hsl(var(--pgrl-line)/0.7)]"
      )}
    >
      {/* flex-wrap: on mobile the nav drops to its own full-width row below
          the brand; on xl it sits inline, right-aligned. */}
      <div className={cn(TOP_GUTTER, "flex min-h-[68px] flex-wrap items-center justify-between gap-x-6 lg:min-h-[74px]")}>
        {/* Phones: capped to leave room for the menu button, so a longer
            name (a translation, enlarged system text) wraps inside the brand
            instead of dropping the button to a row of its own. */}
        <LandingLink
          to={routes.HOME}
          className={cn(
            "flex max-w-[calc(100%-3.75rem)] items-center gap-2.5 py-1.5 no-underline sm:gap-3.5 xl:max-w-none",
            "!text-[hsl(var(--pgrl-top-green))]",
            FOCUS_RING,
            "rounded-[var(--pgrl-radius)]"
          )}
        >
          {emblemUrl ? (
            <img src={emblemUrl} alt="" className="h-[54px] w-[54px] shrink-0 object-contain lg:h-[66px] lg:w-[66px]" />
          ) : (
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--pgrl-top-green)/0.1)]"
            >
              <Landmark className="h-5 w-5 text-[hsl(var(--pgrl-top-green))]" />
            </span>
          )}
          <span className="flex flex-col">
            <span className="text-[13px] font-extrabold uppercase leading-tight text-[hsl(var(--pgrl-top-green))] sm:text-base">
              {c("COUNTY_NAME")}
            </span>
            <span className="mt-0.5 text-[11px] leading-tight text-[hsl(var(--pgrl-top-navy)/0.85)] sm:mt-1 sm:text-xs lg:text-[13px]">
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
            "m-0 flex h-11 w-11 cursor-pointer items-center justify-center rounded-[var(--pgrl-radius)] border-0 bg-transparent",
            "text-[hsl(var(--pgrl-top-green))] xl:hidden",
            FOCUS_RING
          )}
        >
          {open ? <X aria-hidden className="h-7 w-7" /> : <Menu aria-hidden className="h-7 w-7" />}
          <span className="sr-only">{open ? c("NAV_MENU_CLOSE") : c("NAV_MENU_OPEN")}</span>
        </button>

        <nav
          id={MENU_ID}
          aria-label={c("ARIA_MAIN_NAV")}
          className={cn(
            "w-full basis-full xl:flex xl:w-auto xl:basis-auto xl:items-center xl:self-stretch",
            open ? "block" : "hidden"
          )}
        >
          <ul className="m-0 flex list-none flex-col gap-0 p-0 pb-2 xl:h-full xl:flex-row xl:items-center xl:gap-[clamp(14px,2.4vw,36px)] xl:pb-0">
            {items.map((item) => {
              const to = item.href ?? routes[item.route];
              const active = isActive(to);
              const label = c(item.labelKey, item.labelKeyDefault);
              return (
                <li key={item.code ?? item.labelKey} className="m-0 p-0 xl:h-full">
                  <LandingLink
                    to={to}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "relative flex min-h-[48px] items-center px-1 text-[15px] font-bold no-underline xl:h-full xl:px-0 xl:text-sm",
                      "motion-safe:transition-colors",
                      // The gold state bar under the label. Always present,
                      // collapsed when idle and grown on hover (transform only),
                      // so turning it on never reflows the row.
                      "after:absolute after:bottom-2 after:left-0 after:h-[3px] after:w-full after:rounded-full after:content-[''] xl:after:bottom-4",
                      "after:bg-[hsl(var(--pgrl-top-gold))] motion-safe:after:transition-transform motion-safe:after:duration-200",
                      FOCUS_RING,
                      // ! beats legacy overrides.css a:not(...):not(...) color rule
                      "!text-[hsl(var(--pgrl-top-navy))] hover:!text-[hsl(var(--pgrl-top-green))]",
                      active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"
                    )}
                  >
                    {label}
                  </LandingLink>
                </li>
              );
            })}
            {/* Search opens complaint tracking — the only thing a visitor can
                look up here. */}
            <li className="m-0 hidden p-0 xl:flex xl:h-full xl:items-center">
              <span aria-hidden className="mr-[clamp(10px,1.4vw,22px)] h-8 w-px bg-[hsl(var(--pgrl-line))]" />
              <LandingLink
                to={routes.TRACK_COMPLAINT}
                aria-label={c("NAV_TRACK")}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full no-underline",
                  "!text-[hsl(var(--pgrl-top-navy))] hover:!text-[hsl(var(--pgrl-top-green))]",
                  FOCUS_RING
                )}
              >
                <Search aria-hidden className="h-[22px] w-[22px]" />
              </LandingLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
