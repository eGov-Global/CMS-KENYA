/* eslint-disable react/prop-types */
// Receipt actions for a complaint: Download, Print and Share — on the citizen
// and employee "complaint submitted" screens and both complaint detail pages.
//
// The PDF is drawn locally from data already in memory (see
// utils/complaintReceipt), so Download works on a dropped connection. The only
// network call is the optional tenant logo, fetched with a short timeout and
// omitted on failure. Share opens an inline sheet: open the PDF, Email,
// WhatsApp, SMS (phones) and "More apps". What is shared is the receipt PDF
// itself — never the complaint number or a tracking link. Where the browser can
// hand a file to another app (Web Share API level 2: Android Chrome, iOS Safari)
// every tile opens the device's share sheet with the PDF in it. Elsewhere the PDF
// is downloaded first and the tile opens the app empty, for the user to attach it.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileText, Mail, MessageCircle, MessageSquare, Printer, Share2 } from "lucide-react";
import { Button } from "@egovernments/digit-ui-components-v2";
import { RECEIPT_FALLBACKS } from "../utils/receiptCopy";
import { buildShareLinks, canShareFiles } from "../utils/receiptShare";
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
  more: "More apps",
  hintPdf: "Every option sends the receipt PDF. On a computer the PDF is downloaded first — attach it in the app that opens.",
  shareRetry: "Sharing was interrupted — tap again.",
  downloadedOnly: "Receipt PDF saved to your downloads.",
  attach: "Receipt PDF saved to your downloads — attach it in the app that opened.",
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

/** Human tenant name for the receipt (never the bare code). */
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
  // The share carries the PDF only: the subject names the document, not the complaint.
  const share = useMemo(() => {
    const subject = tr("PGR_RECEIPT_TITLE", RECEIPT_FALLBACKS.title);
    return { subject, links: buildShareLinks({ subject }) };
  }, [tr]);

  const prepareModel = useCallback(async () => {
    const { tenantName, helpline, logoUrl } = resolveTenant(service?.tenantId, tr);
    const logoDataUri = await getLogo(logoUrl);
    return { service, details, classification, extendedRows, tenantName, logoDataUri, helpline, generatedOn: stampNow(), t, tr };
  }, [service, details, classification, extendedRows, t, tr]);

  const nav = typeof navigator !== "undefined" ? navigator : null;
  const canNativeShare = typeof nav?.share === "function";
  // Probed once per mount: whether this browser can hand the PDF to another app.
  const fileShare = useMemo(() => canShareFiles(nav), [nav]);
  const coarsePointer = typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)")?.matches;

  const rootRef = useRef(null);
  const sheetId = `pgr-share-sheet-${id || "receipt"}`;

  // The PDF for "Open PDF" is drawn as soon as the sheet opens, so the click can
  // open the finished blob URL synchronously - the only way every browser allows
  // a new tab (navigating a blank popup afterwards is not reliable everywhere).
  const pdfRef = useRef({ url: null, promise: null });
  const ensurePdfUrl = useCallback(() => {
    if (pdfRef.current.url) return Promise.resolve(pdfRef.current.url);
    if (!pdfRef.current.promise) {
      pdfRef.current.promise = Promise.all([loadReceipt(), prepareModel()])
        .then(([{ buildComplaintReceipt }, model]) => {
          const url = buildComplaintReceipt(model).output("bloburl");
          pdfRef.current.url = url;
          return url;
        })
        .catch((e) => {
          pdfRef.current.promise = null;
          throw e;
        });
    }
    return pdfRef.current.promise;
  }, [prepareModel]);
  useEffect(() => {
    // A new/updated complaint record invalidates the drawn receipt.
    const ref = pdfRef.current;
    ref.url = null;
    ref.promise = null;
    return () => {
      if (ref.url) URL.revokeObjectURL(ref.url);
      ref.url = null;
      ref.promise = null;
    };
  }, [service]);

  useEffect(() => {
    if (!sheetOpen) return undefined;
    prefetch();
    ensurePdfUrl().catch(() => {});
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
  }, [sheetOpen, prefetch, ensurePdfUrl, sheetId]);

  const run = useCallback(
    async (action) => {
      if (busy) return;
      setBusy(action);
      setNotice(null);
      // Opened synchronously, inside the click, so the popup blocker sees the gesture:
      // straight onto the prebuilt PDF when it is ready, else a blank tab that is
      // navigated once the PDF exists.
      let tab = null;
      if (action === "whatsapp") {
        // WhatsApp Web must be opened inside the click too, before the PDF is drawn.
        tab = window.open("", "_blank");
        if (tab) tab.opener = null;
      }
      if (action === "open") {
        const ready = pdfRef.current.url;
        if (ready) {
          const { openReceiptUrl, downloadComplaintReceipt } = await loadReceipt();
          if (!openReceiptUrl(ready)) {
            downloadComplaintReceipt(await prepareModel());
            downloadedRef.current = true;
            setNotice({ tone: "info", text: tr("PGR_RECEIPT_POPUP_BLOCKED", RECEIPT_ACTION_FALLBACKS.popupBlocked) });
          }
          setBusy(null);
          return;
        }
        tab = window.open("", "_blank");
        if (tab) tab.opener = null;
      }
      try {
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
        } else if (action === "share") {
          // Any tile on a file-sharing browser, and "More apps" everywhere: the PDF goes
          // into the native share sheet; without file support it is downloaded instead.
          const result = await shareComplaintReceipt(model, { title: share.subject, alreadyDownloaded: downloadedRef.current });
          if (result === "downloaded") {
            downloadedRef.current = true;
            setNotice({ tone: "info", text: tr("PGR_RECEIPT_SHARE_DOWNLOADED_ONLY", RECEIPT_ACTION_FALLBACKS.downloadedOnly) });
          }
        } else if (action === "email" || action === "whatsapp" || action === "sms") {
          // No file sharing here: save the PDF, then open the app empty for the user to
          // attach it. mailto: and sms: navigate in place; WhatsApp gets the tab opened above.
          if (!downloadedRef.current) {
            downloadComplaintReceipt(model);
            downloadedRef.current = true;
          }
          setNotice({ tone: "info", text: tr("PGR_RECEIPT_SHARE_ATTACH", RECEIPT_ACTION_FALLBACKS.attach) });
          if (action === "whatsapp") {
            if (tab) tab.location = share.links.whatsapp;
            else window.open(share.links.whatsapp, "_blank", "noopener");
          } else {
            window.location.href = share.links[action];
          }
        }
      } catch (e) {
        if (tab && !tab.closed) tab.close();
        if (e?.name === "AbortError") {
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
  // On a file-sharing browser every channel tile opens the native sheet with the PDF
  // (the tile names the app the user is after; the OS sheet lets them pick it).
  const channel = (key) => (fileShare ? () => run("share") : () => run(key));
  const options = [
    { key: "open", icon: FileText, label: tr("PGR_RECEIPT_OPEN_PDF", RECEIPT_ACTION_FALLBACKS.openPdf), onClick: () => run("open") },
    { key: "email", icon: Mail, label: tr("PGR_RECEIPT_SHARE_EMAIL", RECEIPT_ACTION_FALLBACKS.email), onClick: channel("email") },
    { key: "whatsapp", icon: MessageCircle, label: tr("PGR_RECEIPT_SHARE_WHATSAPP", RECEIPT_ACTION_FALLBACKS.whatsapp), onClick: channel("whatsapp") },
    coarsePointer && { key: "sms", icon: MessageSquare, label: tr("PGR_RECEIPT_SHARE_SMS", RECEIPT_ACTION_FALLBACKS.sms), onClick: channel("sms") },
    canNativeShare && { key: "more", icon: Share2, label: tr("PGR_RECEIPT_SHARE_MORE", RECEIPT_ACTION_FALLBACKS.more), onClick: () => run("share") },
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
              return (
                <button key={o.key} ref={i === 0 ? firstOptionRef : undefined} type="button" className="pgr-share-sheet__option" data-share={o.key} onClick={o.onClick} disabled={!!busy} aria-busy={busy ? "true" : undefined}>
                  {inner}
                </button>
              );
            })}
          </div>
          <p className="pgr-share-sheet__hint">{tr("PGR_RECEIPT_SHARE_HINT_PDF", RECEIPT_ACTION_FALLBACKS.hintPdf)}</p>
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
