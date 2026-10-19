import { useCallback, useEffect, useMemo, useState } from "react";
import { actionWindowState } from "../../utils/actionWindow";

// A fetched UIConstants record is reused for one minute, then the next page view or tab focus
// asks the server again: a configurator edit reaches open browsers within about a minute, the
// same TTL pgr-services caches the record for. Deliberately not useCustomMDMS: its MDMS v2
// branch keeps masters in IndexedDB for a day, and the request layer's in-memory cache
// (useCache) would serve the first answer for the whole session.
const UI_CONSTANTS_TTL_MS = 60 * 1000;
// The longest delay setTimeout can hold; a deadline further out is re-checked on the next visit.
const MAX_TIMER_MS = 2147483647;

const mdmsSearchUrl = () => `/${window?.globalConfigs?.getConfig?.("MDMS_V2_CONTEXT_PATH") || "mdms-v2"}/v1/_search`;

const useUiConstantsRecord = (tenantId, enabled) =>
  Digit.Hooks.useCustomAPIHook({
    url: mdmsSearchUrl(),
    body: { MdmsCriteria: { tenantId, moduleDetails: [{ moduleName: "RAINMAKER-PGR", masterDetails: [{ name: "UIConstants" }] }] } },
    changeQueryName: `pgr-ui-constants-${tenantId}`,
    config: {
      enabled: !!tenantId && enabled,
      select: (d) => d?.MdmsRes?.["RAINMAKER-PGR"]?.UIConstants?.[0] || null,
      staleTime: UI_CONSTANTS_TTL_MS,
      cacheTime: UI_CONSTANTS_TTL_MS,
      refetchOnWindowFocus: true,
    },
    options: { useCache: false },
  });

/**
 * Whether `action` is still allowed for a complaint, against the tenant's UIConstants fetched
 * fresh from MDMS (complaint tenant first, then the state tenant, as pgr-services reads them)
 * and the complaint's own timestamps. Re-evaluates when the window closes and when the tab
 * becomes visible, so a page left open hides the action on time.
 *
 * Returns { open, known, deadline, ready, isOpenNow }: show the action only when ready && open;
 * isOpenNow() repeats the check against the clock at click time.
 */
const useActionWindow = ({ action, tenantId, auditDetails }) => {
  const stateId = Digit.ULBService.getStateId?.();
  const needState = !!stateId && stateId !== tenantId;
  const city = useUiConstantsRecord(tenantId, true);
  const state = useUiConstantsRecord(stateId, needState);
  const layers = useMemo(() => [city.data, needState ? state.data : null].filter(Boolean), [city.data, state.data, needState]);
  const ready = !(!!tenantId && city.isLoading) && !(needState && state.isLoading);

  const createdTime = auditDetails?.createdTime;
  const lastModifiedTime = auditDetails?.lastModifiedTime;
  const evaluate = useCallback(
    (now) => actionWindowState({ layers, action, auditDetails: { createdTime, lastModifiedTime }, now }),
    [layers, action, createdTime, lastModifiedTime]
  );
  const [now, setNow] = useState(() => Date.now());
  const result = useMemo(() => evaluate(now), [evaluate, now]);

  useEffect(() => {
    if (!result.open || !result.deadline) return undefined;
    const delay = result.deadline - Date.now() + 250;
    if (delay > MAX_TIMER_MS) return undefined;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, delay));
    return () => clearTimeout(timer);
  }, [result.open, result.deadline]);
  useEffect(() => {
    // Background tabs throttle timers; catch up as soon as the page is visible again.
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const isOpenNow = useCallback(() => evaluate(Date.now()).open, [evaluate]);
  return { ...result, ready, isOpenNow };
};

export default useActionWindow;
