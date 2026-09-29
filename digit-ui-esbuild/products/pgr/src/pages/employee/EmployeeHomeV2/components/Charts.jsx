// Small dependency-free charts for the employee home.
//
// CSS only — a conic-gradient ring, flex-column bars, a bar sparkline. No
// charting library: the dashboard's recharts chunk is heavy for the links the
// field offices are on, and these four shapes are all this page needs.
// Every colour comes from the landing token chain so the tenant theme carries.

import React from "react";

/** Categorical palette, most-used first. Alpha on the last so "others" recedes. */
export const PALETTE = [
  "hsl(var(--pgrl-primary))",
  "hsl(var(--pgrl-accent))",
  "hsl(var(--pgrl-type-petition))",
  "hsl(var(--pgrl-secondary))",
  "hsl(var(--pgrl-type-report))",
  "hsl(var(--pgrl-ink-soft)/0.45)",
];

/** True after first paint — lets bar heights transition in from zero. */
const useArmed = () => {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => setArmed(true));
    return () => window.cancelAnimationFrame(id);
  }, []);
  return armed;
};

/**
 * Donut. `segments` = [{ label, n }] already sorted; colours are assigned by
 * position. Zero total renders a hairline ring with `emptyText`, never a blank.
 */
export const Donut = ({ segments = [], centerLabel, formatN = String, emptyText, unavailable = false }) => {
  const total = segments.reduce((s, x) => s + x.n, 0);
  let acc = 0;
  const stops = segments.map((s, i) => {
    const from = acc;
    acc += total ? (s.n / total) * 100 : 0;
    return `${PALETTE[i % PALETTE.length]} ${from}% ${acc}%`;
  });
  const ring = total ? `conic-gradient(${stops.join(",")})` : "hsl(var(--pgrl-line))";
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      {/* the ring is a CSS background (decorative); the centre text stays readable */}
      <div className="relative h-[150px] w-[150px] shrink-0 rounded-full" style={{ background: ring }}>
        <div className="absolute inset-[19px] flex flex-col items-center justify-center rounded-full bg-[hsl(var(--pgrl-surface))] text-center">
          <span className={`text-[26px] font-bold leading-none ${unavailable ? "text-[hsl(var(--pgrl-ink-soft)/0.5)]" : "text-[hsl(var(--pgrl-ink))]"}`}>{unavailable ? "—" : formatN(total)}</span>
          <span className="mt-1 text-[11px] text-[hsl(var(--pgrl-ink-soft))]">{centerLabel}</span>
        </div>
      </div>
      <ul className="m-0 w-full min-w-0 list-none p-0">
        {!total && <li className="py-2 text-xs text-[hsl(var(--pgrl-ink-soft))]">{emptyText}</li>}
        {segments.map((s, i) => (
          <li key={s.key ?? s.label} className="flex items-center gap-2 py-[5px] text-xs">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="min-w-0 flex-1 truncate text-[hsl(var(--pgrl-ink))]">{s.label}</span>
            <span className="font-semibold text-[hsl(var(--pgrl-ink))]">{formatN(s.n)}</span>
            <span className="w-9 text-right text-[hsl(var(--pgrl-ink-soft))]">{total ? Math.round((s.n / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Vertical bars. `data` = [{ label, n }]. Heights animate in on mount. */
export const Bars = ({ data = [], formatN = String, emptyText }) => {
  const armed = useArmed();
  const max = data.reduce((m, d) => (d.n > m ? d.n : m), 0);
  if (!data.length || !max) {
    return <p className="m-0 flex h-[150px] items-center justify-center text-xs text-[hsl(var(--pgrl-ink-soft))]">{emptyText}</p>;
  }
  return (
    <div className="flex h-[150px] items-end gap-3 pt-1.5">
      {data.map((d, i) => (
        <div key={d.key ?? d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[11px] font-bold text-[hsl(var(--pgrl-ink))]">{formatN(d.n)}</span>
          <div
            className="w-full rounded-t-[5px] transition-[height] duration-700 ease-out"
            style={{ height: armed ? `${Math.round((d.n / max) * 100) + 8}px` : "8px", background: PALETTE[i % PALETTE.length], transitionDelay: `${i * 60}ms` }}
          />
          <span className="w-full truncate text-center text-[9.5px] leading-tight text-[hsl(var(--pgrl-ink-soft))]" title={d.label}>{d.label}</span>
        </div>
      ))}
    </div>
  );
};

/** Bar sparkline for a short series; all bars share one brand gradient. */
export const Sparkline = ({ values = [] }) => {
  const armed = useArmed();
  const max = values.reduce((m, v) => (v > m ? v : m), 0) || 1;
  return (
    <div aria-hidden className="mt-2.5 flex h-[76px] items-end gap-[3px]">
      {values.map((v, i) => (
        <i
          key={i}
          className="flex-1 rounded-sm transition-[height] duration-700 ease-out"
          style={{
            height: armed ? `${Math.max(6, Math.round((v / max) * 100))}%` : "6%",
            background: "linear-gradient(180deg, hsl(var(--pgrl-primary)/0.75), hsl(var(--pgrl-tint)))",
            transitionDelay: `${i * 30}ms`,
          }}
        />
      ))}
    </div>
  );
};

/** Ranked rows with a proportional heat bar — "wards needing attention". */
export const HeatRows = ({ rows = [], formatN = String, emptyText, onClick }) => {
  const armed = useArmed();
  const max = rows.reduce((m, r) => (r.n > m ? r.n : m), 0) || 1;
  if (!rows.length) return <p className="m-0 py-2 text-xs text-[hsl(var(--pgrl-ink-soft))]">{emptyText}</p>;
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((r) => (
        <li key={r.key ?? r.label} className="flex items-center gap-2.5 py-2 text-xs">
          <span className="w-[38%] truncate text-[hsl(var(--pgrl-ink))]" title={r.label}>{r.label}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-[hsl(var(--pgrl-tint))]">
            <span
              className="block h-full rounded-full bg-[hsl(var(--pgrl-primary))] transition-[width] duration-700 ease-out"
              style={{ width: armed ? `${Math.round((r.n / max) * 100)}%` : "0%" }}
            />
          </span>
          <span className="w-7 text-right font-semibold text-[hsl(var(--pgrl-ink))]">{formatN(r.n)}</span>
        </li>
      ))}
    </ul>
  );
};
