package org.egov.pgr.service;


import com.jayway.jsonpath.JsonPath;
import lombok.extern.slf4j.Slf4j;
import org.egov.common.contract.request.RequestInfo;
import org.egov.pgr.policy.PgrSearchScope;
import org.egov.pgr.config.PGRConfiguration;
import org.egov.pgr.policy.AccessPolicyRegistry;
import org.egov.pgr.policy.FieldVisibilityService;
import org.egov.pgr.policy.SearchAccessPolicyService;
import org.egov.pgr.producer.Producer;
import org.egov.pgr.repository.PGRRepository;
import org.egov.pgr.util.MDMSUtils;
import org.egov.pgr.util.PGRUtils;
import org.egov.pgr.validator.ServiceRequestValidator;
import org.egov.pgr.web.models.ComplaintTemplateTypeConfig;
import org.egov.pgr.web.models.ExtendedAttributes;
import org.egov.pgr.web.models.Service;
import org.egov.pgr.web.models.ServiceWrapper;
import org.egov.pgr.web.models.User;
import org.egov.pgr.web.models.AuditDetails;
import org.egov.pgr.web.models.RequestSearchCriteria;
import org.egov.pgr.web.models.ServiceRequest;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.*;

import static org.egov.pgr.util.PGRConstants.MDMS_DEPARTMENT_SEARCH;
import static org.egov.pgr.util.PGRConstants.MDMS_SERVICENAME_SEARCH;
import static org.egov.pgr.util.PGRConstants.ROLE_CONFIDENTIAL_VIEWER;
import static org.egov.pgr.util.PGRConstants.MASK_SENTINEL;
import static org.egov.pgr.util.PGRConstants.USERTYPE_EMPLOYEE;

import java.util.stream.Collectors;

@Slf4j
@org.springframework.stereotype.Service
public class PGRService {



    private EnrichmentService enrichmentService;

    private UserService userService;

    private WorkflowService workflowService;

    private ServiceRequestValidator serviceRequestValidator;

    private ServiceRequestValidator validator;

    private Producer producer;

    private PGRConfiguration config;

    private PGRRepository repository;

    private MDMSUtils mdmsUtils;

    private ComplaintDomainEventService complaintDomainEventService;

    private PGRUtils pgrUtils;

    private ExtendedAttributesValidationService extendedAttributesValidationService;

    private EncryptionDecryptionService encryptionDecryptionService;

    private SearchAccessPolicyService searchAccessPolicyService;

    private FieldVisibilityService fieldVisibilityService;

    private EmployeeDepartmentScopeService employeeDepartmentScopeService;

    private EmployeeJurisdictionScopeService employeeJurisdictionScopeService;

    @Autowired
    public PGRService(EnrichmentService enrichmentService, UserService userService, WorkflowService workflowService,
                      ServiceRequestValidator serviceRequestValidator, ServiceRequestValidator validator, Producer producer,
                      PGRConfiguration config, PGRRepository repository, MDMSUtils mdmsUtils,
                      ComplaintDomainEventService complaintDomainEventService, PGRUtils pgrUtils,
                      ExtendedAttributesValidationService extendedAttributesValidationService,
                      EncryptionDecryptionService encryptionDecryptionService,
                      SearchAccessPolicyService searchAccessPolicyService,
                      FieldVisibilityService fieldVisibilityService,
                      EmployeeDepartmentScopeService employeeDepartmentScopeService,
                      EmployeeJurisdictionScopeService employeeJurisdictionScopeService) {
        this.enrichmentService = enrichmentService;
        this.userService = userService;
        this.workflowService = workflowService;
        this.serviceRequestValidator = serviceRequestValidator;
        this.validator = validator;
        this.producer = producer;
        this.config = config;
        this.repository = repository;
        this.mdmsUtils = mdmsUtils;
        this.complaintDomainEventService = complaintDomainEventService;
        this.pgrUtils = pgrUtils;
        this.extendedAttributesValidationService = extendedAttributesValidationService;
        this.encryptionDecryptionService = encryptionDecryptionService;
        this.searchAccessPolicyService = searchAccessPolicyService;
        this.fieldVisibilityService = fieldVisibilityService;
        this.employeeDepartmentScopeService = employeeDepartmentScopeService;
        this.employeeJurisdictionScopeService = employeeJurisdictionScopeService;
    }


    /**
     * Creates a complaint in the system
     * @param request The service request containg the complaint information
     * @return
     */
	public ServiceRequest create(ServiceRequest request) {
		String tenantId = request.getService().getTenantId();
		String fromState = request.getService().getApplicationStatus();
		Object mdmsData = mdmsUtils.mDMSCall(request);
		validator.validateCreate(request, mdmsData);
		enrichmentService.enrichCreateRequest(request);
		workflowService.updateWorkflowStatus(request);

		Service service = request.getService();

		Map<String, Object> existing = pgrUtils.extractAdditionalDetails(service.getAdditionalDetail());
		Map<String, Object> backend = new HashMap<>();
		backend.put("department", getDepartmentFromMDMS(request, mdmsData));
		backend.put("serviceName", getServiceNameFromMDMS(request, mdmsData));
		Map<String, Object> merged = pgrUtils.deepMerge(existing, backend);
		service.setAdditionalDetail(merged);

		// Extended attributes: validate → encrypt → sync contact details to User Service
		ExtendedAttributes ext = service.getExtendedAttributes();
		ComplaintTemplateTypeConfig cfg = null;
		ExtendedAttributes plainExt = null;
		if (ext != null) {
			if (ext.getIsConfidential() == null) ext.setIsConfidential(false);
			if (isConfidentialityFlagOnly(ext)) {
				// Citizen "keep my details confidential" without a category template: nothing
				// to validate or encrypt — the flag alone drives complainant masking on read.
				enrichmentService.enrichUserContactDetails(request);
			} else {
				cfg = mdmsUtils.fetchComplaintTemplateTypeConfig(
						request.getRequestInfo(), tenantId, ext.getCaseRelatedTo());
				if (cfg == null)
					throw new CustomException("INVALID_CASE_RELATED_TO",
							"No MDMS config found for caseRelatedTo: " + ext.getCaseRelatedTo());
				extendedAttributesValidationService.validate(ext, cfg, service);
				plainExt = ext.copy(); // snapshot before encrypt — avoids decrypt round-trip for response
				service.setExtendedAttributes(
						encryptionDecryptionService.encrypt(ext, cfg, tenantId));
				enrichmentService.enrichUserContactDetails(request);
			}
		}

		complaintDomainEventService.publishWorkflowTransitionEvent(request, fromState);

		producer.push(tenantId, config.getCreateTopic(), request);
		producer.push(tenantId, config.getInboxCreateTopic(), request);

		if (plainExt != null)
			service.setExtendedAttributes(plainExt);

		return request;
	}


    /**
     * Searches the complaints in the system based on the given criteria
     * @param requestInfo The requestInfo of the search call
     * @param criteria The search criteria containg the params on which to search
     * @return
     */
    public List<ServiceWrapper> search(RequestInfo requestInfo, RequestSearchCriteria criteria){
        validator.validateSearch(requestInfo, criteria);

        enrichmentService.enrichSearchRequest(requestInfo, criteria);

        if (!applyEmployeeDepartmentScope(requestInfo, criteria))
            return new ArrayList<>();

        if (!applyEmployeeJurisdictionScope(requestInfo, criteria))
            return new ArrayList<>();

        if(criteria.isEmpty())
            return new ArrayList<>();

        if(criteria.getMobileNumber()!=null && CollectionUtils.isEmpty(criteria.getUserIds()))
            return new ArrayList<>();

        applyConfidentialIdentityGuard(requestInfo, criteria);

        String tenantIdForScope = criteria.getTenantId() != null ? criteria.getTenantId() : requestInfo.getUserInfo().getTenantId();
        PgrSearchScope scope = searchAccessPolicyService.resolveScope(requestInfo, tenantIdForScope, config.getStateLevelTenantIdLength());

        if (criteria.getAssignee() != null) {
            String tenantId = criteria.getTenantId() != null ? criteria.getTenantId()
                    : (requestInfo.getUserInfo() != null ? requestInfo.getUserInfo().getTenantId() : null);
            Set<String> serviceRequestIds = workflowService.getServiceRequestIdsByAssignee(requestInfo, tenantId, criteria.getAssignee());
            if (serviceRequestIds.isEmpty()) {
                return new ArrayList<>();
            }
            criteria.setServiceRequestIds(serviceRequestIds);
        }

        criteria.setIsPlainSearch(false);

        List<ServiceWrapper> serviceWrappers = repository.getServiceWrappers(criteria, scope);

        if(CollectionUtils.isEmpty(serviceWrappers))
            return new ArrayList<>();;

        serviceWrappers = searchAccessPolicyService.enforce(requestInfo, tenantIdForScope, scope, serviceWrappers);

        if(CollectionUtils.isEmpty(serviceWrappers))
            return new ArrayList<>();

        userService.enrichUsers(serviceWrappers, requestInfo);
        List<ServiceWrapper> enrichedServiceWrappers = workflowService.enrichWorkflow(requestInfo,serviceWrappers);

        String tenantIdForMdms = criteria.getTenantId() != null ? criteria.getTenantId()
                : (requestInfo.getUserInfo() != null ? requestInfo.getUserInfo().getTenantId() : null);
        Map<String, ComplaintTemplateTypeConfig> configCache = buildConfigCache(requestInfo, tenantIdForMdms, enrichedServiceWrappers);
        applyDecryptOrMask(enrichedServiceWrappers, requestInfo, configCache);
        maskConfidentialComplainants(enrichedServiceWrappers, requestInfo, configCache);
        fieldVisibilityService.apply(requestInfo, tenantIdForScope, scope,
                AccessPolicyRegistry.PGR_REQUEST_SEARCH_URL, "complaint", enrichedServiceWrappers);

        // NOTE: do not re-sort enrichedServiceWrappers here. It used to be
        // regrouped into a createdTime-descending TreeMap unconditionally,
        // which silently discarded whatever ORDER BY
        // PGRQueryBuilder.addOrderByClause built from criteria.sortBy/sortOrder
        // (locality/applicationStatus/serviceRequestId/sla) — every inbox
        // column-header sort landed on this endpoint and always came back in
        // createdTime-descending order regardless of what was requested
        // (issue #922). The query builder already defaults to
        // "ORDER BY ser_createdtime DESC" when no sortBy is given, so trusting
        // the DB's order here preserves that default while finally letting an
        // explicit sortBy take effect.
        return enrichedServiceWrappers;
    }


    /**
     * Updates the complaint (used to forward the complaint from one application status to another)
     * @param request The request containing the complaint to be updated
     * @return
     */
    public ServiceRequest update(ServiceRequest request){
        String tenantId = request.getService().getTenantId();
        String fromState = request.getService().getApplicationStatus();
        // The stored record owns the complaint's identity: a workflow update can neither re-link
        // it to another account nor undo the complainant's confidentiality choice, and a payload
        // that lost its category template (or arrived from a masked read) gets it back from the
        // record before validation. One read by id; validateUpdate repeats it to reject unknown ids.
        Service stored = fetchStoredService(request.getService().getId(), tenantId);
        if (stored != null)
            adoptStoredIdentity(request, stored);
        Object mdmsData = mdmsUtils.mDMSCall(request);
        validator.validateUpdate(request, mdmsData);
        enrichmentService.enrichUpdateRequest(request);
        workflowService.updateWorkflowStatus(request);

        Service updateService = request.getService();
		Map<String, Object> existing = pgrUtils.extractAdditionalDetails(updateService.getAdditionalDetail());
		Map<String, Object> backend = new HashMap<>();
		Object clientDept = existing.get("department");
        if (clientDept == null || (clientDept instanceof String s && (s.isBlank() || s.equalsIgnoreCase("NA")))) {
            backend.put("department", getDepartmentFromMDMS(request, mdmsData));
        }
		backend.put("serviceName", getServiceNameFromMDMS(request, mdmsData));
		Map<String, Object> merged = pgrUtils.deepMerge(existing, backend);
		updateService.setAdditionalDetail(merged);

		// Extended attributes: validate → re-encrypt → sync contact details to User Service
		ExtendedAttributes updatedExt = updateService.getExtendedAttributes();
		ComplaintTemplateTypeConfig cfg = null;
		ExtendedAttributes plainExt = null;
		if (updatedExt != null) {
			if (updatedExt.getIsConfidential() == null) updatedExt.setIsConfidential(false);
			if (isConfidentialityFlagOnly(updatedExt)) {
				syncContactDetailsIfOwner(request, stored);
			} else {
				cfg = mdmsUtils.fetchComplaintTemplateTypeConfig(
						request.getRequestInfo(), tenantId, updatedExt.getCaseRelatedTo());
				if (cfg == null)
					throw new CustomException("INVALID_CASE_RELATED_TO",
							"No MDMS config found for caseRelatedTo: " + updatedExt.getCaseRelatedTo());
				restoreMaskedPlaceholders(updatedExt, updateService.getId(), tenantId, cfg);
				extendedAttributesValidationService.validate(updatedExt, cfg, updateService);
				plainExt = updatedExt.copy(); // snapshot before encrypt — avoids decrypt round-trip for response
				// A restored value may be real confidential data the caller isn't cleared to see —
				// persist it correctly either way, but don't leak it back in this response.
				if (updatedExt.getIsConfidentialSafe() && !isAuthorizedForConfidential(request.getRequestInfo(), updateService, cfg))
					encryptionDecryptionService.maskAllPlaintext(plainExt, cfg);
				updateService.setExtendedAttributes(
						encryptionDecryptionService.encrypt(updatedExt, cfg, tenantId));
				syncContactDetailsIfOwner(request, stored);
			}
		}

        complaintDomainEventService.publishWorkflowTransitionEvent(request, fromState);
        producer.push(tenantId, config.getUpdateTopic(), request);
        producer.push(tenantId, config.getInboxUpdateTopic(), request);

		if (plainExt != null)
			updateService.setExtendedAttributes(plainExt);

		maskComplainantIfUnauthorized(updateService, request.getRequestInfo(), cfg);
        return request;
    }

    /**
     * Returns the total number of comaplaints matching the given criteria
     * @param requestInfo The requestInfo of the search call
     * @param criteria The search criteria containg the params for which count is required
     * @return
     */
    public Integer count(RequestInfo requestInfo, RequestSearchCriteria criteria){

        // Mirrors search()'s guards. The tenant and ownership predicates in PGRQueryBuilder are
        // conditional, so an unfiltered criteria does not narrow the count — it removes the filter.
        // Validate before scoping, as search() does: scoping clears mobileNumber for a pure citizen,
        // which would otherwise hide that param from the allowed-params check.
        validator.validateSearch(requestInfo, criteria);

        // CCRS #1071: /_count shares RequestSearchCriteria and PGRQueryBuilder with /_search, so it
        // needs the same record-level ownership scoping — otherwise a citizen counts every complaint
        // in the tenant, and can use serviceRequestId/ids as an existence oracle for other citizens'
        // complaints. Only the scoping half of the enrichment applies here: the count query wraps the
        // search query including its LIMIT, so applying the pagination defaults would cap the count.
        // Applied before the early returns below so ownership is pinned on every path that queries.
        enrichmentService.scopeSearchCriteria(requestInfo, criteria);

        if(criteria.isEmpty())
            return 0;

        // A mobileNumber that resolved to no user must count 0, not fall through to an unscoped
        // count: an empty userIds drops the ownership clause entirely.
        if(criteria.getMobileNumber()!=null && CollectionUtils.isEmpty(criteria.getUserIds()))
            return 0;

        // Mirror search()'s assignee handling: resolve the assignee to
        // serviceRequestIds via workflow before counting. Without this the
        // assignee param was silently ignored on _count, so count and search
        // disagreed for assignee-scoped queries (e.g. the My-tab badge).
        if (criteria.getAssignee() != null) {
            String tenantId = criteria.getTenantId() != null ? criteria.getTenantId()
                    : (requestInfo.getUserInfo() != null ? requestInfo.getUserInfo().getTenantId() : null);
            Set<String> serviceRequestIds = workflowService.getServiceRequestIdsByAssignee(requestInfo, tenantId, criteria.getAssignee());
            if (CollectionUtils.isEmpty(serviceRequestIds)) {
                return 0;
            }
            criteria.setServiceRequestIds(serviceRequestIds);
        }

        criteria.setIsPlainSearch(false);
        applyConfidentialIdentityGuard(requestInfo, criteria);

        String tenantIdForScope = criteria.getTenantId() != null ? criteria.getTenantId() : requestInfo.getUserInfo().getTenantId();
        PgrSearchScope scope = searchAccessPolicyService.resolveScope(requestInfo, tenantIdForScope, config.getStateLevelTenantIdLength());
        Integer count = repository.getCount(criteria, scope);
        return count;
    }

    /**
     * Employee-only, opt-in: restricts {@code criteria} to the searching employee's own
     * department(s) only if they hold a role in {@code pgr.department.scope.roles}. Every other
     * employee role, and citizen/system callers (including plainSearch calls with no userInfo at
     * all), are untouched. Returns false when the caller must see nothing (search/count/plainSearch
     * should short-circuit).
     *
     * Skipped entirely when {@code criteria.isSkipEmployeeDepartmentScope()} — set by
     * AdminComplaintSearchService for the SUPERUSER cross-department admin search, whose
     * explicitly chosen departmentCodes must not be overwritten by the caller's own HRMS
     * department just because they also happen to hold a scoped role. Also skipped when
     * {@code criteria.getCreatedBy()} is set — that filter already targets a specific filer,
     * so forcing the caller's own department onto it would just drop unrelated results.
     */
    private boolean applyEmployeeDepartmentScope(RequestInfo requestInfo, RequestSearchCriteria criteria) {
        if (criteria.isSkipEmployeeDepartmentScope())
            return true;

        // A createdBy search targets a specific complaint-filer, not the caller's own department —
        // forcing the caller's department onto it would silently drop results filed under a
        // different department, defeating the point of searching by createdBy at all.
        if (!CollectionUtils.isEmpty(criteria.getCreatedBy()))
            return true;

        if (requestInfo.getUserInfo() == null
                || !USERTYPE_EMPLOYEE.equalsIgnoreCase(requestInfo.getUserInfo().getType()))
            return true;

        String scopeTenantId = criteria.getTenantId() != null
                ? criteria.getTenantId() : requestInfo.getUserInfo().getTenantId();
        return employeeDepartmentScopeService.applyScope(requestInfo, scopeTenantId, criteria);
    }

    /**
     * Employee-only, opt-in: restricts {@code criteria} to the searching employee's own
     * jurisdiction (boundary) only if they hold a role in {@code pgr.jurisdiction.scope.roles}.
     * Mirrors {@link #applyEmployeeDepartmentScope} exactly, including its skip conditions.
     */
    private boolean applyEmployeeJurisdictionScope(RequestInfo requestInfo, RequestSearchCriteria criteria) {
        if (criteria.isSkipEmployeeJurisdictionScope())
            return true;

        // A createdBy search targets a specific complaint-filer, not the caller's own jurisdiction —
        // forcing the caller's jurisdiction onto it would silently drop results filed under a
        // different jurisdiction, defeating the point of searching by createdBy at all.
        if (!CollectionUtils.isEmpty(criteria.getCreatedBy()))
            return true;

        if (requestInfo.getUserInfo() == null
                || !USERTYPE_EMPLOYEE.equalsIgnoreCase(requestInfo.getUserInfo().getType()))
            return true;

        String scopeTenantId = criteria.getTenantId() != null
                ? criteria.getTenantId() : requestInfo.getUserInfo().getTenantId();
        return employeeJurisdictionScopeService.applyScope(requestInfo, scopeTenantId, criteria);
    }


    public List<ServiceWrapper> plainSearch(RequestInfo requestInfo, RequestSearchCriteria criteria) {
        validator.validatePlainSearch(criteria);

        if (!applyEmployeeDepartmentScope(requestInfo, criteria))
            return new ArrayList<>();

        if (!applyEmployeeJurisdictionScope(requestInfo, criteria))
            return new ArrayList<>();

        criteria.setIsPlainSearch(true);

        if(criteria.getLimit()==null)
            criteria.setLimit(config.getDefaultLimit());

        if(criteria.getOffset()==null)
            criteria.setOffset(config.getDefaultOffset());

        if(criteria.getLimit()!=null && criteria.getLimit() > config.getMaxLimit())
            criteria.setLimit(config.getMaxLimit());

        List<ServiceWrapper> serviceWrappers = repository.getServiceWrappers(criteria);

        if(CollectionUtils.isEmpty(serviceWrappers)){
            return new ArrayList<>();
        }

        userService.enrichUsers(serviceWrappers, requestInfo);
        List<ServiceWrapper> enrichedServiceWrappers = workflowService.enrichWorkflow(requestInfo, serviceWrappers);

        String tenantIdForMdms = criteria.getTenantId() != null ? criteria.getTenantId()
                : (requestInfo.getUserInfo() != null ? requestInfo.getUserInfo().getTenantId() : null);
        Map<String, ComplaintTemplateTypeConfig> configCache = buildConfigCache(requestInfo, tenantIdForMdms, enrichedServiceWrappers);
        applyDecryptOrMask(enrichedServiceWrappers, requestInfo, configCache);
        maskConfidentialComplainants(enrichedServiceWrappers, requestInfo, configCache);

        // plainSearch stays record-level unrestricted (see PGRRepository/PGRQueryBuilder — no scope
        // threaded into the query) AND, deliberately, unrestricted at the field-visibility level too:
        // _plainsearch is a distinct endpoint from _search and must not reuse _search's
        // ACCESSCONTROL-ACTIONS-TEST action/policy (id 2008) for field masking here — that policy's
        // scope/attributes were authored for _search's semantics, not this endpoint's. If
        // _plainsearch needs field-level masking, it needs its own action + policy end-to-end
        // (row AND field), not a borrowed one.

        Map<Long, List<ServiceWrapper>> sortedWrappers = new TreeMap<>(Collections.reverseOrder());
        for(ServiceWrapper svc : enrichedServiceWrappers){
            if(sortedWrappers.containsKey(svc.getService().getAuditDetails().getCreatedTime())){
                sortedWrappers.get(svc.getService().getAuditDetails().getCreatedTime()).add(svc);
            }else{
                List<ServiceWrapper> serviceWrapperList = new ArrayList<>();
                serviceWrapperList.add(svc);
                sortedWrappers.put(svc.getService().getAuditDetails().getCreatedTime(), serviceWrapperList);
            }
        }
        List<ServiceWrapper> sortedServiceWrappers = new ArrayList<>();
        for(Long createdTimeDesc : sortedWrappers.keySet()){
            sortedServiceWrappers.addAll(sortedWrappers.get(createdTimeDesc));
        }
        return sortedServiceWrappers;
    }


	public Map<String, Integer> getDynamicData(String tenantId) {
		
		Map<String,Integer> dynamicData = repository.fetchDynamicData(tenantId);

		return dynamicData;
	}


	public int getComplaintTypes() {
		
		return Integer.valueOf(config.getComplaintTypes());
	}

    private boolean hasAnyRole(RequestInfo requestInfo, List<String> roleCodes) {
        if (requestInfo == null || requestInfo.getUserInfo() == null
                || requestInfo.getUserInfo().getRoles() == null) return false;
        return requestInfo.getUserInfo().getRoles().stream()
                .anyMatch(r -> roleCodes.contains(r.getCode()));
    }

    /** Fetches ComplaintTemplateTypeConfig per distinct caseRelatedTo in the result set. */
    private Map<String, ComplaintTemplateTypeConfig> buildConfigCache(
            RequestInfo requestInfo, String tenantId, List<ServiceWrapper> wrappers) {
        if (tenantId == null) return Collections.emptyMap();
        Set<String> categoryTypes = wrappers.stream()
                .map(w -> w.getService().getExtendedAttributes())
                .filter(Objects::nonNull)
                .map(ExtendedAttributes::getCaseRelatedTo)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, ComplaintTemplateTypeConfig> cache = new HashMap<>();
        for (String cat : categoryTypes) {
            ComplaintTemplateTypeConfig cfg = mdmsUtils.fetchComplaintTemplateTypeConfig(requestInfo, tenantId, cat);
            if (cfg != null) cache.put(cat, cfg);
        }
        return cache;
    }

    /**
     * Clients that fetched a complaint while it was masked (e.g. a transient MDMS lookup
     * failure, or the citizen UI caching a stale view) may echo the "****" sentinel back
     * on a later update — the citizen RATE flow resubmits the whole cached service object.
     * Restore the currently-stored value for any field the client sends back as the
     * sentinel, so a masked placeholder never permanently overwrites real data.
     */
    private void restoreMaskedPlaceholders(ExtendedAttributes updatedExt, String serviceId, String tenantId,
                                            ComplaintTemplateTypeConfig cfg) {
        boolean hasMasked = updatedExt.getDynamicFields().values().stream().anyMatch(MASK_SENTINEL::equals);
        if (!hasMasked) return;

        RequestSearchCriteria criteria = RequestSearchCriteria.builder()
                .ids(Collections.singleton(serviceId)).tenantId(tenantId).build();
        criteria.setIsPlainSearch(false);
        List<ServiceWrapper> existing = repository.getServiceWrappers(criteria);
        if (CollectionUtils.isEmpty(existing)) return;

        ExtendedAttributes existingExt = existing.get(0).getService().getExtendedAttributes();
        if (existingExt == null) return;

        // existingExt's x-security fields are ciphertext at rest — decrypt before copying
        // back, otherwise validation runs on ciphertext and encrypt() double-encrypts it.
        encryptionDecryptionService.decrypt(existingExt, cfg);

        for (String key : new ArrayList<>(updatedExt.getDynamicFields().keySet())) {
            if (!MASK_SENTINEL.equals(updatedExt.getField(key))) continue;
            Object existingValue = existingExt.getField(key);
            if (existingValue == null) {
                updatedExt.removeField(key);
            } else if (MASK_SENTINEL.equals(existingValue)) {
                // decrypt() falls back to the sentinel on failure (e.g. enc-service down) —
                // treating that as a real value would persist "****" as if it were genuine,
                // the exact corruption this method exists to prevent. Fail closed instead.
                throw new CustomException("MASK_RESTORE_FAILED",
                        "Could not recover the original value for field '" + key
                                + "'; rejecting update to avoid persisting a placeholder.");
            } else {
                updatedExt.putField(key, existingValue);
            }
        }
    }

    /**
     * Decrypts or masks extendedAttributes for each wrapper.
     * All-or-nothing: confidential + no viewer role → maskAll. Creator always decrypts.
     * If MDMS config is gone for a confidential complaint, mask to avoid leaking ciphertext.
     */
    private void applyDecryptOrMask(List<ServiceWrapper> wrappers, RequestInfo requestInfo,
                                     Map<String, ComplaintTemplateTypeConfig> configCache) {
        for (ServiceWrapper wrapper : wrappers) {
            Service svc = wrapper.getService();
            if (svc.getExtendedAttributes() == null) continue;
            ComplaintTemplateTypeConfig cfg = configCache.get(svc.getExtendedAttributes().getCaseRelatedTo());
            if (cfg == null) {
                if (svc.getExtendedAttributes().getIsConfidentialSafe())
                    encryptionDecryptionService.maskAll(svc.getExtendedAttributes(), null);
                continue;
            }
            if (svc.getExtendedAttributes().getIsConfidentialSafe() && !isAuthorizedForConfidential(requestInfo, svc, cfg)) {
                encryptionDecryptionService.maskAll(svc.getExtendedAttributes(), cfg);
            } else {
                encryptionDecryptionService.decrypt(svc.getExtendedAttributes(), cfg);
            }
        }
    }

    /** Creator always qualifies; otherwise the caller needs one of cfg's allowed viewer roles. */
    private boolean isAuthorizedForConfidential(RequestInfo requestInfo, Service svc, ComplaintTemplateTypeConfig cfg) {
        String callerUuid = requestInfo.getUserInfo() != null ? requestInfo.getUserInfo().getUuid() : null;
        if (callerUuid != null && callerUuid.equals(svc.getAccountId())) return true;
        List<String> viewerRoles = cfg != null && !CollectionUtils.isEmpty(cfg.getAllowedViewerRoles())
                ? cfg.getAllowedViewerRoles() : List.of(ROLE_CONFIDENTIAL_VIEWER);
        return hasAnyRole(requestInfo, viewerRoles);
    }

    /** extendedAttributes carrying only the citizen's confidentiality choice — no category template
     *  and none of the contact fields that would be forwarded to the user service. */
    private static boolean isConfidentialityFlagOnly(ExtendedAttributes ext) {
        return ext.getCaseRelatedTo() == null && ext.getDynamicFields().isEmpty()
                && ext.getEmail() == null && ext.getComplainantAddress() == null;
    }

    /**
     * A confidential complaint hides WHO complained, not only its template fields: the complainant
     * record the user service enriched is masked for every caller who is neither the complainant
     * nor a cleared viewer. Runs on both read paths and on the update response.
     */
    private void maskConfidentialComplainants(List<ServiceWrapper> wrappers, RequestInfo requestInfo,
                                              Map<String, ComplaintTemplateTypeConfig> configCache) {
        for (ServiceWrapper wrapper : wrappers) {
            Service svc = wrapper.getService();
            if (svc.getExtendedAttributes() == null) continue;
            maskComplainantIfUnauthorized(svc, requestInfo, configCache.get(svc.getExtendedAttributes().getCaseRelatedTo()));
        }
    }

    private void maskComplainantIfUnauthorized(Service svc, RequestInfo requestInfo, ComplaintTemplateTypeConfig cfg) {
        ExtendedAttributes ext = svc.getExtendedAttributes();
        User citizen = svc.getCitizen();
        if (ext == null || !ext.getIsConfidentialSafe() || citizen == null) return;
        if (isAuthorizedForConfidential(requestInfo, svc, cfg)) return;
        // A masked COPY: enrichUsers hands every complaint by the same citizen one shared User
        // instance, so mutating it would mask that person's non-confidential complaints too.
        svc.setCitizen(maskedCopyOf(citizen));
        // The account link is identity as well: /user/_search resolves a uuid to the person. Updates
        // don't need it back — update() re-adopts accountId from the stored record.
        String accountId = svc.getAccountId();
        svc.setAccountId(null);
        AuditDetails audit = svc.getAuditDetails();
        if (audit != null && accountId != null) {
            if (accountId.equals(audit.getCreatedBy())) audit.setCreatedBy(null);
            if (accountId.equals(audit.getLastModifiedBy())) audit.setLastModifiedBy(null);
        }
    }

    private static User maskedCopyOf(User c) {
        return User.builder()
                .type(c.getType()).roles(c.getRoles()).tenantId(c.getTenantId()).active(c.getActive())
                .countryCode(c.getCountryCode())
                .name(MASK_SENTINEL)
                .mobileNumber(MASK_SENTINEL)
                .userName(MASK_SENTINEL) // citizen accounts log in with the mobile number
                .emailId(c.getEmailId() != null ? MASK_SENTINEL : null)
                .correspondenceAddress(c.getCorrespondenceAddress() != null ? MASK_SENTINEL : null)
                .build(); // uuid / id deliberately absent
    }

    /**
     * Searching by WHO filed (mobile → userIds, createdBy) from a caller who is neither that
     * person nor a cleared viewer must not confirm that a confidential complaint exists —
     * the rows are left out of search and count alike (PGRQueryBuilder honours the flag).
     */
    private void applyConfidentialIdentityGuard(RequestInfo requestInfo, RequestSearchCriteria criteria) {
        Set<String> userIds = criteria.getUserIds() == null ? Collections.emptySet() : criteria.getUserIds();
        Set<String> createdBy = criteria.getCreatedBy() == null ? Collections.emptySet() : criteria.getCreatedBy();
        if (userIds.isEmpty() && createdBy.isEmpty()) return;
        String caller = requestInfo.getUserInfo() != null ? requestInfo.getUserInfo().getUuid() : null;
        boolean onlySelf = caller != null
                && Set.of(caller).containsAll(userIds) && Set.of(caller).containsAll(createdBy);
        if (onlySelf || hasAnyRole(requestInfo, List.of(ROLE_CONFIDENTIAL_VIEWER))) return;
        criteria.setExcludeConfidential(true);
    }

    private Service fetchStoredService(String id, String tenantId) {
        if (id == null) return null;
        RequestSearchCriteria criteria = RequestSearchCriteria.builder()
                .ids(Collections.singleton(id)).tenantId(tenantId).build();
        criteria.setIsPlainSearch(false);
        List<ServiceWrapper> stored = repository.getServiceWrappers(criteria);
        return CollectionUtils.isEmpty(stored) ? null : stored.get(0).getService();
    }

    private static boolean callerIsOwner(RequestInfo requestInfo, Service stored) {
        String caller = requestInfo.getUserInfo() != null ? requestInfo.getUserInfo().getUuid() : null;
        return caller != null && caller.equals(stored.getAccountId());
    }

    /**
     * Identity that the payload may not override on update:
     *  - accountId comes from the record (a masked read returns it as null; a crafted payload
     *    could otherwise re-link the complaint);
     *  - a category template the record has but the payload lacks is carried over — the
     *    caseRelatedTo plus mask placeholders for its fields, which the templated branch then
     *    restores from the record (restoreMaskedPlaceholders) instead of wiping them;
     *  - confidentiality, once set, is switched off only by the complainant.
     */
    private void adoptStoredIdentity(ServiceRequest request, Service stored) {
        Service incoming = request.getService();
        if (StringUtils.hasText(stored.getAccountId())) {
            if (incoming.getAccountId() != null && !incoming.getAccountId().equals(stored.getAccountId()))
                log.warn("Update of {} carried accountId {} — keeping the stored account",
                        incoming.getServiceRequestId(), incoming.getAccountId());
            incoming.setAccountId(stored.getAccountId());
        }
        ExtendedAttributes storedExt = stored.getExtendedAttributes();
        if (storedExt == null) return;
        ExtendedAttributes ext = incoming.getExtendedAttributes();
        boolean templateLost = storedExt.getCaseRelatedTo() != null && (ext == null || ext.getCaseRelatedTo() == null);
        boolean mustStayConfidential = storedExt.getIsConfidentialSafe() && !callerIsOwner(request.getRequestInfo(), stored);
        if (!templateLost && !mustStayConfidential) return;
        if (ext == null) {
            ext = new ExtendedAttributes();
            incoming.setExtendedAttributes(ext);
        }
        if (templateLost) {
            ext.setCaseRelatedTo(storedExt.getCaseRelatedTo());
            if (ext.getSchemaVersion() == null) ext.setSchemaVersion(storedExt.getSchemaVersion());
            for (String key : storedExt.getDynamicFields().keySet())
                if (ext.getField(key) == null) ext.putField(key, MASK_SENTINEL);
        }
        if (mustStayConfidential) ext.setIsConfidential(true);
    }

    /** Contact details ride on extendedAttributes to the user service; on update only the
     *  complainant may change their own — anyone else's copy is dropped before the Kafka push. */
    private void syncContactDetailsIfOwner(ServiceRequest request, Service stored) {
        if (stored == null || callerIsOwner(request.getRequestInfo(), stored)) {
            enrichmentService.enrichUserContactDetails(request);
            return;
        }
        ExtendedAttributes ext = request.getService().getExtendedAttributes();
        if (ext != null) {
            ext.setEmail(null);
            ext.setComplainantAddress(null);
        }
    }

    private String getDepartmentFromMDMS(ServiceRequest request, Object mdmsData) {

        String serviceCode = request.getService().getServiceCode();
        String jsonPath = MDMS_DEPARTMENT_SEARCH.replace("{SERVICEDEF}", serviceCode);

        try {
            List<String> departmentCodeList = JsonPath.read(mdmsData, jsonPath);

            if (departmentCodeList == null || departmentCodeList.isEmpty()) {
                log.warn("No department found in MDMS for service: {}. Defaulting to NA.", serviceCode);
                return "NA";
            }

            // Stored as the MDMS department CODE, not its display name: PGRQueryBuilder's
            // department scope filter and the assignment flow (PGRDetails.js stamping the
            // assignee's raw HRMS department code onto this same field) both compare against
            // the code, and HRMS employee assignments only ever carry the code.
            String departmentCode = departmentCodeList.get(0);
            if (departmentCode == null)
                return "NA";
            String normalized = departmentCode.trim();
            return normalized.isEmpty() || normalized.equalsIgnoreCase("NA") ? "NA" : normalized;
        } catch (Exception e) {
            log.warn("Failed to parse MDMS response for department lookup, service: {}. Defaulting to NA.", serviceCode, e);
            return "NA";
        }
    }

    private String getServiceNameFromMDMS(ServiceRequest request, Object mdmsData) {

        String serviceCode = request.getService().getServiceCode();
        String jsonPath = MDMS_SERVICENAME_SEARCH.replace("{SERVICEDEF}", serviceCode);

        try {
            List<String> names = JsonPath.read(mdmsData, jsonPath);

            if (names == null || names.isEmpty()) {
                log.warn("No service name found in MDMS for service: {}. Falling back to serviceCode.", serviceCode);
                return serviceCode;
            }

            return names.get(0);
        } catch (Exception e) {
            log.warn("Failed to parse MDMS response for service name lookup, service: {}. Falling back to serviceCode.", serviceCode, e);
            return serviceCode;
        }
    }

}
