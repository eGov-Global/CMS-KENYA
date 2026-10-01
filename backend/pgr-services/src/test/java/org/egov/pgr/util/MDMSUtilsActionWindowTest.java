package org.egov.pgr.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.common.utils.MultiStateInstanceUtil;
import org.egov.pgr.config.PGRConfiguration;
import org.egov.pgr.repository.ServiceRequestRepository;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pins how {@link MDMSUtils#getActionWindow} resolves a time-limited workflow action from
 * RAINMAKER-PGR.UIConstants: tenant-configured actionWindows rules first, the deployment defaults
 * (pgr.action.windows.defaults) for anything not listed, the MDMS value over the fallback (#1252),
 * and fail-closed on a broken rule. No action is known to the code itself.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MDMSUtilsActionWindowTest {

    private static final String TENANT = "bo";
    private static final long HOUR = 60 * 60 * 1000L;
    private static final long REOPEN_PROPERTY = 10 * 24 * HOUR;    // deliberately != any MDMS value
    private static final long WITHDRAW_PROPERTY = 9 * 24 * HOUR;

    @Mock private PGRConfiguration config;
    @Mock private ServiceRequestRepository serviceRequestRepository;
    @Mock private ObjectMapper objectMapper;
    @Mock private MultiStateInstanceUtil multiStateInstanceUtil;

    private MDMSUtils mdmsUtils;

    @BeforeEach
    void setUp() {
        mdmsUtils = new MDMSUtils(config, serviceRequestRepository, objectMapper);
        ReflectionTestUtils.setField(mdmsUtils, "multiStateInstanceUtil", multiStateInstanceUtil);
        when(multiStateInstanceUtil.getStateLevelTenant(anyString())).thenAnswer(inv -> inv.getArgument(0));
        when(config.getMdmsHost()).thenReturn("http://mdms/");
        when(config.getMdmsEndPoint()).thenReturn("mdms/v1/_search");
        when(config.getNotificationMdmsCacheTtlMs()).thenReturn(60_000L);
        when(config.getActionWindowDefaults()).thenReturn(DEFAULTS_JSON);
    }

    /** Mirrors application.properties' pgr.action.windows.defaults. */
    private static final String DEFAULTS_JSON = "["
            + "{\"action\":\"REOPEN\",\"windowKey\":\"REOPENSLA\",\"measuredFrom\":\"lastModifiedTime\","
            + "\"fallbackMs\":" + REOPEN_PROPERTY + ",\"message\":\"Complaint is closed\","
            + "\"notOwnerMessage\":\"Not authorized to re-open the complain\"},"
            + "{\"action\":\"WITHDRAW\",\"windowKey\":\"WITHDRAWSLA\",\"measuredFrom\":\"createdTime\","
            + "\"fallbackMs\":" + WITHDRAW_PROPERTY + "}]";

    /** {"MdmsRes":{"RAINMAKER-PGR":{"UIConstants":[row]}}} — the shape fetchResult returns. */
    private void stubUiConstants(Map<String, Object> row) {
        Map<String, Object> module = new LinkedHashMap<>();
        module.put("UIConstants", List.of(row));
        Map<String, Object> mdmsRes = new LinkedHashMap<>();
        mdmsRes.put("RAINMAKER-PGR", module);
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("MdmsRes", mdmsRes);
        when(serviceRequestRepository.fetchResult(any(), any())).thenReturn(root);
    }

    private static Map<String, Object> row(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("code", "DEFAULT");
        for (int i = 0; i < kv.length; i += 2)
            m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    private static Map<String, Object> rule(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2)
            m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    private ActionWindow window(String action) {
        Optional<ActionWindow> w = mdmsUtils.getActionWindow(null, TENANT, action);
        assertTrue(w.isPresent(), "expected a window for " + action);
        return w.get();
    }

    // ── deployment defaults (no actionWindows configured) ─────────────────────

    @Test
    void default_reopen_usesReopenSla_fromLastModified() {
        stubUiConstants(row("REOPENSLA", 72 * HOUR));
        ActionWindow w = window("REOPEN");
        assertEquals(72 * HOUR, w.windowMillis());
        assertEquals(ActionWindow.MeasuredFrom.LAST_MODIFIED_TIME, w.measuredFrom());
    }

    @Test
    void default_withdraw_usesWithdrawSla_fromFiling() {
        stubUiConstants(row("REOPENSLA", 72 * HOUR, "WITHDRAWSLA", 48 * HOUR));
        ActionWindow w = window("WITHDRAW");
        assertEquals(48 * HOUR, w.windowMillis());
        assertEquals(ActionWindow.MeasuredFrom.CREATED_TIME, w.measuredFrom());
    }

    @Test
    void actionMatching_isCaseInsensitive() {
        stubUiConstants(row("WITHDRAWSLA", 48 * HOUR));
        assertEquals(48 * HOUR, window("withdraw").windowMillis());
    }

    /** #1252: the MDMS value is enforced, never the (wider) deployment property. */
    @Test
    void mdmsValue_winsOverProperty() {
        stubUiConstants(row("REOPENSLA", 6 * HOUR));
        assertEquals(6 * HOUR, window("REOPEN").windowMillis());
    }

    @Test
    void missingMdmsValue_fallsBackToProperty() {
        stubUiConstants(row("REOPENSLA", 72 * HOUR));   // no WITHDRAWSLA
        assertEquals(WITHDRAW_PROPERTY, window("WITHDRAW").windowMillis());
    }

    @Test
    void nonPositiveMdmsValue_isIgnored_fallsBackToProperty() {
        stubUiConstants(row("REOPENSLA", 0));
        assertEquals(REOPEN_PROPERTY, window("REOPEN").windowMillis());
    }

    /** An MDMS outage must not leave REOPEN/WITHDRAW unbounded: defaults + properties apply. */
    @Test
    void mdmsUnavailable_defaultsAndPropertiesStillApply() {
        when(serviceRequestRepository.fetchResult(any(), any())).thenThrow(new RuntimeException("mdms down"));
        assertEquals(REOPEN_PROPERTY, window("REOPEN").windowMillis());
        assertEquals(WITHDRAW_PROPERTY, window("WITHDRAW").windowMillis());
        assertEquals(ActionWindow.MeasuredFrom.CREATED_TIME, window("WITHDRAW").measuredFrom());
    }

    @Test
    void actionWithNoRule_isNotTimeLimited() {
        stubUiConstants(row("REOPENSLA", 72 * HOUR));
        assertTrue(mdmsUtils.getActionWindow(null, TENANT, "RESOLVE").isEmpty());
        assertTrue(mdmsUtils.getActionWindow(null, TENANT, null).isEmpty());
    }

    /**
     * Pre-actionWindows REOPENSLA lookup, preserved: a city record without the value uses the
     * STATE record's value before the deployment fallback.
     */
    @Test
    void cityRecordWithoutValue_usesStateRecordValue() {
        when(multiStateInstanceUtil.getStateLevelTenant("ke.bomet")).thenReturn("ke");
        when(serviceRequestRepository.fetchResult(any(), any())).thenAnswer(inv -> {
            org.egov.mdms.model.MdmsCriteriaReq req = inv.getArgument(1);
            Map<String, Object> r = "ke".equals(req.getMdmsCriteria().getTenantId())
                    ? row("REOPENSLA", 5 * HOUR)
                    : row();   // city record exists, but carries no REOPENSLA
            Map<String, Object> module = new LinkedHashMap<>();
            module.put("UIConstants", List.of(r));
            Map<String, Object> mdmsRes = new LinkedHashMap<>();
            mdmsRes.put("RAINMAKER-PGR", module);
            Map<String, Object> root = new LinkedHashMap<>();
            root.put("MdmsRes", mdmsRes);
            return root;
        });
        Optional<ActionWindow> w = mdmsUtils.getActionWindow(null, "ke.bomet", "REOPEN");
        assertTrue(w.isPresent());
        assertEquals(5 * HOUR, w.get().windowMillis());
    }

    // ── tenant-configured actionWindows ──────────────────────────────────────

    @Test
    void configuredRule_overridesDefault() {
        stubUiConstants(row("REOPENSLA", 72 * HOUR, "WITHDRAWSLA", 72 * HOUR,
                "actionWindows", List.of(rule("action", "WITHDRAW", "windowKey", "WITHDRAWSLA", "measuredFrom", "lastModifiedTime"))));
        assertEquals(ActionWindow.MeasuredFrom.LAST_MODIFIED_TIME, window("WITHDRAW").measuredFrom());
        // REOPEN is not listed, so its built-in default still applies
        assertEquals(72 * HOUR, window("REOPEN").windowMillis());
    }

    /** A new action becomes time-limited by config alone, with an inline windowMs. */
    @Test
    void configOnlyAction_withInlineWindowMs() {
        stubUiConstants(row("REOPENSLA", 72 * HOUR,
                "actionWindows", List.of(rule("action", "ESCALATE", "windowMs", 2 * HOUR, "measuredFrom", "createdTime"))));
        ActionWindow w = window("ESCALATE");
        assertEquals(2 * HOUR, w.windowMillis());
        assertEquals(ActionWindow.MeasuredFrom.CREATED_TIME, w.measuredFrom());
    }

    @Test
    void invalidMeasuredFrom_failsClosed() {
        stubUiConstants(row("WITHDRAWSLA", 72 * HOUR,
                "actionWindows", List.of(rule("action", "WITHDRAW", "windowKey", "WITHDRAWSLA", "measuredFrom", "filingTime"))));
        CustomException ex = assertThrows(CustomException.class, () -> mdmsUtils.getActionWindow(null, TENANT, "WITHDRAW"));
        assertEquals("INVALID_ACTION_WINDOW_CONFIG", ex.getCode());
    }

    @Test
    void ruleWithNoResolvableWindow_failsClosed() {
        stubUiConstants(row("actionWindows", List.of(rule("action", "ESCALATE", "windowKey", "ESCALATESLA", "measuredFrom", "createdTime"))));
        CustomException ex = assertThrows(CustomException.class, () -> mdmsUtils.getActionWindow(null, TENANT, "ESCALATE"));
        assertEquals("INVALID_ACTION_WINDOW_CONFIG", ex.getCode());
    }

    // ── messages ──────────────────────────────────────────────────────────────

    @Test
    void message_comesFromDefaultRule() {
        stubUiConstants(row("REOPENSLA", 72 * HOUR));
        assertEquals("Complaint is closed", window("REOPEN").message());
        assertEquals("Not authorized to re-open the complain", window("REOPEN").notOwnerMessage());
        assertNull(window("WITHDRAW").message());   // none configured -> validator's generic text
    }

    @Test
    void tenantRuleMessage_overridesDefaultMessage() {
        stubUiConstants(row("REOPENSLA", 72 * HOUR,
                "actionWindows", List.of(rule("action", "REOPEN", "windowKey", "REOPENSLA",
                        "measuredFrom", "lastModifiedTime", "message", "Reopen period is over"))));
        assertEquals("Reopen period is over", window("REOPEN").message());
    }

    /** A tenant rule reusing a default's windowKey keeps that default's fallbackMs as its backstop. */
    @Test
    void tenantRuleWithoutValue_usesDefaultRulesFallback() {
        stubUiConstants(row("actionWindows", List.of(rule("action", "WITHDRAW", "windowKey", "WITHDRAWSLA", "measuredFrom", "lastModifiedTime"))));
        ActionWindow w = window("WITHDRAW");
        assertEquals(WITHDRAW_PROPERTY, w.windowMillis());
        assertEquals(ActionWindow.MeasuredFrom.LAST_MODIFIED_TIME, w.measuredFrom());
    }

    // ── nothing is hardcoded ──────────────────────────────────────────────────

    /** With no deployment defaults and no MDMS rules, no action is time-limited at all. */
    @Test
    void noDefaultsAndNoRules_nothingIsTimeLimited() {
        when(config.getActionWindowDefaults()).thenReturn("[]");
        stubUiConstants(row("REOPENSLA", 72 * HOUR));
        assertTrue(mdmsUtils.getActionWindow(null, TENANT, "REOPEN").isEmpty());
        assertTrue(mdmsUtils.getActionWindow(null, TENANT, "WITHDRAW").isEmpty());
    }

    @Test
    void invalidDefaultsJson_failsClosed() {
        when(config.getActionWindowDefaults()).thenReturn("[{not json");
        stubUiConstants(row("REOPENSLA", 72 * HOUR));
        CustomException ex = assertThrows(CustomException.class, () -> mdmsUtils.getActionWindow(null, TENANT, "REOPEN"));
        assertEquals("INVALID_ACTION_WINDOW_CONFIG", ex.getCode());
    }

    /**
     * The shipped pgr.action.windows.defaults (line continuations + ${} placeholders) must resolve
     * to valid rules — a typo there would otherwise only surface as INVALID_ACTION_WINDOW_CONFIG in
     * production.
     */
    @Test
    void shippedDefaultsInApplicationProperties_parseAndResolve() throws Exception {
        java.util.Properties props = new java.util.Properties();
        try (java.io.InputStream in = getClass().getClassLoader().getResourceAsStream("application.properties")) {
            props.load(in);
        }
        String resolved = new org.springframework.util.PropertyPlaceholderHelper("${", "}")
                .replacePlaceholders(props.getProperty("pgr.action.windows.defaults"), props);
        when(config.getActionWindowDefaults()).thenReturn(resolved);
        stubUiConstants(row());   // nothing in MDMS -> every value comes from the shipped defaults

        ActionWindow reopen = window("REOPEN");
        assertEquals(Long.parseLong(props.getProperty("pgr.complain.idle.time")), reopen.windowMillis());
        assertEquals(ActionWindow.MeasuredFrom.LAST_MODIFIED_TIME, reopen.measuredFrom());
        assertEquals("Complaint is closed", reopen.message());

        ActionWindow withdraw = window("WITHDRAW");
        assertEquals(Long.parseLong(props.getProperty("pgr.complain.withdraw.time")), withdraw.windowMillis());
        assertEquals(ActionWindow.MeasuredFrom.CREATED_TIME, withdraw.measuredFrom());
    }

    // ── caching ───────────────────────────────────────────────────────────────

    @Test
    void uiConstants_areCachedWithinTtl_acrossActions() {
        stubUiConstants(row("REOPENSLA", 72 * HOUR, "WITHDRAWSLA", 72 * HOUR));
        window("REOPEN");
        window("WITHDRAW");
        window("REOPEN");
        verify(serviceRequestRepository, times(1)).fetchResult(any(), any());
    }
}
