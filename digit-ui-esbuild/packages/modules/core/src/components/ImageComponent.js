import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { DIGIT_FOOTER_FALLBACK } from "./digitFooterFallback";

const ImageComponent = ({
  src,
  alt = "Image not found",
  decorative = false,
  ariaLabel = "No Image description set",
  ariaLabelledby = "no-image-description",
  fallbackSrc,
  onError,
  ...props
}) => {
  // CCRS#881: a non-empty but unreachable src (a stale/dead asset URL — e.g. a
  // per-tenant MDMS StateInfo bannerUrl pointing at a decommissioned S3
  // object) produces the exact same broken-image glyph as a missing src once
  // the browser fails to load it. Track that failure and stop rendering the
  // <img> instead — same "never show the broken-icon" outcome as the
  // missing-src case below. Resets if the caller later passes a different
  // (hopefully working) src. Declared before any early return: hooks must
  // run on every render regardless of the src/failed checks that follow.
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);

  // Merged product+CCRS semantics (product-sync 2026-09-16): a caller-supplied
  // fallbackSrc (or the embedded DIGIT footer logo for the "Powered by DIGIT"
  // footers) is tried once when src is missing/broken; only when there is no
  // fallback — or the fallback itself fails — does the component render
  // nothing (product's CCRS#881 rule) instead of a broken-image icon.
  const effectiveFallback = fallbackSrc || (alt === "Powered by DIGIT" ? DIGIT_FOOTER_FALLBACK : undefined);

  if ((!src && !effectiveFallback) || failed) return null;

  // Determine the appropriate attributes based on the props
  const accessibilityProps = {};

  if (decorative) {
    // For decorative images
    accessibilityProps.alt = "";
  } else if (alt) {
    // Provide meaningful alt text if available
    accessibilityProps.alt = alt;
  } else if (ariaLabel) {
    // Use aria-label if alt is not provided
    accessibilityProps["aria-label"] = ariaLabel;
  } else if (ariaLabelledby) {
    // Use aria-labelledby for descriptive associations
    accessibilityProps["aria-labelledby"] = ariaLabelledby;
  } else {
    console.warn("AccessibleImage: Missing alt, aria-label, or aria-labelledby for non-decorative image.");
  }

  const handleError = (event) => {
    // Swap to the fallback once (loop-guarded); if the fallback also fails —
    // or there is none — fall through to product's render-nothing behaviour.
    if (effectiveFallback && event.currentTarget.src !== effectiveFallback) {
      event.currentTarget.onerror = null;
      event.currentTarget.src = effectiveFallback;
      return;
    }
    setFailed(true);
    onError?.(event);
  };

  return <img src={src || effectiveFallback} {...accessibilityProps} {...props} onError={handleError} />;
};

ImageComponent.propTypes = {
  src: PropTypes.string, // The source URL for the image
  alt: PropTypes.string, // Alternative text for the image
  decorative: PropTypes.bool, // If true, image is decorative
  ariaLabel: PropTypes.string, // Custom label for screen readers
  ariaLabelledby: PropTypes.string, // Association with another descriptive element
  fallbackSrc: PropTypes.string, // Shown if src is missing or fails to load
  onError: PropTypes.func, // Called when neither src nor fallback could load
};

export default ImageComponent;
