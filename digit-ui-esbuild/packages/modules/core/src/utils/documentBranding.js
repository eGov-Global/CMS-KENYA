// The browser tab follows the tenant the same way the header logo already does:
//   title   <- localisation key CORE_APP_TITLE (per tenant and locale)
//   favicon <- StateInfo.logoUrl (MDMS common-masters.StateInfo of the state tenant)
// index.html ships neutral defaults for the moment before the boot data arrives.
// Anything unresolved leaves the current value alone: a raw key or an empty icon
// would be worse than the neutral default.
export const APP_TITLE_KEY = "CORE_APP_TITLE";

export const resolveDocumentBranding = ({ t, stateInfo } = {}) => {
  const translated = typeof t === "function" ? t(APP_TITLE_KEY) : undefined;
  const title =
    typeof translated === "string" && translated.trim() && translated.trim() !== APP_TITLE_KEY ? translated.trim() : undefined;
  const logo = stateInfo?.logoUrl;
  const iconUrl = typeof logo === "string" && logo.trim() ? logo.trim() : undefined;
  return { title, iconUrl };
};

export const applyDocumentBranding = (doc, { title, iconUrl } = {}) => {
  if (!doc) return;
  if (title && doc.title !== title) doc.title = title;
  if (!iconUrl) return;
  let link = doc.querySelector('link[rel="icon"]');
  if (!link && doc.head) {
    link = doc.createElement("link");
    link.setAttribute("rel", "icon");
    doc.head.appendChild(link);
  }
  if (link && link.getAttribute("href") !== iconUrl) link.setAttribute("href", iconUrl);
};
