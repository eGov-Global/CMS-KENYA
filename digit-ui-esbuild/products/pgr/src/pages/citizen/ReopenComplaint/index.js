import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Switch, useRouteMatch } from "react-router-dom";
import { Card, CardHeader, CardText } from "@egovernments/digit-ui-react-components";
// import UserOnboarding from "../UserOnboarding/index";
import { PgrRoutes, getRoute } from "../../../constants/Routes";
import ReasonPage from "./Reason";
import UploadPhoto from "./UploadPhoto";
import AddtionalDetails from "./AddtionalDetails";
import Response from "../Response";
import useActionWindow from "../../../hooks/pgr/useActionWindow";

/**
 * The reopen steps are reached from the complaint page and straight from the reopen link in
 * notifications. Once the tenant's reopen window has passed (same rule the complaint page and
 * pgr-services apply), the step is replaced by a notice instead of a form the server would
 * refuse on submit. Lives inside each step so its re-checks never re-render the route parent.
 */
const ReopenWindowGate = ({ id, complaintDetails, children }) => {
  const { t } = useTranslation();
  const tr = (key, fallback) => (t(key) === key ? fallback : t(key));
  const reopenWindow = useActionWindow({
    action: "REOPEN",
    tenantId: complaintDetails?.service?.tenantId,
    auditDetails: complaintDetails?.service?.auditDetails,
  });
  if (!complaintDetails?.service || !reopenWindow.ready || reopenWindow.open) return children;
  return (
    <Card>
      <CardHeader>{tr("CS_COMMON_REOPEN", "Re-open")}</CardHeader>
      <CardText>{tr("CS_CANNOT_REOPEN_COMPLAINT_PAST_DEADLINE", "The window for reopening this complaint has closed")}</CardText>
      <Link to={`/${window?.contextPath || "digit-ui"}/citizen/pgr/complaints/${id}`}>
        {tr("CS_COMPLAINT_DETAILS_COMPLAINT_DETAILS", "Complaint Details")}
      </Link>
    </Card>
  );
};

const ReopenComplaint = ({ match, history, parentRoute }) => {
  
  const allParams = window.location.pathname.split("/")
  const id = allParams[allParams.length - 1]
  const tenantId = Digit.SessionStorage.get("CITIZEN.COMMON.HOME.CITY")?.code || Digit.ULBService.getCurrentTenantId();

  const complaintDetails = Digit.Hooks.pgr.useComplaintDetails({ tenantId: tenantId, id: id }).complaintDetails;
  return (
    <Switch>
      <Route exact path={getRoute(match, PgrRoutes.ReasonPage)} component={() => <ReopenWindowGate id={id} complaintDetails={complaintDetails}><ReasonPage match={match} {...{complaintDetails}} /></ReopenWindowGate>} />
      <Route path={getRoute(match, PgrRoutes.UploadPhoto)} component={() => <ReopenWindowGate id={id} complaintDetails={complaintDetails}><UploadPhoto match={match} skip={true} {...{complaintDetails}} /></ReopenWindowGate>} />
      <Route path={getRoute(match, PgrRoutes.AddtionalDetails)} component={() => <ReopenWindowGate id={id} complaintDetails={complaintDetails}><AddtionalDetails match={match} parentRoute={parentRoute} {...{complaintDetails}} /></ReopenWindowGate>} />
      <Route path={getRoute(match, PgrRoutes.Response)} component={() => <Response match={match} />} />
    </Switch>
  );
};

export { ReopenComplaint };
