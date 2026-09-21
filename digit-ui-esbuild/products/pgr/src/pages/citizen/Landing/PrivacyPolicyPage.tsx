// Standalone, shell-free in-app Privacy Policy page. Mounted by core App.js at
// /${contextPath}/privacy-policy and linked from the landing's PRIVACY route +
// footer. Text resolves via useLandingCopy (built-in deck in content.ts,
// overridable by PGR_LANDING_* localisation keys).
import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { buildTokenStyle, CONTAINER, NO_HOVER_UNDERLINE } from "./tokens";
import { useLandingCopy } from "./useLandingCopy";
import { useLandingMessages } from "./config/useLandingMessages";
import { LandingLink } from "./components/LandingLink";

const BODY_KEYS = [
  "PRIVACY_PAGE_P1",
  "PRIVACY_PAGE_P2",
  "PRIVACY_PAGE_P3",
  "PRIVACY_PAGE_P4",
  "PRIVACY_PAGE_P5",
];

export function PGRPrivacyPolicyPage() {
  const { c, i18n } = useLandingCopy();
  const ctx = (typeof window !== "undefined" && (window as any)?.contextPath) || "digit-ui";

  // Never changes the app locale: changeLanguage persists to localStorage and
  // would leak into every later screen. Loads the rainmaker-pgr bundle so
  // Builder overrides apply to this notice.
  useLandingMessages(i18n);

  return (
    // Two levels, like LandingRenderer: the v2 preset scopes every utility as
    // `.v2-scope <selector>`, so NO_HOVER_UNDERLINE has to sit on a DESCENDANT
    // of .v2-scope — on the same element the descendant combinator never
    // matches and the rule silently does nothing.
    <div className="v2-scope" style={buildTokenStyle()}>
      <div className={`pgr-landing min-h-screen bg-[hsl(var(--pgrl-page))] ${NO_HOVER_UNDERLINE}`}>
        <header className="bg-[hsl(var(--pgrl-primary))] text-[hsl(var(--pgrl-on-primary))]">
          <div className={`${CONTAINER} flex min-h-[56px] items-center justify-between gap-3 py-2`}>
            <span className="font-semibold uppercase tracking-wide">{c("PORTAL_NAME")}</span>
            <LandingLink
              to={`/${ctx}/landing`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold no-underline !text-[hsl(var(--pgrl-on-primary))]"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" /> {c("NAV_HOME")}
            </LandingLink>
          </div>
        </header>
        <main className={`${CONTAINER} py-10`}>
          <h1 className="mb-6 text-2xl font-bold text-[hsl(var(--pgrl-ink))]">{c("PRIVACY_PAGE_TITLE")}</h1>
          <div className="flex max-w-3xl flex-col gap-4">
            {BODY_KEYS.map((k) => (
              <p key={k} className="m-0 text-base leading-relaxed text-[hsl(var(--pgrl-ink-soft))]">
                {c(k)}
              </p>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default PGRPrivacyPolicyPage;
