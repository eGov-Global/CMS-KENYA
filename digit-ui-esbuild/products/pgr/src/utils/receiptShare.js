// How the receipt reaches someone when the user taps a share tile. The payload is
// the receipt PDF itself — never the complaint number or a tracking link (product
// decision, Nairobi 2026-10-08: a receipt is shared as the document). Kept free of
// jsPDF and the DOM so every branch is unit-testable: the caller injects the
// navigator, a PDF-file factory and the download. Results:
//   "file"        the PDF went into the device's native share sheet, where the user
//                 picks the app (WhatsApp, Gmail, Messages, …)
//   "downloaded"  this browser cannot hand a file to another app: the PDF was saved
//                 to the downloads folder so the user can attach it in the app the
//                 tile opened — not an error
// A FILE share the user dismissed (AbortError) rethrows: nothing was saved yet, so
// there is nothing to confirm. NotAllowedError is different: the browser refused the
// share itself — on Safari and desktop Chrome that is the user activation having run
// out before share() was called (issue #138, Mac) — so the PDF is downloaded instead,
// exactly as on a browser without file sharing. Callers avoid the refusal in the
// first place by handing share() a prebuilt file synchronously inside the click.
export const isUserCancel = (e) => e?.name === "AbortError";

/** Whether this browser can hand a PDF to another app (Web Share API level 2). */
export const canShareFiles = (nav, makeProbeFile) => {
  if (!nav?.share || typeof nav.canShare !== "function") return false;
  try {
    const file = makeProbeFile ? makeProbeFile() : new File([""], "receipt.pdf", { type: "application/pdf" });
    return !!nav.canShare({ files: [file] });
  } catch (e) {
    return false;
  }
};

export async function shareReceipt({ nav, makeFile, download, title, text, alreadyDownloaded = false }) {
  if (nav?.share && typeof nav.canShare === "function") {
    try {
      const file = makeFile();
      if (nav.canShare({ files: [file] })) {
        // title + text ride along with the PDF: a mail app uses them as subject and
        // body, a messenger as the caption. Apps that take only the file ignore them.
        await nav.share({ files: [file], title, ...(text ? { text } : {}) });
        return "file";
      }
    } catch (e) {
      if (isUserCancel(e)) throw e;
      // building or offering the file failed for another reason: the download below still delivers it
    }
  }
  if (!alreadyDownloaded) download();
  return "downloaded";
}

const enc = encodeURIComponent;

/**
 * Deep links for the channels the dialog lists on browsers that cannot share a
 * file. They open the app with the complaint summary prefilled (subject + body,
 * or the message text); the PDF was just downloaded and is what gets attached.
 * `sms:?&body=` is the one form both iOS and Android honour.
 */
export function buildShareLinks({ subject, text }) {
  const body = text || "";
  return {
    email: `mailto:?subject=${enc(subject || "")}${body ? `&body=${enc(body)}` : ""}`,
    whatsapp: body ? `https://wa.me/?text=${enc(body)}` : "https://wa.me/",
    sms: body ? `sms:?&body=${enc(body)}` : "sms:",
  };
}

const DESCRIPTION_MAX = 240;
// Values the details map uses as "nothing here" (landmark-row parity on the page),
// and a helpline left at its all-zero seed value: noise in a message, so dropped.
const isPlaceholder = (v) => /^(na|n\/a|-|—)$/i.test(v) || /^0+$/.test(v.replace(/[\s+-]/g, ""));

/**
 * The message that travels with the receipt: title and municipality, then the
 * same "label: value" rows the PDF prints (complaint number, status, category,
 * filed date, address, description…), then the helpline. Blank rows are dropped,
 * a long description is cut so a WhatsApp/SMS message stays readable. Plain text,
 * no markup: it goes into mailto/wa.me/sms URLs and the native share sheet alike.
 */
export function buildReceiptShareText({ title, tenantName, rows, helpline, helplineLabel }) {
  const clean = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();
  const lines = [];
  const head = [clean(title), clean(tenantName)].filter(Boolean).join(" — ");
  if (head) lines.push(head);
  for (const r of rows || []) {
    const label = clean(r?.label);
    let value = clean(r?.value);
    if (!label || !value || isPlaceholder(value)) continue;
    if (value.length > DESCRIPTION_MAX) value = `${value.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`;
    lines.push(`${label}: ${value}`);
  }
  if (clean(helpline) && !isPlaceholder(clean(helpline))) lines.push(`${clean(helplineLabel) || "Helpline"}: ${clean(helpline)}`);
  return lines.join("\n");
}
