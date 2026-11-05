import React, { useState, Fragment } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ActionBar, SubmitBar, ArrowLeft, ArrowForward } from "@egovernments/digit-ui-react-components";
import { Button } from "@egovernments/digit-ui-components";
import { PanelCard } from "@egovernments/digit-ui-components";
import { Eye } from "lucide-react";
import ReceiptActions from "./ReceiptActions";

const Response = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const queryStrings = Digit.Hooks.useQueryParams();
  const { state } = useLocation();
  const back = state?.back ? state?.back : "BACK";
  const receiptTitle = t("PGR_RECEIPT_TITLE") === "PGR_RECEIPT_TITLE" ? "Complaint Application" : t("PGR_RECEIPT_TITLE");
  const viewLabel = t("PGR_RECEIPT_VIEW") === "PGR_RECEIPT_VIEW" ? "View Application" : t("PGR_RECEIPT_VIEW");

  return (
    <>
      <PanelCard
        animationProps={{
          loop: false,
          noAutoplay: false,
        }}
        cardClassName=""
        cardStyles={{}}
        className=""
        customIcon=""
        description={t(state?.description)}
        footerChildren={[
          // Receipt for the complainant the officer just filed for (download /
          // print / share); it loads the created record itself by id.
          <Button key="another" label={t(`PGR_CREATE_ANOTHER_COMPLAIN`)} onClick={
            () => {
              history.push(`/${window.contextPath}/employee/pgr/create-complaint`);
            }
          } variation="teritiary" icon="ArrowForward" isSuffix />
        ]}
        footerStyles={{}}
        iconFill=""
        info={t(state?.info)}
        maxFooterButtonsAllowed={5}
        message={t(state?.message)}
        multipleResponses={[]}
        props={{}}
        response={t(state?.fileName ? state?.fileName : state?.responseId ? state?.responseId : "")}
        sortFooterButtons
        style={{}}
        type={state?.state}
      ></PanelCard>
      {state?.responseId ? (
        // Own row below the panel: the legacy footer squeezes the buttons into one
        // right-aligned line and leaves no room for the share sheet.
        <section className="pgr-receipt-row" aria-label={receiptTitle}>
          <p className="pgr-receipt-row__label">{receiptTitle}</p>
          <ReceiptActions
            complaintId={state.responseId}
            tenantId={Digit.ULBService.getCurrentTenantId()}
            // Counter operators asked to open the application they just filed
            // without going through the inbox (#185).
            extraActions={[
              {
                key: "view",
                label: viewLabel,
                icon: Eye,
                onClick: () => history.push(`/${window.contextPath}/employee/pgr/complaint-details/${state.responseId}`),
              },
            ]}
          />
        </section>
      ) : null}
      <ActionBar className="mc_back">
        <Button
          data-analytics-event="pgr.complaint.response-go-home"
          style={{ margin: "0.5rem", marginLeft: "6rem", minWidth: "16rem" }}
          variation="primary"
          label={t(back)}
          icon={"ArrowBack"}
          onClick={() => {
            const backlink = state?.backlink || `/${window.contextPath}/employee/`;
            history.push(backlink);
          }}
        />
      </ActionBar>
    </>
  );
};

export default Response;
