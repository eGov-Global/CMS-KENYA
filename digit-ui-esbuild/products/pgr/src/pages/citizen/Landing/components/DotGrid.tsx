// Decorative dot grid for the dark bands (hero, footer).
//
// Inline SVG rather than an image asset: no network request, no file to ship,
// and it stays crisp at any DPI. `fill="currentColor"` means the caller's text
// color tints the dots, so the grid follows whatever the band is painted with.
//
// The host element needs `relative isolate` (the grid positions against it, and
// isolate keeps the negative z-index inside that stacking context — a -z-10
// child paints above its own ancestor's background but below in-flow content).

import * as React from "react";

export interface DotGridProps {
  /** Pattern id — must be unique per instance. Duplicate ids in one document
   *  would make every `url(#…)` reference resolve to the first pattern. */
  id: string;
  /** Position, size and text color utilities for this instance. */
  className?: string;
}

export function DotGrid({ id, className }: DotGridProps) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 200 200" fill="currentColor">
      <defs>
        <pattern id={id} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="2" />
        </pattern>
      </defs>
      <rect width="200" height="200" fill={`url(#${id})`} />
    </svg>
  );
}

/** Shared placement: 420px square bled off the top-right corner, white at 8%. */
export const DOT_GRID_CORNER =
  "absolute -right-10 -top-10 -z-10 h-[420px] w-[420px] text-[hsl(var(--pgrl-on-primary)/0.08)]";
