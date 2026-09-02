package org.egov.novubridge.service;

import org.egov.novubridge.config.NovuBridgeConfiguration;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Coverage of {@link DirectDeliveryService}: SMS built/parsed against Ozeki's classic
 * HTTP API contract (GET + query params, XML response), email built/sent via the
 * auto-configured {@link JavaMailSender}. Both success and failure map onto the same
 * {@link NovuClient.NovuResponse} shape {@code NovuClient} returns, by design, so
 * {@code DispatchPipelineService} treats direct and Novu-routed delivery identically.
 */
class DirectDeliveryServiceTest {

    private RestTemplate restTemplate;
    private JavaMailSender mailSender;
    private NovuBridgeConfiguration config;
    private DirectDeliveryService service;

    @BeforeEach
    void setUp() {
        restTemplate = mock(RestTemplate.class);
        mailSender = mock(JavaMailSender.class);
        config = new NovuBridgeConfiguration();
        config.setDirectSmsBaseUrl("http://ozeki:9501/api");
        config.setDirectSmsUsername("api-user");
        config.setDirectSmsPassword("api-pass");
        config.setDirectEmailFrom("no-reply@example.org");
        service = new DirectDeliveryService(restTemplate, mailSender, config);
    }

    @Test
    void sendSms_success_buildsOzekiUrl_andParsesAcceptReport() {
        String xml = "<response><action>sendmessage</action><data>"
                + "<acceptreport><messageid>msg-123</messageid><statuscode>0</statuscode></acceptreport>"
                + "</data></response>";
        when(restTemplate.getForObject(any(URI.class), eq(String.class))).thenReturn(xml);

        NovuClient.NovuResponse response = service.sendSms("+254712345678", "Hello there", "txn-1");

        assertEquals(200, response.getStatusCode());
        assertEquals("msg-123", response.getResponse().get("messageid"));
        assertEquals("0", response.getResponse().get("statuscode"));

        ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        verify(restTemplate).getForObject(uriCaptor.capture(), eq(String.class));
        var params = UriComponentsBuilder.fromUri(uriCaptor.getValue()).build().getQueryParams();
        assertEquals("http", uriCaptor.getValue().getScheme());
        assertEquals("/api", uriCaptor.getValue().getPath());
        assertEquals("sendmessage", params.getFirst("action"));
        assertEquals("api-user", params.getFirst("username"));
        assertEquals("api-pass", params.getFirst("password"));
        assertEquals("+254712345678", params.getFirst("recipient"));
        assertEquals("SMS:TEXT", params.getFirst("messagetype"));
        assertEquals("Hello there", java.net.URLDecoder.decode(params.getFirst("messagedata"), java.nio.charset.StandardCharsets.UTF_8));
    }

    @Test
    void sendSms_ozekiError_mapsToFailureResponse_withoutThrowing() {
        String xml = "<response><action>error</action><data>"
                + "<errorcode>4</errorcode><errormessage>Invalid recipient</errormessage>"
                + "</data></response>";
        when(restTemplate.getForObject(any(URI.class), eq(String.class))).thenReturn(xml);

        NovuClient.NovuResponse response = service.sendSms("bad-number", "Hello", "txn-2");

        assertEquals(502, response.getStatusCode());
        assertEquals("4", response.getResponse().get("errorcode"));
        assertEquals("Invalid recipient", response.getResponse().get("errormessage"));
    }

    @Test
    void sendSms_emptyResponseBody_throwsCustomException() {
        when(restTemplate.getForObject(any(URI.class), eq(String.class))).thenReturn(null);

        CustomException ex = assertThrows(CustomException.class,
                () -> service.sendSms("+254712345678", "Hello", "txn-3"));
        assertEquals("NB_DIRECT_SMS_FAILED", ex.getCode());
    }

    @Test
    void sendSms_malformedXml_throwsCustomException() {
        when(restTemplate.getForObject(any(URI.class), eq(String.class))).thenReturn("not xml at all <<<");

        CustomException ex = assertThrows(CustomException.class,
                () -> service.sendSms("+254712345678", "Hello", "txn-4"));
        assertEquals("NB_DIRECT_SMS_FAILED", ex.getCode());
    }

    @Test
    void sendSms_bongatechSuccess_buildsBearerAuthedJsonRequest() {
        config.setDirectSmsProvider("bongatech");
        config.setDirectSmsBaseUrl("https://bulk.bongatech.co.ke/api/v1/send-sms");
        config.setDirectSmsToken("secret-token");
        config.setSmsSenderId("CMS-MOZ");

        Map<String, Object> body = Map.of("status", true, "message", "Message successfully queued!",
                "data", Map.of("correlator", "txn-7", "uniqueId", "abc-123"));
        when(restTemplate.exchange(eq("https://bulk.bongatech.co.ke/api/v1/send-sms"), eq(HttpMethod.POST),
                any(HttpEntity.class), eq(Map.class)))
                .thenReturn(new ResponseEntity<>(body, HttpStatus.OK));

        NovuClient.NovuResponse response = service.sendSms("+254712345678", "Hello there", "txn-7");

        assertEquals(200, response.getStatusCode());
        assertEquals(true, response.getResponse().get("status"));

        ArgumentCaptor<HttpEntity> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(eq("https://bulk.bongatech.co.ke/api/v1/send-sms"), eq(HttpMethod.POST),
                entityCaptor.capture(), eq(Map.class));
        HttpEntity<Map<String, Object>> sentEntity = entityCaptor.getValue();
        assertEquals("Bearer secret-token", sentEntity.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
        assertEquals("CMS-MOZ", sentEntity.getBody().get("sender"));
        assertEquals("Hello there", sentEntity.getBody().get("message"));
        assertEquals("+254712345678", sentEntity.getBody().get("phone"));
        assertEquals("txn-7", sentEntity.getBody().get("correlator"));
    }

    @Test
    void sendSms_bongatechRejected_mapsToFailureResponse_withoutThrowing() {
        config.setDirectSmsProvider("bongatech");
        config.setDirectSmsBaseUrl("https://bulk.bongatech.co.ke/api/v1/send-sms");
        config.setDirectSmsToken("secret-token");

        Map<String, Object> body = Map.of("status", false, "message", "Invalid sender id");
        when(restTemplate.exchange(any(String.class), eq(HttpMethod.POST), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(new ResponseEntity<>(body, HttpStatus.OK));

        NovuClient.NovuResponse response = service.sendSms("+254712345678", "Hello", "txn-8");

        assertEquals(502, response.getStatusCode());
        assertEquals(false, response.getResponse().get("status"));
    }

    @Test
    void sendSms_bongatechUnauthenticated_mapsHttpStatusToFailureResponse_withoutThrowing() {
        config.setDirectSmsProvider("bongatech");
        config.setDirectSmsBaseUrl("https://bulk.bongatech.co.ke/api/v1/send-sms");
        config.setDirectSmsToken("bad-token");

        when(restTemplate.exchange(any(String.class), eq(HttpMethod.POST), any(HttpEntity.class), eq(Map.class)))
                .thenThrow(HttpClientErrorException.create(HttpStatus.UNAUTHORIZED, "Unauthorized",
                        HttpHeaders.EMPTY, "{\"status\":false,\"message\":\"Unauthenticated.\"}".getBytes(), null));

        NovuClient.NovuResponse response = service.sendSms("+254712345678", "Hello", "txn-9");

        assertEquals(401, response.getStatusCode());
    }

    @Test
    void sendEmail_success_sendsSimpleMailMessage() {
        NovuClient.NovuResponse response = service.sendEmail("jane@example.com", "Update", "Body text", "txn-5");

        assertEquals(200, response.getStatusCode());
        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        SimpleMailMessage sent = captor.getValue();
        assertEquals("no-reply@example.org", sent.getFrom());
        assertEquals("jane@example.com", sent.getTo()[0]);
        assertEquals("Update", sent.getSubject());
        assertEquals("Body text", sent.getText());
    }

    @Test
    void sendEmail_mailExceptionFromSender_wrappedAsCustomException() {
        doThrow(new MailException("smtp down") {
        }).when(mailSender).send(any(SimpleMailMessage.class));

        CustomException ex = assertThrows(CustomException.class,
                () -> service.sendEmail("jane@example.com", "Update", "Body text", "txn-6"));
        assertEquals("NB_DIRECT_EMAIL_FAILED", ex.getCode());
    }
}
