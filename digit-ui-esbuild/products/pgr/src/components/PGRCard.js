import { EmployeeModuleCard, SVG } from "@egovernments/digit-ui-react-components";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

const ROLES = {
  // CMS_* roles (mz.igsae multi-tier workflow) added alongside the standard PGR roles — additive.
  // <DEPT>_{DIRECTOR,CHIEF_OFFICER,CECM} are the Bomet 3-tier department roles
  // (DIRECTOR is the last-mile actor, CHIEF_OFFICER/CECM the escalation tiers);
  // they work the inbox exactly like PGR_LME, so they get the same card.
  PGR: [
    "GRO", "PGR_LME", "CSR", "SUPERUSER",
    "CMS_ADMIN", "CMS_RECEPTION_OFFICER", "CMS_SCREENING_OFFICER", "CMS_SUPERVISOR", "CMS_CASE_MANAGER", "CMS_VIEWER",
    "HEALTH_DIRECTOR", "HEALTH_CHIEF_OFFICER", "HEALTH_CECM",
    "WATER_DIRECTOR", "WATER_CHIEF_OFFICER", "WATER_CECM",
    "ADMIN_DIRECTOR", "ADMIN_CHIEF_OFFICER", "ADMIN_CECM",
  ],
};

const PGRCard = () => {

  // Reset session storage
  // useEffect(() => {
  //   Digit.SessionStorage.del("paymentInbox");
  //   Digit.SessionStorage.del("selectedValues");
  //   Digit.SessionStorage.del("selectedLevel");
  //   Digit.SessionStorage.del("selectedProject");
  //   Digit.SessionStorage.del("selectedBoundaryCode");
  //   Digit.SessionStorage.del("boundary");
  // }, []);

  const { t } = useTranslation();
  const userInfo = Digit.UserService.getUser();
  const userRoles = userInfo?.info?.roles?.map((roleData) => roleData?.code);
  const generateLink = (labelKey, pathSuffix, roles = ROLES.PGR) => {
    return {
      label: t(labelKey),
      link: `/${window?.contextPath}/employee/pgr/${pathSuffix}`,
      roles: roles,
    };
  };

  if (!Digit.Utils.didEmployeeHasAtleastOneRole(Object.values(ROLES).flatMap((e) => e))) {
    return null;
  }

  let links = [
    generateLink("ACTION_TEST_CREATE_COMPLAINT", "create-complaint", ["CSR", "CMS_RECEPTION_OFFICER"]),
    generateLink("ACTION_TEST_SEARCH_COMPLAINT", "inbox-v2"),
    // Cross-department admin search (backend: _admin/_search) — SUPERUSER + CMS_ADMIN
    generateLink("ES_PGR_ADMIN_SEARCH", "admin-search", ["SUPERUSER", "CMS_ADMIN"]),
  ];
  const hasRequiredRoles = (link) => { 
    if (!link?.roles?.length) return true;
    return Digit.Utils.didEmployeeHasAtleastOneRole(link.roles);
  };
  links = links.filter(hasRequiredRoles);

  const propsForModuleCard = {
    // "UpdateExpense" is a line-art document-and-pencil built for an expense
    // screen, which sat next to the Dashboard card's filled grid and read as a
    // different icon set (#2038). Announcement is the filled speech-bubble the
    // reference image uses for complaints, and is already what this tenant's
    // own MDMS "Complaints" card row asks for.
    Icon: "Announcement",
    moduleName: t("PGR"),
    kpis: [],
    links: links,
    className: "microplan-employee-module-card",
  };
  return <EmployeeModuleCard {...propsForModuleCard} />;
};

export default PGRCard;
