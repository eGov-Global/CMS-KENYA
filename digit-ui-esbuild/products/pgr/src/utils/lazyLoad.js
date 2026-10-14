// Route-level code splitting helpers.
//
// The bundle is built as ES modules with esbuild splitting, so a dynamic
// import() here really is a separate chunk fetched on first use. Two things
// a plain React.lazy() leaves to chance:
//  - a redeploy renames hashed chunks; a tab that loaded the old shell then
//    fails to import the new ones. lazyWithRetry reloads the page ONCE per
//    chunk in that case (keys recorded in sessionStorage) instead of showing
//    a dead screen — and only for a failed FETCH of the chunk, never for an
//    error thrown while the module runs, which a reload would not fix;
//  - every lazy component needs a Suspense boundary; withSuspense gives each
//    one the platform page loader so the registry contract (plain components
//    looked up by key) does not change for callers.
import React, { Suspense } from "react";
import { Loader } from "@egovernments/digit-ui-react-components";

const RETRY_KEY = "pgr-chunk-reloaded";

// Chrome / Firefox / Safari wording for a chunk that could not be fetched.
const isChunkLoadError = (err) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk/i.test(
    String(err?.message || err || "")
  );

const reloadedKeys = () => {
  try {
    const raw = sessionStorage.getItem(RETRY_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return null; // storage unavailable: caller treats every key as already retried
  }
};
const rememberReload = (keys) => {
  try { sessionStorage.setItem(RETRY_KEY, JSON.stringify([...keys])); } catch (e) { /* storage unavailable */ }
};

export const lazyWithRetry = (importer, key) =>
  React.lazy(() =>
    importer().then(
      (mod) => {
        // This chunk loaded: forget ITS reload only, so a redeploy later still gets one retry.
        const keys = reloadedKeys();
        if (keys && keys.delete(key)) rememberReload(keys);
        return mod;
      },
      (err) => {
        const keys = reloadedKeys();
        if (!isChunkLoadError(err) || !keys || keys.has(key)) throw err;
        keys.add(key);
        rememberReload(keys);
        window.location.reload();
        return new Promise(() => {}); // never settles; the reload takes over
      }
    )
  );

export const withSuspense = (LazyComponent, fallback = <Loader />) => {
  const Wrapped = (props) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
  Wrapped.displayName = `withSuspense(${LazyComponent.displayName || LazyComponent.name || "Lazy"})`;
  return Wrapped;
};

/** Convenience: lazy default export + Suspense in one call. */
export const lazyPage = (importer, key) => withSuspense(lazyWithRetry(importer, key));
