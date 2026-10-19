import React from "react";
import PopoverMenu, { PopoverMenuGroupLabel, PopoverMenuItem } from "./ui/PopoverMenu";
import useDashboardT from "../i18n/useDashboardT";
import { EXPORT_FORMATS } from "../utils/dashboardExport";

/**
 * Header "Export" control: the same chip language as the other header buttons,
 * opening the shared PopoverMenu with one entry per export format. The menu
 * closes before the export starts so the chip can show its busy label while
 * the file is generated (the PDF library loads on demand, so this can take a
 * moment on a slow connection).
 */
const ExportIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ExportMenu = ({ onExport, busy = false, disabled = false, status = null }) => {
  const { t } = useDashboardT();
  const labels = {
    xlsx: t("DASHBOARD_EXPORT_MENU_EXCEL", "Excel workbook (.xlsx)"),
    csv: t("DASHBOARD_EXPORT_MENU_CSV", "CSV (.csv)"),
    pdf: t("DASHBOARD_EXPORT_MENU_PDF", "PDF report"),
  };
  const chip = (
    <span className="dashboard-export-chip">
      <ExportIcon />
      <span>{busy ? t("DASHBOARD_EXPORT_BUSY", "Exporting…") : t("DASHBOARD_HEADER_EXPORT", "Export")}</span>
    </span>
  );
  return (
    <span className="dashboard-export-control">
      <PopoverMenu
        chip={chip}
        chipTitle={t("DASHBOARD_HEADER_EXPORT_DASHBOARD", "Export dashboard")}
        ariaLabel={t("DASHBOARD_HEADER_EXPORT_DASHBOARD", "Export dashboard")}
        disabled={disabled || busy}
        align="end"
        panelWidth={236}
        chipClassName="dashboard-header-btn dashboard-header-export"
      >
        {({ close }) => (
          <>
            <PopoverMenuGroupLabel>{t("DASHBOARD_EXPORT_MENU_TITLE", "Export dashboard as")}</PopoverMenuGroupLabel>
            {EXPORT_FORMATS.map((format) => (
              <PopoverMenuItem
                key={format}
                className={`dashboard-export-item dashboard-export-item--${format}`}
                onSelect={() => {
                  close({ refocus: false });
                  onExport(format);
                }}
              >
                {labels[format]}
              </PopoverMenuItem>
            ))}
          </>
        )}
      </PopoverMenu>
      {status ? (
        <span role="status" className={`dashboard-export-status${status.tone === "error" ? " dashboard-export-status--error" : ""}`}>
          {status.text}
        </span>
      ) : null}
    </span>
  );
};

export default ExportMenu;
