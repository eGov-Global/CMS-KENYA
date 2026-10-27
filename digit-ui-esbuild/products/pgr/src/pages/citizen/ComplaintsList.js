/* eslint-disable react/prop-types */
// Citizen "My Complaints" list — v2 (Tailwind + shadcn-style chrome).
//
// Strangler-fig replacement for the legacy ComplaintsList.js (which
// rendered react-components Cards + the per-item <Complaint /> tile).
// Data layer is preserved — the same complaints-list query, same
// ServiceWrapper shape, same revalidate-on-mount cadence.
//
// What changes:
//   - v2 page chrome: header row with brand-tinted title + "File new
//     complaint" primary CTA on the right.
//   - List area is the only scrollable region (flex: 1, overflow-y),
//     so the page footer stays pinned at the viewport bottom.
//   - Each complaint is a v2 Card showing: service category, complaint
//     id, created date, plus a colored status pill (open / closed /
//     rejected) on the right. Click anywhere to drill in.
//   - Empty + error states use the same Card surface and theme colors
//     instead of the legacy raw <Card> with text.
//   - Upstream's My Complaints search, count and paging (v2.12.1) on these
//     cards: a search over the complaint number, type, category and
//     description, newest first, ten to a page.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { complaintLabel } from "../../utils/complaintLabel";
import { statusLabel } from "../../utils/statusLabel";
import { isVisibleOnEntrance } from "../../utils/testingTenant";
import { pageOf, searchComplaints } from "../../utils/citizenComplaints";
import { EV, trackE } from "../../utils/analytics";
import { useTranslation } from "react-i18next";
import { useHistory, useRouteMatch } from "react-router-dom";

import { Loader } from "@egovernments/digit-ui-react-components";
import { Button, Card, Input } from "@egovernments/digit-ui-components-v2";
import { ChevronLeft, ChevronRight, FilePlus2, Inbox, Search } from "lucide-react";
import { LOCALE, LOCALIZATION_KEY } from "../../constants/Localization";

const PAGE_SIZE = 10;
// pgr-services' largest page (pgr.search.max.limit). Without a limit the search
// returns its default 100, and the search and pages here only see what it returns.
const FETCH_LIMIT = 200;
// The search and page, kept for the tab so Back from a complaint returns to
// the same view rather than the first page. Only Back, Forward and a reload
// restore it: opening My Complaints afresh starts clean. Upstream's key.
const VIEW_KEY = "pgr.citizen.my-complaints.view";
const FRESH_VIEW = { query: "", page: 1 };

// The saved view names its citizen: a session expiry clears only the auth keys
// from sessionStorage, so the next person to sign in on this tab would
// otherwise be shown the previous one's search.
function readView(owner) {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(VIEW_KEY) || "null");
    if (!saved || saved.owner !== owner) return FRESH_VIEW;
    return { query: typeof saved.query === "string" ? saved.query : "", page: Number(saved.page) || 1 };
  } catch (e) {
    return FRESH_VIEW;
  }
}

// Terminal states across standard PGR + the mz.igsae CMS workflow (CANCELLED/CLOSEDAFTER*
// are CMS terminals). Keyed by status name — see ComplaintDetails.js for the rationale.
const CLOSED_STATUSES = ["RESOLVED", "REJECTED", "CLOSEDAFTERREJECTION", "CLOSEDAFTERRESOLUTION", "CANCELLED"];
const REJECTED_STATUSES = ["REJECTED", "CLOSEDAFTERREJECTION", "CANCELLED"];

function statusToTone(status) {
  if (REJECTED_STATUSES.includes(status)) return "rejected";
  if (CLOSED_STATUSES.includes(status)) return "closed";
  return "open";
}

const TONE_STYLES = {
  open: {
    bg: "var(--color-primary-selected-bg, #FFF4D7)",
    fg: "var(--color-warning, #9E5F00)",
    label: "OPEN",
  },
  closed: {
    bg: "var(--color-success-bg, #E8F3EE)",
    fg: "var(--color-success, #00703C)",
    label: "CLOSED",
  },
  rejected: {
    bg: "var(--color-error-bg, #FAE5E2)",
    fg: "var(--color-error, #d4351c)",
    label: "REJECTED",
  },
};

function StatusPill({ status, t }) {
  const tone = statusToTone(status);
  const palette = TONE_STYLES[tone];
  // QA #17: label with the FULL workflow status so the card and the opened
  // complaint always agree; the 3-way tone bucket drives the pill COLOR only.
  //
  // Resolve through statusLabel: the seeded key is CS_COMMON_PGR_STATE_<STATUS>,
  // and the bare CS_COMMON_<STATUS> this used to ask for only exists for a few
  // legacy statuses. Escalated complaints fell through to the tone-bucket word
  // below and displayed as "OPEN" despite having escalated three times.
  // Sentinel fallback (not the raw status) so we can still tell "not seeded"
  // apart from a real label and keep the bucket word as the last resort.
  const NOT_SEEDED = "\u0000";
  const resolved = statusLabel(t, status, NOT_SEEDED);
  let label;
  if (resolved !== NOT_SEEDED) {
    label = resolved.toUpperCase();
  } else {
    const labelKey = `CS_COMMON_${palette.label}`;
    const translated = t(labelKey);
    label = translated === labelKey ? palette.label : translated.toUpperCase();
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: "9999px",
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
        backgroundColor: palette.bg,
        color: palette.fg,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// The list aggregates complaints across authority tenants (mz.ige/mz.igsae/…)
// while the list-level serviceDefs are fetched at the CITIZEN's tenant — so
// foreign complaints missed the map and rendered the raw serviceCode. Fetch
// the hierarchy at each complaint's OWN tenant (same read-at-complaint-tenant
// fix as the details page), once per tenant. It is read here rather than in
// the row because the search has to match those names on every page, and only
// the shown page's rows render. NOTE the useCustomMDMS v2 quirk: the tenant
// must ride inside the 5th (mdmsv2) arg — the positional one is ignored.
function TenantHierarchy({ tenantId, onLoad }) {
  const { data } = Digit.Hooks.useCustomMDMS(
    tenantId,
    "RAINMAKER-PGR",
    [{ name: "ComplaintHierarchy" }],
    {
      cacheTime: Infinity,
      enabled: !!tenantId,
      select: (raw) => raw?.["RAINMAKER-PGR"]?.ComplaintHierarchy || [],
    },
    { schemaCode: "PGR_COMPLAINT_HIERARCHY_DETAILS", tenantId }
  );
  useEffect(() => {
    if (Array.isArray(data)) onLoad(tenantId, data);
  }, [data, tenantId, onLoad]);
  return null;
}

/**
 * The citizen's complaints as the cards show them and the search matches them,
 * so a complaint is found by the words on its card.
 *
 * Entrance scoping for the testing tenant comes first, so the search, the
 * count and the pages all agree: the citizen "my complaints" search runs at
 * the STATE tenant, which spans every child tenant — so a tester who used a
 * personal mobile on the testing entrance would otherwise see TST- rows mixed
 * into their real list here. The prod entrance drops testing-tenant rows; the
 * testing entrance lists ONLY them. Which tenants are "testing" comes from the
 * isTestingTenant flag (config fallback) — see utils/testingTenant.
 * Deployments without a testing setup are untouched.
 *
 * Card title = the LEAF complaint type (what the citizen actually filed —
 * "Operating without a licence"), not a hierarchy ancestor: on a personal
 * list the specific type is how people recognize their complaint, while the
 * 1st level ("Business") would render near-identical cards. Key-based
 * localization (COMPLAINT_HIERARCHY.<code>) with the node name as fallback —
 * the complaint's own tenant's node, else the citizen tenant's serviceDefs,
 * else the cached code→name map; OTHERS when nothing resolves. The leaf's
 * parent is the category, which the search matches but the card doesn't show.
 */
export function complaintRows(wrappers, { t, nodesByTenant = {}, defsByCode = {}, namesByCode = {} } = {}) {
  return (Array.isArray(wrappers) ? wrappers : [])
    .map((wrapper) => wrapper?.service)
    .filter((service) => service && isVisibleOnEntrance(service.tenantId))
    .map((service) => {
      const nodes = nodesByTenant[service.tenantId] || [];
      const own = nodes.find((n) => n?.code === service.serviceCode);
      const def = defsByCode[service.serviceCode];
      const parentCode = own ? own.parentCode : def?.menuPath;
      const parentName = own ? nodes.find((n) => n?.code === own.parentCode)?.name : def?.menuPathName;
      return {
        id: service.serviceRequestId,
        concern:
          complaintLabel(t, service.serviceCode, own?.name || def?.name || namesByCode[service.serviceCode]) ||
          t("CS_COMPLAINT_TYPE_OTHERS"),
        category: parentCode ? complaintLabel(t, parentCode, parentName) : "",
        description: service.description || "",
        createdTime: service.auditDetails?.createdTime || 0,
        service,
      };
    });
}

function ComplaintRow({ data, onClick, t, title }) {
  const { serviceRequestId, applicationStatus, auditDetails } = data;
  const dateStr = auditDetails?.createdTime
    ? Digit.DateUtils.ConvertTimestampToDate(auditDetails.createdTime)
    : "";
  return (
    <Card
      role="button"
      tabIndex={0}
      data-analytics-event="pgr.my-complaints.open"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        cursor: "pointer",
        transition: "border-color 0.15s ease-out, box-shadow 0.15s ease-out, transform 0.05s ease-out",
        padding: "16px 20px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor =
          "var(--color-primary-1, var(--color-primary-main, #c84c0e))";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "6px",
              flexWrap: "wrap",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "var(--color-primary-1, var(--color-primary-main, #c84c0e))",
              }}
            >
              {title}
            </h3>
            <StatusPill status={applicationStatus} t={t} />
          </div>
          <div
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-text-secondary, #6B7280)",
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <span>
              <span style={{ fontWeight: 500, color: "var(--color-text-heading, #363636)" }}>
                {t(`${LOCALIZATION_KEY.CS_COMMON}_COMPLAINT_NO`)}:
              </span>{" "}
              {serviceRequestId}
            </span>
            {dateStr ? <span>{dateStr}</span> : null}
            {/* QA #17: bottom state line removed — the title pill now carries
                the full workflow status, so this duplicate (and previously
                contradictory) line is gone. */}
          </div>
        </div>
        <ChevronRight
          aria-hidden
          style={{
            height: "1.25rem",
            width: "1.25rem",
            flexShrink: 0,
            color: "var(--color-text-secondary, #9CA3AF)",
          }}
        />
      </div>
    </Card>
  );
}

function EmptyState({ icon, title, body, action }) {
  return (
    <Card
      style={{
        padding: "48px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          height: "3rem",
          width: "3rem",
          borderRadius: "9999px",
          backgroundColor: "var(--color-primary-selected-bg, #FFF4D7)",
          color: "var(--color-primary-1, var(--color-primary-main, #c84c0e))",
        }}
      >
        {icon}
      </span>
      <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "var(--color-text-heading, #363636)" }}>
        {title}
      </h3>
      {body ? (
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary, #6B7280)", maxWidth: "32rem" }}>
          {body}
        </p>
      ) : null}
      {action}
    </Card>
  );
}

export const ComplaintsList = () => {
  const User = Digit.UserService.getUser();
  const mobileNumber =
    User?.mobileNumber || User?.info?.mobileNumber || User?.info?.userInfo?.mobileNumber;
  const tenantId =
    Digit.SessionStorage.get("CITIZEN.COMMON.HOME.CITY")?.code ||
    Digit.ULBService.getCurrentTenantId();
  const { t } = useTranslation();
  const history = useHistory();
  const { path } = useRouteMatch();
  const { isLoading, error, data, revalidate } = Digit.Hooks.pgr.useComplaintsList(tenantId, {
    mobileNumber,
    limit: FETCH_LIMIT,
  });

  // serviceCode → the LEAF's def (its name, and its parent as menuPath /
  // menuPathName), as a mount-time fallback while each tenant's own hierarchy
  // fetch resolves (only helps complaints filed at the citizen's tenant;
  // foreign-tenant rows resolve via TenantHierarchy).
  const serviceDefs = Digit.Hooks.pgr.useServiceDefs(tenantId, "PGR");
  const typeBySvcCode = React.useMemo(() => {
    const map = {};
    (serviceDefs || []).forEach((def) => {
      if (def?.serviceCode) map[def.serviceCode] = def;
    });
    return map;
  }, [serviceDefs]);

  const [nodesByTenant, setNodesByTenant] = useState({});
  const onHierarchy = useCallback((hierarchyTenant, nodes) => {
    setNodesByTenant((prev) => (prev[hierarchyTenant] === nodes ? prev : { ...prev, [hierarchyTenant]: nodes }));
  }, []);

  const owner = User?.info?.uuid;
  const [initialView] = useState(() => (history.action === "POP" ? readView(owner) : FRESH_VIEW));
  const [query, setQuery] = useState(initialView.query);
  const [page, setPage] = useState(initialView.page);
  const listRef = useRef(null);

  useEffect(() => {
    revalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new search starts from its first page; the one restored on return
  // keeps its page.
  const restoredQuery = useRef(query);
  useEffect(() => {
    if (query !== restoredQuery.current) setPage(1);
    restoredQuery.current = null;
  }, [query]);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(VIEW_KEY, JSON.stringify({ query, page, owner }));
    } catch (e) {
      // Storage blocked: the view just isn't kept.
    }
  }, [query, page, owner]);

  const goCreate = () => history.push(`/${window.contextPath}/citizen/pgr/create-complaint`);

  const tr = (key, fallback) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const rows = useMemo(
    () =>
      complaintRows(data?.ServiceWrappers, {
        t,
        nodesByTenant,
        defsByCode: typeBySvcCode,
        namesByCode: Digit.SessionStorage.get("complaintHierarchyNameByCode") || {},
      }),
    [data, nodesByTenant, typeBySvcCode, t]
  );
  const rowTenants = useMemo(() => [...new Set(rows.map((row) => row.service.tenantId).filter(Boolean))], [rows]);
  const matches = useMemo(() => searchComplaints(rows, query), [rows, query]);
  const shown = pageOf(matches, page, PAGE_SIZE);
  const searching = query.trim().length > 0;

  // The list region is the scroller: without this, Next from the bottom of a
  // page lands at the bottom of the next one.
  const goToPage = (next) => {
    setPage(next);
    if (listRef.current) listRef.current.scrollTop = 0;
  };

  const searchLabel = tr("CS_MY_COMPLAINTS_SEARCH", "Search for a complaint");
  const countLabel =
    matches.length === 1
      ? tr("CS_MY_COMPLAINTS_COUNT_ONE", "1 complaint")
      : tr("CS_MY_COMPLAINTS_COUNT", "{count} complaints").replace("{count}", matches.length);
  const range = tr("CS_MY_COMPLAINTS_RANGE", "{from}–{to} of {total}")
    .replace("{from}", shown.from)
    .replace("{to}", shown.to)
    .replace("{total}", shown.total);

  return (
    <div
      className="v2-scope cms-complaints"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
        width: "100%",
      }}
    >
      <header
        style={{
          padding: "1rem 1.5rem 0.5rem 1.5rem",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 12px" }}>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              margin: 0,
              color: "var(--color-primary-1, var(--color-primary-main, #c84c0e))",
              lineHeight: 1.25,
            }}
          >
            {tr(LOCALE.MY_COMPLAINTS, "My Complaints")}
          </h1>
          {!isLoading && !error && rows.length ? (
            <span
              aria-live="polite"
              style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-secondary, #6B7280)" }}
            >
              {countLabel}
            </span>
          ) : null}
        </div>
        <Button onClick={goCreate} leading={<FilePlus2 className="h-4 w-4" />}>
          {tr("CS_COMMON_FILE_A_COMPLAINT", "File a Complaint")}
        </Button>
      </header>
      {rowTenants.map((rowTenant) => (
        <TenantHierarchy key={rowTenant} tenantId={rowTenant} onLoad={onHierarchy} />
      ))}
      <div
        ref={listRef}
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          padding: "0.5rem 1.5rem 1.5rem 1.5rem",
        }}
      >
        {isLoading ? (
          <div style={{ padding: "32px 0" }}>
            <Loader />
          </div>
        ) : error ? (
          <EmptyState
            icon={<Inbox style={{ height: "1.5rem", width: "1.5rem" }} />}
            title={tr("CS_COMMON_ERROR_LOADING_TITLE", "Couldn't load your complaints")}
            body={tr(LOCALE.ERROR_LOADING_RESULTS, "Please try again in a moment.")}
            action={
              <Button variant="outline" onClick={revalidate}>
                {tr("CS_COMMON_RETRY", "Retry")}
              </Button>
            }
          />
        ) : !rows.length ? (
          <EmptyState
            icon={<Inbox style={{ height: "1.5rem", width: "1.5rem" }} />}
            title={tr("CS_NO_COMPLAINTS_TITLE", "No complaints yet")}
            body={tr(LOCALE.NO_COMPLAINTS, "You haven't filed any complaints. File one and we'll route it to the right team.")}
            action={
              <Button onClick={goCreate} leading={<FilePlus2 className="h-4 w-4" />}>
                {tr("CS_COMMON_FILE_A_COMPLAINT", "File a Complaint")}
              </Button>
            }
          />
        ) : (
          <>
            {/* Upstream's search-box classes (overrides.css). The root's
                cms-complaints class is what lets the field's room for the icon
                beat the global search-input padding rule. */}
            <div className="cms-complaints-search">
              <Search aria-hidden className="cms-complaints-search-icon" />
              <Input
                type="search"
                data-matomo-mask
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => {
                  if (!searching) return;
                  trackE(EV.SEARCH_STARTED, "MyComplaints", matches.length);
                  if (!matches.length) trackE(EV.SEARCH_NO_RESULTS, "MyComplaints");
                }}
                placeholder={searchLabel}
                aria-label={searchLabel}
                className="cms-complaints-search-field"
              />
            </div>
            {!matches.length ? (
              <EmptyState
                icon={<Search style={{ height: "1.5rem", width: "1.5rem" }} />}
                title={tr("CS_MY_COMPLAINTS_NO_MATCH_TITLE", "No complaints match your search")}
                body={tr("CS_MY_COMPLAINTS_NO_MATCH_BODY", "Try a complaint number, or a word from the description.")}
                action={
                  <Button
                    variant="outline"
                    data-analytics-event="pgr.my-complaints.clear-search"
                    onClick={() => setQuery("")}
                  >
                    {tr("CS_MY_COMPLAINTS_CLEAR_SEARCH", "Clear search")}
                  </Button>
                }
              />
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {shown.rows.map((row) => (
                    <ComplaintRow
                      key={row.id}
                      data={row.service}
                      t={t}
                      title={row.concern}
                      onClick={() => history.push(`${path}/${row.id}`)}
                    />
                  ))}
                </div>
                {shown.pages > 1 ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "12px",
                      marginTop: "16px",
                    }}
                  >
                    <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary, #6B7280)" }}>{range}</span>
                    <span style={{ display: "inline-flex", gap: "8px" }}>
                      <Button
                        variant="outline"
                        leading={<ChevronLeft className="h-4 w-4" />}
                        disabled={shown.page <= 1}
                        onClick={() => goToPage(shown.page - 1)}
                        data-analytics-event="pgr.my-complaints.page"
                        data-analytics-label="previous"
                      >
                        {tr("CS_COMMON_PREVIOUS", "Previous")}
                      </Button>
                      <Button
                        variant="outline"
                        trailing={<ChevronRight className="h-4 w-4" />}
                        disabled={shown.page >= shown.pages}
                        onClick={() => goToPage(shown.page + 1)}
                        data-analytics-event="pgr.my-complaints.page"
                        data-analytics-label="next"
                      >
                        {tr("CS_COMMON_NEXT", "Next")}
                      </Button>
                    </span>
                  </div>
                ) : null}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ComplaintsList;
