// Loads the PGR text bundle so Builder text edits show on the live page.
//
// Nothing else on the public landing route loads them, so without this the
// page always shows the built-in copy from content.ts.

import * as React from "react";

declare const Digit: any;

const LOC_MODULE = "rainmaker-pgr";

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

/**
 * Returns a counter that changes once the messages arrive, so the caller
 * re-renders with the fresh text. On failure the built-in copy still shows.
 */
export function useLandingMessages(i18n: any): number {
  const [version, setVersion] = React.useState(0);
  const locale: string = String(i18n?.language || "");
  const stateId: string | undefined = safe(() => Digit.ULBService.getStateId());

  React.useEffect(() => {
    if (!locale || !stateId) return undefined;
    let cancelled = false;
    // Always re-fetches, so a Builder save shows up on the next page load.
    Promise.resolve(
      safe(() =>
        Digit?.LocalizationService?.getUpdatedMessages?.({
          modules: [LOC_MODULE],
          locale,
          tenantId: stateId,
        })
      )
    )
      .then(() => {
        if (!cancelled) setVersion((v) => v + 1);
      })
      .catch(() => {
        /* public page — keep the built-in copy */
      });
    return () => {
      cancelled = true;
    };
  }, [locale, stateId]);

  return version;
}
