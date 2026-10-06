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
  height: "auto",
  whiteSpace: "nowrap",
  textTransform: "none",
  fontSize: "0.875rem",
  fontWeight: 400,
  color: "inherit",
};
const dividerStyle = { width: "1px", height: "1.25rem", background: "currentColor", opacity: 0.35, alignSelf: "center" };

const Avatar = ({ name, size = 30 }) => (
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

// Profile-menu action rows. minHeight + lineHeight are explicit: the employee
// header stylesheet applies a tight line-height to buttons, which collapsed
// these rows even with padding, and read as "congested".
const menuItemStyle = (color) => ({
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  minHeight: "2.75rem",
  lineHeight: "1.5",
  // Horizontal padding is 1rem so the hover highlight has visible breathing
  // room either side of the icon and label rather than hugging them. The
  // negative margin + matching width bleed the row out to the panel's inner
  // edge, so the highlight reads as a full-width band aligned with the
  // panel's 1.25rem gutter instead of a narrow pill floating inside it.
  padding: "0.625rem 1rem",
  marginLeft: "-0.5rem",
  marginRight: "-0.5rem",
  width: "calc(100% + 1rem)",
  background: "transparent",
  border: "none",
  borderRadius: "0.5rem",
  cursor: "pointer",
  color: color,
  fontSize: "0.9375rem",
  fontWeight: 500,
  textAlign: "left",
  textTransform: "none",
  transition: "background 120ms ease",
});

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
/**
 * City picker — rendered ONLY when the employee has more than one city to
 * choose from. A dropdown with a single option is pure noise, which is why
 * TopBar v2 dropped it for Bomet; a multi-city deployment still needs it.
 *
 * Cities are the distinct tenantIds across the logged-in user's roles, which
 * is exactly how core's ChangeCity derives its own options — so the two agree
 * on whether there is a choice to offer.
 *
 * Switching behaviour is kept identical to ChangeCity's: narrow the session
 * user's roles to the chosen tenant, set Employee.tenantId, write the user
 * back, then reload so every tenant-scoped query refetches. Re-stated here
 * rather than imported because core registers ChangeCity through
 * initCoreComponents(), which this build never calls — the registry lookup
 * returns undefined at runtime (verified in-browser), and deep-importing the
 * subtree'd path would couple products to core's internal layout.
 */
const cityOptions = () => {
  const roles = Digit.SessionStorage.get("citizen.userRequestObject")?.info?.roles || [];
  const codes = [...new Set(roles.map((r) => r?.tenantId).filter(Boolean))];
  return codes.map((code) => ({
    code,
    value: code,
    label: `TENANT_TENANTS_${code.split(".").join("_").toUpperCase()}`,
  }));
};

const CityPicker = ({ t }) => {
  const options = cityOptions();
  const current = Digit.SessionStorage.get("Employee.tenantId");
  const selected = options.find((o) => o.value === current) || options[0];

  const onSelect = (city) => {
    if (!city?.value || city.value === current) return;
    const user = Digit.SessionStorage.get("citizen.userRequestObject");
    const scoped = user?.info?.roles?.filter((role) => role.tenantId === city.value);
    if (scoped?.length) {
      user.info.roles = scoped;
      user.info.tenantId = city.value;
      Digit.UserService.setUser(user);
    }
    Digit.SessionStorage.set("Employee.tenantId", city.value);
    window.location.reload();
  };

  return (
    <span style={itemStyle}>
      <Dropdown
        t={t}
        option={options}
        optionKey="label"
        selected={selected}
        select={onSelect}
        freeze={true}
      />
    </span>
  );
};

const ProfileMenu = ({ t, userDetails, cityDetails, workingContext, userOptions, handleUserDropdownSelection }) => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const closeTimer = useRef(null);

  const place = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setAnchor({ top: r.bottom + 12, right: Math.max(window.innerWidth - r.right, 8) });
    }
  };
  const show = () => {
    clearTimeout(closeTimer.current);
    place();
    setOpen(true);
  };
  // The card is a portal, so the pointer "leaves" the button before it can
  // "enter" the card — the delay bridges that gap instead of flickering shut.
  const hideSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 300);
  };
  const toggle = () => {
    clearTimeout(closeTimer.current);
    if (!open) place();
    setOpen((v) => !v);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);

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
  // Actions render in the order the caller lists them, so a surface can put
  // Logout first without a fork of this menu. Logout is always present.
  const actions = (userOptions || []).filter((o) => o === editOption || o === logoutOption);
  if (!logoutOption) actions.push({ icon: "Logout", name: t("CORE_COMMON_LOGOUT"), func: () => {} });
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
            onMouseEnter={() => clearTimeout(closeTimer.current)}
            onMouseLeave={hideSoon}
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

            {/* Menu rows: explicit minHeight + lineHeight because the employee
              * header stylesheet sets a tight line-height on buttons, which
              * collapsed these rows even with padding applied. */}
            <div style={{ paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {actions.map((opt) => {
                const isLogout = opt.icon === "Logout";
                const tone = isLogout ? "#e11d48" : "#111827";
                return (
                  <button
                    key={opt.icon}
                    type="button"
                    role="menuitem"
                    // Class is load-bearing, not cosmetic: overrides.css resets
                    // `button:not([class]):has(> svg)` padding to 0 !important for
                    // bare icon-only buttons, which beat this row's inline padding.
                    className="pgr-topbar-menu-item"
                    onClick={() => pick(opt)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = isLogout ? "#fef2f2" : "#f3f4f6")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    style={menuItemStyle(tone)}
                  >
                    <Glyph d={isLogout ? ICONS.logout : ICONS.edit} size={18} style={{ stroke: tone }} />
                    <span>{opt.name}</span>
                  </button>
                );
              })}
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
        className="pgr-topbar-profile-trigger"
        onClick={toggle}
        onMouseEnter={show}
        onMouseLeave={hideSoon}
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

/** Hover-opening language menu (same portal pattern as the profile card;
 *  core's ChangeLanguage is module-internal, so the Digit APIs are used
 *  directly; languages come from MDMS StoreData). */
const LanguageSelect = () => {
  const { data: storeData, isLoading } = Digit.Hooks.useStore.getInitData();
  const { languages, stateInfo } = storeData || {};
  const selectedLanguage = Digit.StoreData.getCurrentLanguage();
  const [selected, setSelected] = useState(selectedLanguage);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const closeTimer = useRef(null);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  if (isLoading || !languages?.length) return null;

  const pretty = (l) => (l ? l.charAt(0).toUpperCase() + l.slice(1).toLowerCase() : l);
  const current = languages.find((l) => l?.value === selected) || languages[0];
  const show = () => {
    clearTimeout(closeTimer.current);
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setAnchor({ top: r.bottom + 12, right: Math.max(window.innerWidth - r.right, 8) });
    }
    setOpen(true);
  };
  const hideSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 300);
  };
  const choose = (language) => {
    setOpen(false);
    setSelected(language.value);
    Digit.LocalizationService.changeLanguage(language.value, stateInfo?.code);
  };

  const panel =
    open && anchor
      ? ReactDOM.createPortal(
          <div
            ref={panelRef}
            role="menu"
            onMouseEnter={() => clearTimeout(closeTimer.current)}
            onMouseLeave={hideSoon}
            style={{ position: "fixed", top: anchor.top, right: anchor.right, minWidth: "11rem", background: "#fff", color: "#111827", borderRadius: "0.75rem", boxShadow: "0 12px 32px rgba(16,24,40,0.18)", padding: "0.5rem", zIndex: 10000, textTransform: "none" }}
          >
            {languages.map((language) => {
              const active = language.value === selected;
              return (
                <button
                  key={language.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  // Class is load-bearing: overrides.css paints
                  // `button:not([class]):not(:has(> svg))` with the primary
                  // yellow fill at !important. The SELECTED row carries a
                  // checkmark svg so it escaped that rule, while unselected
                  // rows did not — which is exactly why the two states looked
                  // like different components. A class opts both out.
                  className="pgr-topbar-lang-item"
                  onClick={() => choose(language)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = active ? "#eff6ff" : "none")}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: active ? "#eff6ff" : "none", border: "none", cursor: "pointer", color: "#111827", fontSize: "0.875rem", fontWeight: active ? 600 : 400, padding: "0.625rem 0.75rem", borderRadius: "0.5rem", textAlign: "left" }}
                >
                  {pretty(language.label)}
                  {active && <Glyph d={["M5 13l4 4 10-10"]} size={14} style={{ stroke: "#2563eb" }} />}
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <span style={itemStyle}>
      <button
        ref={btnRef}
        type="button"
        className="pgr-topbar-lang-trigger"
        onClick={() => (open ? setOpen(false) : show())}
        onMouseEnter={show}
        onMouseLeave={hideSoon}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, font: "inherit", textTransform: "none" }}
      >
        {pretty(current?.label)}
        <Glyph d={ICONS.caret} size={14} />
      </button>
      {panel}
    </span>
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
        cityOptions().length > 1 && <CityPicker t={t} />,
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
      logoWidth={"40px"}
      logoHeight={"40px"}
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
