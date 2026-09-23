// Toast copy for the browser Geolocation API's failure modes.
//
// Extracted from GeoLocations.js so it is unit-testable: that component pulls in
// leaflet, maplibre and JSX, none of which a string-resolution test needs.
//
// t() returns the KEY VERBATIM when no message is seeded, so calling it bare
// puts a raw constant like "CS_GEOLOCATION_ERROR" on screen. None of the
// CS_GEOLOCATION_* messages are seeded on Bomet, so a citizen who denied
// location permission saw exactly that (#54). Every lookup here therefore goes
// through a fallback.

// i18n fallback — same shape as the tr() helpers in SelectRating /
// ComplaintDetails, which is the established convention in this layer.
export const trFallback = (t, key, fallback) => {
  const v = typeof t === "function" ? t(key) : key;
  return v === key ? fallback : v;
};

// GeolocationPositionError.code -> message key.
// 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT.
export const KEY_BY_CODE = {
  1: "CS_GEOLOCATION_PERMISSION_DENIED",
  2: "CS_GEOLOCATION_UNAVAILABLE",
  3: "CS_GEOLOCATION_TIMEOUT",
};

// English copy. Every message names the way out — picking the point on the map
// by hand is always available — so a denied permission is never a dead end.
export const GEOLOCATION_FALLBACKS = {
  CS_GEOLOCATION_PERMISSION_DENIED:
    "Location permission was denied. Allow location access in your browser, or pick the location on the map.",
  CS_GEOLOCATION_UNAVAILABLE: "Your location could not be determined. Please pick the location on the map.",
  CS_GEOLOCATION_TIMEOUT: "Finding your location took too long. Please try again, or pick the location on the map.",
  CS_GEOLOCATION_ERROR: "Your location could not be determined. Please pick the location on the map.",
  CS_GEOLOCATION_NOT_SUPPORTED:
    "This device does not support location detection. Please pick the location on the map.",
};

// Resolve the toast label for a GeolocationPositionError. An unknown/absent
// code falls back to the generic message rather than rendering nothing.
export const geolocationErrorLabel = (t, code) => {
  const key = KEY_BY_CODE[code] || "CS_GEOLOCATION_ERROR";
  return trFallback(t, key, GEOLOCATION_FALLBACKS[key]);
};

export default geolocationErrorLabel;
