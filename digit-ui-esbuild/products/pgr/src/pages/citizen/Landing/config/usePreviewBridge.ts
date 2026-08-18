// Builder-preview bridge v2 (P4, CCSD-2009).
//
// Glue in the page ENTRY (index.tsx), never in LandingRenderer — the renderer
// stays Builder-unaware and always receives a plain ResolvedLandingConfig.
// Activates only when embedded (window.parent !== window) with
// ?builderPreview=1, and talks to the SAME ORIGIN only. Nothing persists
// through this path.
//
// Protocol ({type, ...}; "in" = from Builder, "out" = to Builder):
//   in:  pgrl-preview-config    { config, messages?, locale? }
//          messages: {locale: {i18nKey: text}} — the Builder's STAGED
//          localization edits, applied to the live i18n store so inline text
//          edits preview instantly; locale switches the display language.
//   in:  pgrl-preview-scroll    { code }
//   in:  pgrl-preview-highlight { code | null }    Figma-style outline + label
//   out: pgrl-preview-ready     {}
//   out: pgrl-preview-hover     { code | null }
//   out: pgrl-preview-select    { code, field? }   click; field set for known
//                                                  editable elements (titles)
//
// Navigation is BLOCKED in preview mode: link clicks become select messages
// instead of navigating the iframe away from the page.

import * as React from "react";
import { useTranslation } from "react-i18next";
import type { ResolvedLandingConfig } from "./types";

/** Find a section by its config `code`. Every section root carries
 *  data-pgrl-code, so this stays exact when two rows share a type. */
function sectionRoot(code: string): HTMLElement | null {
  const esc = (window as any).CSS?.escape ? (window as any).CSS.escape(code) : code.replace(/["\\]/g, "\\$&");
  return document.querySelector(`[data-pgrl-code="${esc}"]`) as HTMLElement | null;
}

/** Which section does a DOM node belong to? */
function codeForNode(node: HTMLElement): string | null {
  const sec = node.closest("[data-pgrl-code]") as HTMLElement | null;
  return sec?.getAttribute("data-pgrl-code") || null;
}

/** Editable field for a clicked element. Every section heading is rendered as
 *  `${sectionDomId}-title`; matching the heading tag keeps a section whose own
 *  id happens to end in "-title" from claiming every click inside it. */
function fieldForNode(node: HTMLElement): { code: string; field: string } | null {
  const el = node.closest("h1[id$='-title'], h2[id$='-title']") as HTMLElement | null;
  if (!el) return null;
  const code = codeForNode(el);
  return code ? { code, field: "titleKey" } : null;
}

export interface PreviewBridge {
  /** true when embedded with ?builderPreview=1 — the entry should render from
   *  `config` (or nothing while null) instead of fetching MDMS. */
  active: boolean;
  config: ResolvedLandingConfig | null;
}

function detectActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.parent === window) return false;
    return /[?&]builderPreview=1\b/.test(window.location.search || "");
  } catch {
    return false;
  }
}

export function usePreviewBridge(): PreviewBridge {
  const active = React.useMemo(detectActive, []);
  const [config, setConfig] = React.useState<ResolvedLandingConfig | null>(null);
  const { i18n } = useTranslation();
  const i18nRef = React.useRef(i18n);
  i18nRef.current = i18n;
  const highlightRef = React.useRef<{ el: HTMLElement; label: HTMLElement } | null>(null);

  React.useEffect(() => {
    if (!active) return;
    const origin = window.location.origin;
    const post = (payload: Record<string, unknown>) => {
      try {
        window.parent.postMessage(payload, origin);
      } catch {
        /* ignore */
      }
    };

    const clearHighlight = () => {
      const h = highlightRef.current;
      if (h) {
        h.el.style.outline = "";
        h.el.style.outlineOffset = "";
        h.label.remove();
        highlightRef.current = null;
      }
    };

    const applyHighlight = (code: string | null) => {
      clearHighlight();
      if (!code) return;
      const el = sectionRoot(code);
      if (!el) return;
      el.style.outline = "2px solid #059669";
      el.style.outlineOffset = "-2px";
      const label = document.createElement("div");
      label.textContent = code.toUpperCase();
      label.setAttribute("aria-hidden", "true");
      label.style.cssText =
        "position:absolute;z-index:70;background:#059669;color:#fff;font:600 10px/1.7 sans-serif;" +
        "padding:0 7px;border-radius:0 0 4px 0;pointer-events:none;letter-spacing:.08em;";
      const rect = el.getBoundingClientRect();
      label.style.top = `${rect.top + window.scrollY}px`;
      label.style.left = `${rect.left + window.scrollX}px`;
      document.body.appendChild(label);
      highlightRef.current = { el, label };
    };

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin) return;
      const msg = e.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "pgrl-preview-config" && msg.config && typeof msg.config === "object") {
        // Staged localization edits — live in the i18n store, never persisted
        // from here. Cover both namespace spellings used across the app.
        if (msg.messages && typeof msg.messages === "object") {
          Object.entries(msg.messages as Record<string, Record<string, string>>).forEach(
            ([lng, res]) => {
              try {
                i18nRef.current?.addResources?.(lng, "translations", res);
                i18nRef.current?.addResources?.(lng, "translation", res);
              } catch {
                /* ignore */
              }
            }
          );
        }
        if (typeof msg.locale === "string" && msg.locale && i18nRef.current?.language !== msg.locale) {
          try {
            i18nRef.current?.changeLanguage?.(msg.locale);
          } catch {
            /* ignore */
          }
        }
        setConfig({ ...(msg.config as ResolvedLandingConfig) });
      } else if (msg.type === "pgrl-preview-scroll" && typeof msg.code === "string") {
        const el = sectionRoot(msg.code);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        // Row not rendered (filtered out): fall back to the page extremes.
        else if (msg.code === "navigation") window.scrollTo({ top: 0, behavior: "smooth" });
        else if (msg.code === "footer")
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      } else if (msg.type === "pgrl-preview-highlight") {
        applyHighlight(typeof msg.code === "string" ? msg.code : null);
      }
    };

    // Hover -> tell the Builder which section the pointer is over.
    let lastHover: string | null = null;
    const onPointerOver = (e: Event) => {
      const t = e.target as HTMLElement | null;
      const code = t ? codeForNode(t) : null;
      if (code !== lastHover) {
        lastHover = code;
        post({ type: "pgrl-preview-hover", code });
      }
    };

    // Click -> select; block in-preview navigation.
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      const field = fieldForNode(t);
      if (field) {
        post({ type: "pgrl-preview-select", ...field });
        return;
      }
      const code = codeForNode(t);
      if (code) post({ type: "pgrl-preview-select", code });
    };

    window.addEventListener("message", onMessage);
    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("click", onClick, true);
    post({ type: "pgrl-preview-ready" });
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("click", onClick, true);
      clearHighlight();
    };
  }, [active]);

  return { active, config };
}
