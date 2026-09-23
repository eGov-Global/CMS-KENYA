// Count-up for the hero figures ("2", "9", "72 h", "17"): the leading number
// animates from 0 to its value the first time the element is on screen; any
// suffix ("h") is kept verbatim. Non-numeric values pass through untouched.
// Honours prefers-reduced-motion (final value at once) and never leaves the
// figure at 0 if the observer is silent (same fallback idea as useReveal).

import * as React from "react";

const DURATION_MS = 1100;
const FALLBACK_MS = 2500;

export function useCountUp<T extends HTMLElement>(value: string) {
  const ref = React.useRef<T | null>(null);
  const match = /^(\d+)(.*)$/.exec(value.trim());
  const target = match ? Number(match[1]) : NaN;
  const suffix = match ? match[2] : "";
  const [n, setN] = React.useState(0);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (Number.isNaN(target)) return;
    const el = ref.current;
    if (!el) return;
    const reduced =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const run = () => {
      if (started.current) return;
      started.current = true;
      if (reduced) {
        setN(target);
        return;
      }
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / DURATION_MS);
        const eased = 1 - Math.pow(1 - k, 3);
        setN(Math.round(target * eased));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (typeof IntersectionObserver === "undefined") {
      run();
      return;
    }
    const timer = window.setTimeout(run, FALLBACK_MS);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          window.clearTimeout(timer);
          io.disconnect();
          run();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      window.clearTimeout(timer);
      io.disconnect();
    };
  }, [target]);

  const text = Number.isNaN(target) ? value : `${n}${suffix}`;
  return { ref, text };
}
