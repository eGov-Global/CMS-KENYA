import { Dropdown, Header } from "@egovernments/digit-ui-components";
import React, { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_EGOV_LOGO = "https://egov-dev-assets.s3.ap-south-1.amazonaws.com/egov-logo-2025.png";
const DEFAULT_EGOV_LOGO_ON_DARK = "/digit-ui/brand/egov-logo-white.png";

// Session-scoped "last login": the user service doesn't return a previous-login
// timestamp, so the closest honest value is when this session started. Stamped
// once per browser session, so it survives SPA navigation and reloads but
// resets on a fresh login (sessionStorage dies with the tab/session).
const LOGIN_STAMP_KEY = "pgr.employee.sessionLoginAt";
const sessionLoginAt = () => {
  try {
    let at = window.sessionStorage.getItem(LOGIN_STAMP_KEY);
    if (!at) {
      at = String(Date.now());
      window.sessionStorage.setItem(LOGIN_STAMP_KEY, at);
    }
    return new Date(Number(at));
  } catch (e) {
    return null;
  }
};

const formatStamp = (d) =>
  d
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
        .format(d)
        .replace(/(\d{4}),?\s/, "$1, ")
    : "";

/* 16px inline glyphs — the design system's icon set has no stable names for
 * all six of these, and a hard icon dependency would break the bundle if a
 * name drifts. currentColor keeps them theme-correct. */
const Glyph = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
    {d.map((p, i) => (typeof p === "string" ? <path key={i} d={p} /> : p))}
  </svg>
);
const ICONS = {
  person: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", <circle key="c" cx="12" cy="8" r="4" />],
  clock: [<circle key="c" cx="12" cy="12" r="9" />, "M12 7v5l3 3"],
  dept: ["M3 21h18", "M5 21V7l7-4 7 4v14", "M9 21v-4h6v4", "M9 10h.01M15 10h.01M9 14h.01M15 14h.01"],
  role: ["M4 7h16v13H4z", "M9 7V5a3 3 0 0 1 6 0v2"],
  pin: ["M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z", <circle key="c" cx="12" cy="10" r="2.5" />],
  history: [<circle key="c" cx="12" cy="12" r="9" />, "M12 8v4l2.5 2.5", "M3.5 12H6"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  caret: ["M6 9l6 6 6-9-6 6-6-6z"],
};

const rowStyle = { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.375rem 0", fontSize: "0.875rem" };
const rowLabelStyle = { color: "#6b7280", display: "flex", alignItems: "center", gap: "0.5rem", minWidth: "7.5rem" };
const rowValueStyle = { color: "#1f2937", fontWeight: 500, marginLeft: "auto", textAlign: "right" };

const ProfileRow = ({ icon, label, value }) =>
  value ? (
    <div style={rowStyle}>
      <span style={rowLabelStyle}>
        <Glyph d={ICONS[icon]} />
        {label}
      </span>
      <span style={rowValueStyle}>{value}</span>
    </div>
  ) : null;

const Avatar = ({ name, size = 36 }) => (
  <span
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "#2563eb",
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 600,
      fontSize: size > 40 ? "1.25rem" : "1rem",
      flexShrink: 0,
    }}
  >
    {(name || "E").trim().charAt(0).toUpperCase()}
  </span>
);

/** Right-side profile menu: avatar button opening the details card (name,
 *  email, department/role/location/last-login rows, edit profile, logout). */
const ProfileMenu = ({ t, userDetails, cityDetails, workingContext, userOptions, handleUserDropdownSelection }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const info = userDetails?.info || {};
  const name = info?.name || "Employee";
  // Role: the highest-signal one — SUPERUSER reads as "Admin" everywhere in
  // this product; otherwise the first non-implicit role's localized name.
  const roleLabel = useMemo(() => {
    const roles = (info?.roles || []).filter((r) => !["CITIZEN", "EMPLOYEE", "INTERNAL_MICROSERVICE_ROLE"].includes(r?.code));
    const primary = roles.find((r) => r?.code === "SUPERUSER") || roles[0];
    if (!primary) return null;
    const localized = t(`ACCESSCONTROL_ROLES_ROLES_${primary.code}`);
    return localized === `ACCESSCONTROL_ROLES_ROLES_${primary.code}` ? primary?.name || primary?.code : localized;
  }, [info?.roles, t]);
  const department = workingContext?.departments?.length
    ? workingContext.departments.map((d) => d?.name || d?.code || d).filter(Boolean).join(", ")
    : null;
  const location = cityDetails?.i18nKey ? t(cityDetails.i18nKey) : null;
  const lastLogin = formatStamp(sessionLoginAt());

  const editOption = (userOptions || []).find((o) => o?.icon === "Edit");
  const logoutOption = (userOptions || []).find((o) => o?.icon === "Logout");
  const pick = (opt) => {
    setOpen(false);
    if (opt) handleUserDropdownSelection ? handleUserDropdownSelection(opt) : opt.func && opt.func();
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}
      >
        <Avatar name={name} />
        <Glyph d={ICONS.caret} size={12} />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 0.875rem)",
            right: 0,
            width: "20rem",
            background: "#fff",
            color: "#1f2937",
            borderRadius: "0.75rem",
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            padding: "1.25rem",
            zIndex: 1000,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", paddingBottom: "0.875rem", borderBottom: "1px solid #e5e7eb" }}>
            <Avatar name={name} size={48} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "1rem" }}>{name}</div>
              {info?.emailId && (
                <div style={{ color: "#6b7280", fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis" }}>{info.emailId}</div>
              )}
            </div>
          </div>

          <div style={{ padding: "0.625rem 0", borderBottom: "1px solid #e5e7eb" }}>
            <ProfileRow icon="dept" label={t("CORE_TOPBAR_DEPARTMENT")} value={department} />
            <ProfileRow icon="role" label={t("CORE_TOPBAR_ROLE")} value={roleLabel} />
            <ProfileRow icon="pin" label={t("CORE_TOPBAR_LOCATION")} value={location} />
            <ProfileRow icon="history" label={t("CORE_TOPBAR_LAST_LOGIN")} value={lastLogin} />
          </div>

          <div style={{ paddingTop: "0.625rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {editOption && (
              <button type="button" role="menuitem" onClick={() => pick(editOption)} style={{ ...rowStyle, background: "none", border: "none", cursor: "pointer", color: "#1f2937", width: "100%" }}>
                <Glyph d={ICONS.edit} /> {editOption.name}
              </button>
            )}
            <button type="button" role="menuitem" onClick={() => pick(logoutOption || { func: () => {} })} style={{ ...rowStyle, background: "none", border: "none", cursor: "pointer", color: "#dc2626", width: "100%" }}>
              <Glyph d={ICONS.logout} /> {logoutOption?.name || t("CORE_COMMON_LOGOUT")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Minimal language switcher (core's ChangeLanguage is module-internal, so the
 *  same Digit APIs are used directly; languages come from MDMS StoreData). */
const LanguageSelect = () => {
  const { data: storeData, isLoading } = Digit.Hooks.useStore.getInitData();
  const { languages, stateInfo } = storeData || {};
  const selectedLanguage = Digit.StoreData.getCurrentLanguage();
  const [selected, setSelected] = useState(selectedLanguage);
  if (isLoading || !languages?.length) return null;
  const current = languages.find((l) => l?.value === selected) || languages[0];
  return (
    <Dropdown
      className="language-dropdown"
      option={languages}
      selected={current}
      optionKey="label"
      freeze={true}
      customSelector={<label className="cp">{current?.label}</label>}
      select={(language) => {
        setSelected(language.value);
        Digit.LocalizationService.changeLanguage(language.value, stateInfo?.code);
      }}
    />
  );
};

/** Live wall clock, minute resolution ("16 Sep 2025, 11:00 AM"). */
const LiveClock = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", whiteSpace: "nowrap" }}>
      <Glyph d={ICONS.clock} />
      {formatStamp(now)}
    </span>
  );
};

/**
 * Country-layer employee TopBar (registered as CustomEmployeeTopBar): keeps
 * the shared Header shell (logo + city lockup + hamburger) and replaces the
 * action fields with greeting · live clock · language · profile menu, per the
 * Bomet header design. The city dropdown is dropped deliberately — this
 * deployment is single-city — and the working-context chip's information moves
 * into the profile menu's Department row.
 */
const EmployeeTopBarV2 = (props) => {
  const { t, stateInfo, toggleSidebar, userDetails, cityDetails, userOptions, handleUserDropdownSelection, logoUrl, logoUrlWhite, showLanguageChange, workingContext, loggedin } = props;
  const headerTone = typeof document !== "undefined" ? document.documentElement.dataset.headerTone : undefined;
  const name = userDetails?.info?.name;

  return (
    <Header
      actionFields={[
        loggedin && name && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", whiteSpace: "nowrap" }}>
            <Glyph d={ICONS.person} />
            {t("CORE_TOPBAR_HELLO")}, {name}
          </span>
        ),
        <LiveClock />,
        showLanguageChange && <LanguageSelect />,
        loggedin && (
          <ProfileMenu
            t={t}
            userDetails={userDetails}
            cityDetails={cityDetails}
            workingContext={workingContext}
            userOptions={userOptions}
            handleUserDropdownSelection={handleUserDropdownSelection}
          />
        ),
      ].filter(Boolean)}
      onHamburgerClick={() => toggleSidebar()}
      className="digit-employee-header"
      img={logoUrl}
      logoWidth={"64px"}
      logoHeight={"48px"}
      logo={(loggedin ? cityDetails?.logoId : stateInfo?.statelogo) || (headerTone === "dark" ? DEFAULT_EGOV_LOGO_ON_DARK : DEFAULT_EGOV_LOGO)}
      onImageClick={() => {}}
      onLogoClick={() => {}}
      props={{}}
      showDeafultImg
      style={{}}
      theme="light"
      ulb={
        loggedin ? (
          cityDetails?.city?.ulbGrade ? (
            <>
              {t(cityDetails?.i18nKey).toUpperCase()}{" "}
              {t(`ULBGRADE_${cityDetails?.city?.ulbGrade.toUpperCase().replace(" ", "_").replace(".", "_")}`).toUpperCase()}
            </>
          ) : (
            <img className="state" src={logoUrlWhite || stateInfo?.logoUrlWhite} alt="" />
          )
        ) : (
          <>
            {t(`MYCITY_${stateInfo?.code?.toUpperCase()}_LABEL`)} {t(`MYCITY_STATECODE_LABEL`)}
          </>
        )
      }
    />
  );
};

export default EmployeeTopBarV2;
