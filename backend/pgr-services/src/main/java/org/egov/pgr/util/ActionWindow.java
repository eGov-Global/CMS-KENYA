package org.egov.pgr.util;

import org.egov.pgr.web.models.AuditDetails;

/**
 * A resolved time window for one workflow action: the action may only be taken while
 * {@code now - measuredFrom <= windowMillis}. Built by {@link MDMSUtils#getActionWindow} from
 * RAINMAKER-PGR.UIConstants.actionWindows (or the deployment defaults, pgr.action.windows.defaults)
 * and enforced by ServiceRequestValidator#validateActionWindow. {@code message} /
 * {@code notOwnerMessage} are the configured error texts (window passed / a citizen acting on
 * someone else's complaint), or null for the generic ones.
 */
public record ActionWindow(String action, long windowMillis, MeasuredFrom measuredFrom, String message,
                           String notOwnerMessage) {

    /**
     * Which persisted timestamp the window runs from — the two audit timestamps a complaint has
     * (eg_pgr_service_v2.createdtime / lastmodifiedtime). Which action uses which is config
     * (a rule's "measuredFrom"), not code.
     */
    public enum MeasuredFrom {
        /** Filing time — never changes after creation, so later updates never extend the window. */
        CREATED_TIME("createdTime"),
        /** Time of the most recent update or workflow transition. */
        LAST_MODIFIED_TIME("lastModifiedTime");

        private final String configValue;

        MeasuredFrom(String configValue) {
            this.configValue = configValue;
        }

        public String configValue() {
            return configValue;
        }

        /** The config spelling ("createdTime" / "lastModifiedTime"), or null when unrecognised. */
        public static MeasuredFrom fromConfig(Object value) {
            if (value == null)
                return null;
            for (MeasuredFrom m : values())
                if (m.configValue.equalsIgnoreCase(value.toString().trim()))
                    return m;
            return null;
        }

        public Long read(AuditDetails auditDetails) {
            if (auditDetails == null)
                return null;
            return this == CREATED_TIME ? auditDetails.getCreatedTime() : auditDetails.getLastModifiedTime();
        }
    }
}
