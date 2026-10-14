package org.egov.pgr.validator;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.utils.MultiStateInstanceUtil;
import org.egov.pgr.config.PGRConfiguration;
import org.egov.pgr.repository.PGRRepository;
import org.egov.pgr.repository.ServiceRequestRepository;
import org.egov.pgr.util.HRMSUtil;
import org.egov.pgr.util.MDMSUtils;
import org.egov.pgr.web.models.*;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.util.PropertyPlaceholderHelper;

import java.io.InputStream;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * End-to-end wiring of the time-limited actions, with nothing between the request and the decision
 * mocked except the two I/O edges: the persisted complaint row (PGRRepository) and the MDMS HTTP
 * response (ServiceRequestRepository). Everything else is real — ServiceRequestValidator,
 * MDMSUtils' rule resolution, and the SHIPPED pgr.action.windows.defaults from
 * application.properties — so this proves the configured criteria actually drive the REOPEN and
 * WITHDRAW decisions, not just that each piece works alone.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ActionWindowWiringTest {

    private static final String TENANT = "bo";
    private static final long HOUR = 60 * 60 * 1000L;
    private static final long MIN = 60 * 1000L;

    @Mock private PGRConfiguration config;
    @Mock private PGRRepository repository;
    @Mock private HRMSUtil hrmsUtil;
    @Mock private ServiceRequestRepository serviceRequestRepository;
    @Mock private MultiStateInstanceUtil multiStateInstanceUtil;

    private ServiceRequestValidator validator;
    private Map<String, Object> uiConstants;

    @BeforeEach
    void setUp() throws Exception {
        Properties props = new Properties();
        try (InputStream in = getClass().getClassLoader().getResourceAsStream("application.properties")) {
            props.load(in);
        }
        String shippedDefaults = new PropertyPlaceholderHelper("${", "}")
                .replacePlaceholders(props.getProperty("pgr.action.windows.defaults"), props);

        when(config.getActionWindowDefaults()).thenReturn(shippedDefaults);
        when(config.getNotificationMdmsCacheTtlMs()).thenReturn(60_000L);
        when(config.getMdmsHost()).thenReturn("http://mdms/");
        when(config.getMdmsEndPoint()).thenReturn("mdms/v1/_search");
        when(config.getAllowedSource()).thenReturn("web");
        when(config.getIsValidateDeptEnabled()).thenReturn(false);
        when(multiStateInstanceUtil.getStateLevelTenant(anyString())).thenAnswer(inv -> inv.getArgument(0));

        // The UIConstants record exactly as the V20260930000000 migration leaves it on bo.
        uiConstants = new LinkedHashMap<>();
        uiConstants.put("code", "DEFAULT");
        uiConstants.put("REOPENSLA", 72 * HOUR);
        uiConstants.put("WITHDRAWSLA", 72 * HOUR);
        when(serviceRequestRepository.fetchResult(any(), any())).thenAnswer(inv -> mdmsResponse());

        ObjectMapper objectMapper = new ObjectMapper();
        MDMSUtils mdmsUtils = new MDMSUtils(config, serviceRequestRepository, objectMapper);
        ReflectionTestUtils.setField(mdmsUtils, "multiStateInstanceUtil", multiStateInstanceUtil);
        validator = new ServiceRequestValidator(config, repository, hrmsUtil, serviceRequestRepository, objectMapper, mdmsUtils);
    }

    // ── WITHDRAW: 72h from FILING ─────────────────────────────────────────────

    @Test
    void withdraw_71hAfterFiling_isAllowed_evenThoughUpdatedSince() {
        ServiceRequest req = update("WITHDRAW", "citizen-1", "CITIZEN");
        persisted("citizen-1", /*created*/ ago(71 * HOUR), /*lastModified*/ ago(MIN));
        assertDoesNotThrow(() -> validator.validateUpdate(req, complaintHierarchy()));
    }

    /** A later update (assignment) does NOT restart the withdraw clock. */
    @Test
    void withdraw_73hAfterFiling_isRefused_evenIfJustUpdated() {
        ServiceRequest req = update("WITHDRAW", "citizen-1", "CITIZEN");
        persisted("citizen-1", ago(73 * HOUR), ago(MIN));
        CustomException ex = assertThrows(CustomException.class, () -> validator.validateUpdate(req, complaintHierarchy()));
        assertEquals("INVALID_ACTION", ex.getCode());
        assertEquals("Complaint can no longer be withdrawn - the withdrawal period has ended", ex.getMessage());
    }

    /** An operator edit of WITHDRAWSLA in MDMS is what's enforced, not the 72h shipped fallback. */
    @Test
    void withdraw_honoursEditedMdmsWindow() {
        uiConstants.put("WITHDRAWSLA", 48 * HOUR);
        ServiceRequest req = update("WITHDRAW", "citizen-1", "CITIZEN");
        persisted("citizen-1", ago(50 * HOUR), ago(MIN));
        assertThrows(CustomException.class, () -> validator.validateUpdate(req, complaintHierarchy()));
    }

    @Test
    void withdraw_byCsrOnACitizensComplaint_isAllowedWithinWindow() {
        ServiceRequest req = update("WITHDRAW", "csr-1", "EMPLOYEE");
        persisted("citizen-1", ago(HOUR), ago(HOUR));
        assertDoesNotThrow(() -> validator.validateUpdate(req, complaintHierarchy()));
    }

    @Test
    void withdraw_byAnotherCitizen_isRefused() {
        ServiceRequest req = update("WITHDRAW", "citizen-2", "CITIZEN");
        persisted("citizen-1", ago(HOUR), ago(HOUR));
        assertThrows(CustomException.class, () -> validator.validateUpdate(req, complaintHierarchy()));
    }

    /** The deadline comes from the DB row: a forged fresh createdTime in the body changes nothing. */
    @Test
    void withdraw_forgedCreatedTimeInBody_isIgnored() {
        ServiceRequest req = update("WITHDRAW", "citizen-1", "CITIZEN");
        req.getService().setAuditDetails(AuditDetails.builder().createdTime(System.currentTimeMillis())
                .lastModifiedTime(System.currentTimeMillis()).build());
        persisted("citizen-1", ago(73 * HOUR), ago(MIN));
        assertThrows(CustomException.class, () -> validator.validateUpdate(req, complaintHierarchy()));
    }

    // ── REOPEN: 72h from the LAST UPDATE (the resolve/reject) ─────────────────

    @Test
    void reopen_71hAfterResolution_isAllowed_evenIfFiledLongAgo() {
        ServiceRequest req = update("REOPEN", "citizen-1", "CITIZEN");
        persisted("citizen-1", ago(10 * 24 * HOUR), ago(71 * HOUR));
        assertDoesNotThrow(() -> validator.validateUpdate(req, complaintHierarchy()));
    }

    @Test
    void reopen_73hAfterResolution_isRefused_withItsMessage() {
        ServiceRequest req = update("REOPEN", "citizen-1", "CITIZEN");
        persisted("citizen-1", ago(10 * 24 * HOUR), ago(73 * HOUR));
        CustomException ex = assertThrows(CustomException.class, () -> validator.validateUpdate(req, complaintHierarchy()));
        assertEquals("INVALID_ACTION", ex.getCode());
        assertEquals("Complaint is closed", ex.getMessage());
    }

    /** Same ownership message REOPEN has always returned (pre-actionWindows behaviour). */
    @Test
    void reopen_byAnotherCitizen_keepsItsOriginalMessage() {
        ServiceRequest req = update("REOPEN", "citizen-2", "CITIZEN");
        persisted("citizen-1", ago(10 * 24 * HOUR), ago(HOUR));
        CustomException ex = assertThrows(CustomException.class, () -> validator.validateUpdate(req, complaintHierarchy()));
        assertEquals("INVALID_ACTION", ex.getCode());
        assertEquals("Not authorized to re-open the complain", ex.getMessage());
    }

    // ── actionWindows in MDMS overrides the shipped defaults ──────────────────

    @Test
    void mdmsRule_canSwitchWithdrawToLastModified() {
        uiConstants.put("actionWindows", List.of(Map.of(
                "action", "WITHDRAW", "windowKey", "WITHDRAWSLA", "measuredFrom", "lastModifiedTime")));
        ServiceRequest req = update("WITHDRAW", "citizen-1", "CITIZEN");
        persisted("citizen-1", ago(10 * 24 * HOUR), ago(HOUR));   // old filing, recent update
        assertDoesNotThrow(() -> validator.validateUpdate(req, complaintHierarchy()));
    }

    /** Actions with no rule anywhere are not time-limited (e.g. RESOLVE on a month-old complaint). */
    @Test
    void unwindowedAction_isNotTimeChecked() {
        ServiceRequest req = update("RESOLVE", "lme-1", "EMPLOYEE");
        persisted("citizen-1", ago(30 * 24 * HOUR), ago(30 * 24 * HOUR));
        assertDoesNotThrow(() -> validator.validateUpdate(req, complaintHierarchy()));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static long ago(long millis) {
        return System.currentTimeMillis() - millis;
    }

    private Map<String, Object> mdmsResponse() {
        Map<String, Object> module = new LinkedHashMap<>();
        module.put("UIConstants", List.of(uiConstants));
        Map<String, Object> mdmsRes = new LinkedHashMap<>();
        mdmsRes.put("RAINMAKER-PGR", module);
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("MdmsRes", mdmsRes);
        return root;
    }

    private static ServiceRequest update(String action, String callerUuid, String callerType) {
        org.egov.common.contract.request.User caller = org.egov.common.contract.request.User.builder()
                .uuid(callerUuid).type(callerType).tenantId(TENANT).build();
        RequestInfo requestInfo = new RequestInfo();
        requestInfo.setUserInfo(caller);
        Service service = Service.builder()
                .id("svc-1").tenantId(TENANT).serviceCode("POTHOLE").source("web")
                .address(Address.builder().tenantId(TENANT).locality(Boundary.builder().code("WARD_1").build()).build())
                .build();
        return ServiceRequest.builder()
                .requestInfo(requestInfo)
                .service(service)
                .workflow(Workflow.builder().action(action).assignes(Collections.emptyList()).build())
                .build();
    }

    /** The complaint row as PGRRepository reads it back from eg_pgr_service_v2. */
    private void persisted(String accountId, long createdTime, long lastModifiedTime) {
        Service row = Service.builder()
                .id("svc-1").tenantId(TENANT).accountId(accountId)
                .auditDetails(AuditDetails.builder().createdTime(createdTime).lastModifiedTime(lastModifiedTime).build())
                .build();
        when(repository.getServiceWrappers(any()))
                .thenReturn(Collections.singletonList(ServiceWrapper.builder().service(row).build()));
    }

    private static Object complaintHierarchy() {
        Map<String, Object> leaf = new HashMap<>();
        leaf.put("code", "POTHOLE");
        leaf.put("levelCode", "SUB_TYPE");
        leaf.put("name", "POTHOLE");
        leaf.put("department", "ROADS");
        Map<String, Object> rainmaker = new HashMap<>();
        rainmaker.put("ComplaintHierarchy", Collections.singletonList(leaf));
        Map<String, Object> mdmsRes = new HashMap<>();
        mdmsRes.put("RAINMAKER-PGR", rainmaker);
        Map<String, Object> root = new HashMap<>();
        root.put("MdmsRes", mdmsRes);
        return root;
    }
}
