// Reads the landing layout (which sections, in what order) from MDMS.
//
// Uncached on purpose, like the page's text, so both halves of an operator's
// save appear together on the next load.
//
// With nothing to read — loading, error, empty, or the page switched off — it
// falls back to the built-in layout in defaults.ts. Once config exists, that
// config decides the page, even if it filters down to nothing.
//
// The fetch is anonymous: this is a pre-login page.

import * as React from "react";
import { DEFAULT_LANDING_CONFIG } from "./defaults";
import { mergeSectionsByCode, orderSections } from "./resolve";
import type {
  LandingPageConfig,
  LandingSectionConfig,
  ResolvedLandingConfig,
} from "./types";

// `Digit` is the app-global runtime (same access pattern as the rest of
// products/pgr). The landing only ever mounts inside the DIGIT shell, so it is
// always present; typed loose to avoid coupling to the libraries' d.ts.
declare const Digit: any;

interface LandingFetch {
  sections: LandingSectionConfig[];
  page?: LandingPageConfig;
}

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

const MODULE = "RAINMAKER-PGR";
const MASTERS = [{ name: "LandingSection" }, { name: "LandingPageConfig" }];
// Same path the platform's own MDMS service builds (globalConfigs -> mdms-v2).
const MDMS_PATH = (() => {
  const get = safe(() => (window as any).globalConfigs.getConfig.bind((window as any).globalConfigs));
  const ctx = safe(() => get?.("MDMS_V1_CONTEXT_PATH")) || safe(() => get?.("MDMS_CONTEXT_PATH")) || "egov-mdms-service";
  return `/${String(ctx).replace(/^\/+|\/+$/g, "")}/v1/_search`;
})();

const criteria = (tenantId: string) => ({
  MdmsCriteria: { tenantId, moduleDetails: [{ moduleName: MODULE, masterDetails: MASTERS }] },
});

const selectLanding = (raw: any): LandingFetch => {
  const mod = raw?.MdmsRes?.[MODULE] || raw?.[MODULE];
  return {
    sections: (mod?.LandingSection as LandingSectionConfig[]) || [],
    page: (mod?.LandingPageConfig as LandingPageConfig[])?.[0],
  };
};

export interface UseLandingConfigResult extends ResolvedLandingConfig {
  isLoading: boolean;
  /** true when the resolved config came from MDMS (vs the built-in fallback). */
  fromConfig: boolean;
}

export function useLandingConfig(): UseLandingConfigResult {
  const stateId: string | undefined = safe(() => Digit.ULBService.getStateId());
  const currentTenant: string | undefined =
    safe(() => Digit.ULBService.getCurrentTenantId()) || stateId;

  const userRoles: string[] =
    safe(() => (Digit.UserService.getUser()?.info?.roles || []).map((r: any) => r.code)) || [];

  const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPERUSER");
  const preview =
    isAdmin && typeof window !== "undefined" && /[?&]preview=1\b/.test(window.location.search || "");

  // No caching at any layer, so an operator's save is visible on reload.
  const fetchOpts = { useCache: false, userService: false } as const;
  const queryOpts = { select: selectLanding, cacheTime: 0, staleTime: 0, retry: 1 } as const;

  // State-tenant rows (where the config lives).
  const { data: stateData, isLoading } = Digit.Hooks.useCustomAPIHook({
    url: MDMS_PATH,
    params: { tenantId: stateId },
    body: criteria(stateId as string),
    changeQueryName: `pgr-landing-config-${stateId}`,
    options: fetchOpts,
    config: { ...queryOpts, enabled: !!stateId },
  });

  // City overlay — only when a distinct city tenant is in context.
  const cityEnabled = !!currentTenant && currentTenant !== stateId;
  const { data: cityData } = Digit.Hooks.useCustomAPIHook({
    url: MDMS_PATH,
    params: { tenantId: currentTenant },
    body: criteria(currentTenant as string),
    changeQueryName: `pgr-landing-config-${currentTenant}`,
    options: fetchOpts,
    config: { ...queryOpts, enabled: cityEnabled },
  });

  return React.useMemo<UseLandingConfigResult>(() => {
    const state: LandingFetch = stateData || { sections: [], page: undefined };
    const city: LandingFetch = cityData || { sections: [], page: undefined };

    const page: LandingPageConfig | undefined = city.page || state.page;
    const rawSections = mergeSectionsByCode(state.sections, city.sections);

    // Fall back to the built-in layout only when there is NO config to honour:
    // MDMS empty (also the loading state) or the page explicitly disabled.
    const pageDisabled = page && page.enabled === false;
    if (pageDisabled || !rawSections || rawSections.length === 0) {
      return { ...DEFAULT_LANDING_CONFIG, isLoading: !!isLoading, fromConfig: false };
    }

    // Config exists, so it decides the page. If everything is draft, disabled
    // or role-gated, nothing renders — never show what was not published.
    const ordered = orderSections(rawSections, page?.sectionOrder, userRoles, { preview });
    return {
      page: page || DEFAULT_LANDING_CONFIG.page,
      sections: ordered,
      isLoading: !!isLoading,
      fromConfig: true,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateData, cityData, isLoading, preview, userRoles.join(",")]);
}
