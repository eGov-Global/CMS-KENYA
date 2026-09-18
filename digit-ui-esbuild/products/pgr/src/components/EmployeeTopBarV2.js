import { Dropdown, Header } from "@egovernments/digit-ui-components";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";

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

// Hand-rolled instead of Intl: the design is "16 Sep 2025, 11:00 AM" and no
// single locale produces exactly that (en-GB says "Sept" and lower-cases am).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const formatStamp = (d) => {
  if (!d) return "";
  const h = d.getHours();
  const h12 = h % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h12}:${mm} ${h < 12 ? "AM" : "PM"}`;
};

/* 24-viewBox stroke glyphs. Everything is forced through inline styles — the
 * employee header stylesheet sets fill/size on descendant svgs, and inline
 * style is the only thing that reliably outranks it. */
const Glyph = ({ d, size = 16, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", width: size, height: size, minWidth: size, flexShrink: 0, display: "block", ...style }}
  >
    {d.map((p, i) =>
      typeof p === "string" ? <path key={i} d={p} style={{ fill: "none" }} /> : React.cloneElement(p, { key: i, style: { fill: "none" } })
    )}
  </svg>
);
const ICONS = {
  person: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", <circle cx="12" cy="8" r="4" />],
  clock: [<circle cx="12" cy="12" r="9" />, "M12 7v5l3 3"],
  dept: ["M3 21h18", "M5 21V7l7-4 7 4v14", "M9 21v-4h6v4"],
  role: ["M4 7h16v13H4z", "M9 7V5a3 3 0 0 1 6 0v2"],
  pin: ["M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z", <circle cx="12" cy="10" r="2.5" />],
  history: [<circle cx="12" cy="12" r="9" />, "M12 8v4l2.5 2.5"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  caret: ["M6 9l6 6 6-6"],
};

// One shared shell for every action item so the row baseline can't drift:
// same height, same centering, no uppercase inherited from the header CSS.
const itemStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  height: "2.5rem",
  whiteSpace: "nowrap",
  textTransform: "none",
  fontSize: "0.875rem",
  fontWeight: 400,
  color: "inherit",
};
const dividerStyle = { width: "1px", height: "1.25rem", background: "currentColor", opacity: 0.35, alignSelf: "center" };

const Avatar = ({ name, size = 34 }) => (
  <span
    style={{
      width: size,
      height: size,
      minWidth: size,
      borderRadius: "50%",
      background: "#2f80ed",
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 600,
      fontSize: size > 40 ? "1.25rem" : "0.9375rem",
      textTransform: "uppercase",
      flexShrink: 0,
    }}
  >
    {(name || "E").trim().charAt(0)}
  </span>
);

const detailRowStyle = { display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.4375rem 0", fontSize: "0.875rem", textTransform: "none" };

const ProfileRow = ({ icon, label, value }) =>
  value ? (
    <div style={detailRowStyle}>
      <span style={{ color: "#6b7280", display: "inline-flex", alignItems: "center", gap: "0.625rem", width: "8.25rem", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <Glyph d={ICONS[icon]} style={{ stroke: "#6b7280" }} />
        {label}
      </span>
      <span style={{ color: "#111827", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
    </div>
  ) : null;

/**
 * Avatar button + profile card. The card is rendered through a portal into
 * document.body and positioned off the button's rect: the header wraps each
 * action field in overflow-clipping containers, so an absolutely-positioned
 * child never survives — this was the "popup does not show" bug.
 */
const ProfileMenu = ({ t, userDetails, cityDetails, workingContext, userOptions, handleUserDropdownSelection }) => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setAnchor({ top: r.bottom + 12, right: Math.max(window.innerWidth - r.right, 8) });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const away = (e) => {
      if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const key = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const info = userDetails?.info || {};
  const name = info?.name || "Employee";
  // Role: the highest-signal one — SUPERUSER reads as "Admin" everywhere in
  // this product; otherwise the first non-implicit role's localized name.
  const roleLabel = useMemo(() => {
    const roles = (info?.roles || []).filter((r) => !["CITIZEN", "EMPLOYEE", "INTERNAL_MICROSERVICE_ROLE"].includes(r?.code));
    const primary = roles.find((r) => r?.code === "SUPERUSER") || roles[0];
    if (!primary) return null;
    if (primary.code === "SUPERUSER") return "Admin";
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

  const panel =
    open && anchor
      ? ReactDOM.createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={{
              position: "fixed",
              top: anchor.top,
              right: anchor.right,
              width: "21rem",
              maxWidth: "calc(100vw - 1rem)",
              background: "#fff",
              color: "#111827",
              borderRadius: "0.75rem",
              boxShadow: "0 12px 32px rgba(16,24,40,0.18)",
              padding: "1.25rem",
              zIndex: 10000,
              textAlign: "left",
              textTransform: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", paddingBottom: "1rem", borderBottom: "1px solid #e5e7eb" }}>
              <Avatar name={name} size={48} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "1.0625rem" }}>{name}</div>
                {info?.emailId && (
                  <div style={{ color: "#6b7280", fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis" }}>{info.emailId}</div>
                )}
              </div>
            </div>

            <div style={{ padding: "0.75rem 0", borderBottom: "1px solid #e5e7eb" }}>
              <ProfileRow icon="dept" label={t("CORE_TOPBAR_DEPARTMENT")} value={department} />
              <ProfileRow icon="role" label={t("CORE_TOPBAR_ROLE")} value={roleLabel} />
              <ProfileRow icon="pin" label={t("CORE_TOPBAR_LOCATION")} value={location} />
              <ProfileRow icon="history" label={t("CORE_TOPBAR_LAST_LOGIN")} value={lastLogin} />
            </div>

            <div style={{ paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.125rem" }}>
              {editOption && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => pick(editOption)}
                  style={{ ...detailRowStyle, background: "none", border: "none", cursor: "pointer", color: "#111827", width: "100%", gap: "0.625rem" }}
                >
                  <Glyph d={ICONS.edit} style={{ stroke: "#111827" }} /> {editOption.name}
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => pick(logoutOption || { func: () => {} })}
                style={{ ...detailRowStyle, background: "none", border: "none", cursor: "pointer", color: "#e11d48", width: "100%", gap: "0.625rem" }}
              >
                <Glyph d={ICONS.logout} style={{ stroke: "#e11d48" }} /> {logoutOption?.name || t("CORE_COMMON_LOGOUT")}
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <span style={itemStyle}>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}
      >
        <Avatar name={userDetails?.info?.name} />
        <Glyph d={ICONS.caret} size={14} />
      </button>
      {panel}
    </span>
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
  // MDMS stores language labels shouted ("ENGLISH"); the design reads "English".
  const pretty = (l) => (l ? l.charAt(0).toUpperCase() + l.slice(1).toLowerCase() : l);
  return (
    <Dropdown
      className="language-dropdown"
      option={languages}
      selected={current}
      optionKey="label"
      freeze={true}
      customSelector={<label className="cp" style={{ textTransform: "none", fontSize: "0.875rem", cursor: "pointer" }}>{pretty(current?.label)}</label>}
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
    <span style={itemStyle}>
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
          <span style={itemStyle}>
            <Glyph d={ICONS.person} />
            <span style={{ fontWeight: 500 }}>
              {t("CORE_TOPBAR_HELLO")}, {name}
            </span>
          </span>
        ),
        loggedin && name && <span style={dividerStyle} />,
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
      className="digit-employee-header pgr-topbar-v2"
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
