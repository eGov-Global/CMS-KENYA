/* eslint-disable react/prop-types */
// Receipt actions for a complaint: Download, Print and Share — on the citizen
// and employee "complaint submitted" screens and both complaint detail pages.
//
// The PDF is drawn locally from data already in memory (see
// utils/complaintReceipt), so Download works on a dropped connection. The only
// network call is the optional tenant logo, fetched with a short timeout and
// omitted on failure. Share hands the PDF to the native share sheet where the
// device supports file sharing, otherwise the complaint number + tracking link.

import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Printer, Share2 } from "lucide-react";
import { Button } from "@egovernments/digit-ui-components-v2";

import { RECEIPT_FALLBACKS } from "../utils/receiptCopy";
import useComplaintReceiptModel from "../hooks/pgr/useComplaintReceiptModel";

// jsPDF (and the drawing code) is a separate chunk fetched on the first click —
// most sessions never download a receipt. Cached by the module system after that.
const loadReceipt = () => import("../utils/complaintReceipt");

export const RECEIPT_ACTION_FALLBACKS = {
  print: "Print Receipt",
  share: "Share",
  shareRetry: "Sharing was interrupted — tap Share again.",
  shareText: "Complaint {id} filed with {tenant}. Track it here:",
  copied: "Link copied — paste it anywhere to share.",
  unavailable: "Sharing is not available on this device — download the receipt instead.",
};

const ALL_ACTIONS = ["download", "print", "share"];

// Logos are cached per URL for the session: the detail page and the success
// screen would otherwise refetch the same image on every click.
const logoCache = new Map();

// dd/MM/yyyy HH:mm, deliberately locale-neutral (the platform's time helper
// emits an English AM/PM suffix).
const stampNow = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${Digit.DateUtils.ConvertEpochToDate(now.getTime())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const getLogo = async (url) => {
  if (!url) return null;
  if (logoCache.has(url)) return logoCache.get(url);
  const { fetchLogoDataUri } = await loadReceipt();
  const uri = await fetchLogoDataUri(url);
  logoCache.set(url, uri);
  return uri;
};

/** The surface the user is on decides which details route the share link opens. */
const trackingUrl = (id) => {
  const ctx = window.contextPath || "digit-ui";
  const employee = /\/employee\//.test(window.location.pathname);
  const path = employee ? `/${ctx}/employee/pgr/complaint-details/${id}` : `/${ctx}/citizen/pgr/complaints/${id}`;
  return `${window.location.origin}${path}`;
};

/**
 * Outer shell: resolves the complaint record (fetching it when only an id was
 * given) and mounts the buttons only once the record exists, so the inner
 * component's MDMS read runs with the complaint's own tenant from its first
 * render (cache key and hierarchy lookup both depend on it).
 */
const ReceiptActions = ({
  complaintDetails: providedDetails,
  complaintId,
  tenantId,
  actions = ALL_ACTIONS,
  variant = "outline",
  className,
}) => {
  const { t } = useTranslation();

  const shouldFetch = !providedDetails && !!complaintId;
  const { complaintDetails: fetchedDetails, revalidate } = Digit.Hooks.pgr.useComplaintDetails({
    tenantId: tenantId || Digit.ULBService.getCurrentTenantId(),
    id: complaintId,
    enabled: shouldFetch,
  });
  const complaintDetails = providedDetails || fetchedDetails || null;

  // Right after a create the complaint is not yet searchable (persistence is
  // asynchronous), so the first fetch legitimately resolves EMPTY and
  // react-query caches it as a success. Re-poll with backoff until the record
  // appears; give up quietly after that (buttons stay disabled). The attempt
  // counter is state, not a ref: react-query hands back the SAME empty object
  // on every refetch, so nothing else would re-run this effect.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!shouldFetch || complaintDetails?.service || !fetchedDetails || attempt >= 5) return undefined;
    const timer = setTimeout(() => {
      revalidate();
      setAttempt((n) => n + 1);
    }, 1200 * (attempt + 1));
    return () => clearTimeout(timer);
    // revalidate is a fresh closure each render; the attempt counter paces the loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFetch, fetchedDetails, complaintDetails?.service, attempt]);

  if (!complaintDetails?.service) {
    const label = t("PGR_RECEIPT_DOWNLOAD");
    return (
      <div className={className}>
        <Button variant={variant} type="button" disabled leading={<Download className="h-4 w-4" />}>
          {label === "PGR_RECEIPT_DOWNLOAD" ? RECEIPT_FALLBACKS.downloadLabel : label}
        </Button>
      </div>
    );
  }
  return <ReceiptActionsReady complaintDetails={complaintDetails} actions={actions} variant={variant} className={className} />;
};

const ReceiptActionsReady = ({ complaintDetails, actions, variant, className }) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(null); // which action is running
  const [notice, setNotice] = useState(null); // { tone: "error" | "info", text }

  const { service, details, classification, extendedRows } = useComplaintReceiptModel(complaintDetails);

  // The receipt chunk and the tenant logo are fetched as soon as the user shows
  // intent (hover / focus / touch) rather than on the click itself: the Web
  // Share API must be called inside the click's user-activation window, and a
  // slow link would otherwise spend it on downloading jsPDF.
  const prefetch = useCallback(() => {
    loadReceipt().catch(() => {});
    const logoUrl = (Digit.SessionStorage.get("initData") || {}).stateInfo?.logoUrl;
    if (logoUrl) getLogo(logoUrl).catch(() => {});
  }, []);

  const tr = useCallback(
    (key, fallback) => {
      const v = t(key);
      return v === key ? fallback : v;
    },
    [t]
  );

  // Everything the PDF needs beyond the complaint itself. The complaint's own
  // tenant is the authority that owns it — not necessarily the user's home
  // city on a multi-authority deployment. Some seeds set the tenant `name` to
  // its CODE ("bo"), which would print as a meaningless header, so fall through
  // to the localized i18nKey and then the state name.
  const prepareModel = useCallback(async () => {
    const initData = Digit.SessionStorage.get("initData") || {};
    const stateInfo = initData.stateInfo || {};
    const tenantCode = service?.tenantId;
    const tenant = (initData.tenants || []).find((x) => x?.code === tenantCode);
    const nameIsCode = (n) => !n || String(n).trim().toLowerCase() === String(tenantCode || "").trim().toLowerCase();
    const tenantName =
      (tenant?.name && !nameIsCode(tenant.name) ? tenant.name : "") ||
      (tenant?.city?.name && !nameIsCode(tenant.city.name) ? tenant.city.name : "") ||
      (tenant?.i18nKey ? tr(tenant.i18nKey, "") : "") ||
      (stateInfo?.name && !nameIsCode(stateInfo.name) ? stateInfo.name : "") ||
      tenant?.name ||
      stateInfo?.name ||
      "";
    const logoDataUri = await getLogo(stateInfo?.logoUrl);
    return {
      service,
      details,
      classification,
      extendedRows,
      tenantName,
      logoDataUri,
      helpline: tenant?.contactNumber || "",
      generatedOn: stampNow(),
      t,
      tr,
    };
  }, [service, details, classification, extendedRows, t, tr]);

  const run = useCallback(
    async (action) => {
      if (busy) return;
      setBusy(action);
      setNotice(null);
      try {
        const [{ downloadComplaintReceipt, printComplaintReceipt, shareComplaintReceipt }, model] = await Promise.all([loadReceipt(), prepareModel()]);
        if (action === "download") {
          downloadComplaintReceipt(model);
        } else if (action === "print") {
          // A popup blocker is the one failure a user can't see — hand them the file instead.
          if (printComplaintReceipt(model) === false) downloadComplaintReceipt(model);
        } else if (action === "share") {
          const id = service?.serviceRequestId || "";
          const text = tr("PGR_RECEIPT_SHARE_TEXT", RECEIPT_ACTION_FALLBACKS.shareText)
            .replace("{id}", id)
            .replace("{tenant}", model.tenantName || "");
          const result = await shareComplaintReceipt(model, { title: `${tr("PGR_RECEIPT_TITLE", RECEIPT_FALLBACKS.title)} ${id}`, text, url: trackingUrl(id) });
          if (result === "copied") setNotice({ tone: "info", text: tr("PGR_RECEIPT_SHARE_COPIED", RECEIPT_ACTION_FALLBACKS.copied) });
          if (result === "unsupported") setNotice({ tone: "info", text: tr("PGR_RECEIPT_SHARE_UNAVAILABLE", RECEIPT_ACTION_FALLBACKS.unavailable) });
        }
      } catch (e) {
        if (e?.name === "AbortError") {
          // The user closed the share sheet — not an error.
        } else if (e?.name === "NotAllowedError") {
          // The click's activation window expired before the share sheet opened
          // (slow chunk / logo fetch). Everything is cached now; a second tap works.
          setNotice({ tone: "info", text: tr("PGR_RECEIPT_SHARE_RETRY", RECEIPT_ACTION_FALLBACKS.shareRetry) });
        } else {
          setNotice({ tone: "error", text: tr("PGR_RECEIPT_ERROR", RECEIPT_FALLBACKS.errorLabel) });
        }
      } finally {
        setBusy(null);
      }
    },
    [busy, prepareModel, service?.serviceRequestId, tr]
  );

  const buttons = {
    download: { icon: Download, label: tr("PGR_RECEIPT_DOWNLOAD", RECEIPT_FALLBACKS.downloadLabel) },
    print: { icon: Printer, label: tr("PGR_RECEIPT_PRINT", RECEIPT_ACTION_FALLBACKS.print) },
    share: { icon: Share2, label: tr("PGR_RECEIPT_SHARE", RECEIPT_ACTION_FALLBACKS.share) },
  };

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }} onPointerEnter={prefetch} onFocusCapture={prefetch} onTouchStart={prefetch}>
        {actions.filter((a) => buttons[a]).map((a) => {
          const { icon: Icon, label } = buttons[a];
          return (
            <Button key={a} variant={variant} type="button" onClick={() => run(a)} loading={busy === a} disabled={!!busy && busy !== a} leading={<Icon className="h-4 w-4" />}>
              {label}
            </Button>
          );
        })}
      </div>
      {notice ? (
        <p role={notice.tone === "error" ? "alert" : "status"} className={notice.tone === "error" ? "m-0 text-sm text-destructive" : "m-0 text-sm text-muted-foreground"}>
          {notice.text}
        </p>
      ) : null}
    </div>
  );
};

export default ReceiptActions;
