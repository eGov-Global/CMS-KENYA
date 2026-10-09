/* eslint-disable react/prop-types */
// Citizen complaint summary — v2 (Tailwind + shadcn-style chrome).
//
// Strangler-fig replacement for the legacy ComplaintDetails.js. Same
// data hooks (`useComplaintDetails`, `useWorkflowDetails`,
// `useActionWindow` for the reopen window) and same subcomponents
// (TimeLine, ComplaintPhotos, ComplaintLocationMap). Only the visual
// chrome — page header, summary cards, key-value rows, status pill —
// is replaced with the v2 Card / typography / theme tokens used by
// the rest of the modernized citizen surface.

import React, { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "react-query";
import { statusLabel } from "../../utils/statusLabel";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Loader } from "@egovernments/digit-ui-react-components";
import { Toast } from "@egovernments/digit-ui-components";
import { Card } from "@egovernments/digit-ui-components-v2";
import { AlertCircle } from "lucide-react";

import { LOCALIZATION_KEY } from "../../constants/Localization";
import { buildComplaintPath } from "../../utils/complaintHierarchyPath";
import TimelineWrapper from "../../components/TimeLineWrapper";
import useActionWindow from "../../hooks/pgr/useActionWindow";
import ComplaintPhotos from "../../components/ComplaintPhotos";
import ComplaintLocationMap from "../../components/ComplaintLocationMap";
import { buildExtendedAttributeRows, useExtendedAttributeOrder } from "../../components/PgrExtendedAttributesView";
import { EmojiRatingBadge } from "../../components/EmojiRating";
import ReceiptActions from "../../components/ReceiptActions";
import { buildWithdrawRequest, wasReopened } from "../../utils/withdraw";
import { trackApiError } from "../../utils/analytics";
import WithdrawComplaintPopup from "./WithdrawComplaintPopup";

// Terminal (non-active) states across standard PGR *and* the mz.igsae CMS workflow.
// CANCELLED / CLOSEDAFTER* are CMS terminals; without them CANCELLED wrongly showed
// as "open" (active). A fully workflow-driven derivation would read isTerminateState
// off the BusinessService, but that state is not fetched on the citizen detail page,
// so we key off the status name (which the BusinessService states are named after).
const REJECTED_STATUSES = ["REJECTED", "CLOSEDAFTERREJECTION", "CANCELLED"];
const CLOSED_STATUSES = ["RESOLVED", "REJECTED", "CLOSEDAFTERREJECTION", "CLOSEDAFTERRESOLUTION", "CANCELLED"];

function statusToTone(status) {
  if (REJECTED_STATUSES.includes(status)) return "rejected";
  if (CLOSED_STATUSES.includes(status)) return "closed";
  return "open";
}

const TONE_STYLES = {
  open: {
    bg: "var(--color-primary-selected-bg, #FFF4D7)",
    fg: "var(--color-warning, #9E5F00)",
  },
  closed: {
    bg: "var(--color-success-bg, #E8F3EE)",
    fg: "var(--color-success, #00703C)",
  },
  rejected: {
    bg: "var(--color-error-bg, #FAE5E2)",
    fg: "var(--color-error, #d4351c)",
  },
};

function StatusPill({ status, t }) {
  const tone = statusToTone(status);
  const palette = TONE_STYLES[tone];
  // Seeded key is CS_COMMON_PGR_STATE_<STATUS>; the bare form resolves only for
  // a few legacy statuses, so escalated complaints fell through to the
  // tone-bucket word and this pill read "OPEN" on a thrice-escalated complaint.
  // Sentinel fallback keeps the bucket word as the last resort for a status
  // that genuinely has no seeded label.
  const NOT_SEEDED = "\u0000";
  const resolved = statusLabel(t, status, NOT_SEEDED);
  const label = resolved !== NOT_SEEDED ? resolved.toUpperCase() : tone.toUpperCase();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 12px",
        borderRadius: "9999px",
        fontSize: "0.75rem",
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

function SectionTitle({ children }) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: "1rem",
        fontWeight: 600,
        color: "var(--color-primary-1, var(--color-primary-main, #c84c0e))",
      }}
    >
      {children}
    </h2>
  );
}

function DetailRow({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(140px, 200px) 1fr",
        gap: "16px",
        padding: "10px 0",
        borderBottom: "1px solid var(--color-border, #e5e7eb)",
        fontSize: "0.875rem",
        alignItems: "baseline",
      }}
    >
      <div style={{ color: "var(--color-text-secondary, #6B7280)", fontWeight: 500 }}>{label}</div>
      <div style={{ color: "var(--color-text-heading, #363636)", wordBreak: "break-word" }}>
        {value}
      </div>
    </div>
  );
}

// Localization-first with graceful fallbacks, in order: a `name` the hook
// already resolved from the boundary localization module (deterministic — no
// dependence on which screen loaded labels into i18next first), then t(code)
// (the seeding convention), then the humanized fallback — never a raw code.
function localizedOrFallback(t, code, fallback, name) {
  if (name) return name;
  if (!code) return fallback || "";
  const translated = t(String(code));
  return translated && translated !== String(code) ? translated : fallback || String(code);
}

function renderRowValue(val, t) {
  if (Array.isArray(val)) {
    return val
      .map((item) =>
        typeof item === "object" && item
          ? localizedOrFallback(t, item?.code, item?.fallback, item?.name)
          : t(String(item ?? ""))
      )
      .filter(Boolean)
      .join(", ");
  }
  if (val == null || val === "") return "N/A";
  if (typeof val === "object") return localizedOrFallback(t, val?.code, val?.fallback) || "N/A";
  return t(String(val)) || "N/A";
}

function WorkflowComponent({ complaintDetails, id }) {
  const { t } = useTranslation();
  const tenantId =
    Digit.SessionStorage.get("CITIZEN.COMMON.HOME.CITY")?.code ||
    complaintDetails.service.tenantId;

  // Workflow-driven timeline: fetch the raw process instances (same source the
  // employee side uses) and render them via the generic TimelineWrapper. This
  // renders whatever states a BusinessService defines (standard PGR *and* the
  // mz.igsae CMS workflow) with no hardcoded status list, replacing the legacy
  // status-ordered <TimeLine>.
  const { isLoading: isWorkFlowLoading, data: workflowData, revalidate } = Digit.Hooks.useCustomAPIHook({
    // The chronology comes through pgr-services' filtered endpoint — same
    // response shape as the workflow API, but employee comments, attachments
    // and identities are stripped SERVER-SIDE for the citizen instead of only
    // being hidden by TimelineWrapper (the raw workflow API returned everything
    // to the citizen's token).
    url: "/pgr-services/v2/request/_chronology",
    params: { tenantId, history: true, businessIds: id },
    changeQueryName: id,
  });

  // Reopen window: the complaint tenant's RAINMAKER-PGR.UIConstants (REOPENSLA and
  // its actionWindows rule), fetched fresh, against this complaint's own timestamps
  // — the rule pgr-services enforces, so the button and the server agree.
  const reopenWindow = useActionWindow({
    action: "REOPEN",
    tenantId: complaintDetails?.service?.tenantId,
    auditDetails: complaintDetails?.service?.auditDetails,
  });
  // Withdraw window: WITHDRAWSLA counted from filing, same mechanism.
  const withdrawWindow = useActionWindow({
    action: "WITHDRAW",
    tenantId: complaintDetails?.service?.tenantId,
    auditDetails: complaintDetails?.service?.auditDetails,
  });

  const queryClient = useQueryClient();
  const [withdrawPopup, setWithdrawPopup] = useState({ open: false, submitting: false, failed: false });
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  // The popup only confirms; the WITHDRAW update runs here so the page can
  // refresh itself afterwards — status pill (useComplaintDetails), My
  // Complaints and this timeline all move to the closed state without a reload.
  const withdrawComplaint = async (reason) => {
    setWithdrawPopup({ open: true, submitting: true, failed: false });
    try {
      const response = await Digit.PGRService.update(buildWithdrawRequest(complaintDetails.service, reason));
      if (!response?.ServiceWrappers?.length) throw new Error("WITHDRAW update returned no complaint");
    } catch (e) {
      trackApiError("Withdraw", e);
      setWithdrawPopup({ open: true, submitting: false, failed: true });
      return;
    }
    setWithdrawPopup({ open: false, submitting: false, failed: false });
    const successKey = "WITHDRAW_SUCCESSFULLY";
    setToast({ type: "success", label: t(successKey) === successKey ? "Withdrawn Successfully" : t(successKey) });
    refreshComplaint();
    setStatusSettle({ from: complaintDetails?.service?.applicationStatus, attempt: 0 });
  };

  const refreshComplaint = () => {
    queryClient.invalidateQueries(["complaintDetails"]);
    queryClient.invalidateQueries(["complaintsList"]);
    revalidate();
  };
  // pgr-services saves the new status asynchronously (egov-persister), so the search
  // fired right after the update can still return the old one: the status pill stayed on
  // "Pending" next to a "Withdrawn" timeline. Refresh again, backing off, until the
  // complaint no longer reads as it did before the withdrawal (at most five tries).
  const [statusSettle, setStatusSettle] = useState(null);
  const currentStatus = complaintDetails?.service?.applicationStatus;
  useEffect(() => {
    if (!statusSettle) return undefined;
    if (currentStatus !== statusSettle.from || statusSettle.attempt >= 5) {
      setStatusSettle(null);
      return undefined;
    }
    const timer = setTimeout(() => {
      refreshComplaint();
      setStatusSettle((s) => s && { ...s, attempt: s.attempt + 1 });
    }, 800 * (statusSettle.attempt + 1));
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusSettle, currentStatus]);

  useEffect(() => {
    revalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Citizen actions for the CURRENT state (RATE / REOPEN / …) straight from the
  // workflow's nextActions — the legacy <TimeLine> rendered these links inside
  // its Resolved/Rejected checkpoints, so the TimelineWrapper swap dropped them.
  // COMMENT is excluded (no citizen page for it); REOPEN honors the idle-window.
  const current = workflowData?.ProcessInstances?.[0];
  // REOPEN waits for the UIConstants answer (no button that appears and then vanishes)
  // and disappears the moment the window closes, without a reload.
  const reopenAllowed = reopenWindow.ready && reopenWindow.open;
  const citizenActions = (current?.nextActions || [])
    .filter((a) => Array.isArray(a?.roles) && a.roles.includes("CITIZEN"))
    .map((a) => a?.action)
    .filter((a) => a && a !== "COMMENT")
    .filter((a) => a !== "REOPEN" || reopenAllowed)
    // WITHDRAW only inside its window (server-enforced too) and never after a
    // reopen (UI rule) — see utils/withdraw.
    .filter(
      (a) =>
        a !== "WITHDRAW" ||
        (withdrawWindow.ready && withdrawWindow.open && !wasReopened(workflowData?.ProcessInstances))
    );

  // Rendered INSIDE the current-state timeline row (legacy-checkpoint parity):
  // action buttons while actions are open; the given rating once rated.
  const rating = complaintDetails?.service?.rating;
  const currentStateChildren =
    rating || citizenActions.length > 0 ? (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
        {rating ? <EmojiRatingBadge text={t("CS_ADDCOMPLAINT_YOU_RATED")} rating={rating} /> : null}
        {citizenActions
          .filter((action) => !(rating && action === "RATE"))
          .map((action) => {
            const key = `CS_COMMON_${action}`;
            const label = t(key) === key ? action : t(key);
            const isWithdraw = action === "WITHDRAW";
            const button = (
              <button
                type="button"
                // The class is load-bearing: overrides.css restyles every
                // CLASSLESS <button> with text-primary (near-black) !important,
                // which on a dark-green primary read as black-on-green.
                className="pgr-citizen-action-btn"
                onClick={isWithdraw ? () => setWithdrawPopup({ open: true, submitting: false, failed: false }) : undefined}
                style={{
                  padding: "0.4rem 1.1rem",
                  fontWeight: 600,
                  // Same pair the design-system primary button uses; applyTheme
                  // derives a readable text colour when the tenant omits it.
                  color: "var(--color-button-primary-text, #fff)",
                  background: "var(--color-button-primary-bg-default, var(--color-primary-1, var(--color-primary-main, #c84c0e)))",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
            // WITHDRAW is confirmed in a popup on this page; the other citizen
            // actions have their own pages (/reopen, /rate).
            return isWithdraw ? (
              <React.Fragment key={action}>{button}</React.Fragment>
            ) : (
              <Link key={action} to={`/${window?.contextPath || "digit-ui"}/citizen/pgr/${action.toLowerCase()}/${id}`}>
                {button}
              </Link>
            );
          })}
      </div>
    ) : null;

  return (
    <>
      <TimelineWrapper
        businessId={id}
        isWorkFlowLoading={isWorkFlowLoading}
        workflowData={workflowData}
        labelPrefix="WF_PGR_"
        currentStateChildren={currentStateChildren}
        // QA #19 part 1 (sheet v4): the citizen must not see which employee
        // handled the complaint — employee name + contact lines are omitted.
        hideEmployeeContacts
        // Internal department comments (assign, escalate, reassign, …) stay
        // internal; the citizen reads the resolving / rejecting comment only.
        citizenCommentActions={["RESOLVE", "REJECT"]}
      />
      {withdrawPopup.open ? (
        <WithdrawComplaintPopup
          onConfirm={withdrawComplaint}
          onClose={() => setWithdrawPopup({ open: false, submitting: false, failed: false })}
          isSubmitting={withdrawPopup.submitting}
          hasError={withdrawPopup.failed}
        />
      ) : null}
      {toast ? <Toast type={toast.type} label={toast.label} onClose={closeToast} /> : null}
    </>
  );
}

const ComplaintDetailsPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const tenantId =
    Digit.SessionStorage.get("CITIZEN.COMMON.HOME.CITY")?.code ||
    Digit.ULBService.getCurrentTenantId();
  const { isLoading, isError, complaintDetails } = Digit.Hooks.pgr.useComplaintDetails({
    tenantId,
    id,
  });
  // CCSD-2123: schema x-order for the Additional Details card (complainantName
  // is pinned first inside buildExtendedAttributeRows regardless).
  const extAttrOrder = useExtendedAttributeOrder(complaintDetails?.service?.extendedAttributes);

  // Complaint classification hierarchy (configurable N levels). Absent on
  // un-migrated tenants -> buildComplaintPath returns null and the legacy flat
  // Type/Sub-Type rows from `details` are shown unchanged.
  // Single RAINMAKER-PGR.ComplaintHierarchy adjacency list (interior nodes +
  // leaf complaint types). buildComplaintPath finds the leaf (code===serviceCode)
  // and walks parentCode up through these same rows.
  // The hierarchy (nodes + their names) is onboarded at the COMPLAINT'S tenant
  // (e.g. mz.igsae) — not the citizen's home city, which on multi-authority envs
  // is the state root with no such rows. Read it where it lives, else the
  // Type/Sub-Type rows render raw COMPLAINT_HIERARCHY.* keys with no name
  // fallback (nodes absent at the home tenant too).
  const hierarchyTenant = complaintDetails?.service?.tenantId || tenantId;
  const { data: hier } = Digit.Hooks.useCustomMDMS(
    hierarchyTenant,
    "RAINMAKER-PGR",
    [{ name: "ComplaintHierarchyDefinition" }, { name: "ComplaintHierarchy" }],
    {
      cacheTime: Infinity,
      select: (raw) => {
        const defs = (raw?.["RAINMAKER-PGR"]?.ComplaintHierarchyDefinition || []).filter((d) => d?.active !== false);
        const allRows = raw?.["RAINMAKER-PGR"]?.ComplaintHierarchy || [];
        return { defs, allRows };
      },
    },
    // NOTE: this 5th arg switches useCustomMDMS into its v2 branch, which
    // IGNORES the positional tenantId — the tenant must ride inside this
    // object (mdmsv2.tenantId) or the fetch silently uses the logged-in
    // tenant (the citizen's home/state root) no matter what we pass above.
    { schemaCode: "PGR_COMPLAINT_HIERARCHY_DETAILS", tenantId: hierarchyTenant }
  );

  // Pick the hierarchy DEFINITION that owns this complaint's leaf node — a
  // tenant can hold several hierarchies (e.g. the state root aggregates every
  // authority's), and "first def with any rows" mis-picked for complaints of
  // the other authority, collapsing the view to the legacy flat rows.
  const { hierDef, hierNodes } = React.useMemo(() => {
    const defs = hier?.defs || [];
    const allRows = hier?.allRows || [];
    const sc = complaintDetails?.service?.serviceCode;
    const leaf = sc ? allRows.find((n) => n?.code === sc) : null;
    const def =
      (leaf && defs.find((d) => d?.hierarchyType === leaf?.hierarchyType)) ||
      defs.find((d) => allRows.some((n) => n?.hierarchyType === d?.hierarchyType)) ||
      defs[0] ||
      null;
    const nodes = def ? allRows.filter((n) => n?.hierarchyType === def.hierarchyType) : [];
    return { hierDef: def, hierNodes: nodes };
  }, [hier, complaintDetails?.service?.serviceCode]);

  const classification = buildComplaintPath({
    serviceCode: complaintDetails?.service?.serviceCode,
    def: hierDef,
    nodes: hierNodes,
    t,
  });

  const tr = (key, fallback) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  // When a hierarchy applies, the level rows below replace the flat Type/Sub-Type
  // entries the details hook injects — drop those by their displayed label.
  const isFlatTypeRow = (key) => {
    const lbl = String(t(key) || "").toLowerCase().replace(/[-_]+/g, " ").trim();
    return lbl === "complaint type" || lbl === "complaint sub type" || lbl === "complaint subtype";
  };

  const geoLocation = complaintDetails?.service?.address?.geoLocation;
  const address = complaintDetails?.service?.address;
  // QA #31/#25: show ONLY what the complainant typed — no boundary code, no
  // tenant/authority name (those rendered as raw identifiers like
  // "MZ_IGE_ADMIN_hungaro" or appended "…, IGSAE").
  const displayAddress = [
    address?.buildingName,
    address?.street,
    address?.landmark,
    address?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const status = complaintDetails?.service?.applicationStatus;

  return (
    <div
      className="v2-scope"
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
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            margin: 0,
            color: "var(--color-primary-1, var(--color-primary-main, #c84c0e))",
            lineHeight: 1.25,
          }}
        >
          {tr(`${LOCALIZATION_KEY.CS_HEADER}_COMPLAINT_SUMMARY`, "Complaint Summary")}
        </h1>
        {status ? <StatusPill status={status} t={t} /> : null}
        {!isLoading && complaintDetails?.service ? (
          <div style={{ marginLeft: "auto" }}>
            <ReceiptActions complaintDetails={complaintDetails} />
          </div>
        ) : null}
      </header>
      <div
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
        ) : isError || !complaintDetails || Object.keys(complaintDetails).length === 0 ? (
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
                backgroundColor: "var(--color-error-bg, #FAE5E2)",
                color: "var(--color-error, #d4351c)",
              }}
            >
              <AlertCircle style={{ height: "1.5rem", width: "1.5rem" }} />
            </span>
            <h3
              style={{
                margin: 0,
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "var(--color-text-heading, #363636)",
              }}
            >
              {tr("CS_COMPLAINT_DETAILS_LOAD_ERROR", "Couldn't load this complaint")}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "var(--color-text-secondary, #6B7280)",
                maxWidth: "32rem",
              }}
            >
              {tr(
                "CS_COMPLAINT_DETAILS_LOAD_ERROR_DESC",
                "The complaint details aren't reachable right now. Please try refreshing in a moment."
              )}
            </p>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {classification && classification.length > 0 ? (
              <Card style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionTitle>{tr("CS_COMPLAINT_CLASSIFICATION", "Complaint Classification")}</SectionTitle>
                <div>
                  {classification.map((r) => (
                    <DetailRow key={r.levelCode} label={r.label} value={r.value || "N/A"} />
                  ))}
                </div>
              </Card>
            ) : null}

            <Card style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Sub-type already appears as its own "Complaint Sub Type"
                  row below; the redundant header chip was removed. */}
              <SectionTitle>{t("CS_COMPLAINT_DETAILS_COMPLAINT_DETAILS")}</SectionTitle>
              <div>
                {Object.keys(complaintDetails.details)
                  .filter((flag) => !(classification && isFlatTypeRow(flag)))
                  .map((flag) => (
                    <DetailRow
                      key={flag}
                      label={t(flag)}
                      value={renderRowValue(complaintDetails.details[flag], t)}
                    />
                  ))}
                {/* One labelled row per administrative level (County / Sub-
                    County / Ward), root → leaf — employee-page parity
                    (CCRS#927). Labels follow the create-cascade convention
                    (t(`${hierarchyType}_${TYPE}`)) with a humanized fallback;
                    values are t(code) with a humanized-code fallback, so
                    neither ever renders a raw key or a bare numeric code. */}
                {(complaintDetails.boundaryAncestors || []).map((b) => {
                  const levelKey = Digit.Utils.locale.getTransformedLocale(
                    `${b.hierarchyType || "ADMIN"}_${b.boundaryType || ""}`
                  );
                  const humanizedType = String(b.boundaryType || "")
                    .replace(/[_-]+/g, " ")
                    .trim()
                    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
                  const label = t(levelKey) !== levelKey ? t(levelKey) : humanizedType;
                  const humanizedCode = String(b.code || "")
                    .replace(/^(?:[A-Z0-9]+_)+(?=[^A-Z])/, "")
                    .replace(/[_-]+/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <DetailRow
                      key={`boundary-${b.boundaryType}-${b.code}`}
                      label={label}
                      value={localizedOrFallback(t, b.code, humanizedCode, b.name)}
                    />
                  );
                })}
              </div>
              {complaintDetails?.workflow?.verificationDocuments?.length > 0 ? (
                <div style={{ marginTop: "12px" }}>
                  <SectionTitle>{t("CS_COMMON_ATTACHMENTS")}</SectionTitle>
                  <div style={{ marginTop: "12px" }}>
                    <ComplaintPhotos serviceWrapper={complaintDetails} />
                  </div>
                </div>
              ) : null}
            </Card>

            {(() => {
              // Read-only "Additional Details" — just fetch service.extendedAttributes
              // and show it; the backend already returns masked ("****") values.
              const extAttrRows = buildExtendedAttributeRows(complaintDetails?.service?.extendedAttributes, t, extAttrOrder);
              return extAttrRows.length > 0 ? (
                <Card style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <SectionTitle>{tr("CS_COMPLAINT_DETAILS_ADDITIONAL_DETAILS", "Additional Details")}</SectionTitle>
                  <div>
                    {extAttrRows.map((r) => (
                      <DetailRow key={r.fieldKey} label={r.label} value={r.value} />
                    ))}
                  </div>
                </Card>
              ) : null;
            })()}

            {/* Hide the section entirely when there is no REAL pin (issue #26,
                employee-page parity). A complaint saved without coordinates
                comes back as latitude/longitude 0 — JDBC getDouble() turns the
                NULL columns into 0.0 — and Number.isFinite(0) let that sentinel
                render a header pointing at null island. Exact (0,0) is not a
                plausible complaint location for any tenant. */}
            {Number.isFinite(geoLocation?.latitude) &&
            Number.isFinite(geoLocation?.longitude) &&
            !(geoLocation.latitude === 0 && geoLocation.longitude === 0) ? (
              <Card style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionTitle>{t("CS_COMPLAINT_LOCATION")}</SectionTitle>
                <ComplaintLocationMap
                  latitude={geoLocation.latitude}
                  longitude={geoLocation.longitude}
                  address={displayAddress}
                />
              </Card>
            ) : null}

            <Card style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <SectionTitle>
                {tr(`${LOCALIZATION_KEY.CS_COMMON}_TIMELINE`, "Activity timeline")}
              </SectionTitle>
              {complaintDetails?.service ? (
                <WorkflowComponent complaintDetails={complaintDetails} id={id} />
              ) : null}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintDetailsPage;
