import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "react-query";
import { useParams, useHistory, Redirect } from "react-router-dom";

import { BackButton, Card, CardHeader, CardText, CardLabelError, TextArea, SubmitBar } from "@egovernments/digit-ui-react-components";

import { updateComplaints } from "../../../redux/actions/index";
import { LOCALIZATION_KEY } from "../../../constants/Localization";
import { mergeAdditionalDetail } from "../../../utils/additionalDetail";
import { findLatestAssigneeUuidByRole, findLatestAssigneeUuidByAnyRole } from "../../../utils/workflowAssignee";
import { deriveTransitionAssigneeRoles } from "../../../utils/autoAssign";
import { EV, trackE, trackApiError } from "../../../utils/analytics";

const AddtionalDetails = (props) => {
  const history = useHistory();
  let { id } = useParams();
  const dispatch = useDispatch();
  const appState = useSelector((state) => state)["common"];
  let { t } = useTranslation();

  const { complaintDetails } = props;
  // Roles that may hold an assignment come from the LIVE workflow, not a
  // hardcoded constant: Bomet's 2-level PGR has no CMS_SUPERVISOR.
  const reopenTenant = complaintDetails?.service?.tenantId || Digit.ULBService.getCurrentTenantId();
  // The submit waits for this: the routing below reads the live workflow to
  // find who can act on the reopened state, and a click that beats the fetch
  // would send the reopen unassigned — into nobody's queue.
  const { businessService, isLoading: workflowLoading } = Digit.Hooks.pgr.useBusinessServiceStates(reopenTenant);
  const autoAssignment = Digit.Hooks.pgr.useAutoAssignment(reopenTenant);
  const queryClient = useQueryClient();

  // CCSD-2082 Issue 3: reason details are now MANDATORY (reverses CCSD-1955,
  // which had made them optional). Track the value locally so we can block the
  // reopen and surface an error until the citizen provides an explanation.
  const [details, setDetails] = useState(() => Digit.SessionStorage.get(`reopen.${id}`)?.addtionalDetail || "");
  const [error, setError] = useState(false);
  // A rejected _update used to surface nowhere: the promise was never awaited,
  // so the citizen stayed on this step with a silent console error (#61).
  const [submitError, setSubmitError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (appState.complaints) {
      const { response } = appState.complaints;
      if (response && response.responseInfo.status === "successful") {
        history.push(`${props.match.path}/response/:${id}`);
      }
    }
  }, [appState.complaints, props.history]);

  const updateComplaint = useCallback(
    async (complaintDetails) => {
      await dispatch(updateComplaints(complaintDetails));
      // CCSD-2119: the reopen goes through the redux updateComplaints path, which
      // does NOT touch react-query. The citizen status pill (useComplaintDetails
      // -> ["complaintDetails", tenantId, id]) and My Complaints list
      // (useComplaintsListByMobile -> ["complaintsList", …]) therefore kept
      // serving the pre-reopen status until a manual browser refresh. Invalidate
      // both so they refetch — active views update live, others on next mount.
      queryClient.invalidateQueries(["complaintDetails"]);
      queryClient.invalidateQueries(["complaintsList"]);
      // Analytics: submission only — the /response page reports the settled
      // outcome (reopened vs failed) as its own virtual pageview.
      trackE(EV.COMPLAINT_REOPENED);
      history.push(`${props.match.path}/response/${id}`);
    },
    [dispatch, queryClient]
  );

  // CCSD-2167: reopen routes the complaint back to the SUPERVISOR who handled
  // it. `assignes` defaults to [] so a complaint with no supervisor in its
  // history (e.g. rejected at the screening stage, or the standard non-CMS
  // workflow) keeps the pre-2167 behaviour. hrmsAssignes mirrors assignes,
  // matching the employee ASSIGN payload (PGRDetails.js).
  const getUpdatedWorkflow = (reopenDetails, type, assignes = []) => {
    switch (type) {
      case "REOPEN":
        return {
          action: "REOPEN",
          comments: reopenDetails.addtionalDetail,
          assignes,
          hrmsAssignes: assignes,
          verificationDocuments: reopenDetails.verificationDocuments,
        };
      default:
        return "";
    }
  };

  async function reopenComplaint() {
    // CCSD-2082 Issue 3: require a non-empty explanation before reopening.
    if (!details || !details.trim()) {
      setError(true);
      return;
    }
    if (submitting || workflowLoading || !complaintDetails) return;
    let reopenDetails = Digit.SessionStorage.get(`reopen.${id}`);
    setSubmitError(false);
    setSubmitting(true);
    try {
      // CCSD-2167: find the Supervisor from the complaint's workflow history.
      // Complaint's tenant, not the state root — see SelectRating.js note.
      const wfTenant = complaintDetails?.service?.tenantId || Digit.ULBService.getStateId();
      const businessId = complaintDetails?.service?.serviceRequestId || id;
      // Reopen routes back to the LME who handled the complaint before, so the
      // citizen's follow-up reaches the person with the context. REOPEN lands
      // in PENDINGATLME, and that state has NO ASSIGN action — an unassigned
      // reopen can therefore never be given an owner again, so this must not
      // be left empty.
      //
      // 1) CMS_SUPERVISOR keeps the Mozambique CMS workflow behaviour.
      // 2) Otherwise the previous holder of a role that can act on the state
      //    REOPEN lands in (Bomet: PGR_LME / PGR_VIEWER; Nairobi: PGR_LME).
      //    Derived from the REOPEN transition, not the create path: Nairobi
      //    fronts creation with a GRO triage stop, so the create-path roles
      //    picked the assessor who filed the complaint and the engine refused
      //    the reopen with INVALID_ASSIGNEE (#61).
      // 3) Otherwise fall back to fresh department+jurisdiction routing, the
      //    same resolver the citizen create flow uses — covers a complaint
      //    whose original handler has since left.
      let reopenAssignee = await findLatestAssigneeUuidByRole(wfTenant, businessId, "CMS_SUPERVISOR");
      if (!reopenAssignee) {
        reopenAssignee = await findLatestAssigneeUuidByAnyRole(
          wfTenant,
          businessId,
          deriveTransitionAssigneeRoles(businessService, complaintDetails?.service?.applicationStatus, "REOPEN")
        );
      }
      if (!reopenAssignee) {
        const resolved = autoAssignment.resolve({
          departmentCode: complaintDetails?.service?.additionalDetail?.autoAssignment?.departmentCode,
          localityCode: complaintDetails?.service?.address?.locality?.code,
          seed: `${businessId}:reopen`,
        });
        reopenAssignee = resolved?.uuid || null;
      }
      const assignes = reopenAssignee ? [reopenAssignee] : [];
      complaintDetails.workflow = getUpdatedWorkflow(
        reopenDetails,
        // complaintDetails,
        "REOPEN",
        assignes
      );
      // CCSD-2012: MERGE the reopen reason into additionalDetail instead of
      // replacing the object. Replacing dropped the `department` stamped at
      // create/ASSIGN, so the backend re-derived it from the serviceCode —
      // "NA" for unmapped codes — and department-scoped supervisors could no
      // longer see the reopened complaint (inbox empty + details "No Results
      // Found" while the workflow's Take Action still rendered).
      // resetEscalation: a reopen starts a fresh lifecycle — carrying the
      // escalation bookkeeping over would freeze auto-escalation at the old
      // level (the pre-fix replace reset it by accident; we do it on purpose).
      complaintDetails.service.additionalDetail = mergeAdditionalDetail(
        complaintDetails.service.additionalDetail,
        { REOPEN_REASON: reopenDetails.reason },
        { resetEscalation: true }
      );
      await updateComplaint({ service: complaintDetails.service, workflow: complaintDetails.workflow });
    } catch (err) {
      // Stay on the step, say so, and let the citizen retry: the button is
      // disabled only while a submit is in flight.
      trackApiError("PgrReopen", err);
      setSubmitError(true);
      setSubmitting(false);
    }
  }

  function textInput(e) {
    const value = e.target.value;
    setDetails(value);
    if (error && value && value.trim()) setError(false);
    let reopenDetails = Digit.SessionStorage.get(`reopen.${id}`);
    Digit.SessionStorage.set(`reopen.${id}`, {
      ...reopenDetails,
      addtionalDetail: value,
    });
  }

  // CCSD-2082 Issue 3: mandatory label. Falls back to English when the
  // localisation key is not seeded (Kenya tenants are English-only).
  const detailsLabel =
    t("CS_REOPEN_DETAILS_LABEL") === "CS_REOPEN_DETAILS_LABEL"
      ? "Provide the details of the reason for reopening the complaint"
      : t("CS_REOPEN_DETAILS_LABEL");
  const submitErrorText =
    t("CS_REOPEN_SUBMIT_ERROR") === "CS_REOPEN_SUBMIT_ERROR"
      ? "The complaint could not be reopened. Please try again."
      : t("CS_REOPEN_SUBMIT_ERROR");

  return (
    <React.Fragment>
      <Card>
        <CardHeader>
          {detailsLabel} <span style={{ color: "#d4351c" }}>*</span>
        </CardHeader>
        <CardText>{t(`${LOCALIZATION_KEY.CS_ADDCOMPLAINT}_ADDITIONAL_DETAILS_TEXT`)}</CardText>
        <TextArea name={"AdditionalDetails"} value={details} onChange={textInput}></TextArea>
        {error ? <CardLabelError>{t(`${LOCALIZATION_KEY.CS_ADDCOMPLAINT}_ERROR_REOPEN_DETAILS`)}</CardLabelError> : null}
        {submitError ? <CardLabelError>{submitErrorText}</CardLabelError> : null}
        <div onClick={reopenComplaint}>
          <SubmitBar label={t(`${LOCALIZATION_KEY.CS_HEADER}_REOPEN_COMPLAINT`)} disabled={submitting || workflowLoading} />
        </div>
      </Card>
    </React.Fragment>
  );
};

export default AddtionalDetails;
