// Scroll-reveal for landing sections: marks an element `data-pgrl-in` once it
// scrolls into view. The transition itself lives in src/index.css under
// `.pgrl-reveal`, guarded by `prefers-reduced-motion`, so this hook never
// animates anything on its own — it only records visibility.
//
// Content must never stay hidden behind the effect, so three fallbacks:
//   * no IntersectionObserver (old WebViews, server rendering) => shown at once;
//   * already inside the viewport on mount => shown at once, no observer wait;
//   * observer silent for FALLBACK_MS (throttled/occluded tab, a busy main
//     thread on a low-end phone) => shown anyway. A late reveal without the
//     slide-in is a far smaller failure than an empty section.

import * as React from "react";

const FALLBACK_MS = 2500;

export function useReveal<T extends HTMLElement>(threshold = 0.1) {
  const ref = React.useRef<T | null>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = () => el.setAttribute("data-pgrl-in", "");

    if (typeof IntersectionObserver === "undefined") {
      show();
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      show();
      return;
    }

    const timer = window.setTimeout(() => {
      show();
      io.disconnect();
    }, FALLBACK_MS + Math.max(0, rect.top - window.innerHeight) / 2); // further down => a little more patience
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            show();
            window.clearTimeout(timer);
            io.disconnect();
          }
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => {
      window.clearTimeout(timer);
      io.disconnect();
    };
  }, [threshold]);
  return ref;
}
