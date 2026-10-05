/* eslint-disable react/prop-types */
// Receipt actions for a complaint: Download, Print and Share — on the citizen
// and employee "complaint submitted" screens and both complaint detail pages.
//
// The PDF is drawn locally from data already in memory (see
// utils/complaintReceipt), so Download works on a dropped connection. The only
// network call is the optional tenant logo, fetched with a short timeout and
// omitted on failure. Share opens an inline sheet: open the PDF, Email,
// WhatsApp, SMS (phones), copy the tracking link, and "More apps"
// (the device's native share sheet, which carries the PDF itself).

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileText, Link2, Mail, MessageCircle, MessageSquare, Printer, Share2 } from "lucide-react";
import { Button } from "@egovernments/digit-ui-components-v2";
import { RECEIPT_FALLBACKS } from "../utils/receiptCopy";
import { buildShareLinks } from "../utils/receiptShare";
import useComplaintReceiptModel from "../hooks/pgr/useComplaintReceiptModel";

const loadReceipt = () => import("../utils/complaintReceipt");

export const RECEIPT_ACTION_FALLBACKS = {
  print: "Print Receipt",
  share: "Share",
  shareVia: "Share receipt via",
  openPdf: "Open PDF",
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
  copy: "Copy link",
  more: "More apps",
  hint: "Email, WhatsApp and SMS send the complaint number and tracking link. To send the PDF itself use More apps, or Download Application above.",
  shareRetry: "Sharing was interrupted — tap again.",
  shareText: "Complaint {id} filed with {tenant}. Track it here:",
  copied: "Link copied — paste it anywhere to share.",
  copyFailed: "Could not copy the link on this device.",
  downloaded: "The receipt PDF is also in your downloads.",
  downloadedCopied: "Receipt PDF saved to your downloads; tracking link copied.",
  downloadedOnly: "Receipt PDF saved to your downloads.",
  popupBlocked: "The browser blocked the PDF tab — the receipt was downloaded instead.",
};

const ALL_ACTIONS = ["download", "print", "share"];
// The v2 utilities only apply under `.v2-scope` (tailwind.config.ts `important`). Legacy
// employee screens (e.g. the complaint-success panel) have no such ancestor, so carry it here.
const scoped = (className) => ["v2-scope", className].filter(Boolean).join(" ");
const logoCache = new Map();

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

/** Human tenant name for the receipt and the share text (never the bare code). */
const resolveTenant = (tenantCode, tr) => {
  const initData = Digit.SessionStorage.get("initData") || {};
  const stateInfo = initData.stateInfo || {};
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
  return { tenantName, helpline: tenant?.contactNumber || "", logoUrl: stateInfo?.logoUrl };
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

  // Right after submit the search can lag the write by a moment: poll a few
  // times, backing off, until the record is there.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!shouldFetch || complaintDetails?.service || !fetchedDetails || attempt >= 5) return undefined;
    const timer = setTimeout(() => {
      revalidate();
      setAttempt((n) => n + 1);
    }, 1200 * (attempt + 1));
    return () => clearTimeout(timer);
  }, [shouldFetch, fetchedDetails, complaintDetails?.service, attempt]);

  if (!complaintDetails?.service) {
    const label = t("PGR_RECEIPT_DOWNLOAD");
    return (
      <div className={scoped(className)}>
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const downloadedRef = useRef(false); // a repeat share must not save a second copy
  const firstOptionRef = useRef(null);
  const { service, details, classification, extendedRows } = useComplaintReceiptModel(complaintDetails);

  const tr = useCallback(
    (key, fallback) => {
      const v = t(key);
      return v === key ? fallback : v;
    },
    [t]
  );

  const prefetch = useCallback(() => {
    loadReceipt().catch(() => {});
    const { logoUrl } = resolveTenant(service?.tenantId, tr);
    if (logoUrl) getLogo(logoUrl).catch(() => {});
  }, [service?.tenantId, tr]);

  const id = service?.serviceRequestId || "";
  const share = useMemo(() => {
    const { tenantName } = resolveTenant(service?.tenantId, tr);
    const subject = `${tr("PGR_RECEIPT_TITLE", RECEIPT_FALLBACKS.title)} ${id}`;
    const text = tr("PGR_RECEIPT_SHARE_TEXT", RECEIPT_ACTION_FALLBACKS.shareText).replace("{id}", id).replace("{tenant}", tenantName || "");
    const url = trackingUrl(id);
    return { subject, text, url, links: buildShareLinks({ subject, text, url }) };
  }, [service?.tenantId, id, tr]);

  const prepareModel = useCallback(async () => {
    const { tenantName, helpline, logoUrl } = resolveTenant(service?.tenantId, tr);
    const logoDataUri = await getLogo(logoUrl);
    return { service, details, classification, extendedRows, tenantName, logoDataUri, helpline, generatedOn: stampNow(), t, tr };
  }, [service, details, classification, extendedRows, t, tr]);

  const nav = typeof navigator !== "undefined" ? navigator : null;
  const canNativeShare = typeof nav?.share === "function";
  const canCopy = typeof nav?.clipboard?.writeText === "function";
  const coarsePointer = typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)")?.matches;

  const rootRef = useRef(null);
  const sheetId = `pgr-share-sheet-${id || "receipt"}`;
  useEffect(() => {
    if (!sheetOpen) return undefined;
    prefetch();
    firstOptionRef.current?.focus();
    // Escape closes the sheet from anywhere on the page (an option that disabled
    // itself while busy may have dropped focus to <body>) and hands focus back to Share.
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setSheetOpen(false);
      rootRef.current?.querySelector(`[aria-controls="${sheetId}"]`)?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen, prefetch, sheetId]);

  const run = useCallback(
    async (action) => {
      if (busy) return;
      setBusy(action);
      setNotice(null);
      // Opened synchronously, inside the click, so the popup blocker sees the gesture.
      const tab = action === "open" ? window.open("", "_blank") : null;
      if (tab) tab.opener = null;
      try {
        if (action === "copy") {
          await nav.clipboard.writeText(share.links.message);
          setNotice({ tone: "info", text: tr("PGR_RECEIPT_SHARE_COPIED", RECEIPT_ACTION_FALLBACKS.copied) });
          return;
        }
        const [{ downloadComplaintReceipt, printComplaintReceipt, openComplaintReceipt, shareComplaintReceipt }, model] = await Promise.all([loadReceipt(), prepareModel()]);
        if (action === "download") {
          downloadComplaintReceipt(model);
          downloadedRef.current = true;
        } else if (action === "print") {
          if (printComplaintReceipt(model) === false) downloadComplaintReceipt(model);
        } else if (action === "open") {
          if (openComplaintReceipt(model, tab) === false) {
            downloadComplaintReceipt(model);
            downloadedRef.current = true;
            setNotice({ tone: "info", text: tr("PGR_RECEIPT_POPUP_BLOCKED", RECEIPT_ACTION_FALLBACKS.popupBlocked) });
          }
        } else if (action === "more") {
          const result = await shareComplaintReceipt(model, { title: share.subject, text: share.text, url: share.url, alreadyDownloaded: downloadedRef.current });
          if (result.startsWith("downloaded")) downloadedRef.current = true;
          // Without native file sharing the PDF went to the downloads folder - say so,
          // and whether the tracking link reached the share sheet or the clipboard.
          if (result === "downloaded-shared") setNotice({ tone: "info", text: tr("PGR_RECEIPT_SHARE_DOWNLOADED", RECEIPT_ACTION_FALLBACKS.downloaded) });
          if (result === "downloaded-copied") setNotice({ tone: "info", text: tr("PGR_RECEIPT_SHARE_DOWNLOADED_COPIED", RECEIPT_ACTION_FALLBACKS.downloadedCopied) });
          if (result === "downloaded") setNotice({ tone: "info", text: tr("PGR_RECEIPT_SHARE_DOWNLOADED_ONLY", RECEIPT_ACTION_FALLBACKS.downloadedOnly) });
        }
      } catch (e) {
        if (tab && !tab.closed) tab.close();
        if (action === "copy") {
          setNotice({ tone: "info", text: tr("PGR_RECEIPT_SHARE_COPY_FAILED", RECEIPT_ACTION_FALLBACKS.copyFailed) });
        } else if (e?.name === "AbortError") {
          // the user dismissed the native sheet: nothing to say
        } else if (e?.name === "NotAllowedError") {
          setNotice({ tone: "info", text: tr("PGR_RECEIPT_SHARE_RETRY", RECEIPT_ACTION_FALLBACKS.shareRetry) });
        } else {
          setNotice({ tone: "error", text: tr("PGR_RECEIPT_ERROR", RECEIPT_FALLBACKS.errorLabel) });
        }
      } finally {
        setBusy(null);
      }
    },
    [busy, nav, prepareModel, share, tr]
  );

  const buttons = {
    download: { icon: Download, label: tr("PGR_RECEIPT_DOWNLOAD", RECEIPT_FALLBACKS.downloadLabel), onClick: () => run("download") },
    print: { icon: Printer, label: tr("PGR_RECEIPT_PRINT", RECEIPT_ACTION_FALLBACKS.print), onClick: () => run("print") },
    share: { icon: Share2, label: tr("PGR_RECEIPT_SHARE", RECEIPT_ACTION_FALLBACKS.share), onClick: () => setSheetOpen((o) => !o) },
  };
  const options = [
    { key: "open", icon: FileText, label: tr("PGR_RECEIPT_OPEN_PDF", RECEIPT_ACTION_FALLBACKS.openPdf), onClick: () => run("open") },
    { key: "email", icon: Mail, label: tr("PGR_RECEIPT_SHARE_EMAIL", RECEIPT_ACTION_FALLBACKS.email), href: share.links.email },
    { key: "whatsapp", icon: MessageCircle, label: tr("PGR_RECEIPT_SHARE_WHATSAPP", RECEIPT_ACTION_FALLBACKS.whatsapp), href: share.links.whatsapp, external: true },
    coarsePointer && { key: "sms", icon: MessageSquare, label: tr("PGR_RECEIPT_SHARE_SMS", RECEIPT_ACTION_FALLBACKS.sms), href: share.links.sms },
    canCopy && { key: "copy", icon: Link2, label: tr("PGR_RECEIPT_SHARE_COPY", RECEIPT_ACTION_FALLBACKS.copy), onClick: () => run("copy") },
    canNativeShare && { key: "more", icon: Share2, label: tr("PGR_RECEIPT_SHARE_MORE", RECEIPT_ACTION_FALLBACKS.more), onClick: () => run("more") },
  ].filter(Boolean);

  return (
    <div ref={rootRef} className={scoped(className)} style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }} onPointerEnter={prefetch} onFocusCapture={prefetch} onTouchStart={prefetch}>
        {actions.filter((a) => buttons[a]).map((a) => {
          const { icon: Icon, label, onClick } = buttons[a];
          const extra = a === "share" ? { "aria-expanded": sheetOpen, "aria-controls": sheetId } : {};
          return (
            <Button key={a} variant={variant} type="button" onClick={onClick} loading={busy === a} disabled={!!busy && busy !== a} leading={<Icon className="h-4 w-4" />} {...extra}>
              {label}
            </Button>
          );
        })}
      </div>
      {sheetOpen ? (
        <div
          id={sheetId}
          className="pgr-share-sheet"
          role="group"
          aria-labelledby={`${sheetId}-title`}
        >
          <p id={`${sheetId}-title`} className="pgr-share-sheet__title">{tr("PGR_RECEIPT_SHARE_VIA", RECEIPT_ACTION_FALLBACKS.shareVia)}</p>
          <div className="pgr-share-sheet__grid">
            {options.map((o, i) => {
              const Icon = o.icon;
              const inner = (
                <>
                  <Icon aria-hidden="true" />
                  <span>{o.label}</span>
                </>
              );
              return o.href ? (
                <a key={o.key} ref={i === 0 ? firstOptionRef : undefined} className="pgr-share-sheet__option" data-share={o.key} href={o.href} target={o.external ? "_blank" : undefined} rel={o.external ? "noopener noreferrer" : undefined}>
                  {inner}
                </a>
              ) : (
                <button key={o.key} ref={i === 0 ? firstOptionRef : undefined} type="button" className="pgr-share-sheet__option" data-share={o.key} onClick={o.onClick} disabled={!!busy} aria-busy={busy === o.key || undefined}>
                  {inner}
                </button>
              );
            })}
          </div>
          <p className="pgr-share-sheet__hint">{tr("PGR_RECEIPT_SHARE_HINT", RECEIPT_ACTION_FALLBACKS.hint)}</p>
        </div>
      ) : null}
      {notice ? (
        <p role={notice.tone === "error" ? "alert" : "status"} className={notice.tone === "error" ? "m-0 text-sm text-destructive" : "m-0 text-sm text-muted-foreground"}>
          {notice.text}
        </p>
      ) : null}
    </div>
  );
};

export default ReceiptActions;
