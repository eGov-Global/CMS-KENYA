// Dark green government strip over the masthead (county design, 2026-10-12):
// the county name on the left; the help line, a language menu and sign-in on
// the right.

import * as React from "react";
import { Phone, Globe, ChevronDown, UserRound } from "lucide-react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { LandingLink } from "./LandingLink";
import { useLandingCopy } from "../useLandingCopy";
import { LandingRoutes } from "../routes";
import { CONTACT } from "../content";
import { FOCUS_RING_DARK, TOP_GUTTER } from "../tokens";
import { LanguageOption, phoneDisplay, pickLanguage } from "../topOfPage";

export type { LanguageOption } from "../topOfPage";

export const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: "en_IN", label: "EN" }
];

export interface UtilityBarProps {
  routes: LandingRoutes;
  languages: LanguageOption[];
  onLanguageChange?: (code: string) => void;
}

// !important text colors: legacy overrides.css `a:not(.digit-button):not(.button)`
// (0-2-1, plus a :hover variant at 0-3-1) outranks scoped utilities otherwise.
const UTIL_LINK =
  "inline-flex min-h-[40px] items-center gap-2 font-semibold no-underline !text-white hover:!text-[hsl(var(--pgrl-top-gold))] motion-safe:transition-colors " +
  FOCUS_RING_DARK;

const MENU_ID = "pgr-landing-language-menu";

function LanguageMenu({ languages, onChange }: { languages: LanguageOption[]; onChange: (code: string) => void }) {
  const { c, i18n } = useLandingCopy();
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const current = pickLanguage(languages, i18n?.language);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  // One language: nothing to choose, so a label rather than a dead control.
  if (languages.length < 2) {
    return (
      <span className="inline-flex min-h-[40px] items-center gap-2 font-semibold">
        <Globe aria-hidden className="h-4 w-4" />
        {current?.label}
      </span>
    );
  }

  return (
    // A disclosure (button + list of language buttons), not an ARIA menu: it
    // closes on Escape, on a click outside and when focus leaves it.
    <div
      ref={rootRef}
      className="relative"
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={MENU_ID}
        aria-label={`${c("ARIA_LANGUAGE")}: ${current?.label}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(UTIL_LINK, "m-0 cursor-pointer border-0 bg-transparent p-0 text-[inherit] text-white")}
      >
        <Globe aria-hidden className="h-4 w-4" />
        {current?.label}
        <ChevronDown aria-hidden className={cn("h-3.5 w-3.5 motion-safe:transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul
          id={MENU_ID}
          className="absolute right-0 top-full z-50 m-0 mt-1 min-w-[5.5rem] list-none rounded-lg border border-solid border-[hsl(var(--pgrl-line))] bg-white p-1 shadow-lg"
        >
          {languages.map((lng) => (
            <li key={lng.code} className="m-0 p-0">
              <button
                type="button"
                aria-pressed={lng.code === current?.code}
                onClick={() => {
                  setOpen(false);
                  onChange(lng.code);
                }}
                className={cn(
                  "m-0 flex min-h-[40px] w-full cursor-pointer items-center rounded-md border-0 bg-transparent px-3 text-left text-[13px] font-semibold",
                  "text-[hsl(var(--pgrl-top-navy))] hover:bg-[hsl(var(--pgrl-tint))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--pgrl-ring))]",
                  lng.code === current?.code && "text-[hsl(var(--pgrl-top-green))] underline underline-offset-4"
                )}
              >
                {lng.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function UtilityBar({ routes, languages, onLanguageChange }: UtilityBarProps) {
  const { c, i18n } = useLandingCopy();

  const phone = phoneDisplay(routes.PHONE, CONTACT);

  const changeLanguage = (code: string) => {
    if (onLanguageChange) onLanguageChange(code);
    else i18n?.changeLanguage?.(code);
  };

  return (
    // role=region: aria-label on a generic div is ignored by assistive tech
    <div role="region" aria-label={c("ARIA_UTILITY")} className="pgrl-top-font bg-[hsl(var(--pgrl-top-bar))] text-[11px] text-white sm:text-[13px]">
      <div className={cn(TOP_GUTTER, "flex min-h-[40px] items-center justify-end gap-2 whitespace-nowrap sm:justify-between sm:gap-4")}>
        {/* Phones keep the strip to one line: the masthead names the county. */}
        <p className="m-0 hidden font-bold uppercase tracking-wide sm:block">{c("COUNTY_NAME")}</p>

        <div className="flex items-center gap-3 sm:gap-5">
          <a href={routes.PHONE} aria-label={`${c("UTILITY_GREEN_LINE")}: ${phone}`} className={cn(UTIL_LINK, "font-bold")}>
            <Phone aria-hidden className="h-4 w-4" />
            {phone}
          </a>
          <span aria-hidden className="hidden h-4 w-px bg-white/60 sm:block" />
          <LanguageMenu languages={languages} onChange={changeLanguage} />
          <LandingLink to={routes.CITIZEN_LOGIN} className={UTIL_LINK}>
            <UserRound aria-hidden className="h-4 w-4" />
            {c("LOGIN")}
          </LandingLink>
        </div>
      </div>
    </div>
  );
}
