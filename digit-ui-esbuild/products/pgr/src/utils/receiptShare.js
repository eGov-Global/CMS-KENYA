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

export async function shareReceipt({ nav, makeFile, download, title, alreadyDownloaded = false }) {
  if (nav?.share && typeof nav.canShare === "function") {
    try {
      const file = makeFile();
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title });
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
 * Deep links for the channels the sheet lists on browsers that cannot share a
 * file. They open the app empty — only the subject, no complaint number and no
 * tracking link — because the PDF was just downloaded and is what gets attached.
 */
export function buildShareLinks({ subject }) {
  return {
    email: `mailto:?subject=${enc(subject || "")}`,
    whatsapp: "https://wa.me/",
    sms: "sms:",
  };
}
