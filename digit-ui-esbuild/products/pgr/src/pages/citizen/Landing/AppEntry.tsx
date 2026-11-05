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
import type { LandingRoutes } from "./routes";
// Tenant branding belongs to the deployment entry, not the reusable page:
// esbuild's `file` loader emits the asset and returns its URL. An MDMS
// `navigation` section with a media.imageId still overrides this.
import nairobiEmblem from "./assets/nairobi-emblem.png";
import nairobiFooterLogo from "./assets/nairobi-footer-logo.png";
// Photography (see assets/CREDITS.md): the County's customer-service centre for
// the hero; Wikimedia Commons photos for the closing band and portrait.
import nairobiHero from "./assets/nairobi-hero.jpg";
import nairobiHeroSm from "./assets/nairobi-hero-sm.jpg";
import nairobiBand from "./assets/nairobi-band.jpg";
// Resident portrait in the closing band (Commons, CC BY-SA 4.0 — see
// CREDITS.md). Swap for a county-supplied photo when one is available.
import nairobiPerson from "./assets/nairobi-person.jpg";
// Square cuts for the circular photo orbs. Reusing the wide hero/band photos
// meant a 1.9 image in a 1.0 box — object-fit:cover threw away ~47% of it.
import nairobiOrbSteps from "./assets/nairobi-orb-steps.jpg";
import nairobiOrbChannels from "./assets/nairobi-orb-channels.jpg";

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

  return (
    <PGRLandingPage
      routes={routes}
      emblemUrl={nairobiEmblem}
      footerLogoUrl={nairobiFooterLogo}
      heroImageUrl={nairobiHero}
      heroImageSmallUrl={nairobiHeroSm}
      bandImageUrl={nairobiBand}
      personImageUrl={nairobiPerson}
      stepsOrbImageUrl={nairobiOrbSteps}
      channelsOrbImageUrl={nairobiOrbChannels}
    />
  );
}

export default PGRLandingEntry;
