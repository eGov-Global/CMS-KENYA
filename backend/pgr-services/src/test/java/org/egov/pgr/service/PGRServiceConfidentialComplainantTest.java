package org.egov.pgr.service;

import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.Role;
import org.egov.pgr.config.PGRConfiguration;
import org.egov.pgr.policy.FieldVisibilityService;
import org.egov.pgr.policy.PgrSearchScope;
import org.egov.pgr.policy.SearchAccessPolicyService;
import org.egov.pgr.producer.Producer;
import org.egov.pgr.repository.PGRRepository;
import org.egov.pgr.util.MDMSUtils;
import org.egov.pgr.util.PGRUtils;
import org.egov.pgr.validator.ServiceRequestValidator;
import org.egov.pgr.web.models.AuditDetails;
import org.egov.pgr.web.models.ComplaintTemplateTypeConfig;
import org.egov.pgr.web.models.ExtendedAttributes;
import org.egov.pgr.web.models.RequestSearchCriteria;
import org.egov.pgr.web.models.Service;
import org.egov.pgr.web.models.ServiceRequest;
import org.egov.pgr.web.models.ServiceWrapper;
import org.egov.pgr.web.models.User;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Set;

import static org.egov.pgr.util.PGRConstants.MASK_SENTINEL;
import static org.egov.pgr.util.PGRConstants.ROLE_CONFIDENTIAL_VIEWER;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * A complaint the citizen marked confidential must hide WHO complained: the complainant record
 * enriched from the user service is masked for every caller who is neither the complainant nor a
 * cleared viewer, the flag is accepted without a category template, and an uncleared caller can't
 * switch it off on update.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PGRServiceConfidentialComplainantTest {

    private static final String TENANT = "nb";
    private static final String COMPLAINANT_UUID = "citizen-1";

    @Mock private EnrichmentService enrichmentService;
    @Mock private UserService userService;
    @Mock private WorkflowService workflowService;
    @Mock private ServiceRequestValidator validator;
    @Mock private Producer producer;
    @Mock private PGRConfiguration config;
    @Mock private PGRRepository repository;
    @Mock private MDMSUtils mdmsUtils;
    @Mock private ComplaintDomainEventService complaintDomainEventService;
    @Mock private PGRUtils pgrUtils;
    @Mock private ExtendedAttributesValidationService extendedAttributesValidationService;
    @Mock private EncryptionDecryptionService encryptionDecryptionService;
    @Mock private SearchAccessPolicyService searchAccessPolicyService;
    @Mock private FieldVisibilityService fieldVisibilityService;
    @Mock private EmployeeDepartmentScopeService employeeDepartmentScopeService;
    @Mock private EmployeeJurisdictionScopeService employeeJurisdictionScopeService;

    private PGRService pgrService;

    @BeforeEach
    void setup() {
        when(config.getStateLevelTenantIdLength()).thenReturn(2);
        when(pgrUtils.extractAdditionalDetails(any())).thenReturn(new HashMap<>());
        when(pgrUtils.deepMerge(any(), any())).thenReturn(new HashMap<>());
        pgrService = new PGRService(enrichmentService, userService, workflowService, validator, validator, producer,
                config, repository, mdmsUtils, complaintDomainEventService, pgrUtils,
                extendedAttributesValidationService, encryptionDecryptionService, searchAccessPolicyService,
                fieldVisibilityService, employeeDepartmentScopeService, employeeJurisdictionScopeService);
    }

    // ── search ────────────────────────────────────────────────────────────────

    @Test
    void searchMasksComplainantForAnUnclearedEmployee() {
        List<ServiceWrapper> result = searchAs(employee("officer-1"), wrapper(flagOnly(true)));

        User citizen = result.get(0).getService().getCitizen();
        assertEquals(MASK_SENTINEL, citizen.getName());
        assertEquals(MASK_SENTINEL, citizen.getMobileNumber());
        assertEquals(MASK_SENTINEL, citizen.getUserName());
        assertEquals(MASK_SENTINEL, citizen.getEmailId());
        assertEquals(MASK_SENTINEL, citizen.getCorrespondenceAddress());
        // the account link resolves to the person via /user/_search — it goes too
        assertNull(citizen.getUuid());
        assertNull(result.get(0).getService().getAccountId());
        assertNull(result.get(0).getService().getAuditDetails().getCreatedBy());
    }

    @Test
    void searchKeepsComplainantClearForTheComplainantThemselves() {
        List<ServiceWrapper> result = searchAs(citizen(COMPLAINANT_UUID), wrapper(flagOnly(true)));

        assertEquals("Grace Wanjiru", result.get(0).getService().getCitizen().getName());
        assertEquals("0712345678", result.get(0).getService().getCitizen().getMobileNumber());
    }

    @Test
    void searchKeepsComplainantClearForAClearedViewer() {
        List<ServiceWrapper> result = searchAs(employee("auditor-1", ROLE_CONFIDENTIAL_VIEWER), wrapper(flagOnly(true)));

        assertEquals("Grace Wanjiru", result.get(0).getService().getCitizen().getName());
    }

    @Test
    void searchLeavesNonConfidentialComplaintsUntouched() {
        List<ServiceWrapper> result = searchAs(employee("officer-1"), wrapper(flagOnly(false)));

        assertEquals("Grace Wanjiru", result.get(0).getService().getCitizen().getName());
        assertEquals("0712345678", result.get(0).getService().getCitizen().getMobileNumber());
    }

    @Test
    void searchLeavesComplaintsWithoutExtendedAttributesUntouched() {
        List<ServiceWrapper> result = searchAs(employee("officer-1"), wrapper(null));

        assertEquals("Grace Wanjiru", result.get(0).getService().getCitizen().getName());
    }

    // ── create ────────────────────────────────────────────────────────────────

    @Test
    void createAcceptsTheConfidentialityFlagWithoutACategoryTemplate() {
        ServiceRequest request = request(citizen(COMPLAINANT_UUID), service(flagOnly(true)));

        ServiceRequest created = pgrService.create(request);

        assertTrue(created.getService().getExtendedAttributes().getIsConfidentialSafe());
        verify(mdmsUtils, never()).fetchComplaintTemplateTypeConfig(any(), anyString(), any());
        verify(extendedAttributesValidationService, never()).validate(any(), any(), any());
        verify(encryptionDecryptionService, never()).encrypt(any(), any(), anyString());
    }

    @Test
    void createStillRejectsCategoryFieldsWithoutACaseRelatedTo() {
        ExtendedAttributes ext = flagOnly(true);
        ext.putField("hierarchyLevel1", "WATER");
        ServiceRequest request = request(citizen(COMPLAINANT_UUID), service(ext));

        CustomException ex = assertThrows(CustomException.class, () -> pgrService.create(request));
        assertEquals("INVALID_CASE_RELATED_TO", ex.getCode());
    }

    // ── update ────────────────────────────────────────────────────────────────

    @Test
    void updateByAnUnclearedEmployeeCannotSwitchConfidentialityOff() {
        storedIs(flagOnly(true));
        ServiceRequest request = request(employee("officer-1"), service(flagOnly(false)));

        ServiceRequest updated = pgrService.update(request);

        assertTrue(updated.getService().getExtendedAttributes().getIsConfidentialSafe());
        // and the response carries the masked complainant, like a read would
        assertEquals(MASK_SENTINEL, updated.getService().getCitizen().getName());
        assertEquals(MASK_SENTINEL, updated.getService().getCitizen().getMobileNumber());
    }

    @Test
    void updateByAnUnclearedEmployeeCannotDropTheFlagByOmittingExtendedAttributes() {
        storedIs(flagOnly(true));
        ServiceRequest request = request(employee("officer-1"), service(null));

        ServiceRequest updated = pgrService.update(request);

        assertNotNull(updated.getService().getExtendedAttributes());
        assertTrue(updated.getService().getExtendedAttributes().getIsConfidentialSafe());
    }

    @Test
    void updateByTheComplainantMaySwitchConfidentialityOff() {
        storedIs(flagOnly(true));
        ServiceRequest request = request(citizen(COMPLAINANT_UUID), service(flagOnly(false)));

        ServiceRequest updated = pgrService.update(request);

        assertFalse(updated.getService().getExtendedAttributes().getIsConfidentialSafe());
        assertEquals("Grace Wanjiru", updated.getService().getCitizen().getName());
    }

    @Test
    void updateOfANonConfidentialComplaintLeavesTheComplainantClear() {
        storedIs(flagOnly(false));
        ServiceRequest request = request(employee("officer-1"), service(flagOnly(false)));

        ServiceRequest updated = pgrService.update(request);

        assertFalse(updated.getService().getExtendedAttributes().getIsConfidentialSafe());
        assertEquals("Grace Wanjiru", updated.getService().getCitizen().getName());
    }

    @Test
    void searchMasksACopySoTheSameCitizensOtherComplaintsStayClear() {
        User shared = complainant();
        ServiceWrapper confidential = wrapper(flagOnly(true));
        confidential.getService().setCitizen(shared);
        ServiceWrapper open = wrapper(flagOnly(false));
        open.getService().setCitizen(shared);

        List<ServiceWrapper> result = searchAs(employee("officer-1"), List.of(confidential, open));

        assertEquals(MASK_SENTINEL, result.get(0).getService().getCitizen().getName());
        assertEquals("Grace Wanjiru", result.get(1).getService().getCitizen().getName());
        assertEquals("Grace Wanjiru", shared.getName(), "the shared user-service record itself is untouched");
    }

    @Test
    void createStillRejectsContactFieldsWithoutACaseRelatedTo() {
        ExtendedAttributes ext = flagOnly(true);
        ext.setEmail("someone@example.com");

        CustomException ex = assertThrows(CustomException.class,
                () -> pgrService.create(request(citizen(COMPLAINANT_UUID), service(ext))));
        assertEquals("INVALID_CASE_RELATED_TO", ex.getCode());
    }

    @Test
    void updateKeepsTheStoredAccountWhateverThePayloadSays() {
        storedIs(flagOnly(false));

        ServiceRequest updated = pgrService.update(request(employee("officer-1"), serviceOwnedBy("someone-else", flagOnly(false))));

        assertEquals(COMPLAINANT_UUID, updated.getService().getAccountId());
    }

    @Test
    void flagOnlyUpdateByAnEmployeeNeverSyncsContactDetails() {
        storedIs(flagOnly(true));

        pgrService.update(request(employee("officer-1"), service(flagOnly(true))));

        verify(enrichmentService, never()).enrichUserContactDetails(any());
    }

    @Test
    void flagOnlyUpdateByTheComplainantStillSyncsContactDetails() {
        storedIs(flagOnly(true));
        ServiceRequest request = request(citizen(COMPLAINANT_UUID), service(flagOnly(true)));

        pgrService.update(request);

        verify(enrichmentService).enrichUserContactDetails(request);
    }

    @Test
    void updateByAClearedViewerStillCannotSwitchConfidentialityOff() {
        storedIs(flagOnly(true));

        ServiceRequest updated = pgrService.update(
                request(employee("auditor-1", ROLE_CONFIDENTIAL_VIEWER), service(flagOnly(false))));

        assertTrue(updated.getService().getExtendedAttributes().getIsConfidentialSafe());
    }

    @Test
    void updateRestoresAStoredTemplateThePayloadLost() {
        ExtendedAttributes storedExt = flagOnly(true);
        storedExt.setCaseRelatedTo("WATER");
        storedExt.putField("meterNo", "M-1");
        storedIs(storedExt);
        ComplaintTemplateTypeConfig cfg = new ComplaintTemplateTypeConfig();
        cfg.setCaseRelatedTo("WATER");
        when(mdmsUtils.fetchComplaintTemplateTypeConfig(any(), eq(TENANT), eq("WATER"))).thenReturn(cfg);
        when(encryptionDecryptionService.encrypt(any(), any(), anyString())).thenAnswer(inv -> inv.getArgument(0));

        ServiceRequest updated = pgrService.update(request(citizen(COMPLAINANT_UUID), service(flagOnly(true))));

        ExtendedAttributes ext = updated.getService().getExtendedAttributes();
        assertEquals("WATER", ext.getCaseRelatedTo());
        assertEquals("M-1", ext.getField("meterNo"));
        assertTrue(ext.getIsConfidentialSafe());
    }

    // ── identity-filtered searches ────────────────────────────────────────────

    @Test
    void employeeSearchByAnotherPersonsIdentityLeavesConfidentialComplaintsOut() {
        RequestSearchCriteria criteria = criteriaFor(Set.of(COMPLAINANT_UUID));
        searchWith(employee("officer-1"), criteria, List.of(wrapper(flagOnly(true))));
        assertTrue(criteria.isExcludeConfidential());
    }

    @Test
    void citizenSearchingTheirOwnComplaintsIsNotRestricted() {
        RequestSearchCriteria criteria = criteriaFor(Set.of(COMPLAINANT_UUID));
        searchWith(citizen(COMPLAINANT_UUID), criteria, List.of(wrapper(flagOnly(true))));
        assertFalse(criteria.isExcludeConfidential());
    }

    @Test
    void clearedViewerSearchingByIdentityIsNotRestricted() {
        RequestSearchCriteria criteria = criteriaFor(Set.of(COMPLAINANT_UUID));
        searchWith(employee("auditor-1", ROLE_CONFIDENTIAL_VIEWER), criteria, List.of(wrapper(flagOnly(true))));
        assertFalse(criteria.isExcludeConfidential());
    }

    @Test
    void searchWithoutAnIdentityFilterIsNotRestricted() {
        RequestSearchCriteria criteria = criteriaFor(null);
        searchWith(employee("officer-1"), criteria, List.of(wrapper(flagOnly(true))));
        assertFalse(criteria.isExcludeConfidential());
    }

    // ── fixtures ──────────────────────────────────────────────────────────────

    private List<ServiceWrapper> searchAs(RequestInfo requestInfo, ServiceWrapper wrapper) {
        return searchAs(requestInfo, List.of(wrapper));
    }

    private List<ServiceWrapper> searchAs(RequestInfo requestInfo, List<ServiceWrapper> wrappers) {
        return searchWith(requestInfo, criteriaFor(null), wrappers);
    }

    private List<ServiceWrapper> searchWith(RequestInfo requestInfo, RequestSearchCriteria criteria, List<ServiceWrapper> wrappers) {
        PgrSearchScope scope = new PgrSearchScope(TENANT, false, requestInfo.getUserInfo().getUuid(), null, null);
        when(searchAccessPolicyService.resolveScope(eq(requestInfo), eq(TENANT), anyInt())).thenReturn(scope);
        when(repository.getServiceWrappers(criteria, scope)).thenReturn(new ArrayList<>(wrappers));
        when(searchAccessPolicyService.enforce(eq(requestInfo), eq(TENANT), eq(scope), anyList())).thenReturn(new ArrayList<>(wrappers));
        when(workflowService.enrichWorkflow(eq(requestInfo), anyList())).thenAnswer(inv -> inv.getArgument(1));
        return pgrService.search(requestInfo, criteria);
    }

    private static RequestSearchCriteria criteriaFor(Set<String> userIds) {
        return RequestSearchCriteria.builder().tenantId(TENANT).serviceRequestId("SR-1")
                .skipEmployeeDepartmentScope(true).skipEmployeeJurisdictionScope(true).userIds(userIds).build();
    }

    /** What the repository returns for the complaint being updated. */
    private void storedIs(ExtendedAttributes storedExt) {
        when(repository.getServiceWrappers(any(RequestSearchCriteria.class)))
                .thenReturn(new ArrayList<>(List.of(wrapper(storedExt))));
    }

    private static ServiceRequest request(RequestInfo requestInfo, Service service) {
        return ServiceRequest.builder().requestInfo(requestInfo).service(service).build();
    }

    private static ExtendedAttributes flagOnly(boolean confidential) {
        ExtendedAttributes ext = new ExtendedAttributes();
        ext.setIsConfidential(confidential);
        return ext;
    }

    /** The complainant as the user service enriches them onto the complaint. */
    private static User complainant() {
        return User.builder().uuid(COMPLAINANT_UUID).type("CITIZEN").name("Grace Wanjiru")
                .mobileNumber("0712345678").userName("0712345678").emailId("grace@example.com")
                .correspondenceAddress("Plot 12, Konoin").build();
    }

    private static Service service(ExtendedAttributes ext) {
        return serviceOwnedBy(COMPLAINANT_UUID, ext);
    }

    private static Service serviceOwnedBy(String accountId, ExtendedAttributes ext) {
        return Service.builder().id("svc-1").serviceRequestId("SR-1").serviceCode("StreetLightNotWorking")
                .accountId(accountId).tenantId(TENANT)
                .extendedAttributes(ext).citizen(complainant())
                .auditDetails(AuditDetails.builder().createdTime(1L).createdBy(COMPLAINANT_UUID).build()).build();
    }

    private static ServiceWrapper wrapper(ExtendedAttributes ext) {
        return ServiceWrapper.builder().service(service(ext)).build();
    }

    private static RequestInfo citizen(String uuid) {
        return caller(uuid, "CITIZEN", "CITIZEN");
    }

    private static RequestInfo employee(String uuid, String... extraRoles) {
        List<String> roles = new ArrayList<>(List.of("EMPLOYEE", "PGR_LME"));
        roles.addAll(List.of(extraRoles));
        return caller(uuid, "EMPLOYEE", roles.toArray(new String[0]));
    }

    private static RequestInfo caller(String uuid, String type, String... roleCodes) {
        org.egov.common.contract.request.User user = new org.egov.common.contract.request.User();
        user.setUuid(uuid);
        user.setType(type);
        user.setTenantId(TENANT);
        List<Role> roles = new ArrayList<>();
        for (String code : roleCodes) roles.add(Role.builder().code(code).name(code).tenantId(TENANT).build());
        user.setRoles(roles);
        RequestInfo requestInfo = new RequestInfo();
        requestInfo.setUserInfo(user);
        return requestInfo;
    }
}
