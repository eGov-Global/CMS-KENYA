/* eslint-disable react/prop-types */
// Citizen complaint-submitted response — v2 (Tailwind + shadcn-style chrome).
//
// Strangler-fig replacement for the legacy Response.js (which rendered a
// <Banner> + <CardText> + <SubmitBar> via react-components). Same redux
// data flow (`state.pgr.complaints.response`), same action-message
// switch (CREATE / REOPEN / RATE / failure), same SessionStorage cleanup
// — only the chrome is replaced with a big success card carrying a
// brand-tinted icon, the complaint ID as a copyable chip, contextual
// "what next" copy, and a primary CTA back to the citizen home plus a
// quieter outline CTA to view the complaint detail when applicable.
//
// After a new filing the card also lists what was filed (category, location,
// time, photos). That summary arrives in the route's state from the filing
// flow — the create response carries only codes.
//
// Failure path keeps the same shape with a destructive-toned icon and
// a "Try again" CTA back to the create flow.
//
// Note: filename is `Response.js` (matches the registry entry
// `PGRResponseCitzen` / Module.js import) — kept JS so we can reuse
// the same component without retooling the registry.

import React from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { CheckCircle2, AlertCircle, Eye, Check, Copy } from "lucide-react";
import { Button, Card } from "@egovernments/digit-ui-components-v2";
import ReceiptActions from "../../components/ReceiptActions";

// PGR `_update` returns `ResponseInfo` (capital R); accept either casing.
const hasUpdatePayload = (complaints) =>
  !!complaints?.response &&
  (complaints.response.ResponseInfo || complaints.response.responseInfo) &&
  Array.isArray(complaints.response.ServiceWrappers) &&
  complaints.response.ServiceWrappers.length > 0;

function getActionMessageKey(action) {
  switch (action) {
    case "REOPEN":
      return "CS_COMMON_COMPLAINT_REOPENED";
    case "RATE":
      return "CS_COMMON_THANK_YOU";
    default:
      return "CS_COMMON_COMPLAINT_SUBMITTED";
  }
}

function StatusIcon({ tone }) {
  const palette =
    tone === "success"
      ? {
          bg: "var(--color-success-bg, #E8F3EE)",
          fg: "var(--color-success, #00703C)",
          Icon: CheckCircle2,
        }
      : {
          bg: "var(--color-error-bg, #FAE5E2)",
          fg: "var(--color-error, #d4351c)",
          Icon: AlertCircle,
        };
  const Icon = palette.Icon;
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: "4rem",
        width: "4rem",
        borderRadius: "9999px",
        backgroundColor: palette.bg,
        color: palette.fg,
        flexShrink: 0,
      }}
    >
      <Icon style={{ height: "2.25rem", width: "2.25rem" }} />
    </span>
  );
}

function ComplaintIdChip({ id }) {
  if (!id) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 14px",
        borderRadius: "9999px",
        backgroundColor: "var(--color-primary-selected-bg, #FFF4D7)",
        color: "var(--color-primary-1, var(--color-primary-main, #c84c0e))",
        fontSize: "0.8125rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      <span style={{ color: "var(--color-text-secondary, #6B7280)", fontWeight: 500 }}>ID</span>
      <span>{id}</span>
    </div>
  );
}

// Upstream's ComplaintNumber copy control; the chip carries the number here.
function CopyIdButton({ id, tr }) {
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
    } catch {
      // No clipboard permission: the number stays selectable.
    }
  };
  const Icon = copied ? Check : Copy;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={copy}
      aria-live="polite"
      leading={<Icon className="h-4 w-4" />}
      data-analytics-event="pgr.complaint.response-copy-number"
    >
      {copied ? tr("CS_COMMON_COPIED", "Copied") : tr("CS_COMMON_COPY", "Copy")}
    </Button>
  );
}

/** "Today, 10:42" for today, else the date and time. */
function filedOn(ts, tr) {
  const when = new Date(ts);
  const time = when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (when.toDateString() === new Date().toDateString()) {
    return `${tr("CS_FILE_TODAY", "Today")}, ${time}`;
  }
  return `${when.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}, ${time}`;
}

const Response = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const appState = useSelector((state) => state)["pgr"] || {};
  const { complaints } = appState;
  const summary = location.state?.filedSummary;

  React.useEffect(() => {
    if (appState.complaints?.response?.ServiceWrappers?.length > 0) {
      Digit.SessionStorage.del("PGR_MAP_LOCATION");
    }
  }, [appState]);

  const tr = (key, fallback) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const success = hasUpdatePayload(complaints);
  const wrapper = success ? complaints.response.ServiceWrappers[0] : null;
  const action = wrapper?.workflow?.action;
  const complaintId = wrapper?.service?.serviceRequestId;
  const filed = success && action !== "REOPEN" && action !== "RATE";

  // /response is ONE route serving four different outcomes — canonicalise the
  // URL to /response/{created|reopened|rated|failed} (history.replace, once)
  // so the outcome is an ordinary tracked pageview and a real location. A
  // virtual pageview here double-counted the page (outcome + bare /response
  // in the visits log); the replace coalesces to one. The flows await the
  // update before navigating here, so the first render's redux slice is
  // already the settled outcome. No id, no complaint data in the URL. The
  // route state (the filing summary) is handed on: a bare replace drops it,
  // and the route remounts on the new URL.
  const outcome = !success ? "failed" : action === "REOPEN" ? "reopened" : action === "RATE" ? "rated" : "created";
  React.useEffect(() => {
    const base = `/${window?.contextPath}/citizen/pgr/response`;
    if (history.location?.pathname === base || history.location?.pathname === `${base}/`) {
      history.replace(`${base}/${outcome}`, history.location?.state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headlineKey = success
    ? getActionMessageKey(action)
    : "CS_COMMON_COMPLAINT_NOT_SUBMITTED";
  const headline = tr(
    headlineKey,
    success
      ? action === "REOPEN"
        ? "Complaint reopened"
        : action === "RATE"
        ? "Thank you for the rating"
        : "Complaint submitted"
      : "Complaint couldn't be submitted"
  );
  const supportingKey = success
    ? action === "RATE"
      ? "CS_COMMON_RATING_SUBMIT_TEXT"
      : "CS_COMMON_TRACK_COMPLAINT_TEXT"
    : "CS_COMMON_COMPLAINT_SUBMIT_RETRY";
  const supporting = tr(
    supportingKey,
    success
      ? action === "RATE"
        ? "Your rating has been submitted."
        : "We've routed your complaint to the right team. You can track it from My Complaints."
      : "Something went wrong while submitting your complaint. Please try again."
  );

  const goHome = `/${window?.contextPath}/citizen/all-services`;
  const goDetail = complaintId
    ? `/${window?.contextPath}/citizen/pgr/complaints/${complaintId}`
    : null;
  const retryFlow = `/${window?.contextPath}/citizen/pgr/create-complaint`;

  const rows =
    filed && summary
      ? [
          [tr("CS_FILE_CATEGORY_LABEL", "Complaint Category"), summary.category || "—"],
          [tr("CS_FILE_STEP_LOCATION", "Location"), summary.location || "—"],
          [tr("CS_FILE_FILED_ON", "Filed on"), summary.filedAt ? filedOn(summary.filedAt, tr) : "—"],
          [
            tr("CS_FILE_ATTACHMENTS", "Attachments"),
            summary.photos == null
              ? "—"
              : summary.photos
              ? tr(
                  summary.photos === 1 ? "CS_FILE_ONE_PHOTO" : "CS_FILE_N_PHOTOS",
                  // "attachment": documents and videos count too, as on the Review step.
                  summary.photos === 1 ? "1 attachment" : "{count} attachments"
                ).replace("{count}", String(summary.photos))
              : tr("CS_FILE_NONE", "None"),
          ],
        ]
      : [];

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
      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          padding: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Card
          style={{
            width: "100%",
            maxWidth: "560px",
            padding: "40px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            textAlign: "center",
          }}
        >
          <StatusIcon tone={success ? "success" : "error"} />
          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--color-text-heading, #363636)",
              lineHeight: 1.25,
            }}
          >
            {headline}
          </h1>
          {complaintId ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <ComplaintIdChip id={complaintId} />
              <CopyIdButton id={complaintId} tr={tr} />
            </div>
          ) : null}
          <p
            style={{
              margin: 0,
              fontSize: "0.9375rem",
              color: "var(--color-text-secondary, #6B7280)",
              maxWidth: "36rem",
              lineHeight: 1.5,
            }}
          >
            {supporting}
          </p>
          {rows.length ? (
            <dl
              style={{
                width: "100%",
                margin: 0,
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                border: "1px solid var(--color-border, #e5e7eb)",
                borderRadius: "var(--v2-radius, 0.5rem)",
                fontSize: "0.875rem",
                lineHeight: 1.5,
                textAlign: "start",
              }}
            >
              {rows.map(([label, value]) => (
                // Label and value share a line while both fit and stack on a
                // phone; the value's 999 grow takes the spare width, keeping the
                // labels one column.
                <div key={label} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 16px" }}>
                  <dt style={{ flex: "1 1 9rem", color: "var(--color-text-secondary, #6B7280)", fontWeight: 500 }}>
                    {label}
                  </dt>
                  <dd
                    data-matomo-mask
                    style={{
                      flex: "999 1 12rem",
                      minWidth: 0,
                      margin: 0,
                      color: "var(--color-text-heading, #363636)",
                      wordBreak: "break-word",
                    }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {success && goDetail ? (
              <Button
                variant="outline"
                onClick={() => history.push(goDetail)}
                leading={<Eye className="h-4 w-4" />}
              >
                {tr("CS_COMMON_VIEW_COMPLAINT", "View Complaint")}
              </Button>
            ) : !success ? (
              <Button variant="outline" onClick={() => history.push(retryFlow)}>
                {tr("CS_COMMON_TRY_AGAIN", "Try Again")}
              </Button>
            ) : null}
            {success && action !== "RATE" && complaintId ? (
              // Only the created ServiceWrapper is in redux here, and printing
              // that alone yields a receipt with nothing but the ID — so hand
              // over the id and let the component load the same full record
              // the detail page shows.
              <ReceiptActions complaintId={complaintId} tenantId={wrapper?.service?.tenantId} />
            ) : null}
            <Link to={goHome} style={{ textDecoration: "none" }}>
              <Button>{tr("CORE_COMMON_GO_TO_HOME", "Go to Home")}</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Response;
