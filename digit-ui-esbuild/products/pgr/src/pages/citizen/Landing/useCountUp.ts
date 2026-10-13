// Count-up for the hero figures ("2", "9", "72 h", "17"): the leading number
// animates from 0 to its value the first time the element is on screen; any
// suffix ("h") is kept verbatim. Non-numeric values pass through untouched.
// Honours prefers-reduced-motion (final value at once) and never leaves the
// figure at 0 if the observer is silent (same fallback idea as useReveal).
// Any report from the observer — it always sends one right after observe() —
// cancels that fallback: on a phone the cards sit below the fold, and an
// unconditional timer ran the count before anyone could see it.

import * as React from "react";

const DURATION_MS = 1100;
const FALLBACK_MS = 2500;

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useCountUp<T extends HTMLElement>(value: string) {
  const ref = React.useRef<T | null>(null);
  const match = /^(\d+)(.*)$/.exec(value.trim());
  const target = match ? Number(match[1]) : NaN;
  const suffix = match ? match[2] : "";
  // Reduced motion starts on the real figure: waiting for the observer showed
  // "0 pilot sub-counties" on every card below the fold.
  const [n, setN] = React.useState(() => (prefersReducedMotion() ? target : 0));
  const started = React.useRef(false);
  const frame = React.useRef(0);

  React.useEffect(() => {
    if (Number.isNaN(target)) return;
    // The figure changed after its count ran (localized copy landing late):
    // show the new value rather than leaving the old one on screen.
    if (started.current) {
      setN(target);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const reduced = prefersReducedMotion();

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
        if (k < 1) frame.current = requestAnimationFrame(step);
      };
      frame.current = requestAnimationFrame(step);
    };

    if (typeof IntersectionObserver === "undefined") {
      run();
      return;
    }
    const timer = window.setTimeout(run, FALLBACK_MS);
    const io = new IntersectionObserver(
      (entries) => {
        window.clearTimeout(timer);
        if (entries.some((e) => e.isIntersecting)) {
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
      // Unmount or a new value mid-count: stop the loop writing the old figure.
      cancelAnimationFrame(frame.current);
    };
  }, [target]);

  const text = Number.isNaN(target) ? value : `${n}${suffix}`;
  return { ref, text };
}
