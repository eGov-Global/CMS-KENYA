/* eslint-disable react/prop-types */
// Receipt actions for a complaint: Download, Print and Share — on the citizen
// and employee "complaint submitted" screens and both complaint detail pages.
//
// The PDF is drawn locally from data already in memory (see
// utils/complaintReceipt), so Download works on a dropped connection. The only
// network call is the optional tenant logo, fetched with a short timeout and
// omitted on failure. Share opens a modal dialog: open the PDF, Email,
// WhatsApp, SMS (phones) and "More apps". What is shared is the receipt PDF
// itself — never the complaint number or a tracking link. Where the browser can
// hand a file to another app (Web Share API level 2: Android Chrome, iOS and
// macOS Safari) every tile opens the device's share sheet with the PDF in it.
// Elsewhere the PDF is downloaded first and the tile opens the app empty, for
// the user to attach it.
//
// The PDF is drawn as soon as the dialog opens and kept (File, blob URL), so a
// tile can call navigator.share() / trigger the download synchronously inside its
// own click. Safari and desktop Chrome refuse both once the click's user
// activation has run out, which an `await` before the call guarantees — that was
// issue #138 on Mac: "loading" and then nothing.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useTranslation } from "react-i18next";
import { Download, FileText, Mail, MessageCircle, MessageSquare, Printer, Share2, X } from "lucide-react";
import { Button } from "@egovernments/digit-ui-components-v2";
import { RECEIPT_FALLBACKS } from "../utils/receiptCopy";
import { buildShareLinks, canShareFiles } from "../utils/receiptShare";
import useComplaintReceiptModel from "../hooks/pgr/useComplaintReceiptModel";

const loadReceipt = () => import("../utils/complaintReceipt");

export const RECEIPT_ACTION_FALLBACKS = {
  print: "Print Receipt",
  share: "Share",
  shareVia: "Share receipt via",
  close: "Close",
  preparing: "Preparing the PDF…",
  openPdf: "Open PDF",
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
  more: "More apps",
  hintPdf: "Every option sends the receipt PDF. On a computer the PDF is downloaded first — attach it in the app that opens.",
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

// window.open with the "noopener" feature returns null BY SPEC even when the tab
// opened, which would read as a blocked popup — detach the opener by hand.
const openTab = (url) => {
  const tab = window.open(url, "_blank");
  if (tab) tab.opener = null;
  return tab;
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preparing, setPreparing] = useState(false); // PDF being drawn for the open dialog
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
  const dialogId = `pgr-share-dialog-${id || "receipt"}`;

  // The receipt, drawn once per complaint record and kept in every form a tile
  // needs (File for the share sheet, blob URL for Open PDF and the download),
  // together with the receipt module that knows how to use them. Built when the
  // dialog opens; `ready` is set only once both exist so a click can act
  // synchronously, which Safari and desktop Chrome require (issue #138).
  const receiptRef = useRef({ mod: null, artifacts: null, promise: null });
  const ensureReceipt = useCallback(() => {
    const ref = receiptRef.current;
    if (ref.artifacts && ref.mod) return Promise.resolve(ref);
    if (!ref.promise) {
      setPreparing(true);
      ref.promise = Promise.all([loadReceipt(), prepareModel()])
        .then(([mod, model]) => {
          ref.mod = mod;
          ref.artifacts = mod.buildReceiptArtifacts(model);
          return ref;
        })
        .catch((e) => {
          ref.promise = null;
          throw e;
        })
        .finally(() => setPreparing(false));
    }
    return ref.promise;
  }, [prepareModel]);
  useEffect(() => {
    // A new/updated complaint record invalidates the drawn receipt.
    const ref = receiptRef.current;
    const drop = () => {
      if (ref.artifacts && ref.mod) ref.mod.releaseReceiptArtifacts(ref.artifacts);
      ref.artifacts = null;
      ref.promise = null;
    };
    drop();
    return drop;
  }, [service]);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    rootRef.current?.querySelector(`[aria-controls="${dialogId}"]`)?.focus();
  }, [dialogId]);

  useEffect(() => {
    if (!dialogOpen) return undefined;
    prefetch();
    ensureReceipt().catch(() => {});
    firstOptionRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Escape closes the dialog from anywhere on the page (an option that disabled
    // itself while busy may have dropped focus to <body>) and hands focus back to Share.
    const onKey = (e) => {
      if (e.key === "Escape") closeDialog();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [dialogOpen, prefetch, ensureReceipt, closeDialog]);

  const saveArtifacts = useCallback((ref) => {
    ref.mod.downloadReceiptArtifacts(ref.artifacts);
    downloadedRef.current = true;
  }, []);

  /**
   * Act with the prebuilt receipt. Everything that must happen inside the user
   * gesture — navigator.share(), the download anchor, window.open — is reached
   * here without an await in between.
   */
  const actWithReceipt = useCallback(
    (action, ref) => {
      if (action === "download") {
        saveArtifacts(ref);
        return Promise.resolve();
      }
      if (action === "open") {
        if (!openTab(ref.artifacts.url)) {
          saveArtifacts(ref);
          setNotice({ tone: "info", text: tr("PGR_RECEIPT_POPUP_BLOCKED", RECEIPT_ACTION_FALLBACKS.popupBlocked) });
        }
        return Promise.resolve();
      }
      if (action === "share") {
        // Any tile on a file-sharing browser, and "More apps" everywhere: the PDF goes
        // into the native share sheet; a browser that refuses (no file support, or the
        // activation ran out) gets the download instead — see utils/receiptShare.
        return ref.mod
          .shareReceiptArtifacts(ref.artifacts, { title: share.subject, alreadyDownloaded: downloadedRef.current })
          .then((result) => {
            if (result === "downloaded") {
              downloadedRef.current = true;
              setNotice({ tone: "info", text: tr("PGR_RECEIPT_SHARE_DOWNLOADED_ONLY", RECEIPT_ACTION_FALLBACKS.downloadedOnly) });
            }
          });
      }
      // email / whatsapp / sms on a browser without file sharing: save the PDF, then
      // open the app empty for the user to attach it. mailto: and sms: navigate in
      // place; WhatsApp Web needs a tab, opened inside the same click.
      let tab = null;
      if (action === "whatsapp") tab = openTab("");
      if (!downloadedRef.current) saveArtifacts(ref);
      setNotice({ tone: "info", text: tr("PGR_RECEIPT_SHARE_ATTACH", RECEIPT_ACTION_FALLBACKS.attach) });
      if (action === "whatsapp") {
        if (tab) tab.location = share.links.whatsapp;
        else window.open(share.links.whatsapp, "_blank", "noopener");
      } else {
        window.location.href = share.links[action];
      }
      return Promise.resolve();
    },
    [saveArtifacts, share, tr]
  );

  const run = useCallback(
    (action) => {
      if (busy) return;
      setBusy(action);
      setNotice(null);
      const ref = receiptRef.current;
      let work;
      if (action === "print") {
        // Printing draws into a hidden iframe; nothing here needs the gesture.
        work = Promise.all([loadReceipt(), prepareModel()]).then(([{ printComplaintReceipt, downloadComplaintReceipt }, model]) => {
          if (printComplaintReceipt(model) === false) downloadComplaintReceipt(model);
        });
      } else if (ref.artifacts && ref.mod) {
        work = actWithReceipt(action, ref); // synchronous path: still inside the click
      } else {
        // Clicked before the receipt was drawn (dialog not used, or a very fast tap):
        // draw it first. The gesture may have run out by then; the share helper then
        // falls back to the download rather than failing.
        work = ensureReceipt().then((r) => actWithReceipt(action, r));
      }
      work
        .catch((e) => {
          if (e?.name === "AbortError") return; // the user dismissed the native sheet: nothing to say
          setNotice({ tone: "error", text: tr("PGR_RECEIPT_ERROR", RECEIPT_FALLBACKS.errorLabel) });
        })
        .finally(() => setBusy(null));
    },
    [busy, prepareModel, actWithReceipt, ensureReceipt, tr]
  );

  const buttons = {
    download: { icon: Download, label: tr("PGR_RECEIPT_DOWNLOAD", RECEIPT_FALLBACKS.downloadLabel), onClick: () => run("download") },
    print: { icon: Printer, label: tr("PGR_RECEIPT_PRINT", RECEIPT_ACTION_FALLBACKS.print), onClick: () => run("print") },
    share: { icon: Share2, label: tr("PGR_RECEIPT_SHARE", RECEIPT_ACTION_FALLBACKS.share), onClick: () => setDialogOpen((o) => !o) },
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

  const noticeEl = notice ? (
    <p role={notice.tone === "error" ? "alert" : "status"} className={`pgr-share-dialog__notice m-0 text-sm ${notice.tone === "error" ? "text-destructive" : "text-muted-foreground"}`}>
      {notice.text}
    </p>
  ) : null;

  // A modal, portaled to <body>: the sheet used to sit inline in the page header and
  // clipped inside the details card. The backdrop and Escape close it; focus starts
  // on the first tile and returns to the Share button.
  const dialog = dialogOpen
    ? ReactDOM.createPortal(
        <div
          className="v2-scope pgr-share-dialog"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDialog();
          }}
        >
          <div id={dialogId} className="pgr-share-dialog__panel" role="dialog" aria-modal="true" aria-labelledby={`${dialogId}-title`}>
            <div className="pgr-share-dialog__head">
              <p id={`${dialogId}-title`} className="pgr-share-sheet__title">{tr("PGR_RECEIPT_SHARE_VIA", RECEIPT_ACTION_FALLBACKS.shareVia)}</p>
              <button type="button" className="pgr-share-dialog__close" aria-label={tr("PGR_RECEIPT_SHARE_CLOSE", RECEIPT_ACTION_FALLBACKS.close)} onClick={closeDialog}>
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="pgr-share-sheet__grid">
              {options.map((o, i) => {
                const Icon = o.icon;
                return (
                  <button key={o.key} ref={i === 0 ? firstOptionRef : undefined} type="button" className="pgr-share-sheet__option" data-share={o.key} onClick={o.onClick} disabled={!!busy} aria-busy={busy ? "true" : undefined}>
                    <Icon aria-hidden="true" />
                    <span>{o.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="pgr-share-sheet__hint">{tr("PGR_RECEIPT_SHARE_HINT_PDF", RECEIPT_ACTION_FALLBACKS.hintPdf)}</p>
            {preparing ? (
              <p className="pgr-share-sheet__hint" role="status" data-share-preparing="true">{tr("PGR_RECEIPT_SHARE_PREPARING", RECEIPT_ACTION_FALLBACKS.preparing)}</p>
            ) : null}
            {noticeEl}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={rootRef} className={scoped(className)} style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }} onPointerEnter={prefetch} onFocusCapture={prefetch} onTouchStart={prefetch}>
        {actions.filter((a) => buttons[a]).map((a) => {
          const { icon: Icon, label, onClick } = buttons[a];
          const extra = a === "share" ? { "aria-expanded": dialogOpen, "aria-haspopup": "dialog", "aria-controls": dialogId } : {};
          return (
            <Button key={a} variant={variant} type="button" onClick={onClick} loading={busy === a} disabled={!!busy && busy !== a} leading={<Icon className="h-4 w-4" />} {...extra}>
              {label}
            </Button>
          );
        })}
      </div>
      {dialog}
      {!dialogOpen ? noticeEl : null}
    </div>
  );
};

export default ReceiptActions;
