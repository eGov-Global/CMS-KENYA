// English fallbacks for the receipt UI strings. Kept apart from
// complaintReceipt.js so the buttons can import these without pulling jsPDF
// into the main bundle — the PDF code itself is loaded on first click.
export const RECEIPT_FALLBACKS = {
  downloadLabel: "Download Application",
  nextTitle: "What happens next",
  nextTrack: "Keep this complaint number — you need it to ask about your complaint.",
  nextUpdate: "You can track the status any time under My Complaints.",
  nextHelpline: "Helpline",
  complainantTitle: "Complainant Details",
  complainantName: "Complainant Name",
  complainantContact: "Contact Number",
  errorLabel: "Could not generate the receipt. Please try again.",
  title: "Complaint Receipt",
  classification: "Classification",
  systemGenerated: "This is a system-generated document and does not require a signature.",
  generatedOn: "Generated on",
  municipality: "Municipality",
};
