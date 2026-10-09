package org.egov.pgr.validator;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.pgr.config.PGRConfiguration;
import org.egov.pgr.repository.PGRRepository;
import org.egov.pgr.repository.ServiceRequestRepository;
import org.egov.pgr.util.ActionWindow;
import org.egov.pgr.util.HRMSUtil;
import org.egov.pgr.util.MDMSUtils;
import org.egov.pgr.web.models.*;
import org.egov.pgr.web.models.boundary.BoundaryResponse;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class ServiceRequestValidatorTest {

    @Mock private PGRConfiguration config;
    @Mock private PGRRepository repository;
    @Mock private HRMSUtil hrmsUtil;
    @Mock private ServiceRequestRepository serviceRequestRepository;
    @Mock private ObjectMapper objectMapper;
    @Mock private MDMSUtils mdmsUtils;

    @InjectMocks
    private ServiceRequestValidator validator;

    private ServiceRequest request;
    private Object mdmsData;

    @BeforeEach
    void setup() {
        request = buildRequest("LOC001", "POTHOLE");
        mdmsData = buildMdmsData("POTHOLE");
        when(config.getAllowedSource()).thenReturn("web");
        when(config.getIsValidateDeptEnabled()).thenReturn(false);
    }

    // ── validateBoundary ──────────────────────────────────────────────────────

    @Test
    void create_validBoundaryCode_passes() {
        stubBoundaryResponse("LOC001");
        assertDoesNotThrow(() -> validator.validateCreate(request, mdmsData));
    }

    @Test
    void create_nullAddress_throwsInvalidBoundary() {
        request.getService().setAddress(null);
        assertCode("INVALID_BOUNDARY", () -> validator.validateCreate(request, mdmsData));
    }

    @Test
    void create_nullLocality_throwsInvalidBoundary() {
        request.getService().getAddress().setLocality(null);
        assertCode("INVALID_BOUNDARY", () -> validator.validateCreate(request, mdmsData));
    }

    @Test
    void create_nullLocalityCode_throwsInvalidBoundary() {
        request.getService().getAddress().getLocality().setCode(null);
        assertCode("INVALID_BOUNDARY", () -> validator.validateCreate(request, mdmsData));
    }

    @Test
    void create_localityCodeNotReturnedByBoundaryService_throwsInvalidBoundaryCode() {
        stubBoundaryResponse("DIFFERENT_CODE");
        assertCode("INVALID_BOUNDARY_CODE", () -> validator.validateCreate(request, mdmsData));
    }

    @Test
    void create_emptyBoundaryList_throwsInvalidBoundaryCode() {
        BoundaryResponse response = BoundaryResponse.builder().boundary(Collections.emptyList()).build();
        when(serviceRequestRepository.fetchResult(any(), any())).thenReturn(response);
        when(objectMapper.convertValue(any(), eq(BoundaryResponse.class))).thenReturn(response);
        assertCode("INVALID_BOUNDARY_CODE", () -> validator.validateCreate(request, mdmsData));
    }

    @Test
    void create_boundaryServiceThrowsRuntimeException_throwsBoundaryServiceError() {
        when(serviceRequestRepository.fetchResult(any(), any())).thenThrow(new RuntimeException("connection refused"));
        assertCode("BOUNDARY_SERVICE_SEARCH_ERROR", () -> validator.validateCreate(request, mdmsData));
    }

    // ── validateMDMS ──────────────────────────────────────────────────────────

    @Test
    void create_serviceCodeNotInMDMS_throwsInvalidServiceCode() {
        stubBoundaryResponse("LOC001");
        assertCode("INVALID_SERVICECODE", () -> validator.validateCreate(request, buildMdmsData("GARBAGE")));
    }

    @Test
    void create_validServiceCode_passes() {
        stubBoundaryResponse("LOC001");
        assertDoesNotThrow(() -> validator.validateCreate(request, buildMdmsData("POTHOLE")));
    }

    // ── validateMDMS on update ────────────────────────────────────────────────

    @Test
    void update_serviceCodeNotInMDMS_throwsInvalidServiceCode() {
        assertCode("INVALID_SERVICECODE", () -> validator.validateUpdate(request, buildMdmsData("GARBAGE")));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void stubBoundaryResponse(String code) {
        org.egov.pgr.web.models.boundary.Boundary b =
                org.egov.pgr.web.models.boundary.Boundary.builder().code(code).build();
        BoundaryResponse response = BoundaryResponse.builder()
                .boundary(Collections.singletonList(b))
                .build();
        when(serviceRequestRepository.fetchResult(any(), any())).thenReturn(response);
        when(objectMapper.convertValue(any(), eq(BoundaryResponse.class))).thenReturn(response);
    }

    private static void assertCode(String expectedCode, org.junit.jupiter.api.function.Executable block) {
        CustomException ex = assertThrows(CustomException.class, block);
        assertEquals(expectedCode, ex.getCode());
    }

    private static ServiceRequest buildRequest(String localityCode, String serviceCode) {
        org.egov.common.contract.request.User actor = org.egov.common.contract.request.User.builder()
                .uuid("citizen-uuid")
                .type("CITIZEN")
                .tenantId("pg.citya")
                .build();

        org.egov.common.contract.request.RequestInfo requestInfo =
                new org.egov.common.contract.request.RequestInfo();
        requestInfo.setUserInfo(actor);

        Address address = Address.builder()
                .tenantId("pg.citya")
                .locality(Boundary.builder().code(localityCode).build())
                .build();

        Service service = Service.builder()
                .id(UUID.randomUUID().toString())
                .tenantId("pg.citya")
                .serviceCode(serviceCode)
                .source("web")
                .address(address)
                .build();

        return ServiceRequest.builder()
                .requestInfo(requestInfo)
                .service(service)
                .workflow(Workflow.builder().action("APPLY").assignes(Collections.emptyList()).build())
                .build();
    }

    private static Object buildMdmsData(String serviceCode) {
        // Leaf row in the merged ComplaintHierarchy master: code == serviceCode, carries department.
        Map<String, Object> leaf = new HashMap<>();
        leaf.put("code", serviceCode);
        leaf.put("levelCode", "SUB_TYPE");
        leaf.put("name", serviceCode);
        leaf.put("department", "ROADS");

        Map<String, Object> rainmaker = new HashMap<>();
        rainmaker.put("ComplaintHierarchy", Collections.singletonList(leaf));

        Map<String, Object> mdmsRes = new HashMap<>();
        mdmsRes.put("RAINMAKER-PGR", rainmaker);

        Map<String, Object> root = new HashMap<>();
        root.put("MdmsRes", mdmsRes);
        return root;
    }

    // ── validateReOpen: window source and anti-forgery (#925, #1252) ───────────

    private static final long WINDOW_MS = 6 * 60 * 60 * 1000L;   // MDMS REOPENSLA
    // Deliberately NOT the shipped pgr.complain.idle.time default (259200000) — an arbitrary,
    // clearly-wider value, so a test that passes can only mean the MDMS window was used.
    private static final long PROPERTY_MS = 10L * 24 * 60 * 60 * 1000L;

    @Test
    void reopen_withinMdmsWindow_passes() {
        ServiceRequest req = reopenRequest();
        stubPersisted(req, "citizen-uuid", System.currentTimeMillis() - WINDOW_MS / 2);
        stubWindow(WINDOW_MS);
        assertDoesNotThrow(() -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    @Test
    void reopen_pastMdmsWindow_throwsInvalidAction() {
        ServiceRequest req = reopenRequest();
        stubPersisted(req, "citizen-uuid", System.currentTimeMillis() - WINDOW_MS * 2);
        stubWindow(WINDOW_MS);
        assertCode("INVALID_ACTION", () -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    /**
     * The heart of #925: the deadline must be read from the DB row, not the request body.
     * Here the caller forges a brand-new lastModifiedTime while the stored complaint is long
     * past the window — the reopen must still be refused.
     */
    @Test
    void reopen_forgedFreshLastModifiedTimeInRequestBody_stillBlocked() {
        ServiceRequest req = reopenRequest();   // body claims lastModifiedTime = now
        stubPersisted(req, "citizen-uuid", System.currentTimeMillis() - WINDOW_MS * 2);
        stubWindow(WINDOW_MS);
        assertCode("INVALID_ACTION", () -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    /**
     * Same anti-forgery guarantee for the ownership check: a citizen cannot reopen someone
     * else's complaint by putting their own uuid in the request body's accountId.
     */
    @Test
    void reopen_forgedAccountIdInRequestBody_stillBlocked() {
        ServiceRequest req = reopenRequest();   // body claims accountId = the caller
        stubPersisted(req, "a-different-citizen", System.currentTimeMillis());
        stubWindow(WINDOW_MS);
        assertCode("INVALID_ACTION", () -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    /**
     * #1252: the enforced window is MDMS REOPENSLA, not pgr.complain.idle.time. With the
     * property set far wider than the MDMS window, a complaint outside the MDMS window must
     * still be refused — otherwise the property is silently back in charge.
     */
    @Test
    void reopen_mdmsWindowWinsOverProperty() {
        ServiceRequest req = reopenRequest();
        stubPersisted(req, "citizen-uuid", System.currentTimeMillis() - WINDOW_MS * 2);
        stubWindow(WINDOW_MS);
        when(config.getComplainMaxIdleTime()).thenReturn(PROPERTY_MS);   // 10 days, far wider
        assertCode("INVALID_ACTION", () -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    /** Fail closed: a persisted record with no audit details must not be reopenable. */
    @Test
    void reopen_persistedRecordWithoutAuditDetails_throwsInvalidAction() {
        ServiceRequest req = reopenRequest();
        Service persisted = Service.builder().tenantId("pg.citya").accountId("citizen-uuid").build();
        when(repository.getServiceWrappers(any()))
                .thenReturn(Collections.singletonList(ServiceWrapper.builder().service(persisted).build()));
        stubWindow(WINDOW_MS);
        assertCode("INVALID_ACTION", () -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    /** An employee is not subject to the citizen ownership check, but is subject to the window. */
    @Test
    void reopen_employeePastWindow_throwsInvalidAction() {
        ServiceRequest req = reopenRequest();
        req.getRequestInfo().getUserInfo().setType("EMPLOYEE");
        req.getRequestInfo().getUserInfo().setUuid("employee-uuid");
        stubPersisted(req, "citizen-uuid", System.currentTimeMillis() - WINDOW_MS * 2);
        stubWindow(WINDOW_MS);
        assertCode("INVALID_ACTION", () -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    /** A non-REOPEN update must not consult the reopen window at all. */
    @Test
    void nonReopenAction_ignoresReopenWindow() {
        ServiceRequest req = reopenRequest();
        req.getWorkflow().setAction("RESOLVE");
        stubPersisted(req, "someone-else", 0L);   // would fail every reopen check
        assertDoesNotThrow(() -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    // ── reopen helpers ────────────────────────────────────────────────────────

    private static ServiceRequest reopenRequest() {
        ServiceRequest req = buildRequest("LOC001", "POTHOLE");
        req.getWorkflow().setAction("REOPEN");
        // A well-formed body from the owning citizen: fresh timestamp + matching accountId.
        // Both are client-controlled, so every assertion below must come from the DB row
        // instead. Setting them here also keeps each test isolated: without them the
        // ownership check would throw first and mask whether the deadline check ever ran.
        req.getService().setAccountId("citizen-uuid");
        req.getService().setAuditDetails(
                AuditDetails.builder().lastModifiedTime(System.currentTimeMillis()).build());
        return req;
    }

    /** Stubs the DB row the validator is required to read instead of the request body. */
    private void stubPersisted(ServiceRequest req, String accountId, long lastModifiedTime) {
        Service persisted = Service.builder()
                .id(req.getService().getId())
                .tenantId("pg.citya")
                .accountId(accountId)
                .auditDetails(AuditDetails.builder().lastModifiedTime(lastModifiedTime).build())
                .build();
        when(repository.getServiceWrappers(any()))
                .thenReturn(Collections.singletonList(ServiceWrapper.builder().service(persisted).build()));
    }

    private void stubWindow(long millis) {
        when(mdmsUtils.getActionWindow(any(), any(), eq("REOPEN")))
                .thenReturn(Optional.of(new ActionWindow("REOPEN", millis, ActionWindow.MeasuredFrom.LAST_MODIFIED_TIME, "Complaint is closed", "Not authorized to re-open the complain")));
    }

    // ── validateWithdraw: window from FILING time (MDMS WITHDRAWSLA) ────────────

    private static final long WITHDRAW_WINDOW_MS = 72 * 60 * 60 * 1000L;   // MDMS WITHDRAWSLA

    @Test
    void withdraw_citizenWithinWindow_passes() {
        ServiceRequest req = withdrawRequest();
        stubPersistedForWithdraw(req, "citizen-uuid", System.currentTimeMillis() - WITHDRAW_WINDOW_MS / 2);
        stubWithdrawWindow(WITHDRAW_WINDOW_MS);
        assertDoesNotThrow(() -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    @Test
    void withdraw_pastWindowFromFiling_throwsInvalidAction() {
        ServiceRequest req = withdrawRequest();
        stubPersistedForWithdraw(req, "citizen-uuid", System.currentTimeMillis() - WITHDRAW_WINDOW_MS - 60_000L);
        stubWithdrawWindow(WITHDRAW_WINDOW_MS);
        assertCode("INVALID_ACTION", () -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    /**
     * The window runs from filing, not last modification: a complaint filed 4 days ago but
     * touched a minute ago (assignment, escalation) must still be refused.
     */
    @Test
    void withdraw_recentlyModifiedButFiledLongAgo_stillBlocked() {
        ServiceRequest req = withdrawRequest();
        Service persisted = Service.builder()
                .id(req.getService().getId()).tenantId("pg.citya").accountId("citizen-uuid")
                .auditDetails(AuditDetails.builder()
                        .createdTime(System.currentTimeMillis() - 4 * 24 * 60 * 60 * 1000L)
                        .lastModifiedTime(System.currentTimeMillis() - 60_000L).build())
                .build();
        when(repository.getServiceWrappers(any()))
                .thenReturn(Collections.singletonList(ServiceWrapper.builder().service(persisted).build()));
        stubWithdrawWindow(WITHDRAW_WINDOW_MS);
        assertCode("INVALID_ACTION", () -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    /** The deadline comes from the DB row: a forged fresh createdTime in the body must not help. */
    @Test
    void withdraw_forgedFreshCreatedTimeInRequestBody_stillBlocked() {
        ServiceRequest req = withdrawRequest();   // body claims createdTime = now
        stubPersistedForWithdraw(req, "citizen-uuid", System.currentTimeMillis() - WITHDRAW_WINDOW_MS * 2);
        stubWithdrawWindow(WITHDRAW_WINDOW_MS);
        assertCode("INVALID_ACTION", () -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    @Test
    void withdraw_citizenOnSomeoneElsesComplaint_throwsInvalidAction() {
        ServiceRequest req = withdrawRequest();   // body claims accountId = the caller
        stubPersistedForWithdraw(req, "a-different-citizen", System.currentTimeMillis());
        stubWithdrawWindow(WITHDRAW_WINDOW_MS);
        assertCode("INVALID_ACTION", () -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    /** A counter/call-centre employee may withdraw any complaint (no ownership check) within the window. */
    @Test
    void withdraw_employeeOnCitizensComplaintWithinWindow_passes() {
        ServiceRequest req = withdrawRequest();
        req.getRequestInfo().getUserInfo().setType("EMPLOYEE");
        req.getRequestInfo().getUserInfo().setUuid("csr-uuid");
        stubPersistedForWithdraw(req, "citizen-uuid", System.currentTimeMillis() - WITHDRAW_WINDOW_MS / 2);
        stubWithdrawWindow(WITHDRAW_WINDOW_MS);
        assertDoesNotThrow(() -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    @Test
    void withdraw_employeePastWindow_throwsInvalidAction() {
        ServiceRequest req = withdrawRequest();
        req.getRequestInfo().getUserInfo().setType("EMPLOYEE");
        req.getRequestInfo().getUserInfo().setUuid("csr-uuid");
        stubPersistedForWithdraw(req, "citizen-uuid", System.currentTimeMillis() - WITHDRAW_WINDOW_MS * 2);
        stubWithdrawWindow(WITHDRAW_WINDOW_MS);
        assertCode("INVALID_ACTION", () -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    /** Fail closed: a persisted record with no filing time must not be withdrawable. */
    @Test
    void withdraw_persistedRecordWithoutCreatedTime_throwsInvalidAction() {
        ServiceRequest req = withdrawRequest();
        Service persisted = Service.builder().tenantId("pg.citya").accountId("citizen-uuid")
                .auditDetails(AuditDetails.builder().lastModifiedTime(System.currentTimeMillis()).build())
                .build();
        when(repository.getServiceWrappers(any()))
                .thenReturn(Collections.singletonList(ServiceWrapper.builder().service(persisted).build()));
        stubWithdrawWindow(WITHDRAW_WINDOW_MS);
        assertCode("INVALID_ACTION", () -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    /** A non-WITHDRAW update must not consult the withdraw window at all. */
    @Test
    void nonWithdrawAction_ignoresWithdrawWindow() {
        ServiceRequest req = withdrawRequest();
        req.getWorkflow().setAction("RESOLVE");
        stubPersistedForWithdraw(req, "someone-else", 0L);   // would fail every withdraw check
        assertDoesNotThrow(() -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    // ── withdraw helpers ──────────────────────────────────────────────────────

    private static ServiceRequest withdrawRequest() {
        ServiceRequest req = buildRequest("LOC001", "POTHOLE");
        req.getWorkflow().setAction("WITHDRAW");
        // Well-formed, client-controlled body from the owning citizen; every assertion must
        // come from the DB row instead.
        req.getService().setAccountId("citizen-uuid");
        req.getService().setAuditDetails(AuditDetails.builder()
                .createdTime(System.currentTimeMillis())
                .lastModifiedTime(System.currentTimeMillis()).build());
        return req;
    }

    private void stubPersistedForWithdraw(ServiceRequest req, String accountId, long createdTime) {
        Service persisted = Service.builder()
                .id(req.getService().getId())
                .tenantId("pg.citya")
                .accountId(accountId)
                .auditDetails(AuditDetails.builder().createdTime(createdTime).lastModifiedTime(createdTime).build())
                .build();
        when(repository.getServiceWrappers(any()))
                .thenReturn(Collections.singletonList(ServiceWrapper.builder().service(persisted).build()));
    }

    private void stubWithdrawWindow(long millis) {
        when(mdmsUtils.getActionWindow(any(), any(), eq("WITHDRAW")))
                .thenReturn(Optional.of(new ActionWindow("WITHDRAW", millis, ActionWindow.MeasuredFrom.CREATED_TIME, null, null)));
    }

    // ── validateActionWindow: any action configured in MDMS actionWindows ─────

    /**
     * The check is generic: an action pgr-services has no constant for is enforced purely because
     * MDMS gives it a window — here a hypothetical ESCALATE limited to 1h from filing.
     */
    @Test
    void configOnlyAction_isEnforcedGenerically() {
        ServiceRequest req = withdrawRequest();
        req.getWorkflow().setAction("ESCALATE");
        req.getRequestInfo().getUserInfo().setType("EMPLOYEE");
        stubPersistedForWithdraw(req, "citizen-uuid", System.currentTimeMillis() - 2 * 60 * 60 * 1000L);
        when(mdmsUtils.getActionWindow(any(), any(), eq("ESCALATE")))
                .thenReturn(Optional.of(new ActionWindow("ESCALATE", 60 * 60 * 1000L, ActionWindow.MeasuredFrom.CREATED_TIME, null, null)));
        assertCode("INVALID_ACTION", () -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }

    /** The rule's configured message is returned; without one, a generic message names the action. */
    @Test
    void expiredMessage_configuredOrGeneric() {
        ServiceRequest reopen = reopenRequest();
        stubPersisted(reopen, "citizen-uuid", System.currentTimeMillis() - WINDOW_MS * 2);
        stubWindow(WINDOW_MS);
        CustomException r = assertThrows(CustomException.class, () -> validator.validateUpdate(reopen, buildMdmsData("POTHOLE")));
        assertEquals("Complaint is closed", r.getMessage());

        ServiceRequest withdraw = withdrawRequest();
        stubPersistedForWithdraw(withdraw, "citizen-uuid", System.currentTimeMillis() - WITHDRAW_WINDOW_MS * 2);
        stubWithdrawWindow(WITHDRAW_WINDOW_MS);
        CustomException w = assertThrows(CustomException.class, () -> validator.validateUpdate(withdraw, buildMdmsData("POTHOLE")));
        assertEquals("The time allowed to withdraw this complaint has expired", w.getMessage());
    }

    /** A misconfigured window fails the update closed rather than letting the action through. */
    @Test
    void misconfiguredWindow_failsClosed() {
        ServiceRequest req = withdrawRequest();
        stubPersistedForWithdraw(req, "citizen-uuid", System.currentTimeMillis());
        when(mdmsUtils.getActionWindow(any(), any(), eq("WITHDRAW")))
                .thenThrow(new CustomException("INVALID_ACTION_WINDOW_CONFIG", "misconfigured"));
        assertCode("INVALID_ACTION_WINDOW_CONFIG", () -> validator.validateUpdate(req, buildMdmsData("POTHOLE")));
    }
}
