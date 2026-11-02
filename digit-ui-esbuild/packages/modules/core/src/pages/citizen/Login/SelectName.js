import { FormStep } from "@egovernments/digit-ui-components";
import React, { useState } from "react";

// Privacy Notice acknowledgement at registration (Bomet DPIA): a new resident
// confirms the county's notice before the account is created — "Next" stays
// disabled until the box is ticked. The notice is the in-app privacy page.
const SelectName = ({ config, onSelect, t, isDisabled }) => {
  const [accepted, setAccepted] = useState(false);
  const [missing, setMissing] = useState(false);
  const ctx = window?.contextPath || "digit-ui";
  const tr = (k, fb) => { const v = t(k); return v === k ? fb : v; };
  // Enforced on submit too: the card's disabled state is advisory.
  const guarded = (data) => { if (!accepted) { setMissing(true); return; } onSelect(data); };
  return (
    <FormStep config={config} onSelect={guarded} t={t} isDisabled={isDisabled || !accepted}>
      <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", margin: "8px 0 4px", fontSize: "0.875rem", lineHeight: 1.5 }}>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          style={{ marginTop: "0.2rem", flexShrink: 0, width: "1rem", height: "1rem" }}
        />
        <span>
          {tr("CS_LOGIN_PRIVACY_NOTICE_ACCEPT", "I confirm that I have read and understood the Privacy Notice, which explains how the county collects, uses, stores and protects my personal data.")}{" "}
          <a href={`/${ctx}/privacy-policy`} target="_blank" rel="noopener noreferrer">
            {tr("CS_LOGIN_PRIVACY_NOTICE_READ", "Read the Privacy Notice")}
          </a>
        </span>
      </label>
      {missing && !accepted && (
        <p role="alert" style={{ margin: "0 0 4px", fontSize: "0.8125rem", color: "var(--color-error, #d4351c)" }}>
          {tr("CS_LOGIN_PRIVACY_NOTICE_REQUIRED", "Please confirm you have read the Privacy Notice to continue.")}
        </p>
      )}
    </FormStep>
  );
};

export default SelectName;
