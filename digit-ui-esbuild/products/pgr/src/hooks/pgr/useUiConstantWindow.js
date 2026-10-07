import { useMemo } from "react";

// A time window in milliseconds read from MDMS RAINMAKER-PGR.UIConstants (the DEFAULT
// record): REOPENSLA for reopening a resolved/rejected complaint, WITHDRAWSLA for
// withdrawing a pending one. pgr-services reads the same master for its own check
// (validateReOpen / validateActionWindow), so the UI guard and the server cannot drift.
//
// Returns undefined while MDMS is loading and on tenants with no usable value. Callers
// treat undefined as "window unknown" and let the action through rather than block it:
// the server still enforces its own backstop, whereas hiding on a missing master would
// enforce a deadline nobody configured (the #925 bug, when a hardcoded 1-hour default
// silently won over REOPENSLA).
//
// NOTE on the arguments: the 5th argument puts useCustomMDMS on its mdms-v2 branch, which
// builds its own react-query config and resolves the tenant itself; `tenantId` is passed
// to keep the signature honest. The tenant is part of the query key via the request body,
// so there is no cross-tenant cache bleed.
const useUiConstantWindow = (tenantId, key) => {
  const { data } = Digit.Hooks.useCustomMDMS(
    tenantId,
    "RAINMAKER-PGR",
    [{ name: "UIConstants" }],
    {
      select: (d) => d?.["RAINMAKER-PGR"]?.UIConstants,
    },
    { schemaCode: "RAINMAKER-PGR.UIConstants" }
  );
  return useMemo(() => {
    const value = Array.isArray(data) ? data[0]?.[key] : undefined;
    // A non-positive window would hide the action forever; treat it as misconfigured and defer.
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
  }, [data, key]);
};

export default useUiConstantWindow;
