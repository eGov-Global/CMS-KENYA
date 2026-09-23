// Employee home v2 — a full-page, role-tiered home.
//
// Mounted SHELL-FREE from core's App.js, the same pattern the citizen landing
// already uses. That keeps the upstream `EmployeeHome` (which renders only
// `<LandingPageWrapper>{cards}</LandingPageWrapper>` and has no slot above or
// beside the grid) untouched, so this costs nothing on an upstream subtree
// pull. The trade is that this page owns its own top bar and sidebar.
//
// TIERING IS PRESENTATION ONLY — see tiers.js. Tier picks which KPIs, charts
// and rail panels render and which SCOPE the data hook asks the server for;
// links keep their own per-link role filter so a multi-role user never loses
// an affordance they legitimately hold. Every tier gets the same DENSITY —
// the earlier draft left casework and intake screens half empty.
//
// Every string goes through `t()` with an inline English fallback, because an
// unseeded key renders as the raw key on screen and this tenant has live
// examples of exactly that (DASHBOARD_CARD_HEADER, ES_PGR_ADMIN_SEARCH).
//
// Numbers are honest: a figure derived from the fetched SAMPLE says so when
// the total is larger ("of the latest 30"), and an unreadable count renders
// "—", never 0.

import React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { buildTokenStyle, FOCUS_RING_DARK } from "../../citizen/Landing/tokens";
import { complaintLabel } from "../../../utils/complaintLabel";
import { statusLabel } from "../../../utils/statusLabel";
import { TIER, resolveTier, canAdminSearch } from "./tiers";
import { useDashboardAccess } from "../../../../../dashboard/roles";
import useHomeData, { SCOPE } from "./useHomeData";
import { KpiCard, ActionTile, SectionHead, Panel, Medallion } from "./components/Primitives";
import { Donut, Bars, HeatRows } from "./components/Charts";
import { PanelHead, LinkButton, Feed, TabbedTable, QuickLinks, DueList, PerfPanel, DraftCard, ErrorPanel, TopBar } from "./components/Panels";

/* ── localisation + formatting helpers ─────────────────────────────────── */

const interpolate = (s, vars) => (vars ? String(s).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] == null ? "" : vars[k])) : s);

/** t() with a readable fallback — never render a raw key. */
const useT = () => {
  const { t } = useTranslation();
  return (key, fallback, vars) => {
    const v = t(key, vars);
    return !v || v === key ? interpolate(fallback, vars) : v;
  };
};

/** BCP-47 tag for Intl from DIGIT's "en_IN"-style locale. */
const useLang = () => {
  try {
    return String(Digit.StoreData.getCurrentLanguage() || "en").replace("_", "-");
  } catch (e) {
    return "en";
  }
};

const DAY_MS = 86400000;
const useFormatters = (lang, tr) => {
  const num = React.useMemo(() => new Intl.NumberFormat(lang), [lang]);
  const dt = React.useMemo(() => new Intl.DateTimeFormat(lang, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }), [lang]);
  const rel = React.useMemo(() => (typeof Intl.RelativeTimeFormat === "function" ? new Intl.RelativeTimeFormat(lang, { numeric: "auto" }) : null), [lang]);
  return {
    n: (x) => (x == null ? null : num.format(x)),
    dt: (ts) => (ts == null ? "—" : dt.format(new Date(ts))),
    days: (d) => tr("PGR_HOME_DAYS_SHORT", "{{n}} d", { n: num.format(Math.round(d)) }),
    ago: (ts) => {
      if (ts == null) return "";
      const diff = ts - Date.now();
      const abs = Math.abs(diff);
      const [unit, ms] = abs < 3600000 ? ["minute", 60000] : abs < DAY_MS ? ["hour", 3600000] : ["day", DAY_MS];
      const v = Math.round(diff / ms);
      return rel ? rel.format(v, unit) : `${Math.abs(v)}${unit[0]}`;
    },
  };
};

// Channel codes as pgr-services stores them → the keys the create form seeds.
const CHANNEL_KEY = { inperson: "PGR_CHANNEL_IN_PERSON", email: "PGR_CHANNEL_EMAIL", letter: "PGR_CHANNEL_LETTER", linhaverde: "PGR_CHANNEL_LINHA_VERDE" };
const CHANNEL_FALLBACK = { inperson: "In person", email: "Email", letter: "Letter", linhaverde: "Phone line", web: "Web", mobile: "Mobile app", whatsapp: "WhatsApp", ivr: "Phone", unknown: "Unknown" };
const channelLabel = (tr, code) => {
  const c = String(code || "unknown").toLowerCase();
  return tr(CHANNEL_KEY[c] || `PGR_HOME_SRC_${c.toUpperCase()}`, CHANNEL_FALLBACK[c] || code);
};
const deptLabel = (tr, code) =>
  code === "UNKNOWN" ? tr("PGR_HOME_DEPT_UNKNOWN", "No department") : tr(`COMMON_MASTERS_DEPARTMENT_${String(code).toUpperCase().replace(/[.:\-\s/]/g, "_")}`, code);
// Boundary labels are seeded under the bare code (rainmaker-boundary-*).
const wardLabel = (tr, code, name) => (code ? tr(code, name || code) : tr("PGR_HOME_WARD_UNKNOWN", "No ward"));
const AGE_LABEL = { LT1: ["PGR_HOME_AGE_LT1", "< 1 day"], D1_3: ["PGR_HOME_AGE_D1_3", "1–3 days"], D3_7: ["PGR_HOME_AGE_D3_7", "3–7 days"], GT7: ["PGR_HOME_AGE_GT7", "> 7 days"] };
const WEEKDAY_LABEL = { MON: ["PGR_HOME_WD_MON", "Mon"], TUE: ["PGR_HOME_WD_TUE", "Tue"], WED: ["PGR_HOME_WD_WED", "Wed"], THU: ["PGR_HOME_WD_THU", "Thu"], FRI: ["PGR_HOME_WD_FRI", "Fri"], SAT: ["PGR_HOME_WD_SAT", "Sat"], SUN: ["PGR_HOME_WD_SUN", "Sun"] };

const toneOf = (i) => (i.overdue ? "overdue" : i.isResolved ? "resolved" : i.isOpen ? "open" : "closed");
const feedIconOf = (i) =>
  i.isResolved ? ["check", "leaf"] : i.overdue ? ["alert", "danger"] : /^ESCALATED/.test(i.status || "") ? ["up", "warning"] : i.status === "PENDINGFORASSIGNMENT" ? ["plus", "brand"] : ["redo", "brand"];

/* ── chrome ────────────────────────────────────────────────────────────── */

const Sidebar = ({ items, active, onNavigate, tr }) => (
  <aside className="hidden w-[212px] shrink-0 flex-col bg-[hsl(var(--pgrl-deep))] px-2.5 py-3.5 md:flex">
    <nav className="flex flex-col gap-0.5">
      {items.map((i) => (
        <button
          key={i.key}
          type="button"
          onClick={() => onNavigate(i.to)}
          className={`m-0 flex cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-2.5 text-left text-[13px] ${FOCUS_RING_DARK} ${
            i.key === active ? "bg-[hsl(var(--pgrl-on-primary)/0.14)] font-semibold text-[hsl(var(--pgrl-on-primary))]" : "text-[hsl(var(--pgrl-on-primary)/0.72)] hover:bg-[hsl(var(--pgrl-on-primary)/0.08)]"
          }`}
        >
          <Medallion icon={i.icon} hue="dark" size="sm" />
          <span className="min-w-0 flex-1 truncate" title={i.label}>{i.label}</span>
        </button>
      ))}
    </nav>
    {/* landscape + motto, echoing the county mark */}
    <div className="relative mt-auto h-24">
      <svg aria-hidden viewBox="0 0 220 96" preserveAspectRatio="none" className="absolute inset-x-[-10px] bottom-0 w-[calc(100%+20px)]">
        <path d="M0 96 L0 62 L38 34 L62 52 L92 22 L124 54 L152 40 L186 66 L220 48 L220 96 Z" fill="hsl(var(--pgrl-on-primary)/0.07)" />
        <path d="M0 96 L0 76 L34 58 L70 74 L104 52 L140 76 L174 62 L220 80 L220 96 Z" fill="hsl(var(--pgrl-on-primary)/0.05)" />
      </svg>
      <p className="relative m-0 px-3 pb-2.5 text-xs leading-relaxed text-[hsl(var(--pgrl-on-primary)/0.8)]">
        <b className="font-semibold text-[hsl(var(--pgrl-on-primary))]">{tr("PGR_HOME_MOTTO_1", "Let's Make")}</b>
        <br />
        {tr("PGR_HOME_MOTTO_2", "Nairobi Work")}
      </p>
    </div>
  </aside>
);

/** Panel with the landing's entrance motion, staggered by `i`. */
const Rise = ({ i = 0, className = "", children }) => (
  <Panel className={`pgrl-rise ${className}`} style={{ "--pgrl-i": i }}>{children}</Panel>
);

/* ── page ──────────────────────────────────────────────────────────────── */

export const EmployeeHomeV2 = () => {
  const tr = useT();
  const { t } = useTranslation();
  const lang = useLang();
  const fmt = useFormatters(lang, tr);
  const history = useHistory();
  const ctx = window?.contextPath || "digit-ui";
  const go = (to) => to && history.push(to);
  const R = {
    inbox: `/${ctx}/employee/pgr/inbox-v2`,
    create: `/${ctx}/employee/pgr/create-complaint`,
    admin: `/${ctx}/employee/pgr/admin-search`,
    dashboard: `/${ctx}/employee/dashboard`,
    landing: `/${ctx}/landing`,
    details: (id) => `/${ctx}/employee/pgr/complaint-details/${id}`,
  };

  // PGRModule loads the `rainmaker-pgr` and `rainmaker-boundary-<hierarchy>`
  // messages when it mounts; this page is mounted shell-free, outside it, so
  // it must ask for the same bundles or every status/ward label falls back.
  const hierarchyType = window?.globalConfigs?.getConfig("HIERARCHY_TYPE") || "ADMIN";
  Digit.Services.useStore({
    stateCode: Digit.ULBService.getStateId(),
    moduleCode: ["pgr", `boundary-${String(hierarchyType).toLowerCase()}`],
    language: Digit.StoreData.getCurrentLanguage(),
    modulePrefix: "rainmaker",
  });

  const { tier, readOnly, isIntake, hasAny } = resolveTier();
  const isOversight = tier === TIER.OVERSIGHT;
  const isCasework = tier === TIER.CASEWORK;
  const intakeOnly = tier === TIER.NARROW && isIntake;
  const scope = isOversight || readOnly ? SCOPE.ALL : intakeOnly ? SCOPE.LOGGED : SCOPE.MINE;

  const { data, isLoading, isFetching, isError, refetch } = useHomeData({ scope, withAnalytics: isOversight });
  const [tab, setTab] = React.useState("all");
  // The dashboard's gate is a server capability (/analytics/_access), not a role
  // list — offering the link on `isOversight` alone produced a dead affordance.
  const dash = useDashboardAccess();
  const dashboardAllowed = !dash.loading && dash.allowed;
  const adminSearch = canAdminSearch();

  const tenantId = Digit.ULBService.getCurrentTenantId();
  const user = Digit.UserService.getUser();
  const uuid = user?.info?.uuid;
  const name = user?.info?.name || user?.info?.userName || "";
  const firstRole = (user?.info?.roles || []).map((r) => r.code).find((c) => c && !["EMPLOYEE", "CITIZEN", "INTERNAL_MICROSERVICE_ROLE"].includes(c));
  const { data: storeData } = Digit.Hooks.useStore.getInitData();
  const stateInfo = storeData?.stateInfo;

  // A user with no PGR role at all gets nothing here — the same posture the
  // existing PGRCard takes (it returns null).
  if (!hasAny) return null;

  const d = data || {};
  const totals = d.totals || {};
  const partialNote = d.partial ? tr("PGR_HOME_PARTIAL", "of the latest {{n}}", { n: fmt.n(d.sampleSize) }) : null;
  const loading = isLoading && !data;
  // null (renders "—") unless the sample was actually readable — a 403 must not read as "0 overdue"
  const overdue = data && d.sampleOk ? d.overdue : null;
  const unavailable = !!data && !d.sampleOk;
  const emptyText = loading
    ? tr("PGR_HOME_I_LOADING", "Loading…")
    : unavailable
    ? tr("PGR_HOME_UNAVAILABLE", "Figures unavailable")
    : tr("PGR_HOME_EMPTY", "Nothing to show yet");
  const dueEmptyText = loading || unavailable ? emptyText : tr("PGR_HOME_R_DUE_EMPTY", "No open case is close to its SLA.");

  /* KPIs — four per tier, same density everywhere */
  const kpis = isOversight || readOnly
    ? [
        { icon: "doc", hue: "brand", label: tr("PGR_HOME_KPI_TOTAL", "Total complaints"), value: totals.total, caption: tr("PGR_HOME_KPI_TOTAL_SUB", "visible to you") },
        { icon: "clock", hue: "warning", label: tr("PGR_HOME_KPI_OPEN_ALL", "Open"), value: totals.open, caption: tr("PGR_HOME_KPI_OPEN_ALL_SUB", "awaiting action") },
        { icon: "check", hue: "leaf", label: tr("PGR_HOME_KPI_RESOLVED", "Resolved"), value: totals.resolved, caption: tr("PGR_HOME_KPI_RESOLVED_ALL_SUB", "incl. closed after resolution") },
        { icon: "alert", hue: "danger", label: tr("PGR_HOME_KPI_OVERDUE", "Past SLA"), value: overdue, caption: partialNote || tr("PGR_HOME_KPI_OVERDUE_SUB", "open cases over budget") },
      ]
    : intakeOnly
    ? [
        { icon: "plus", hue: "leaf", label: tr("PGR_HOME_KPI_TODAY", "Logged today"), value: totals.today, caption: tr("PGR_HOME_KPI_TODAY_SUB", "by you, since midnight") },
        { icon: "doc", hue: "brand", label: tr("PGR_HOME_KPI_LOGGED", "Logged by me"), value: totals.total, caption: tr("PGR_HOME_KPI_LOGGED_SUB", "all time") },
        { icon: "clock", hue: "warning", label: tr("PGR_HOME_KPI_STILL_OPEN", "Still open"), value: totals.open, caption: tr("PGR_HOME_KPI_STILL_OPEN_SUB", "of the cases you logged") },
        { icon: "check", hue: "leaf", label: tr("PGR_HOME_KPI_RESOLVED", "Resolved"), value: totals.resolved, caption: tr("PGR_HOME_KPI_RESOLVED_LOGGED_SUB", "of the cases you logged") },
      ]
    : [
        { icon: "user", hue: "brand", label: tr("PGR_HOME_KPI_OPEN_MINE", "Assigned to me"), value: totals.open, caption: tr("PGR_HOME_KPI_OPEN_MINE_SUB", "open, in your queue") },
        { icon: "alert", hue: "danger", label: tr("PGR_HOME_KPI_OVERDUE_MINE", "Past SLA"), value: overdue, caption: partialNote || tr("PGR_HOME_KPI_OVERDUE_MINE_SUB", "of your open cases") },
        { icon: "check", hue: "leaf", label: tr("PGR_HOME_KPI_RESOLVED", "Resolved"), value: totals.resolved, caption: tr("PGR_HOME_KPI_RESOLVED_SUB", "by you") },
        { icon: "doc", hue: "plum", label: tr("PGR_HOME_KPI_HANDLED", "In your name"), value: totals.total, caption: tr("PGR_HOME_KPI_HANDLED_SUB", "assigned to you, any status") },
      ];

  /* Quick actions — per-link role filter, NOT the tier */
  const tiles = [
    !readOnly && { key: "search", icon: "search", hue: "brand", to: R.inbox, title: tr("ACTION_TEST_SEARCH_COMPLAINT", "Search Complaints"), sub: tr("PGR_HOME_A_SEARCH_SUB", "Find and view complaint details") },
    (isCasework || isOversight) && { key: "mine", icon: "user", hue: "accent", to: R.inbox, title: tr("PGR_HOME_NAV_MINE", "My Complaints"), sub: tr("PGR_HOME_A_MINE_SUB", "Your assigned queue") },
    isIntake && { key: "create", icon: "plus", hue: "leaf", to: R.create, title: tr("ACTION_TEST_CREATE_COMPLAINT", "New Complaint"), sub: tr("PGR_HOME_A_CREATE_SUB", "Register on behalf of a citizen") },
    adminSearch && { key: "admin", icon: "shield", hue: "plum", to: R.admin, title: tr("ES_PGR_ADMIN_SEARCH", "Admin Search"), sub: tr("PGR_HOME_A_ADMIN_SUB", "Across all departments") },
    dashboardAllowed && { key: "reports", icon: "chart", hue: "warning", to: R.dashboard, title: tr("PGR_HOME_A_REPORTS", "Reports"), sub: tr("PGR_HOME_A_REPORTS_SUB", "Dashboard, analytics and exports") },
    readOnly && { key: "ro", icon: "search", hue: "brand", to: R.inbox, title: tr("ACTION_TEST_SEARCH_COMPLAINT", "Search Complaints"), sub: tr("PGR_HOME_A_READONLY_SUB", "Read-only access") },
    { key: "portal", icon: "globe", hue: "leaf", to: R.landing, secondary: true, title: tr("PGR_HOME_A_PORTAL", "Citizen portal"), sub: tr("PGR_HOME_A_PORTAL_SUB", "What citizens see") },
    { key: "refresh", icon: "refresh", hue: "accent", secondary: true, onClick: () => refetch(), title: tr("PGR_HOME_A_REFRESH", "Refresh figures"), sub: isFetching ? tr("PGR_HOME_A_REFRESHING", "Updating…") : tr("PGR_HOME_A_REFRESH_SUB", "Reload every panel") },
  ].filter(Boolean);

  /* Charts — source depends on tier; oversight prefers the analytics census */
  const an = d.analytics || {};
  const donut = isOversight
    ? { title: tr("PGR_HOME_C_DEPT", "Complaints by department"), sub: an.available ? tr("PGR_HOME_ALL_COMPLAINTS", "all complaints") : partialNote, center: tr("PGR_HOME_TOTAL", "Total"),
        segments: ((an.available ? an.byDept : d.byDept) || []).slice(0, 6).map((r) => ({ key: r.key, label: deptLabel(tr, r.key), n: r.n })) }
    : intakeOnly
    ? { title: tr("PGR_HOME_C_CHANNEL", "Logged by channel"), sub: partialNote, center: tr("PGR_HOME_LOGGED", "Logged"),
        segments: (d.bySource || []).map((r) => ({ key: r.key, label: channelLabel(tr, r.key), n: r.n })) }
    : { title: readOnly ? tr("PGR_HOME_C_STATUS_ALL", "Complaints by status") : tr("PGR_HOME_C_STATUS_MINE", "My queue by status"), sub: partialNote, center: tr("PGR_HOME_CASES", "Cases"),
        segments: (d.byStatus || []).slice(0, 6).map((r) => ({ key: r.key, label: statusLabel(t, r.key, r.key), n: r.n })) };
  const bars = isOversight
    ? { title: tr("PGR_HOME_C_WARD", "Complaints by ward"), sub: an.available ? tr("PGR_HOME_TOP_WARDS", "busiest wards") : partialNote,
        data: ((an.available ? an.byWard : d.byWard) || []).slice(0, 6).map((r) => ({ key: r.key, label: wardLabel(tr, r.key), n: r.n })) }
    : intakeOnly
    ? { title: tr("PGR_HOME_C_WEEK", "This week by day"), sub: [tr("PGR_HOME_C_WEEK_SUB", "complaints you logged, Monday to today"), partialNote].filter(Boolean).join(" · "),
        data: (d.byWeekday || []).map((r) => ({ key: r.key, label: tr(...WEEKDAY_LABEL[r.key]), n: r.n })) }
    : { title: readOnly ? tr("PGR_HOME_C_AGE_ALL", "Open cases by age") : tr("PGR_HOME_C_AGE_MINE", "My open cases by age"), sub: partialNote,
        data: (d.byAge || []).map((r) => ({ key: r.key, label: tr(...AGE_LABEL[r.key]), n: r.n })) };

  /* Activity feed */
  const feed = (d.recent || []).map((i) => {
    const [icon, hue] = feedIconOf(i);
    return {
      key: i.id, icon, hue, title: i.id, when: fmt.ago(i.modified),
      sub: [statusLabel(t, i.status, i.status), complaintLabel(t, i.code, i.typeName), wardLabel(tr, i.ward, i.wardName)].filter(Boolean).join(" · "),
      onClick: () => go(R.details(i.id)),
    };
  });

  /* Performance */
  const rate = typeof totals.total === "number" && totals.total > 0 && typeof totals.resolved === "number" ? Math.round((totals.resolved / totals.total) * 100) : null;
  const weekN = (d.byWeekday || []).reduce((s, r) => s + r.n, 0);
  const perf = intakeOnly
    ? {
        rateLabel: tr("PGR_HOME_P_WEEK", "Logged this week"), rate: unavailable ? null : fmt.n(weekN),
        rateSub: [tr("PGR_HOME_P_WEEK_SUB", "complaints"), partialNote].filter(Boolean).join(" · "),
        minis: [
          { label: tr("PGR_HOME_P_PERDAY", "Per day, last 14 days"), value: d.perDay14 && !unavailable ? fmt.n(Math.round((d.perDay14.reduce((s, x) => s + x, 0) / 14) * 10) / 10) : null, sub: partialNote },
          { label: tr("PGR_HOME_KPI_STILL_OPEN", "Still open"), value: fmt.n(totals.open) },
        ],
        insight: typeof totals.today === "number"
          ? tr("PGR_HOME_I_TODAY", "You have logged {{n}} complaints today. Each one gets a reference number the citizen can quote.", { n: fmt.n(totals.today) })
          : tr("PGR_HOME_I_TODAY_UNAVAILABLE", "Today's figure could not be read. Refresh to try again."),
      }
    : {
        rateLabel: tr("PGR_HOME_P_RATE", "Resolution rate"), rate: rate == null ? null : `${fmt.n(rate)}%`,
        rateSub: rate == null ? null : tr("PGR_HOME_P_RATE_SUB", "{{r}} resolved of {{t}}", { r: fmt.n(totals.resolved), t: fmt.n(totals.total) }),
        minis: [
          { label: tr("PGR_HOME_P_AVG", "Avg. resolution time"), value: d.avgResolutionMs ? fmt.days(d.avgResolutionMs / DAY_MS) : null, sub: d.avgResolutionMs ? null : tr("PGR_HOME_P_NA", "not reported") },
          { label: tr("PGR_HOME_P_OLDEST", "Oldest open case"), value: d.open && d.open.length ? fmt.days(d.oldestOpenDays) : null, sub: partialNote },
        ],
        insight: !data
          ? tr("PGR_HOME_I_LOADING", "Loading…")
          : overdue == null
          ? tr("PGR_HOME_I_UNAVAILABLE", "Figures could not be read. Refresh to try again.")
          : d.overdue > 0
          ? tr("PGR_HOME_I_OVERDUE", "{{n}} open cases are past their SLA{{p}}. Start with the ones due soonest.", { n: fmt.n(d.overdue), p: partialNote ? ` (${partialNote})` : "" })
          : tr("PGR_HOME_I_ON_TRACK", "No open case is past its SLA{{p}}.", { p: partialNote ? ` (${partialNote})` : "" }),
      };

  /* Tabbed table */
  const items = d.items || [];
  const tabs = [
    { key: "all", label: tr("PGR_HOME_T_ALL", "All"), n: totals.total ?? (d.sampleOk ? items.length : null) },
    { key: "open", label: tr("PGR_HOME_T_OPEN", "Open"), n: totals.open ?? (d.sampleOk ? items.filter((i) => i.isOpen).length : null) },
    { key: "overdue", label: tr("PGR_HOME_T_OVERDUE", "Past SLA"), n: d.partial ? null : overdue },
    { key: "resolved", label: tr("PGR_HOME_T_RESOLVED", "Resolved"), n: totals.resolved ?? (d.sampleOk ? items.filter((i) => i.isResolved).length : null) },
  ];
  const rowsFor = { all: items, open: items.filter((i) => i.isOpen), overdue: items.filter((i) => i.overdue), resolved: items.filter((i) => i.isResolved) };
  const columns = [
    tr("PGR_HOME_COL_ID", "Complaint no"),
    tr("PGR_HOME_COL_WARD", "Ward"),
    isOversight ? tr("PGR_HOME_COL_DEPT", "Department") : tr("PGR_HOME_COL_TYPE", "Type"),
    intakeOnly ? tr("PGR_HOME_COL_CHANNEL", "Channel") : tr("PGR_HOME_COL_RECEIVED", "Received"),
  ];
  const rows = (rowsFor[tab] || []).slice(0, 6).map((i) => ({
    key: i.id,
    cells: [i.id, wardLabel(tr, i.ward, i.wardName), isOversight ? deptLabel(tr, i.dept || "UNKNOWN") : complaintLabel(t, i.code, i.typeName), intakeOnly ? channelLabel(tr, i.source) : fmt.dt(i.created)],
    pill: { tone: toneOf(i), label: statusLabel(t, i.status, i.status) },
    onView: () => go(R.details(i.id)),
  }));

  /* Rail */
  const dueRows = (d.dueSoon || []).map((i) => ({
    key: i.id, id: i.id, place: wardLabel(tr, i.ward, i.wardName), urgent: i.slaDays < 0,
    chip: i.slaDays < 0 ? tr("PGR_HOME_DUE_OVER", "{{n}} d over", { n: fmt.n(-i.slaDays) }) : tr("PGR_HOME_DUE_IN", "{{n}} d left", { n: fmt.n(i.slaDays) }),
    onClick: () => go(R.details(i.id)),
  }));
  const heatWards = ((an.available ? an.openByWard : d.openByWard) || []).slice(0, 5).map((r) => ({ key: r.key, label: wardLabel(tr, r.key), n: r.n }));
  const heatTypes = (d.byType || []).slice(0, 5).map((r) => ({ key: r.key, label: complaintLabel(t, r.key), n: r.n }));
  const heatOpenStatus = (d.openByStatus || []).slice(0, 5).map((r) => ({ key: r.key, label: statusLabel(t, r.key, r.key), n: r.n }));

  const rawDraft = Digit.SessionStorage.get("COMPLAINT_CREATE");
  const meta = rawDraft?.__draftMeta;
  const draft = meta && meta.tenant === tenantId && meta.user === uuid && Object.keys(rawDraft).length > 1 ? rawDraft : null;
  const draftChannel = draft?.ReceivedChannel?.name ? tr(draft.ReceivedChannel.name, draft.ReceivedChannel.code) : null;

  const links = [
    { key: "inbox", icon: "doc", hue: "brand", label: tr("PGR_HOME_L_INBOX", "Complaints inbox"), onClick: () => go(R.inbox) },
    isIntake && { key: "create", icon: "plus", hue: "leaf", label: tr("ACTION_TEST_CREATE_COMPLAINT", "New Complaint"), onClick: () => go(R.create) },
    dashboardAllowed && { key: "dash", icon: "chart", hue: "plum", label: tr("PGR_HOME_L_DASH", "Dashboard"), onClick: () => go(R.dashboard) },
    adminSearch && { key: "admin", icon: "shield", hue: "accent", label: tr("ES_PGR_ADMIN_SEARCH", "Admin Search"), onClick: () => go(R.admin) },
    { key: "portal", icon: "globe", hue: "leaf", label: tr("PGR_HOME_A_PORTAL", "Citizen portal"), onClick: () => go(R.landing) },
  ].filter(Boolean);

  const nav = [
    { key: "home", icon: "home", label: tr("PGR_HOME_NAV_HOME", "Home"), to: `/${ctx}/employee` },
    !readOnly && (isCasework || isOversight) && { key: "mine", icon: "user", label: tr("PGR_HOME_NAV_MINE", "My Complaints"), to: R.inbox },
    isIntake && { key: "create", icon: "plus", label: tr("ACTION_TEST_CREATE_COMPLAINT", "New Complaint"), to: R.create },
    { key: "search", icon: "search", label: tr("PGR_HOME_NAV_SEARCH", "Search Complaints"), to: R.inbox },
    adminSearch && { key: "all", icon: "shield", label: tr("PGR_HOME_NAV_ALL", "All Departments"), to: R.admin },
    dashboardAllowed && { key: "reports", icon: "chart", label: tr("PGR_HOME_A_REPORTS", "Reports"), to: R.dashboard },
  ].filter(Boolean);

  const tenantKey = `TENANT_TENANTS_${String(tenantId || "").toUpperCase().replace(/\./g, "_")}`;
  const dateText = new Intl.DateTimeFormat(lang, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
  const viewAll = <LinkButton onClick={() => go(R.inbox)}>{tr("PGR_HOME_VIEW_ALL", "View all")}</LinkButton>;

  // The --pgrl-* tokens are seeded INLINE by buildTokenStyle(); they are not
  // global. Each var still defers to its --pgrl-*-brand override, so the
  // tenant ThemeConfig retints this page exactly as it retints the landing.
  return (
    <div className="v2-scope" style={buildTokenStyle()}>
      <div className="pgr-emp-home flex min-h-screen flex-col bg-[hsl(var(--pgrl-page))] font-condensed text-[hsl(var(--pgrl-ink))]">
        <TopBar
          logoUrl={stateInfo?.logoUrlWhite || stateInfo?.logoUrl}
          brand={tr(tenantKey, stateInfo?.name || tenantId)}
          brandSub={tr("PGR_HOME_BRAND_SUB", "Citizen Complaint Resolution System")}
          dateText={dateText}
          name={name}
          roleLabel={firstRole ? tr(`ACCESSCONTROL_ROLES_ROLES_${firstRole}`, firstRole) : ""}
          signOutLabel={tr("CORE_COMMON_LOGOUT", "Sign out")}
          onSignOut={() => Digit.UserService.logout()}
        />
        <div className="flex min-h-0 flex-1">
          <Sidebar items={nav} active="home" onNavigate={go} tr={tr} />

          <main className="min-w-0 flex-1 px-4 py-4 md:px-5">
            {/* greeting hero over the county photograph */}
            <section
              className="pgrl-rise relative mb-4 overflow-hidden rounded-2xl p-5 md:p-6"
              style={{ background: "linear-gradient(100deg, hsl(var(--pgrl-tint)/0.97) 0%, hsl(var(--pgrl-tint)/0.9) 46%, hsl(var(--pgrl-surface)/0.3) 100%), url('/digit-ui/nairobi-home-banner.jpg') right center / cover no-repeat" }}
            >
              <p className="m-0 text-[13px] text-[hsl(var(--pgrl-ink-soft))]">{tr("PGR_HOME_GREETING", "Good day,")}</p>
              <h1 className="mb-0 mt-1 text-2xl font-bold tracking-tight text-[hsl(var(--pgrl-ink))]">{name}</h1>
              <p className="mb-0 mt-1.5 text-[13px] text-[hsl(var(--pgrl-ink-soft))]">
                {isOversight
                  ? tr("PGR_HOME_SUB_OVERSIGHT", "County-wide overview across all departments.")
                  : intakeOnly
                  ? tr("PGR_HOME_SUB_INTAKE", "Log a complaint for a citizen at the counter or on the phone.")
                  : readOnly
                  ? tr("PGR_HOME_SUB_READONLY", "Read-only view of the complaints visible to you.")
                  : tr("PGR_HOME_SUB_CASEWORK", "Your queue. Figures are scoped to your own cases.")}
              </p>
            </section>

            {isError && (
              <ErrorPanel
                title={tr("PGR_HOME_ERR_TITLE", "Figures could not be loaded")}
                sub={d.forbidden
                  ? tr("PGR_HOME_ERR_FORBIDDEN", "Your role cannot read complaint figures on this tenant. The links below still work.")
                  : tr("PGR_HOME_ERR_SUB", "The complaint service did not answer. Your links below still work.")}
                retryLabel={tr("PGR_HOME_RETRY", "Retry")}
                onRetry={() => refetch()}
              />
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              {/* ── main column ── */}
              <div className="min-w-0">
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {kpis.map((k, i) => (
                    <div key={k.label} className="pgrl-rise" style={{ "--pgrl-i": i }}>
                      <KpiCard icon={k.icon} hue={k.hue} loading={loading} label={k.label} value={fmt.n(k.value)} caption={k.caption} />
                    </div>
                  ))}
                </div>

                <Rise i={1}>
                  <SectionHead title={tr("PGR_HOME_ACTIONS", "Quick actions")} sub={tr("PGR_HOME_ACTIONS_SUB", "Common tasks to help you work faster")} />
                  <div className={`grid grid-cols-1 gap-3.5 sm:grid-cols-2 ${tiles.length > 6 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
                    {tiles.map((tile) => (
                      <ActionTile key={tile.key} icon={tile.icon} hue={tile.hue} secondary={tile.secondary} title={tile.title} sub={tile.sub} to={tile.to} onNavigate={tile.onClick ? () => tile.onClick() : go} />
                    ))}
                  </div>
                </Rise>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Rise i={2} className="md:mb-4">
                    <PanelHead title={donut.title} sub={donut.sub} action={viewAll} />
                    <Donut segments={donut.segments} centerLabel={donut.center} formatN={fmt.n} emptyText={emptyText} unavailable={unavailable} />
                  </Rise>
                  <Rise i={3} className="md:mb-4">
                    <PanelHead title={bars.title} sub={bars.sub} action={viewAll} />
                    <Bars data={bars.data} formatN={fmt.n} emptyText={emptyText} />
                  </Rise>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Rise i={4} className="md:mb-4">
                    <PanelHead title={isOversight || readOnly ? tr("PGR_HOME_FEED", "Recent activity") : tr("PGR_HOME_FEED_MINE", "My recent activity")} sub={partialNote} action={viewAll} />
                    <Feed rows={feed} emptyText={emptyText} />
                  </Rise>
                  <Rise i={5} className="md:mb-4">
                    <PanelHead title={isOversight || readOnly ? tr("PGR_HOME_PERF", "Performance overview") : intakeOnly ? tr("PGR_HOME_PERF_INTAKE", "My intake summary") : tr("PGR_HOME_PERF_MINE", "My performance")} />
                    <PerfPanel
                      {...perf}
                      spark={d.perDay14 || Array(14).fill(0)}
                      sparkCaption={`${tr("PGR_HOME_SPARK", "New complaints per day, last 14 days")}${partialNote ? ` · ${partialNote}` : ""}`}
                      insightTitle={tr("PGR_HOME_INSIGHT", "Insight")}
                    />
                  </Rise>
                </div>

                <Rise i={6} className="mb-0">
                  <PanelHead
                    title={isOversight || readOnly ? tr("PGR_HOME_TABLE_ALL", "All complaints") : intakeOnly ? tr("PGR_HOME_TABLE_LOGGED", "Complaints I logged") : tr("PGR_HOME_TABLE_MINE", "My assigned complaints")}
                    sub={tr("PGR_HOME_TABLE_SUB", "Showing the most recent; open the inbox for the full list")}
                    action={viewAll}
                  />
                  <TabbedTable tabs={tabs} active={tab} onTab={setTab} columns={columns} rows={rows} viewLabel={tr("PGR_HOME_VIEW", "View")} actionsLabel={tr("PGR_HOME_COL_ACTIONS", "Status and actions")} formatN={fmt.n} emptyText={emptyText} />
                </Rise>
              </div>

              {/* ── rail ── */}
              <aside className="min-w-0">
                {isOversight || readOnly ? (
                  <>
                    <Rise i={2}>
                      <PanelHead title={tr("PGR_HOME_R_WARDS", "Wards needing attention")} sub={an.available ? tr("PGR_HOME_R_WARDS_SUB", "open complaints") : partialNote} />
                      <HeatRows rows={heatWards} formatN={fmt.n} emptyText={emptyText} />
                    </Rise>
                    <Rise i={3}>
                      <PanelHead title={tr("PGR_HOME_R_OPEN_STATUS", "Open by status")} sub={partialNote} />
                      <HeatRows rows={heatOpenStatus} formatN={fmt.n} emptyText={emptyText} />
                    </Rise>
                  </>
                ) : intakeOnly ? (
                  <>
                    <Rise i={2}>
                      <PanelHead title={tr("PGR_HOME_R_DRAFT", "Resume draft")} />
                      <DraftCard
                        draft={draft}
                        title={tr("PGR_HOME_R_DRAFT_TITLE", "Unfinished complaint")}
                        startedLabel={draftChannel ? tr("PGR_HOME_R_DRAFT_CHANNEL", "Channel: {{c}}", { c: draftChannel }) : tr("PGR_HOME_R_DRAFT_SAVED", "Saved in this session")}
                        emptyText={tr("PGR_HOME_R_DRAFT_EMPTY", "No unfinished complaint in this session.")}
                        resumeLabel={tr("PGR_HOME_R_DRAFT_RESUME", "Resume")}
                        newLabel={tr("ACTION_TEST_CREATE_COMPLAINT", "New Complaint")}
                        onResume={() => go(R.create)}
                        onNew={() => go(R.create)}
                      />
                    </Rise>
                    <Rise i={3}>
                      <PanelHead title={tr("PGR_HOME_R_DUE_LOGGED", "Due soonest (logged by me)")} sub={partialNote} />
                      <DueList rows={dueRows} emptyText={dueEmptyText} />
                    </Rise>
                  </>
                ) : (
                  <>
                    <Rise i={2}>
                      <PanelHead title={tr("PGR_HOME_R_DUE", "Due soonest")} sub={partialNote} action={<LinkButton onClick={() => go(R.inbox)}>{tr("PGR_HOME_NAV_MINE", "My Complaints")}</LinkButton>} />
                      <DueList rows={dueRows} emptyText={dueEmptyText} />
                    </Rise>
                    <Rise i={3}>
                      <PanelHead title={tr("PGR_HOME_R_TYPES", "By complaint type")} sub={partialNote} />
                      <HeatRows rows={heatTypes} formatN={fmt.n} emptyText={emptyText} />
                    </Rise>
                  </>
                )}
                <Rise i={4} className="mb-0">
                  <SectionHead title={tr("PGR_HOME_LINKS", "Quick links")} />
                  <QuickLinks rows={links} />
                </Rise>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default EmployeeHomeV2;
