package org.egov.pgr.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.common.contract.request.RequestInfo;
import org.egov.pgr.config.PGRConfiguration;
import org.egov.pgr.repository.ServiceRequestRepository;
import org.egov.pgr.web.models.Service;
import org.egov.pgr.web.models.ServiceWrapper;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * enrichWorkflow asks workflow for the process instance of every complaint on a page. The
 * stock workflow jar pages at 10 when no limit is sent, so the request must carry one and
 * must never exceed the maximum workflow honours.
 */
class WorkflowServiceEnrichTest {

    private static final ObjectMapper M = new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private ServiceRequestRepository repo;
    private WorkflowService svc;

    @BeforeEach
    void setUp() {
        repo = mock(ServiceRequestRepository.class);
        PGRConfiguration config = mock(PGRConfiguration.class);
        when(config.getWfHost()).thenReturn("http://egov-workflow-v2:8080");
        when(config.getWfProcessInstanceSearchPath()).thenReturn("/egov-workflow-v2/egov-wf/process/_search");
        svc = new WorkflowService(config, repo, M);
    }

    private static List<ServiceWrapper> page(int n) {
        return IntStream.rangeClosed(1, n)
                .mapToObj(i -> ServiceWrapper.builder().service(Service.builder().tenantId("bo").serviceRequestId("PGR-" + i).build()).build())
                .collect(Collectors.toList());
    }

    /** Workflow answering like the real service: one instance per id it was asked for. */
    private void workflowAnswersEveryIdAsked() {
        when(repo.fetchResult(any(StringBuilder.class), any())).thenAnswer(inv -> {
            String url = inv.getArgument(0).toString();
            String ids = url.substring(url.indexOf("businessIds=") + "businessIds=".length(), url.indexOf("&limit="));
            List<Map<String, Object>> instances = Arrays.stream(ids.split(","))
                    .map(id -> Map.<String, Object>of("businessId", id, "action", "APPLY"))
                    .collect(Collectors.toList());
            return Map.of("ProcessInstances", instances);
        });
    }

    private List<String> searchUrls(int calls) {
        ArgumentCaptor<StringBuilder> url = ArgumentCaptor.forClass(StringBuilder.class);
        verify(repo, times(calls)).fetchResult(url.capture(), any());
        List<String> out = new ArrayList<>();
        url.getAllValues().forEach(u -> out.add(u.toString()));
        return out;
    }

    @Test
    void asksForExactlyTheIdsOfThePage() {
        workflowAnswersEveryIdAsked();
        List<ServiceWrapper> out = svc.enrichWorkflow(new RequestInfo(), page(18));

        String url = searchUrls(1).get(0);
        assertTrue(url.endsWith("&limit=18"), url);
        assertEquals(1, url.split("businessIds=").length - 1, "one businessIds parameter");
        assertEquals(18, out.size());
        assertNotNull(out.get(17).getWorkflow(), "the eighteenth complaint carries its workflow");
        assertEquals("APPLY", out.get(17).getWorkflow().getAction());
    }

    @Test
    void batchesAtTheWorkflowMaximum() {
        workflowAnswersEveryIdAsked();
        List<ServiceWrapper> out = svc.enrichWorkflow(new RequestInfo(), page(150));

        List<String> urls = searchUrls(2);
        assertTrue(urls.get(0).endsWith("&limit=" + WorkflowService.WF_SEARCH_BATCH), urls.get(0));
        assertTrue(urls.get(1).endsWith("&limit=50"), urls.get(1));
        assertTrue(urls.get(0).contains("businessIds=PGR-1,"), urls.get(0));
        assertTrue(urls.get(1).contains("businessIds=PGR-101,"), urls.get(1));
        assertEquals(150, out.stream().filter(w -> w.getWorkflow() != null).count());
    }

    @Test
    void aShortAnswerStillFailsClosed() {
        when(repo.fetchResult(any(StringBuilder.class), any()))
                .thenReturn(Map.of("ProcessInstances", List.of(Map.of("businessId", "PGR-1", "action", "APPLY"))));
        CustomException e = assertThrows(CustomException.class, () -> svc.enrichWorkflow(new RequestInfo(), page(2)));
        assertEquals("WORKFLOW_NOT_FOUND", e.getCode());
    }

    @Test
    void anEmptyAnswerFailsClosed() {
        when(repo.fetchResult(any(StringBuilder.class), any())).thenReturn(Map.of("ProcessInstances", List.of()));
        CustomException e = assertThrows(CustomException.class, () -> svc.enrichWorkflow(new RequestInfo(), page(3)));
        assertEquals("WORKFLOW_NOT_FOUND", e.getCode());
    }
}
