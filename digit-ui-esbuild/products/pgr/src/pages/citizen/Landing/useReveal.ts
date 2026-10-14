// Scroll-reveal for landing sections. The section shell (Section.tsx) owns one
// observer, and every `pgrl-reveal-item` inside it is marked `data-pgrl-in` as
// the item itself scrolls into view — not when the section does. On a phone a
// section runs well over one screen, so a section-wide trigger played the
// lower cards' entrance off-screen. The transition itself lives in
// src/index.css under `.pgrl-reveal`, guarded by `prefers-reduced-motion`, so
// this hook never animates anything on its own — it only records visibility.
//
// Items that arrive together get --pgrl-d, their stagger rank within that
// batch (relative to their authored --pgrl-i), so a row still cascades but an
// item arriving alone never waits behind the ones above it.
//
// Content must never stay hidden behind the effect, so the section itself is
// marked — which shows every item at once — when:
//   * there is no IntersectionObserver (old WebViews, server rendering);
//   * the observer stays silent for FALLBACK_MS (throttled/occluded tab, a
//     busy main thread on a low-end phone). It always reports once right
//     after observe(), so any report proves it is alive and cancels the timer.
//     An unconditional timer revealed every section off-screen a few seconds
//     after load, and the reader then scrolled through a page that never moved.

import * as React from "react";

const FALLBACK_MS = 2500;
const SHOWN = "data-pgrl-in";
const PENDING_ITEMS = `.pgrl-reveal-item:not([${SHOWN}])`;

/** Authored stagger index (set inline by revealIndex); 0 when absent. */
const authoredIndex = (el: HTMLElement): number => Number(el.style.getPropertyValue("--pgrl-i")) || 0;

export function useReveal<T extends HTMLElement>(threshold = 0.1) {
  const ref = React.useRef<T | null>(null);
  const observerRef = React.useRef<IntersectionObserver | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const showAll = () => el.setAttribute(SHOWN, "");

    if (typeof IntersectionObserver === "undefined") {
      showAll();
      return;
    }

    const timer = window.setTimeout(() => {
      showAll();
      io.disconnect();
    }, FALLBACK_MS);
    const io = new IntersectionObserver(
      (entries) => {
        window.clearTimeout(timer);
        const arriving = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
        if (!arriving.length) return;
        const first = Math.min(...arriving.map(authoredIndex));
        for (const item of arriving) {
          item.style.setProperty("--pgrl-d", String(authoredIndex(item) - first));
          item.setAttribute(SHOWN, "");
          io.unobserve(item);
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );
    observerRef.current = io;
    el.querySelectorAll<HTMLElement>(PENDING_ITEMS).forEach((item) => io.observe(item));
    return () => {
      window.clearTimeout(timer);
      io.disconnect();
      observerRef.current = null;
    };
  }, [threshold]);

  // An MDMS or Builder config can swap a section's items after mount; pick up
  // any that are new since the last render (observe() on a watched item is a
  // no-op). Once the fallback has shown the whole section there is nothing to do.
  React.useEffect(() => {
    const el = ref.current;
    const io = observerRef.current;
    if (!el || !io || el.hasAttribute(SHOWN)) return;
    el.querySelectorAll<HTMLElement>(PENDING_ITEMS).forEach((item) => io.observe(item));
  });

  return ref;
}
