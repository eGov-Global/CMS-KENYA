// How the receipt reaches the citizen when they tap Share. Kept free of jsPDF and
// the DOM so every branch is unit-testable: the caller injects the navigator, a
// PDF-file factory and the download. Results:
//   "file"               the PDF itself went into the native share sheet
//   "downloaded-shared"  no file sharing: PDF downloaded, the link went to the share sheet
//   "downloaded-copied"  no share sheet: PDF downloaded, the link copied to the clipboard
//   "downloaded"         PDF downloaded; the link could not be handed on (sheet dismissed,
//                        clipboard refused, or nothing available) — not an error
// A FILE share the user dismissed rethrows (AbortError / NotAllowedError): nothing
// was saved yet, so there is nothing to confirm.
export const isUserCancel = (e) => e?.name === "AbortError" || e?.name === "NotAllowedError";

export async function shareReceipt({ nav, makeFile, download, title, text, url, alreadyDownloaded = false }) {
  const message = [text, url].filter(Boolean).join(" ");
  if (nav?.share && typeof nav.canShare === "function") {
    try {
      const file = makeFile();
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title, text: message });
        return "file";
      }
    } catch (e) {
      if (isUserCancel(e)) throw e;
      // building or offering the file failed for another reason: the download below still delivers it
    }
  }
  if (!alreadyDownloaded) download();
  if (nav?.share) {
    try {
      await nav.share({ title, text, url });
      return "downloaded-shared";
    } catch (e) {
      return "downloaded";
    }
  }
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(message);
      return "downloaded-copied";
    } catch (e) {
      return "downloaded";
    }
  }
  return "downloaded";
}

const enc = encodeURIComponent;

/**
 * Deep links for the channels the share sheet lists. Each carries the complaint
 * number + tracking link as text (an email/SMS/WhatsApp link cannot attach a
 * file; the PDF travels via "More apps" or Download). `sms:?&body=` is the form
 * both Android and iOS accept.
 */
export function buildShareLinks({ subject, text, url }) {
  const line = [text, url].filter(Boolean).join(" ");
  return {
    email: `mailto:?subject=${enc(subject || "")}&body=${enc([text, url].filter(Boolean).join("\n"))}`,
    whatsapp: `https://wa.me/?text=${enc(line)}`,
    sms: `sms:?&body=${enc(line)}`,
    message: line,
  };
}
