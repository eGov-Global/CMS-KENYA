/**
 * The employee's complaint entry points, in one place.
 *
 * The home page's module card and the sidebar's Complaints section both offer
 * these, and they must agree on who sees what: a GRO who cannot create a
 * complaint should not find a Create row in either. Building the list once,
 * with the role check applied here, is what keeps the two from drifting.
 */
export const PGR_EMPLOYEE_ROLES = [
  "GRO", "PGR_LME", "CSR", "SUPERUSER",
  // CMS_* roles (mz.igsae multi-tier workflow) added alongside the standard PGR roles — additive.
  "CMS_ADMIN", "CMS_RECEPTION_OFFICER", "CMS_SCREENING_OFFICER", "CMS_SUPERVISOR", "CMS_CASE_MANAGER", "CMS_VIEWER",
  // <DEPT>_{DIRECTOR,CHIEF_OFFICER,CECM} are the Bomet 3-tier department roles
  // (DIRECTOR is the last-mile actor, CHIEF_OFFICER/CECM the escalation tiers);
  // they work the inbox exactly like PGR_LME, so they get the same entry points.
  "HEALTH_DIRECTOR", "HEALTH_CHIEF_OFFICER", "HEALTH_CECM",
  "WATER_DIRECTOR", "WATER_CHIEF_OFFICER", "WATER_CECM",
  "ADMIN_DIRECTOR", "ADMIN_CHIEF_OFFICER", "ADMIN_CECM",
  // Nairobi's HRMS provisions the same tiers as BARE codes, and its workflow
  // lets them act at Pending-at-LME and the escalation levels. Without these,
  // chief officers and CECMs (who hold no PGR_LME) got no Complaints card.
  "DIRECTOR", "CHIEF_OFFICER", "CECM",
  // Bomet ombudsman office — works the inbox/search like PGR_LME (2026-09-18
  // request). Code as provisioned in HRMS, mixed case included.
  "Ombudsman_Officer", "OMBUDSMAN_OFFICER",
];

export const getPGREmployeeLinks = (t) => {
  if (!Digit.Utils.didEmployeeHasAtleastOneRole(PGR_EMPLOYEE_ROLES)) {
    return [];
  }
  const base = `/${window?.contextPath}/employee/pgr`;
  const links = [
    {
      key: "create",
      // "File a Complaint", the citizen app's words for the same action, on
      // the employee side too (#2038).
      label: t("CS_COMMON_FILE_A_COMPLAINT"),
      link: `${base}/create-complaint`,
      roles: ["CSR", "CMS_RECEPTION_OFFICER"],
      icon: "NoteAdd",
    },
    {
      key: "search",
      label: t("ACTION_TEST_SEARCH_COMPLAINT"),
      link: `${base}/inbox-v2`,
      roles: PGR_EMPLOYEE_ROLES,
      icon: "Search",
    },
    {
      key: "admin-search",
      // Cross-department admin search (backend: _admin/_search) — SUPERUSER + CMS_ADMIN
      label: t("ES_PGR_ADMIN_SEARCH"),
      link: `${base}/admin-search`,
      roles: ["SUPERUSER", "CMS_ADMIN"],
      icon: "Search",
    },
  ];
  return links.filter((link) => Digit.Utils.didEmployeeHasAtleastOneRole(link.roles));
};

/**
 * The sidebar's Complaints section. Registered as `PGRSidebarSection`, the
 * same `${code}…` convention the home page uses to find `PGRCard`, so the core
 * shell asks each enabled module for its section without importing any of them.
 */
export const getPGRSidebarSection = (t) => {
  const links = getPGREmployeeLinks(t);
  if (links.length === 0) return null;
  return {
    key: "pgr",
    label: t("CORE_SIDEBAR_SECTION_COMPLAINTS", "Complaints"),
    items: links.map(({ key, label, link, icon }) => ({ key, label, navigationUrl: link, icon })),
  };
};

/**
 * The citizen rail's Complaints section, registered as
 * `PGRCitizenSidebarSection`. Every citizen can file and follow complaints
 * (a signed-out visitor is sent to sign in first), so there is no role gate;
 * the labels are the ones the citizen home card already uses for the same
 * two links.
 */
export const getPGRCitizenSidebarSection = (t) => {
  const base = `/${window?.contextPath}/citizen/pgr`;
  return {
    key: "pgr",
    label: t("CORE_SIDEBAR_SECTION_COMPLAINTS", "Complaints"),
    items: [
      { key: "file", label: t("CS_COMMON_FILE_A_COMPLAINT"), navigationUrl: `${base}/create-complaint`, icon: "NoteAdd" },
      { key: "mine", label: t("CS_HOME_MY_COMPLAINTS"), navigationUrl: `${base}/complaints`, icon: "ListAlt" },
    ],
  };
};
