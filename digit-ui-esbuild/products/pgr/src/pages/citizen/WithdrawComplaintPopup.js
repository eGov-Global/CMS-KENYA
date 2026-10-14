/* eslint-disable react/prop-types */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { PopUp } from "@egovernments/digit-ui-components";
import { Button, Field, Textarea } from "@egovernments/digit-ui-components-v2";

import { WITHDRAW_REASON_MAX_LENGTH } from "../../utils/withdraw";

// Confirmation step before a citizen withdraws a complaint. The caller owns the
// update request; this collects the optional reason and shows the pending and
// failed states so the citizen always knows whether the withdrawal went through.
const WithdrawComplaintPopup = ({ onConfirm, onClose, isSubmitting, hasError }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");

  const tr = (key, fallback) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  // Dismissing mid-request would hide the outcome, so the popup stays put
  // until the update settles.
  const dismiss = () => {
    if (!isSubmitting) onClose();
  };

  return (
    <PopUp
      type="default"
      // Compact confirmation card on every viewport (sizing + body reset in overrides.css).
      className="pgr-confirm-popup-wrapper"
      heading={tr("CS_WITHDRAW_CONFIRM_HEADING", "Withdraw this complaint?")}
      onClose={dismiss}
      onOverlayClick={dismiss}
      equalWidthButtons
      // v2 buttons, as on the rest of the citizen surface: the DIGIT Button's
      // primary renders white-on-yellow here, which is unreadable.
      footerChildren={[
        <Button key="cancel" variant="outline" size="lg" onClick={dismiss} disabled={isSubmitting}>
          {tr("CS_COMMON_CANCEL", "Cancel")}
        </Button>,
        <Button key="confirm" size="lg" onClick={() => onConfirm(reason)} loading={isSubmitting}>
          {isSubmitting ? tr("CS_WITHDRAWING", "Withdrawing…") : tr("CS_COMMON_WITHDRAW", "Withdraw")}
        </Button>,
      ]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ margin: 0, fontSize: "1rem", lineHeight: 1.5, color: "var(--color-text-heading, #363636)" }}>
          {tr(
            "CS_WITHDRAW_CONFIRM_MESSAGE",
            "The complaint will be closed and no further action will be taken on it. This cannot be undone."
          )}
        </p>
        <Field
          label={`${tr("CS_WITHDRAW_REASON", "Reason for withdrawing")} ${tr("CS_OPTIONAL_SUFFIX", "(Optional)")}`}
          htmlFor="withdraw-reason"
        >
          <Textarea
            id="withdraw-reason"
            // Tailwind preflight is off, so a textarea keeps the browser's monospace font.
            className="font-sans"
            rows={3}
            value={reason}
            maxLength={WITHDRAW_REASON_MAX_LENGTH}
            disabled={isSubmitting}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        {hasError ? (
          <p role="alert" style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-error, #d4351c)" }}>
            {tr("CS_WITHDRAW_FAILED", "Couldn't withdraw the complaint. Please try again.")}
          </p>
        ) : null}
      </div>
    </PopUp>
  );
};

export default WithdrawComplaintPopup;
