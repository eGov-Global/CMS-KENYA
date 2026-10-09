// Composite panels for the employee home: activity feed, tabbed complaints
// table, rail lists, performance card, top bar. Presentation only — every
// label arrives already localised, every number already formatted, and every
// row carries its own click handler, so nothing here knows about routes or
// data contracts.

import React from "react";
import { Medallion, Panel } from "./Primitives";
import { PopUp, CardText, Button } from "@egovernments/digit-ui-components";
import { Sparkline } from "./Charts";
import { FOCUS_RING, FOCUS_RING_DARK } from "../../../citizen/Landing/tokens";

/** Section heading without the bolt — used on data panels. */
export const PanelHead = ({ title, sub, action }) => (
  <div className="mb-3.5 flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h3 className="m-0 text-[15px] font-bold text-[hsl(var(--pgrl-ink))]">{title}</h3>
      {sub && <p className="mb-0 mt-0.5 text-xs text-[hsl(var(--pgrl-ink-soft))]">{sub}</p>}
    </div>
    {action}
  </div>
);

/** "View all →" style text button. */
export const LinkButton = ({ children, onClick }) => (
  <button type="button" onClick={onClick} className={`m-0 shrink-0 cursor-pointer whitespace-nowrap rounded border-0 bg-transparent p-0 text-xs font-semibold text-[hsl(var(--pgrl-primary))] hover:underline ${FOCUS_RING}`}>
    {children} →
  </button>
);

/* Status pill tones encode urgency, not brand — fixed colours on purpose. */
const TONE = {
  open: "bg-[hsl(var(--pgrl-primary)/0.1)] text-[hsl(var(--pgrl-primary))]",
  overdue: "bg-rose-50 text-rose-700",
  resolved: "bg-emerald-50 text-emerald-700",
  closed: "bg-[hsl(var(--pgrl-line)/0.6)] text-[hsl(var(--pgrl-ink-soft))]",
};
export const StatusPill = ({ tone = "open", label }) => (
  <span title={label} className={`inline-block max-w-[110px] truncate rounded-full px-2 py-0.5 align-middle text-[10.5px] font-semibold ${TONE[tone] || TONE.open}`}>{label}</span>
);

/** Activity feed. rows = [{ key, icon, hue, title, sub, when, onClick }]. */
export const Feed = ({ rows = [], emptyText }) => {
  if (!rows.length) return <p className="m-0 py-2 text-xs text-[hsl(var(--pgrl-ink-soft))]">{emptyText}</p>;
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((r) => (
        <li key={r.key} className="border-0 border-b border-solid border-[hsl(var(--pgrl-line)/0.7)] last:border-b-0">
          <button type="button" onClick={r.onClick} className={`m-0 flex w-full min-w-0 cursor-pointer items-start gap-3 rounded-lg border-0 bg-transparent px-0 py-2.5 text-left ${FOCUS_RING}`}>
            <Medallion icon={r.icon} hue={r.hue} size="xs" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold text-[hsl(var(--pgrl-ink))]">{r.title}</span>
              <span className="mt-0.5 block truncate text-[11px] text-[hsl(var(--pgrl-ink-soft))]">{r.sub}</span>
            </span>
            <span className="ml-auto shrink-0 whitespace-nowrap text-[10.5px] text-[hsl(var(--pgrl-ink-soft))]">{r.when}</span>
          </button>
        </li>
      ))}
    </ul>
  );
};

/**
 * Tabbed table. tabs = [{ key, label, n }], rows = [{ key, cells: [..],
 * pill: { tone, label }, onView }]. The table itself is real <table> markup
 * so screen readers get headers; on narrow screens it scrolls horizontally.
 */
export const TabbedTable = ({ tabs = [], active, onTab, columns = [], rows = [], viewLabel, actionsLabel, emptyText, formatN = String }) => (
  <div>
    <div role="tablist" className="mb-2.5 flex flex-wrap gap-x-4 gap-y-1 border-0 border-b border-solid border-[hsl(var(--pgrl-line))]">
      {tabs.map((tb) => (
        <button
          key={tb.key}
          role="tab"
          type="button"
          aria-selected={tb.key === active}
          onClick={() => onTab(tb.key)}
          className={`m-0 cursor-pointer border-0 border-b-2 border-solid bg-transparent px-0 pb-2 text-xs ${FOCUS_RING} ${
            tb.key === active ? "border-[hsl(var(--pgrl-primary))] font-bold text-[hsl(var(--pgrl-primary))]" : "border-transparent text-[hsl(var(--pgrl-ink-soft))]"
          }`}
        >
          {tb.label}{tb.n != null && <span className="ml-1 opacity-80">({formatN(tb.n)})</span>}
        </button>
      ))}
    </div>
    <div className="overflow-x-auto">
      {/* table-fixed + explicit widths: the vendored legacy CSS gives td a 16px
          font and 12-16px padding, which made the auto layout overflow the
          panel; utilities on each cell win because of the .v2-scope prefix. */}
      {/* min-w keeps the fixed columns legible on phones: the wrapper scrolls instead of crushing them */}
      <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
        <colgroup>
          {columns.map((c, i) => <col key={c} className={i === 0 ? "w-[30%]" : ""} />)}
          <col className="w-[190px]" />
        </colgroup>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col" className="truncate border-0 border-b border-solid border-[hsl(var(--pgrl-line))] px-0 py-2 pr-3 text-[10.5px] font-semibold uppercase tracking-wide text-[hsl(var(--pgrl-ink-soft))]">{c}</th>
            ))}
            <th scope="col" className="border-0 border-b border-solid border-[hsl(var(--pgrl-line))] px-0 py-2">
              <span className="sr-only">{actionsLabel}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr><td colSpan={columns.length + 1} className="py-5 text-center text-[hsl(var(--pgrl-ink-soft))]">{emptyText}</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.key} className="border-0 border-b border-solid border-[hsl(var(--pgrl-line)/0.6)] last:border-b-0">
              {r.cells.map((c, i) => (
                <td key={i} className={`truncate px-0 py-2.5 pr-3 align-middle text-xs ${i === 0 ? "font-semibold text-[hsl(var(--pgrl-primary))]" : "text-[hsl(var(--pgrl-ink))]"}`} title={typeof c === "string" ? c : undefined}>
                  {c}
                </td>
              ))}
              <td className="px-0 py-2.5 align-middle text-xs">
                <div className="flex items-center justify-end gap-2">
                  {r.pill && <StatusPill tone={r.pill.tone} label={r.pill.label} />}
                  <button type="button" onClick={r.onView} aria-label={`${viewLabel} ${r.cells[0]}`} className={`m-0 cursor-pointer rounded-md border border-solid border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-surface))] px-2.5 py-[3px] text-[10.5px] font-semibold text-[hsl(var(--pgrl-primary))] hover:bg-[hsl(var(--pgrl-tint))] ${FOCUS_RING}`}>
                    {viewLabel}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/** Quick links rail. rows = [{ key, icon, hue, label, onClick }]. */
export const QuickLinks = ({ rows = [] }) => (
  <ul className="m-0 list-none p-0">
    {rows.map((r) => (
      <li key={r.key} className="border-0 border-b border-solid border-[hsl(var(--pgrl-line)/0.7)] last:border-b-0">
        <button type="button" onClick={r.onClick} className={`m-0 flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-0 bg-transparent px-0 py-2 text-left text-[12.5px] text-[hsl(var(--pgrl-ink))] ${FOCUS_RING}`}>
          <Medallion icon={r.icon} hue={r.hue} size="xs" />
          <span className="min-w-0 flex-1 truncate">{r.label}</span>
          <span aria-hidden className="text-[hsl(var(--pgrl-ink-soft)/0.6)]">›</span>
        </button>
      </li>
    ))}
  </ul>
);

/** Due-soonest rail. rows = [{ key, id, place, chip, urgent, onClick }]. */
export const DueList = ({ rows = [], emptyText }) => {
  if (!rows.length) return <p className="m-0 py-2 text-xs text-[hsl(var(--pgrl-ink-soft))]">{emptyText}</p>;
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((r) => (
        <li key={r.key} className="border-0 border-b border-solid border-[hsl(var(--pgrl-line)/0.7)] last:border-b-0">
          <button type="button" onClick={r.onClick} className={`m-0 flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-0 bg-transparent px-0 py-2 text-left text-xs ${FOCUS_RING}`}>
            <span title={r.chip} className={`max-w-[46%] shrink-0 truncate rounded-md px-2 py-0.5 text-[10.5px] font-bold ${r.urgent ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{r.chip}</span>
            <span className="min-w-0 flex-1 truncate font-semibold text-[hsl(var(--pgrl-ink))]">{r.id}</span>
            <span className="max-w-[40%] truncate text-[hsl(var(--pgrl-ink-soft))]">{r.place}</span>
          </button>
        </li>
      ))}
    </ul>
  );
};

/** Two-line mini stat used inside the performance panel. */
const MiniStat = ({ label, value, sub }) => (
  <div className="rounded-[10px] border border-solid border-[hsl(var(--pgrl-line))] px-3 py-2.5">
    <div className="text-[10.5px] text-[hsl(var(--pgrl-ink-soft))]">{label}</div>
    <div className={`mt-0.5 text-[19px] font-bold ${value == null ? "text-[hsl(var(--pgrl-ink-soft)/0.5)]" : "text-[hsl(var(--pgrl-ink))]"}`}>{value == null ? "—" : value}</div>
    {sub && <div className="text-[10px] font-semibold text-[hsl(var(--pgrl-ink-soft))]">{sub}</div>}
  </div>
);

/** Performance card: headline rate, sparkline, two minis, an insight line. */
export const PerfPanel = ({ rateLabel, rate, rateSub, spark, sparkCaption, minis = [], insightTitle, insight }) => (
  <div>
    <div className="text-[11px] text-[hsl(var(--pgrl-ink-soft))]">{rateLabel}</div>
    <div className="flex items-baseline gap-2.5">
      <span className={`text-[30px] font-bold leading-tight ${rate == null ? "text-[hsl(var(--pgrl-ink-soft)/0.5)]" : "text-[hsl(var(--pgrl-ink))]"}`}>{rate == null ? "—" : rate}</span>
      {rateSub && <span className="text-xs font-semibold text-[hsl(var(--pgrl-ink-soft))]">{rateSub}</span>}
    </div>
    <Sparkline values={spark} />
    {sparkCaption && <div className="mt-1 text-[10.5px] text-[hsl(var(--pgrl-ink-soft))]">{sparkCaption}</div>}
    <div className="mt-3 grid grid-cols-2 gap-2.5">
      {minis.map((m) => <MiniStat key={m.label} {...m} />)}
    </div>
    <div className="mt-3 flex gap-2.5 rounded-[10px] border border-solid border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-tint)/0.55)] px-3 py-2.5">
      <Medallion icon="chart" hue="accent" size="xs" />
      <div>
        <div className="text-[11.5px] font-bold text-[hsl(var(--pgrl-ink))]">{insightTitle}</div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-[hsl(var(--pgrl-ink-soft))]">{insight}</div>
      </div>
    </div>
  </div>
);

/** Resume-draft card. `draft` null renders the "nothing unfinished" state. */
export const DraftCard = ({ draft, title, emptyText, startedLabel, resumeLabel, newLabel, onResume, onNew }) => (
  <div>
    {draft ? (
      <>
        <div className="text-[12.5px] text-[hsl(var(--pgrl-ink))]">{title}</div>
        <div className="mt-1 text-[11px] text-[hsl(var(--pgrl-ink-soft))]">{startedLabel}</div>
        <button type="button" onClick={onResume} className={`mt-2.5 cursor-pointer rounded-lg border-0 bg-[hsl(var(--pgrl-primary))] px-3.5 py-1.5 text-xs font-semibold text-[hsl(var(--pgrl-on-primary))] ${FOCUS_RING}`}>{resumeLabel}</button>
      </>
    ) : (
      <>
        <div className="text-[12.5px] text-[hsl(var(--pgrl-ink-soft))]">{emptyText}</div>
        <button type="button" onClick={onNew} className={`mt-2.5 cursor-pointer rounded-lg border border-solid border-[hsl(var(--pgrl-line))] bg-[hsl(var(--pgrl-surface))] px-3.5 py-1.5 text-xs font-semibold text-[hsl(var(--pgrl-primary))] hover:bg-[hsl(var(--pgrl-tint))] ${FOCUS_RING}`}>{newLabel}</button>
      </>
    )}
  </div>
);

/** Full-width retry panel — the page never renders a blank on failure. */
export const ErrorPanel = ({ title, sub, retryLabel, onRetry }) => (
  <Panel className="flex items-center gap-4">
    <Medallion icon="alert" hue="warning" />
    <div className="min-w-0 flex-1">
      <div className="text-sm font-bold text-[hsl(var(--pgrl-ink))]">{title}</div>
      <div className="mt-0.5 text-xs text-[hsl(var(--pgrl-ink-soft))]">{sub}</div>
    </div>
    <button type="button" onClick={onRetry} className={`cursor-pointer rounded-lg border-0 bg-[hsl(var(--pgrl-primary))] px-3.5 py-1.5 text-xs font-semibold text-[hsl(var(--pgrl-on-primary))] ${FOCUS_RING}`}>{retryLabel}</button>
  </Panel>
);

/**
 * Sign-out confirmation — the same PopUp, strings and class as core's
 * LogoutDialog, which is module-internal and cannot be imported here.
 */
export const SignOutDialog = ({ t, onConfirm, onCancel }) => (
  <PopUp
    type="default"
    heading={t("CORE_LOGOUT_WEB_HEADER")}
    children={[
      <div key="msg">
        <CardText>
          {t("CORE_LOGOUT_WEB_CONFIRMATION_MESSAGE") + " "}
          <strong>{t("CORE_LOGOUT_MESSAGE")}</strong>
        </CardText>
      </div>,
    ]}
    footerChildren={[
      <Button key="cancel" type="button" size="large" variation="secondary" label={t("CORE_LOGOUT_CANCEL")} className="logout-cancel-button" onClick={onCancel} />,
      <Button key="yes" type="button" size="large" variation="primary" label={t("CORE_LOGOUT_WEB_YES")} onClick={onConfirm} />,
    ]}
    sortFooterButtons={true}
    equalWidthButtons={true}
    onClose={onCancel}
    onOverlayClick={onCancel}
    className="digit-logout-popup-wrapper"
  />
);

