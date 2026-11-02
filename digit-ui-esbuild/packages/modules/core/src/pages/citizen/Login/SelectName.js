/* eslint-disable react/prop-types */
// New-user name step, on the card the number and OTP steps use. Same contract
// as the FormStep it replaces: `onSelect({ name })`, with the length and
// pattern rules taken from the step's config (Login/config.js), and the
// submit held while `isDisabled` (the registration call is in flight).

import React, { useMemo, useState } from "react";
import {
  Button as V2Button,
  Field as V2Field,
  Input as V2Input,
} from "@egovernments/digit-ui-components-v2";
import { SignInCard, V2LoginShell, stepText } from "./SelectMobileNumber";

const SelectName = ({ config, onSelect, t, isDisabled }) => {
  const input = config?.inputs?.[0] || {};
  const rules = input.validation || {};
  const pattern = useMemo(() => (rules.pattern ? new RegExp(rules.pattern) : null), [rules.pattern]);
  const [name, setName] = useState("");
  // Privacy Notice acknowledgement (Bomet DPIA): a new resident confirms the
  // county's notice before the account is created.
  const [accepted, setAccepted] = useState(false);
  const ctx = window?.contextPath || "digit-ui";

  const tr = (key, fallback) => {
    const v = key ? t(key) : key;
    return v && v !== key ? v : fallback;
  };

  // Spaces at either end are a slip, not part of the name; the pattern would
  // otherwise reject "Kanav " for its trailing space.
  const value = name.trim();
  const isValid =
    value.length >= (rules.minlength || 1) &&
    (!rules.maxlength || value.length <= rules.maxlength) &&
    (!pattern || pattern.test(value));
  // Shown once something is typed, not on the empty field the step opens with.
  const error = value && !isValid ? tr(input.error, "Please enter a valid name") : null;

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (!accepted || !isValid || isDisabled) return;
    onSelect({ [input.name || "name"]: value });
  };

  return (
    <V2LoginShell>
      <SignInCard
        title={stepText(config?.texts?.header, "Your name")}
        text={stepText(config?.texts?.cardText, null)}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <V2Field label={tr(input.label, "Name")} required={!!rules.required} htmlFor="register-name" error={error}>
            <V2Input
              id="register-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={rules.maxlength}
              invalid={!!error}
            />
          </V2Field>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.875rem", lineHeight: 1.5 }}>
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
          <V2Button type="submit" disabled={!isValid || isDisabled || !accepted} loading={isDisabled} width="full">
            {stepText(config?.texts?.nextText, "Continue")}
          </V2Button>
        </form>
      </SignInCard>
    </V2LoginShell>
  );
};

export default SelectName;
