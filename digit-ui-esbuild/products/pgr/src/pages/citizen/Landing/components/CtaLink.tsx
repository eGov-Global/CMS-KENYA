// Link styled as a call-to-action button.
//
// CTAs on the landing page are navigations, not actions, so they must be real
// anchors (middle-click, copy-link, SEO) — hence a styled LandingLink instead
// of the v2 <Button>. Variants follow the county identity: light-blue accent
// for the primary ask, brand blue for secondary emphasis, outline flavours for
// light and dark surfaces.

import * as React from "react";
import { cn } from "@egovernments/digit-ui-components-v2";
import { LandingLink, LandingLinkProps } from "./LandingLink";
import { FOCUS_RING, FOCUS_RING_DARK } from "../tokens";

type CtaVariant = "accent" | "primary" | "outline" | "inverse" | "subtle";
type CtaSize = "md" | "lg";

export interface CtaLinkProps extends LandingLinkProps {
  variant?: CtaVariant;
  size?: CtaSize;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

const BASE =
  // no-underline + m-0 defend against legacy global anchor styles (preflight is off)
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold no-underline " +
  "rounded-[var(--pgrl-radius)] motion-safe:transition-colors select-none m-0";

// Anchor colors are `!important` (Tailwind `!` modifier): the app's legacy
// overrides.css styles `a:not(.digit-button):not(.button)` at specificity
// 0-2-1, which beats scoped utilities (0-2-0) and would repaint every link in
// the tenant's tertiary-link color.
const VARIANTS: Record<CtaVariant, string> = {
  accent:
    "bg-[hsl(var(--pgrl-accent))] !text-[hsl(var(--pgrl-on-accent))] hover:bg-[hsl(var(--pgrl-accent-hover))] shadow-sm " +
    FOCUS_RING_DARK,
  primary:
    "bg-[hsl(var(--pgrl-primary))] !text-[hsl(var(--pgrl-on-primary))] hover:bg-[hsl(var(--pgrl-primary-hover))] shadow-sm " +
    FOCUS_RING,
  outline:
    "border border-solid border-[hsl(var(--pgrl-primary))] bg-transparent !text-[hsl(var(--pgrl-primary))] " +
    "hover:border-[hsl(var(--pgrl-primary-hover))] hover:!text-[hsl(var(--pgrl-primary-hover))] hover:bg-[hsl(var(--pgrl-primary)/0.08)] " +
    FOCUS_RING,
  inverse:
    // Sits on the flat primary bands (hero, final CTA). Hover is a white tint
    // now that there's no darker end of a gradient to lean on.
    "border border-solid border-[hsl(var(--pgrl-on-primary)/0.65)] bg-transparent !text-[hsl(var(--pgrl-on-primary))] " +
    "hover:bg-[hsl(var(--pgrl-on-primary)/0.15)] hover:border-[hsl(var(--pgrl-on-primary))] " +
    FOCUS_RING_DARK,
  subtle:
    // No hover underline (house style) — the color shift carries the affordance.
    "bg-transparent !text-[hsl(var(--pgrl-primary))] hover:!text-[hsl(var(--pgrl-primary-hover))] px-0 min-h-[24px] " + FOCUS_RING,
};

const SIZES: Record<CtaSize, string> = {
  md: "min-h-[44px] px-5 text-sm",
  lg: "min-h-[48px] px-6 text-base",
};

export const CtaLink = React.forwardRef<HTMLAnchorElement, CtaLinkProps>(
  ({ variant = "accent", size = "md", leading, trailing, className, children, ...rest }, ref) => (
    <LandingLink
      ref={ref}
      className={cn(BASE, VARIANTS[variant], variant !== "subtle" && SIZES[size], className)}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </LandingLink>
  )
);
CtaLink.displayName = "CtaLink";
