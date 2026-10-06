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
import type { LandingTokens } from "./tokens";
// Tenant branding belongs to the deployment entry, not the reusable page:
// esbuild's `file` loader emits the asset and returns its URL. An MDMS
// `navigation` section with a media.imageId still overrides this.
import bometLogo from "./assets/bomet-logo.jpg";
import bometFooterLogo from "./assets/bomet-footer-logo.jpg";
// The county highlands already shipped as the sign-in backdrop, re-cut to the
// hero's two sizes (see assets/CREDITS.md). No portrait or orb photography yet:
// those sections render their photo-less variants until the County supplies some.
import bometHero from "./assets/bomet-hero.jpg";
import bometHeroSm from "./assets/bomet-hero-sm.jpg";

// Bomet palette: the live theme's county blue (primary #1565A8, accent #1B85D2,
// text #1D2433). The shipped defaults are Nairobi green; the MDMS theme still
// overrides the roles applyTheme bridges at runtime, these cover the rest —
// text on the accent, the tints and the four service-area hues.
const BOMET_TOKENS: Partial<LandingTokens> = {
  primary: "207 78% 37%",       // #1565A8
  primaryHover: "208 80% 29%",  // #0F4F85
  secondary: "207 77% 46%",     // #1B85D2
  deep: "209 72% 18%",          // #0D324F  footer, closing band, hero scrim base
  accent: "207 77% 46%",        // #1B85D2  primary CTAs; white text reads 4.6:1
  accentHover: "207 80% 38%",   // #146AAE
  onPrimary: "0 0% 100%",
  onAccent: "0 0% 100%",
  ink: "222 27% 16%",           // #1D2433
  inkSoft: "218 12% 40%",       // #5A6372
  surface: "0 0% 100%",
  page: "210 25% 98%",          // #F7F9FB
  line: "212 18% 89%",          // #DDE3EA
  ring: "207 78% 37%",
  tint: "208 70% 94%",          // #E5F0FA  soft blue band / icon tiles
  tintGold: "208 70% 94%",      // no gold in the Bomet palette: same soft blue
  typeComplaint: "207 78% 37%", // Health Services — county blue
  typePetition: "192 62% 32%",  // Water & Sanitation — teal
  typeGrievance: "222 32% 32%", // Administration & Governance — slate
  typeReport: "207 77% 46%",
};

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
      emblemUrl={bometLogo}
      footerLogoUrl={bometFooterLogo}
      heroImageUrl={bometHero}
      heroImageSmallUrl={bometHeroSm}
      bandImageUrl={bometHero}
      tokens={BOMET_TOKENS}
    />
  );
}

export default PGRLandingEntry;
