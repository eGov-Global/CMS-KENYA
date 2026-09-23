// Shared presentational pieces for the employee home.
//
// Icons are inline SVG rather than a dependency: lucide-react is already in
// the bundle for the citizen landing, but these render inside a Tailwind
// layer that only covers this folder, and hand-rolled paths keep the surface
// free of an import that would pull the whole icon set into the employee
// chunk.
//
// Every colour resolves from the landing token chain (`--pgrl-*`), which the
// tenant ThemeConfig already drives via applyTheme's PGRL_BRIDGE. The one
// exception is STATUS hue (overdue red / resolved green): those communicate
// urgency, not brand, and must not retint per tenant.

import React from "react";
import { FOCUS_RING } from "../../../citizen/Landing/tokens";

/* ── icons ─────────────────────────────────────────────────────────────── */
const S = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

export const Icons = {
  doc: (
    <svg viewBox="0 0 24 24" {...S}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></svg>
  ),
  check: <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 5-5.5" /></svg>,
  clock: <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>,
  alert: <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2v.3" /></svg>,
  up: <svg viewBox="0 0 24 24" {...S}><path d="M12 19V6" /><path d="M6.5 11.5L12 6l5.5 5.5" /></svg>,
  redo: <svg viewBox="0 0 24 24" {...S}><path d="M20 11a8 8 0 1 0-2.3 6" /><path d="M20 5v6h-6" /></svg>,
  search: <svg viewBox="0 0 24 24" {...S}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>,
  plus: <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><path d="M12 8.5v7M8.5 12h7" /></svg>,
  user: <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="9" r="3.4" /><path d="M5.5 19a6.5 6.5 0 0 1 13 0" /></svg>,
  chart: <svg viewBox="0 0 24 24" {...S}><path d="M5 19V11M12 19V5M19 19v-5" /></svg>,
  shield: <svg viewBox="0 0 24 24" {...S}><path d="M12 3l7 3v5.5c0 4.3-3 7.7-7 9-4-1.3-7-4.7-7-9V6z" /><path d="M9.2 12.2l2 2 3.6-3.8" /></svg>,
  bolt: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3L5 13.5h5.5L11 21l8-10.5h-5.5z" /></svg>,
  refresh: <svg viewBox="0 0 24 24" {...S}><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></svg>,
  logout: <svg viewBox="0 0 24 24" {...S}><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="M14 8l4 4-4 4M18 12H9" /></svg>,
  globe: <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>,
  home: <svg viewBox="0 0 24 24" {...S}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>,
};

/* ── hue map ───────────────────────────────────────────────────────────── */
// brand hues route through the landing tokens so a tenant retint carries;
// status hues are fixed because they encode urgency.
export const HUE = {
  brand:   { bg: "bg-[hsl(var(--pgrl-primary)/0.1)]",  fg: "text-[hsl(var(--pgrl-primary))]",  tint: "from-[hsl(var(--pgrl-primary)/0.07)]" },
  accent:  { bg: "bg-[hsl(var(--pgrl-accent)/0.18)]",  fg: "text-[hsl(var(--pgrl-deep))]",     tint: "from-[hsl(var(--pgrl-accent)/0.12)]" },
  leaf:    { bg: "bg-[hsl(var(--pgrl-type-petition)/0.12)]", fg: "text-[hsl(var(--pgrl-type-petition))]", tint: "from-[hsl(var(--pgrl-type-petition)/0.08)]" },
  plum:    { bg: "bg-[hsl(var(--pgrl-secondary)/0.12)]", fg: "text-[hsl(var(--pgrl-secondary))]", tint: "from-[hsl(var(--pgrl-secondary)/0.08)]" },
  // on the dark sidebar/top bar: the brand tint is invisible there
  dark:    { bg: "bg-[hsl(var(--pgrl-on-primary)/0.1)]", fg: "text-[hsl(var(--pgrl-on-primary)/0.85)]", tint: "from-transparent" },
  danger:  { bg: "bg-rose-50",  fg: "text-rose-600",  tint: "from-rose-50" },
  warning: { bg: "bg-amber-50", fg: "text-amber-600", tint: "from-amber-50" },
};

/** Rounded icon medallion — the device that carries the whole visual system. */
export const Medallion = ({ icon, hue = "brand", size = "md" }) => {
  const h = HUE[hue] || HUE.brand;
  const dim = size === "xs" ? "h-8 w-8 rounded-[9px]" : size === "sm" ? "h-10 w-10 rounded-xl" : "h-12 w-12 rounded-2xl";
  const ic = size === "xs" ? "h-4 w-4" : size === "sm" ? "h-[19px] w-[19px]" : "h-[22px] w-[22px]";
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center ${dim} ${h.bg} ${h.fg}`}>
      <span className={ic}>{Icons[icon] || Icons.doc}</span>
    </span>
  );
};

/**
 * KPI card. `value` is a STRING by contract, never a number.
 *
 * Three distinct render states — null means UNAVAILABLE, "0" means genuinely
 * none. useHomeData resolves an unreadable count to null for exactly this
 * reason; a 403 or an outage must never read as "nothing to do".
 *   loading      -> skeleton
 *   value == null-> "—" (unavailable)
 *   otherwise    -> the value, including a genuine "0"
 */
export const KpiCard = ({ icon, hue = "brand", label, value, caption, delta, loading }) => {
  const h = HUE[hue] || HUE.brand;
  return (
    <div className={`rounded-2xl border border-solid border-[hsl(var(--pgrl-line))] bg-gradient-to-b ${h.tint} to-white p-4 shadow-sm md:p-5`}>
      <div className="flex items-center gap-3">
        <Medallion icon={icon} hue={hue} />
        <span className="text-sm font-medium text-[hsl(var(--pgrl-ink-soft))]">{label}</span>
      </div>
      {loading ? (
        <div className="mt-3 h-9 w-24 animate-pulse rounded-lg bg-[hsl(var(--pgrl-line))]" />
      ) : (
        <div className={`mt-3 text-4xl font-bold leading-none tracking-tight ${value == null ? "text-[hsl(var(--pgrl-ink-soft)/0.5)]" : "text-[hsl(var(--pgrl-ink))]"}`}>
          {value == null ? "—" : value}
        </div>
      )}
      {(caption || delta) && !loading && (
        <div className="mt-2 text-xs text-[hsl(var(--pgrl-ink-soft))]">
          {delta && <span className={`font-semibold ${delta.dir === "down" ? "text-rose-600" : "text-emerald-600"}`}>{delta.dir === "down" ? "▼" : "▲"} {delta.text} </span>}
          {caption}
        </div>
      )}
    </div>
  );
};

/** Quick-action tile. `secondary` renders the lighter second row. */
export const ActionTile = ({ icon, hue = "brand", title, sub, to, secondary, onNavigate }) => (
  <button
    type="button"
    onClick={() => onNavigate?.(to)}
    className={`pgrl-lift relative m-0 flex w-full cursor-pointer flex-col gap-3 rounded-2xl border border-solid border-[hsl(var(--pgrl-line))] p-4 text-left ${secondary ? "bg-[hsl(var(--pgrl-page))]" : "bg-[hsl(var(--pgrl-surface))]"} ${FOCUS_RING}`}
  >
    <span aria-hidden className="absolute right-3.5 top-4 text-[hsl(var(--pgrl-ink-soft)/0.6)]">›</span>
    <Medallion icon={icon} hue={hue} />
    <span>
      <span className="block text-sm font-semibold text-[hsl(var(--pgrl-ink))]">{title}</span>
      {sub && <span className="mt-0.5 block text-xs leading-relaxed text-[hsl(var(--pgrl-ink-soft))]">{sub}</span>}
    </span>
  </button>
);

/** Section heading with the bolt medallion. */
export const SectionHead = ({ title, sub, action }) => (
  <div className="mb-4 flex items-start justify-between gap-4">
    <div className="flex items-center gap-2.5">
      <span aria-hidden className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--pgrl-accent)/0.18)] text-[hsl(var(--pgrl-deep))]">
        <span className="h-[15px] w-[15px]">{Icons.bolt}</span>
      </span>
      <div>
        <h3 className="m-0 text-[15px] font-bold text-[hsl(var(--pgrl-ink))]">{title}</h3>
        {sub && <p className="mb-0 mt-0.5 text-xs text-[hsl(var(--pgrl-ink-soft))]">{sub}</p>}
      </div>
    </div>
    {action}
  </div>
);

export const Panel = ({ children, className = "", style }) => (
  <section style={style} className={`mb-4 min-w-0 rounded-2xl border border-solid border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-surface))] p-5 shadow-sm ${className}`}>
    {children}
  </section>
);
