// "Let's Make NAIROBI Work" — the deep green band that closes the top of the
// page (county design, 2026-10-12): the county motto between two gold dashes,
// triangle mosaics at either end and the skyline line art on the right (lg+,
// where it clears the motto). The artwork is the deployment's; without it the
// band is the motto on plain green. The images load lazily: the band sits
// below the fold, and phones never fetch the skyline art they do not show.

import * as React from "react";
import { useLandingCopy } from "../useLandingCopy";
import { splitEmphasis } from "../topOfPage";
import type { LandingArtwork } from "../config/sectionRegistry";
import type { LandingSectionConfig } from "../config/types";

export interface TaglineBandProps {
  artwork?: LandingArtwork;
  /** Config-driven overrides (titleKey replaces the motto). */
  section?: LandingSectionConfig;
}

export function TaglineBand({ artwork, section }: TaglineBandProps) {
  const { c } = useLandingCopy();
  const motto = c(section?.titleKey, "MOTTO_VALUES");
  if (!motto) return null;
  // The county's name within the motto is set in bold capitals; the word is
  // copy (MOTTO_EMPHASIS), so each tenant and language names its own.
  const parts = splitEmphasis(motto, c("MOTTO_EMPHASIS"));

  return (
    <div
      data-pgrl-code={section?.code}
      className="pgrl-top-font relative isolate flex min-h-[68px] items-center justify-center overflow-hidden bg-[hsl(var(--pgrl-top-band))] px-12 py-4 lg:min-h-[clamp(68px,4.4vw,84px)]"
    >
      {artwork?.bandLeft && (
        <img
          src={artwork.bandLeft}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-y-0 left-0 -z-10 h-full w-[clamp(36px,15vw,260px)] object-cover object-left"
        />
      )}
      {artwork?.bandSkyline && (
        <img
          src={artwork.bandSkyline}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute bottom-0 right-[clamp(28px,6.6vw,112px)] -z-10 hidden h-full w-auto max-w-[33vw] object-contain object-right-bottom lg:block"
        />
      )}
      {artwork?.bandRight && (
        <img
          src={artwork.bandRight}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-y-0 right-0 -z-10 h-full w-[clamp(28px,6.6vw,112px)] object-cover object-right"
        />
      )}

      <p className="m-0 flex items-center gap-2.5 text-center text-base text-white sm:gap-3.5 sm:text-xl lg:text-[clamp(20px,1.6vw,28px)]">
        <span aria-hidden className="h-[3px] w-[17px] shrink-0 rounded-full bg-[hsl(var(--pgrl-top-gold))] sm:w-[30px]" />
        <span>
          {parts ? (
            <>
              {parts[0]}
              <strong className="font-black uppercase">{parts[1]}</strong>
              {parts[2]}
            </>
          ) : (
            motto
          )}
        </span>
        <span aria-hidden className="h-[3px] w-[17px] shrink-0 rounded-full bg-[hsl(var(--pgrl-top-gold))] sm:w-[30px]" />
      </p>
    </div>
  );
}
