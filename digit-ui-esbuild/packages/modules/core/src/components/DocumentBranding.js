import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { applyDocumentBranding, resolveDocumentBranding } from "../utils/documentBranding";

// Renders nothing. Keeps document.title and the favicon in step with the tenant
// once the boot data (localisation + StateInfo) is in, and again on language change.
const DocumentBranding = ({ stateInfo }) => {
  const { t, i18n } = useTranslation();
  const logoUrl = stateInfo?.logoUrl;
  useEffect(() => {
    applyDocumentBranding(document, resolveDocumentBranding({ t, stateInfo: { logoUrl } }));
  }, [t, i18n?.language, logoUrl]);
  return null;
};

export default DocumentBranding;
