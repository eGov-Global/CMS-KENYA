// Employee home v2 — a full-page, role-tiered home.
//
// Mounted SHELL-FREE from core's App.js, the same pattern the citizen landing
// already uses. That keeps the upstream `EmployeeHome` (which renders only
// `<LandingPageWrapper>{cards}</LandingPageWrapper>` and has no slot above or
// beside the grid) untouched, so this costs nothing on an upstream subtree
// pull. The trade is that this page owns its own sidebar and topbar.
//
// TIERING IS PRESENTATION ONLY — see tiers.js. Tier picks which KPIs and
// panels render; links keep their own per-link role filter so a multi-role
// user never loses an affordance they legitimately hold.
//
// Every string goes through `t()` with an inline English fallback, because an
// unseeded key renders as the raw key on screen and this tenant has live
// examples of exactly that (DASHBOARD_CARD_HEADER, ES_PGR_ADMIN_SEARCH).

import React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { buildTokenStyle } from "../../citizen/Landing/tokens";
import { TIER, resolveTier } from "./tiers";
import useHomeCounts from "./useHomeCounts";
import { KpiCard, PriorityTile, ActionTile, SectionHead, Panel, Medallion } from "./components/Primitives";

/** t() with a readable fallback — never render a raw key. */
const useT = () => {
  const { t } = useTranslation();
  return (key, fallback) => {
    const v = t(key);
    return !v || v === key ? fallback : v;
  };
};

const OPEN_STATES = [
  "PENDINGFORASSIGNMENT",
  "PENDINGFORREASSIGNMENT",
  "PENDINGATLME",
  "ESCALATEDLEVEL1DUE",
  "ESCALATEDLEVEL2DUE",
  "ESCALATEDLEVEL3DUE",
];

const Sidebar = ({ items, active, onNavigate, tr }) => (
  <aside className="flex w-[212px] shrink-0 flex-col bg-[hsl(var(--pgrl-deep))] px-2.5 py-3.5">
    <nav className="flex flex-col gap-0.5">
      {items.map((i) => (
        <button
          key={i.key}
          type="button"
          onClick={() => onNavigate(i.to)}
          className={`m-0 flex cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-2.5 text-left text-[13px] ${
            i.key === active
              ? "bg-[hsl(var(--pgrl-on-primary)/0.14)] font-semibold text-[hsl(var(--pgrl-on-primary))]"
              : "text-[hsl(var(--pgrl-on-primary)/0.72)]"
          }`}
        >
          <Medallion icon={i.icon} hue="brand" size="sm" />
          {i.label}
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

export const EmployeeHomeV2 = () => {
  const tr = useT();
  const history = useHistory();
  const ctx = window?.contextPath || "digit-ui";
  const go = (to) => to && history.push(to);

  const { tier, readOnly, isIntake, hasAny } = resolveTier();
  const isOversight = tier === TIER.OVERSIGHT;
  const { counts, isLoading } = useHomeCounts({
    openStates: OPEN_STATES,
    mineOnly: !isOversight, // only oversight sees beyond its own queue
  });

  const user = Digit.UserService.getUser();
  const name = user?.info?.name || user?.info?.userName || "";

  // A user with no PGR role at all gets nothing here — the same posture the
  // existing PGRCard takes (it returns null).
  if (!hasAny) return null;

  const fmt = (n) => (n == null ? null : String(n)); // string by contract, so "0" renders

  const nav = [
    { key: "home", icon: "chart", label: tr("PGR_HOME_NAV_HOME", "Dashboard"), to: `/${ctx}/employee` },
    !readOnly && { key: "mine", icon: "user", label: tr("PGR_HOME_NAV_MINE", "My Complaints"), to: `/${ctx}/employee/pgr/inbox-v2` },
    { key: "search", icon: "search", label: tr("PGR_HOME_NAV_SEARCH", "Search Complaints"), to: `/${ctx}/employee/pgr/inbox-v2` },
    isOversight && { key: "all", icon: "shield", label: tr("PGR_HOME_NAV_ALL", "All Departments"), to: `/${ctx}/employee/pgr/admin-search` },
  ].filter(Boolean);

  // The --pgrl-* tokens are seeded INLINE on the landing root by
  // buildTokenStyle(); they are not global. Without this the whole page
  // renders unstyled (every hsl(var(--pgrl-…)) resolves to nothing).
  // Reusing the landing's own builder keeps one source of truth, and each var
  // still defers to its --pgrl-*-brand override, so the tenant ThemeConfig
  // retints this page exactly as it retints the landing.
  return (
    <div className="v2-scope" style={buildTokenStyle()}>
      <div className="pgr-emp-home flex min-h-screen bg-[hsl(var(--pgrl-page))] font-condensed text-[hsl(var(--pgrl-ink))]">
        <Sidebar items={nav} active="home" onNavigate={go} tr={tr} />

        <main className="min-w-0 flex-1 px-5 py-4">
          {/* greeting hero over the county photograph */}
          <section
            className="pgrl-rise relative mb-4 overflow-hidden rounded-2xl p-5 md:p-6"
            style={{
              background:
                "linear-gradient(100deg, hsl(var(--pgrl-tint)/0.97) 0%, hsl(var(--pgrl-tint)/0.9) 46%, hsl(var(--pgrl-surface)/0.3) 100%), url('/digit-ui/nairobi-home-banner.jpg') right center / cover no-repeat",
            }}
          >
            <p className="m-0 text-[13px] text-[hsl(var(--pgrl-ink-soft))]">{tr("PGR_HOME_GREETING", "Good day,")}</p>
            <h1 className="mb-0 mt-1 text-2xl font-bold tracking-tight text-[hsl(var(--pgrl-ink))]">{name}</h1>
            <p className="mb-0 mt-1.5 text-[13px] text-[hsl(var(--pgrl-ink-soft))]">
              {isOversight
                ? tr("PGR_HOME_SUB_OVERSIGHT", "County-wide overview across all departments.")
                : isIntake
                ? tr("PGR_HOME_SUB_INTAKE", "Log a complaint for a citizen at the counter or on the phone.")
                : tr("PGR_HOME_SUB_CASEWORK", "Your queue. Figures are scoped to your own cases.")}
            </p>
          </section>

          {/* KPIs — tier decides which */}
          <div className={`pgrl-rise mb-5 grid gap-4 ${isOversight ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            <KpiCard
              icon="doc" hue="brand" loading={isLoading}
              label={isOversight ? tr("PGR_HOME_KPI_OPEN_ALL", "Open complaints") : tr("PGR_HOME_KPI_OPEN_MINE", "Assigned to me")}
              value={fmt(counts.open)}
              caption={isOversight ? tr("PGR_HOME_KPI_OPEN_ALL_SUB", "across all departments") : tr("PGR_HOME_KPI_OPEN_MINE_SUB", "in your queue")}
            />
            <KpiCard
              icon="check" hue="leaf" loading={isLoading}
              label={tr("PGR_HOME_KPI_RESOLVED", "Resolved")}
              value={fmt(counts.resolved)}
              caption={isOversight ? tr("PGR_HOME_KPI_RESOLVED_ALL_SUB", "all departments") : tr("PGR_HOME_KPI_RESOLVED_SUB", "by you")}
            />
            {isOversight && (
              <KpiCard
                icon="alert" hue="warning" loading={isLoading}
                label={tr("PGR_HOME_KPI_OVERDUE", "Past SLA")}
                value={fmt(counts.overdue)}
                caption={tr("PGR_HOME_KPI_OVERDUE_SUB", "needs an aggregate endpoint")}
              />
            )}
          </div>

          {/* priority strip — oversight only; the others get it inside the inbox */}
          {isOversight && (
            <Panel>
              <SectionHead
                title={tr("PGR_HOME_PRIORITY", "High priority")}
                sub={tr("PGR_HOME_PRIORITY_SUB", "Your attention is needed")}
                action={
                  <button type="button" onClick={() => go(`/${ctx}/employee/pgr/inbox-v2`)}
                    className="m-0 cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-[hsl(var(--pgrl-primary))]">
                    {tr("PGR_HOME_VIEW_ALL", "View all")} →
                  </button>
                }
              />
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                <PriorityTile icon="eye" hue="danger" label={tr("PGR_HOME_P_OVERDUE", "Overdue")} value={fmt(counts.overdue)} onClick={() => go(`/${ctx}/employee/pgr/inbox-v2`)} />
                <PriorityTile icon="clock" hue="warning" label={tr("PGR_HOME_P_OPEN", "Open")} value={fmt(counts.open)} onClick={() => go(`/${ctx}/employee/pgr/inbox-v2`)} />
                <PriorityTile icon="redo" hue="plum" label={tr("PGR_HOME_P_RESOLVED", "Resolved")} value={fmt(counts.resolved)} onClick={() => go(`/${ctx}/employee/pgr/inbox-v2`)} />
              </div>
            </Panel>
          )}

          {/* quick actions — per-link role filter, NOT the tier */}
          <Panel className="mb-0">
            <SectionHead title={tr("PGR_HOME_ACTIONS", "Quick actions")} sub={tr("PGR_HOME_ACTIONS_SUB", "Common tasks to help you work faster")} />
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {!readOnly && (
                <ActionTile icon="search" hue="brand" onNavigate={go} to={`/${ctx}/employee/pgr/inbox-v2`}
                  title={tr("ACTION_TEST_SEARCH_COMPLAINT", "Search Complaints")} sub={tr("PGR_HOME_A_SEARCH_SUB", "Find and view complaint details")} />
              )}
              {isIntake && (
                <ActionTile icon="plus" hue="leaf" onNavigate={go} to={`/${ctx}/employee/pgr/create-complaint`}
                  title={tr("ACTION_TEST_CREATE_COMPLAINT", "New Complaint")} sub={tr("PGR_HOME_A_CREATE_SUB", "Register on behalf of a citizen")} />
              )}
              {isOversight && (
                <ActionTile icon="shield" hue="plum" onNavigate={go} to={`/${ctx}/employee/pgr/admin-search`}
                  title={tr("ES_PGR_ADMIN_SEARCH", "Admin Search")} sub={tr("PGR_HOME_A_ADMIN_SUB", "Across all departments")} />
              )}
              {readOnly && (
                <ActionTile icon="search" hue="brand" secondary onNavigate={go} to={`/${ctx}/employee/pgr/inbox-v2`}
                  title={tr("ACTION_TEST_SEARCH_COMPLAINT", "Search Complaints")} sub={tr("PGR_HOME_A_READONLY_SUB", "Read-only access")} />
              )}
            </div>
          </Panel>
        </main>
      </div>
    </div>
  );
};

export default EmployeeHomeV2;
