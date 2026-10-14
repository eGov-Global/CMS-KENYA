package org.egov.pgr.service;

import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.User;
import org.egov.pgr.config.PGRConfiguration;
import org.egov.pgr.repository.IdGenRepository;
import org.egov.pgr.util.PGRUtils;
import org.egov.pgr.util.Principals;
import org.egov.pgr.web.models.Address;
import org.egov.pgr.web.models.AuditDetails;
import org.egov.pgr.web.models.Service;
import org.egov.pgr.web.models.ServiceRequest;
import org.egov.pgr.web.models.Workflow;
import org.egov.pgr.web.models.Idgen.IdGenerationResponse;
import org.egov.pgr.web.models.Idgen.IdResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Collections;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/** The strip toggle decides only the shape of the generated id, nothing else about creation. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EnrichmentServiceIdFormatTest {

    @Mock
    private PGRUtils utils;
    @Mock
    private IdGenRepository idGenRepository;
    @Mock
    private PGRConfiguration config;
    @Mock
    private UserService userService;
    @Mock
    private Principals principals;

    @InjectMocks
    private EnrichmentService enrichmentService;

    @BeforeEach
    void setUp() {
        when(utils.getAuditDetails(anyString(), any(), any(Boolean.class)))
                .thenReturn(AuditDetails.builder().build());
        when(config.getServiceRequestIdGenName()).thenReturn("pgr.servicerequestid");
        when(config.getServiceRequestIdGenFormat()).thenReturn("BNG-[cy:yyyy]-[SEQ_EG_CMSNAIROBI]");
        when(idGenRepository.getId(any(RequestInfo.class), anyString(), anyString(), anyString(), anyInt()))
                .thenReturn(IdGenerationResponse.builder()
                        .idResponses(Collections.singletonList(IdResponse.builder().id("BNG-2026-000125").build()))
                        .build());
    }

    @Test
    void dropsThePaddingWhenStrippingIsOn() {
        when(config.getStripServiceRequestIdSequencePadding()).thenReturn(true);

        ServiceRequest request = createRequest();
        enrichmentService.enrichCreateRequest(request);

        assertEquals("BNG-2026-125", request.getService().getServiceRequestId());
    }

    @Test
    void keepsIdgensPaddingWhenStrippingIsOff() {
        when(config.getStripServiceRequestIdSequencePadding()).thenReturn(false);

        ServiceRequest request = createRequest();
        enrichmentService.enrichCreateRequest(request);

        assertEquals("BNG-2026-000125", request.getService().getServiceRequestId());
    }

    @Test
    void keepsIdgensPaddingWhenTheToggleIsUnset() {
        when(config.getStripServiceRequestIdSequencePadding()).thenReturn(null);

        ServiceRequest request = createRequest();
        enrichmentService.enrichCreateRequest(request);

        assertEquals("BNG-2026-000125", request.getService().getServiceRequestId());
    }

    private ServiceRequest createRequest() {
        User citizen = User.builder().uuid(UUID.randomUUID().toString()).type("CITIZEN").build();

        return ServiceRequest.builder()
                .requestInfo(RequestInfo.builder().userInfo(citizen).build())
                .workflow(Workflow.builder().build())
                .service(Service.builder()
                        .tenantId("nb.bonga")
                        .address(Address.builder().build())
                        .build())
                .build();
    }
}
