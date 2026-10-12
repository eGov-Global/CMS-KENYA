// Deployment entry for <PGRLandingPage /> inside the DIGIT shell.
//
// The app's react-router has NO basename — every route path carries
// `/${window.contextPath}` explicitly (see core App.js). The landing page's
// route defaults are basename-relative, so this wrapper prefixes the known
// in-app destinations with the runtime contextPath before mounting.
//
// Registered as "PGRLandingPage" in products/pgr/src/Module.js and mounted
// shell-free at `/${contextPath}/landing` by core's DigitApp switch.

import * as React from "react";
import PGRLandingPage from "./index";
import type { LandingArtwork } from "./index";
import { languageOptions } from "./topOfPage";
import type { LandingRoutes } from "./routes";
// Tenant branding belongs to the deployment entry, not the reusable page:
// esbuild's `file` loader emits the asset and returns its URL. An MDMS
// `navigation` section with a media.imageId still overrides this.
import nairobiCrest from "./assets/nairobi-crest.png";
import nairobiFooterLogo from "./assets/nairobi-footer-logo.png";
// Top of the page — artwork from the county's Bonga Nai design of 2026-10-12
// (see assets/CREDITS.md).
import bongaHeroSkyline from "./assets/bonga-hero-skyline.jpg";
import bongaHeroSkylineSm from "./assets/bonga-hero-skyline-sm.jpg";
import bongaHeroPattern from "./assets/bonga-hero-pattern.jpg";
import bongaCatMobility from "./assets/bonga-cat-mobility.jpg";
import bongaCatHealth from "./assets/bonga-cat-health.jpg";
import bongaCatEnvironment from "./assets/bonga-cat-environment.jpg";
import bongaCatMarkets from "./assets/bonga-cat-markets.jpg";
import bongaBandLeft from "./assets/bonga-band-left.png";
import bongaBandRight from "./assets/bonga-band-right.png";
import bongaBandSkyline from "./assets/bonga-band-skyline.png";
// Photography (see assets/CREDITS.md): the County's customer-service centre for
// the phone photo card of the areas section; Wikimedia Commons photos for the
// closing band and portrait.
import nairobiHeroSm from "./assets/nairobi-hero-sm.jpg";
import nairobiBand from "./assets/nairobi-band.jpg";
// Resident portrait in the closing band (Commons, CC BY-SA 4.0 — see
// CREDITS.md). Swap for a county-supplied photo when one is available.
import nairobiPerson from "./assets/nairobi-person.jpg";
// Square cuts for the circular photo orbs. Reusing the wide hero/band photos
// meant a 1.9 image in a 1.0 box — object-fit:cover threw away ~47% of it.
import nairobiOrbSteps from "./assets/nairobi-orb-steps.jpg";
import nairobiOrbChannels from "./assets/nairobi-orb-channels.jpg";

// Category photos keyed by MANIFESTATION_TYPES id.
const ARTWORK: LandingArtwork = {
  heroPattern: bongaHeroPattern,
  categories: {
    mobility_works: bongaCatMobility,
    health_wellness_and_nutrition: bongaCatHealth,
    green_nairobi: bongaCatEnvironment,
    finance_and_economic_planning_affairs: bongaCatMarkets,
  },
  bandLeft: bongaBandLeft,
  bandRight: bongaBandRight,
  bandSkyline: bongaBandSkyline,
};

/** The tenant's languages (StateInfo, loaded by the shell before any route
 *  renders) as language-menu options; undefined keeps the page default. */
function tenantLanguages() {
  const D = typeof window !== "undefined" ? (window as any).Digit : undefined;
  const options = languageOptions(D?.SessionStorage?.get?.("initData")?.languages);
  return options.length ? options : undefined;
}

export function PGRLandingEntry() {
  const ctx = (typeof window !== "undefined" && (window as any)?.contextPath) || "digit-ui";

  const routes: Partial<LandingRoutes> = React.useMemo(
    () => ({
      HOME: `/${ctx}/landing`,
      REGISTER_COMPLAINT: `/${ctx}/citizen/pgr/create-complaint`,
      TRACK_COMPLAINT: `/${ctx}/citizen/pgr/complaints`,
      CITIZEN_LOGIN: `/${ctx}/citizen/login`,
      EMPLOYEE_LOGIN: `/${ctx}/employee`,
      PRIVACY: `/${ctx}/privacy-policy`,
    }),
    [ctx]
  );
  const languages = React.useMemo(tenantLanguages, []);

  return (
    <PGRLandingPage
      routes={routes}
      languages={languages}
      emblemUrl={nairobiCrest}
      footerLogoUrl={nairobiFooterLogo}
      heroImageUrl={bongaHeroSkyline}
      heroImageSmallUrl={bongaHeroSkylineSm}
      artwork={ARTWORK}
      areasPhotoUrl={nairobiHeroSm}
      bandImageUrl={nairobiBand}
      personImageUrl={nairobiPerson}
      stepsOrbImageUrl={nairobiOrbSteps}
      channelsOrbImageUrl={nairobiOrbChannels}
    />
  );
}

export default PGRLandingEntry;
