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
//   out: pgrl-preview-ready     { defaults }     the page's built-in layout
//                                                  (defaults.ts), so a tenant with
//                                                  no saved rows can start the
//                                                  Builder from what is live
//   out: pgrl-preview-hover     { code | null }
//   out: pgrl-preview-select    { code, field? }   click; field set for known
//                                                  editable elements (titles)
//   out: pgrl-preview-pick-media { code, slot }   a section's picture was
//                                                  clicked ("main" or a named
//                                                  slot): open its Media library
//   out: pgrl-preview-pick-icon { code, item, iconId } an item's icon was
//                                                  changed with the on-page picker
//   out: pgrl-preview-edit      { code, key, text } text typed in place on the
//                                                  page (click a text, type,
//                                                  Enter / click away commits)
//
// Navigation is BLOCKED in preview mode: link clicks become select messages
// instead of navigating the iframe away from the page.

import * as React from "react";
import { useTranslation } from "react-i18next";
import type { ResolvedLandingConfig } from "./types";
import { DEFAULT_LANDING_CONFIG } from "./defaults";
import { LANDING_COPY } from "../content";
import { LANDING_KEY_PREFIX } from "../useLandingCopy";
import * as ReactDOM from "react-dom";
import { sectionTakesImage, defaultItemsByType } from "./sectionRegistry";
import { ICON_REGISTRY } from "./iconRegistry";

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
  // section code -> type, from the last config the Builder pushed.
  const typesRef = React.useRef<Record<string, string>>({});

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
                for (const ns of ["translations", "translation"]) {
                  // A landing key the Builder no longer sends (edit undone) must
                  // fall back to the built-in text again. i18next cannot drop a
                  // key, so set it to its own name — what the copy resolver
                  // treats as "unresolved".
                  const bundle = (i18nRef.current?.getResourceBundle?.(lng, ns) || {}) as Record<string, unknown>;
                  Object.keys(bundle).forEach((k) => {
                    if (k.startsWith(LANDING_KEY_PREFIX) && !(k in res)) i18nRef.current?.addResource?.(lng, ns, k, k);
                  });
                  i18nRef.current?.addResources?.(lng, ns, res);
                }
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
        const cfg = msg.config as ResolvedLandingConfig;
        const types: Record<string, string> = {};
        (cfg.sections || []).forEach((s) => { if (s?.code && s?.type) types[s.code] = s.type; });
        typesRef.current = types;
        setConfig({ ...cfg });
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
    // ---- Click-to-edit text ------------------------------------------------
    // Every visible string is a PGR_LANDING_* message (store or built-in deck),
    // so the text itself identifies its key: an element whose own text equals
    // a known value becomes editable in place; Enter / click away commits the
    // new text to the Builder, Escape restores it. Plain text only.
    const EDIT_OUTLINE = "2px solid #059669";
    const HOVER_OUTLINE = "1px dashed rgba(5,150,105,.75)";
    const textToKey = (): Map<string, string> => {
      const map = new Map<string, string>();
      const lang = String(i18nRef.current?.language || "en");
      const short = lang.split(/[-_]/)[0];
      Object.entries(LANDING_COPY as Record<string, Record<string, string | undefined>>).forEach(([k, v]) => {
        const text = v?.[short] ?? v?.en;
        if (text) map.set(text.trim(), LANDING_KEY_PREFIX + k);
      });
      for (const ns of ["translations", "translation"]) {
        const bundle = (i18nRef.current?.getResourceBundle?.(lang, ns) || {}) as Record<string, unknown>;
        Object.entries(bundle).forEach(([k, text]) => {
          if (k.startsWith(LANDING_KEY_PREFIX) && typeof text === "string" && text.trim()) map.set(text.trim(), k);
        });
      }
      return map;
    };
    const editableFor = (node: HTMLElement | null, x?: number, y?: number): { el: HTMLElement; key: string } | null => {
      const map = textToKey();
      // A stretched card link reports its title as text over the whole card, so
      // the pointer must be inside the candidate's own box.
      const contains = (el: HTMLElement) => { if (x === undefined || y === undefined) return true; const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
      const text = (el: Element) => ((el as HTMLElement).innerText || el.textContent || "").trim();
      let el: HTMLElement | null = node;
      for (let i = 0; el && i < 4 && !el.hasAttribute("data-pgrl-code"); i++, el = el.parentElement) {
        const t = text(el);
        const key = map.get(t);
        if (!key) continue;
        // The innermost element that holds exactly this text (not a wrapper).
        let inner: HTMLElement = el;
        for (;;) {
          const child = [...inner.children].find((c) => text(c) === t) as HTMLElement | undefined;
          if (!child) break;
          inner = child;
        }
        return contains(inner) ? { el: inner, key } : null;
      }
      return null;
    };
    type Editing = { el: HTMLElement; key: string; code: string | null; original: string; onKey: (e: KeyboardEvent) => void; onBlur: () => void };
    let editing: Editing | null = null;
    const endEdit = (commit: boolean) => {
      if (!editing) return;
      const { el, key, code, original, onKey, onBlur } = editing;
      editing = null;
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("blur", onBlur);
      el.removeAttribute("contenteditable");
      el.removeAttribute("data-pgrl-editing");
      el.style.outline = "";
      el.style.outlineOffset = "";
      const text = (el.innerText || "").trim();
      if (!commit || !text || text === original) {
        el.textContent = original;
        return;
      }
      post({ type: "pgrl-preview-edit", code, key, text });
    };
    const startEdit = (el: HTMLElement, key: string) => {
      const original = (el.innerText || "").trim();
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); endEdit(true); }
        else if (e.key === "Escape") { e.preventDefault(); endEdit(false); }
        e.stopPropagation();
      };
      const onBlur = () => endEdit(true);
      editing = { el, key, code: codeForNode(el), original, onKey, onBlur };
      el.setAttribute("contenteditable", "plaintext-only");
      if (!el.isContentEditable) el.setAttribute("contenteditable", "true");
      el.setAttribute("data-pgrl-editing", key);
      el.style.outline = EDIT_OUTLINE;
      el.style.outlineOffset = "2px";
      el.addEventListener("keydown", onKey);
      el.addEventListener("blur", onBlur);
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    };
    // ---- Click-to-replace pictures / icons -----------------------------------
    // A picture (<img> or an element with a background image) inside a section
    // whose type reads `media` opens that section's Media library in the Builder.
    // Pictures are often full-bleed behind a text panel (the hero), so the
    // pointer target is rarely the <img> itself: hit-test the section's
    // pictures by position instead.
    // The picture under the pointer: the smallest one, so a tagged detail
    // (pattern strip, card photo) wins over the full-bleed picture behind it.
    // A tag names the slot; untagged pictures are the section's main one.
    const pictureFor = (node: HTMLElement | null, x: number, y: number): { el: HTMLElement; code: string; slot: string } | null => {
      const root = node?.closest("[data-pgrl-code]") as HTMLElement | null;
      const code = root?.getAttribute("data-pgrl-code") || null;
      if (!root || !code || !sectionTakesImage(typesRef.current[code])) return null;
      const area = (el: Element) => { const r = el.getBoundingClientRect(); return r.width * r.height; };
      const under = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 24 && r.height > 24 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
      // Decorative pictures are aria-hidden; a tagged one is still a slot.
      const pics = [...root.querySelectorAll("img")].filter((img) => (img.hasAttribute("data-pgrl-image") || img.getAttribute("aria-hidden") !== "true") && under(img)).sort((a, b) => area(a) - area(b));
      const el = (pics[0] as HTMLElement | undefined)
        ?? ([...root.querySelectorAll<HTMLElement>("*")].find((e) => e.tagName !== "A" && getComputedStyle(e).backgroundImage.includes("url(") && under(e)));
      return el ? { el, code, slot: el.getAttribute("data-pgrl-image") || "main" } : null;
    };

    // ---- On-page icon picker ------------------------------------------------
    // Item icons carry data-pgrl-item (see buildRichItems); a click opens a
    // small picker of the approved icons next to it.
    let pickerHost: HTMLDivElement | null = null;
    const closePicker = () => { if (pickerHost) { ReactDOM.unmountComponentAtNode(pickerHost); pickerHost.remove(); pickerHost = null; } };
    const openPicker = (anchor: SVGElement, code: string, item: string) => {
      closePicker();
      const r = anchor.getBoundingClientRect();
      pickerHost = document.createElement("div");
      document.body.appendChild(pickerHost);
      const choices = Object.keys(ICON_REGISTRY);
      const left = Math.max(8, Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - 268));
      const top = r.bottom + window.scrollY + 6;
      const picker = React.createElement(
        "div",
        { role: "listbox", "aria-label": "Icon", style: { position: "absolute", left, top, zIndex: 80, width: 256, padding: 8, background: "#fff", border: "2px solid #059669", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.18)", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 } },
        ...choices.map((id) =>
          React.createElement(
            "button",
            { key: id, type: "button", title: id, "aria-label": id, onClick: (e: Event) => { e.stopPropagation(); post({ type: "pgrl-preview-pick-icon", code, item, iconId: id }); closePicker(); },
              style: { display: "flex", alignItems: "center", justifyContent: "center", height: 36, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer" } },
            React.createElement(ICON_REGISTRY[id] as any, { width: 18, height: 18 })
          )
        )
      );
      ReactDOM.render(picker, pickerHost);
    };
    const iconFor = (node: HTMLElement | null): string | null => {
      const svg = node?.closest("svg");
      return svg ? codeForNode(svg as unknown as HTMLElement) : null;
    };
    // The tagged icon under the pointer, by position: a card's stretched link
    // sits on top of its icon, so the event target is rarely the <svg>.
    const iconAt = (node: HTMLElement | null, x: number, y: number): SVGElement | null => {
      const direct = node?.closest("svg[data-pgrl-item]") as SVGElement | null;
      if (direct) return direct;
      const root = node?.closest("[data-pgrl-code]") as HTMLElement | null;
      if (!root) return null;
      return ([...root.querySelectorAll("svg[data-pgrl-item]")] as SVGElement[]).find((svg) => { const r = svg.getBoundingClientRect(); return r.width > 8 && x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 4 && y <= r.bottom + 4; }) ?? null;
    };

    let hoverEl: HTMLElement | null = null;
    const clearHover = () => {
      if (hoverEl && hoverEl !== editing?.el) {
        hoverEl.style.outline = "";
        hoverEl.style.cursor = "";
        hoverEl.removeAttribute("title");
      }
      hoverEl = null;
    };
    const onPointerOverEdit = (e: Event) => {
      const t = e.target as HTMLElement | null;
      const pe = e as PointerEvent;
      if (iconAt(t, pe.clientX, pe.clientY)) { clearHover(); return; }
      const text = editableFor(t, pe.clientX, pe.clientY);
      const pic = text ? null : pictureFor(t, pe.clientX, pe.clientY);
      const el = text?.el ?? pic?.el ?? null;
      if (el === hoverEl) return;
      clearHover();
      if (!el || el === editing?.el) return;
      hoverEl = el;
      hoverEl.style.outline = HOVER_OUTLINE;
      hoverEl.style.cursor = text ? "text" : "pointer";
      hoverEl.setAttribute("title", text ? "Click to edit this text" : "Click to replace this picture");
    };
    let iconHover: SVGElement | null = null;
    const onPointerOverIcon = (e: Event) => {
      const pe = e as PointerEvent;
      const svg = iconAt(e.target as HTMLElement | null, pe.clientX, pe.clientY);
      if (iconHover && iconHover !== svg) { iconHover.style.outline = ""; iconHover.removeAttribute("title"); iconHover = null; }
      if (svg && svg !== iconHover) { iconHover = svg; svg.setAttribute("title", "Click to change this icon"); svg.style.outline = HOVER_OUTLINE; svg.style.outlineOffset = "2px"; svg.style.cursor = "pointer"; }
    };

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      // A choice inside the icon picker: let the click reach the picker's own
      // handler (React listens on the picker host, below this capture listener).
      if (pickerHost && pickerHost.contains(t)) return;
      e.preventDefault();
      if (editing && editing.el.contains(t)) return; // the caret moving inside the text being edited
      e.stopPropagation();
      endEdit(true);
      closePicker();
      // An icon is the smallest, most specific target: it wins over the text
      // beside it and the picture behind it.
      const svg = iconAt(t, e.clientX, e.clientY);
      const iconCode = svg ? codeForNode(svg as unknown as HTMLElement) : null;
      if (svg && iconCode) {
        clearHover();
        openPicker(svg, iconCode, svg.getAttribute("data-pgrl-item") as string);
        post({ type: "pgrl-preview-select", code: iconCode, field: "items" });
        return;
      }
      const hit = editableFor(t, e.clientX, e.clientY);
      if (hit) {
        clearHover();
        startEdit(hit.el, hit.key);
        const code = codeForNode(hit.el);
        if (code) post({ type: "pgrl-preview-select", code });
        return;
      }
      const pic = pictureFor(t, e.clientX, e.clientY);
      if (pic) {
        post({ type: "pgrl-preview-pick-media", code: pic.code, slot: pic.slot });
        return;
      }
      if (iconFor(t)) {
        post({ type: "pgrl-preview-select", code: iconFor(t) as string, field: "items" });
        return;
      }
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
    document.addEventListener("pointerover", onPointerOverEdit, true);
    document.addEventListener("pointerout", clearHover, true);
    document.addEventListener("pointerover", onPointerOverIcon, true);
    post({ type: "pgrl-preview-ready", defaults: { ...DEFAULT_LANDING_CONFIG, items: defaultItemsByType() } });
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onPointerOverEdit, true);
      document.removeEventListener("pointerout", clearHover, true);
      document.removeEventListener("pointerover", onPointerOverIcon, true);
      closePicker();
      endEdit(false);
      clearHover();
      clearHighlight();
    };
  }, [active]);

  return { active, config };
}
