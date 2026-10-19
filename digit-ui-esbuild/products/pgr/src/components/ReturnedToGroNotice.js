import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { Modal } from "@egovernments/digit-ui-react-components";

// Reassign to GRO puts the complaint back in the GRO pool, unassigned, so it is
// no longer on this officer's list and this page is no longer theirs to act on:
// say so, count down, then take them to their inbox. replace(), so Back doesn't
// reopen the complaint.
const REDIRECT_SECONDS = 5;

const ReturnedToGroNotice = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);
  const goToInbox = () => history.replace(`/${window?.contextPath}/employee/pgr/inbox-v2`);

  useEffect(() => {
    if (seconds <= 0) {
      goToInbox();
      return undefined;
    }
    const timer = setTimeout(() => setSeconds((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  return (
    <Modal
      popupStyles={{ width: "32rem", maxWidth: "calc(100vw - 2rem)", borderRadius: "0.25rem", height: "fit-content" }}
      headerBarMainStyle={{ padding: 0, margin: 0 }}
      headerBarMain={<h1 className="heading-m">{t("CS_REASSIGNTOGRO_DONE_HEADING")}</h1>}
      actionSaveLabel={t("COMMON_GO_TO_INBOX")}
      actionSaveOnSubmit={goToInbox}
    >
      <p className="pgr-returned-to-gro-message" style={{ margin: "0 0 1rem 0", fontSize: "1rem", lineHeight: 1.5 }}>
        {t("CS_REASSIGNTOGRO_DONE_MESSAGE", { seconds })}
      </p>
    </Modal>
  );
};

export default ReturnedToGroNotice;
