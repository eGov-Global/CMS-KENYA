package org.egov.novubridge.service;

import lombok.extern.slf4j.Slf4j;
import org.egov.novubridge.config.NovuBridgeConfiguration;
import org.egov.novubridge.util.PiiMask;
import org.egov.tracer.model.CustomException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.w3c.dom.Document;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Delivers SMS/Email WITHOUT Novu — for channels listed in
 * {@code novu.bridge.direct.channels} (see {@link NovuBridgeConfiguration#isDirectChannel}),
 * for deployments where {@code novu-api} can't run at all.
 *
 * <p>SMS talks directly to one of three gateways' HTTP APIs, selected by
 * {@code novu.bridge.direct.sms.provider} (default {@code ozeki}):
 * <ul>
 *   <li>Ozeki's classic HTTP API: a GET with recipient/message/credentials as
 *       query params, XML response. This is the exact contract the Novu-side
 *       {@code OzekiOverridesBuilder} path exists to satisfy via Novu's
 *       generic-sms provider.</li>
 *   <li>Bongatech's Bulk SMS API: a POST with a JSON body and a Bearer token,
 *       JSON response — see {@code BongatechOverridesBuilder} for the
 *       Novu-routed equivalent.</li>
 * </ul>
 * {@code novu.bridge.direct.sms.base.url} is the COMPLETE endpoint URL
 * (e.g. {@code http://ozeki-host:9501/api} or
 * {@code https://bulk.bongatech.co.ke/api/v1/send-sms}) — nothing is appended
 * here.
 *
 * <p>Here there is no Novu provider format constraint (novu-bridge is the
 * caller), so each request is built and its response parsed directly — no
 * adapter process needed.
 *
 * <p>Every method returns a {@link NovuClient.NovuResponse} (statusCode +
 * response body) — the same shape {@code NovuClient} returns — so
 * {@code DispatchPipelineService} can treat direct and Novu-routed
 * deliveries identically after this call returns.
 */
@Service
@Slf4j
public class DirectDeliveryService {

    private final RestTemplate restTemplate;
    private final JavaMailSender mailSender;
    private final NovuBridgeConfiguration config;

    public DirectDeliveryService(RestTemplate restTemplate, JavaMailSender mailSender, NovuBridgeConfiguration config) {
        this.restTemplate = restTemplate;
        this.mailSender = mailSender;
        this.config = config;
    }

    /**
     * Send an SMS via the gateway selected by {@code novu.bridge.direct.sms.provider}
     * (default {@code ozeki}) — the single switch point for direct-mode SMS, mirroring
     * {@code SmsProviderOverridesFactory} on the Novu-routed side.
     */
    public NovuClient.NovuResponse sendSms(String phone, String body, String transactionId) {
        if (config.isDirectSmsProviderBongatech()) {
            return sendSmsViaBongatech(phone, body, transactionId);
        }
        if (config.isDirectSmsProviderSourcecode()) {
            return sendSmsViaSourcecode(phone, body, transactionId);
        }
        return sendSmsViaOzeki(phone, body, transactionId);
    }

    /**
     * Send an SMS straight to the Ozeki gateway's classic HTTP API
     * ({@code GET <directSmsBaseUrl>?action=sendmessage&username=...&password=...
     * &recipient=...&messagetype=SMS:TEXT&messagedata=...} — directSmsBaseUrl is
     * expected to already include the {@code /api} path, e.g.
     * {@code http://ozeki-host:9501/api}), parsing its XML response. Never logs
     * the request URL (carries the password) or the raw XML body — only the
     * parsed outcome, masked where it carries the recipient.
     */
    private NovuClient.NovuResponse sendSmsViaOzeki(String phone, String body, String transactionId) {
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(config.getDirectSmsBaseUrl())
                    .queryParam("action", "sendmessage")
                    .queryParam("username", config.getDirectSmsUsername())
                    .queryParam("password", config.getDirectSmsPassword())
                    .queryParam("recipient", phone)
                    .queryParam("messagetype", "SMS:TEXT")
                    .queryParam("messagedata", body)
                    .build()
                    .encode(StandardCharsets.UTF_8)
                    .toUri();

            log.info("Ozeki direct SMS send: recipient={} txn={}", PiiMask.mask(phone), transactionId);
            String rawXml = restTemplate.getForObject(uri, String.class);
            if (!StringUtils.hasText(rawXml)) {
                throw new CustomException("NB_DIRECT_SMS_FAILED", "Ozeki returned an empty response");
            }

            Document doc = parseXml(rawXml);
            String action = textOf(doc, "action");
            if ("error".equalsIgnoreCase(action)) {
                String errorCode = textOf(doc, "errorcode");
                String errorMessage = textOf(doc, "errormessage");
                log.warn("Ozeki direct SMS rejected: txn={} errorcode={} errormessage={}",
                        transactionId, errorCode, errorMessage);
                Map<String, Object> response = new HashMap<>();
                response.put("errorcode", errorCode);
                response.put("errormessage", errorMessage);
                return NovuClient.NovuResponse.builder().statusCode(502).response(response).build();
            }

            String messageId = textOf(doc, "messageid");
            String statusCode = textOf(doc, "statuscode");
            log.info("Ozeki direct SMS accepted: txn={} messageId={} statuscode={}",
                    transactionId, messageId, statusCode);
            Map<String, Object> response = new HashMap<>();
            response.put("messageid", messageId);
            response.put("statuscode", statusCode);
            return NovuClient.NovuResponse.builder().statusCode(200).response(response).build();
        } catch (CustomException ce) {
            throw ce;
        } catch (Exception e) {
            log.error("Ozeki direct SMS failed: txn={}", transactionId, e);
            throw new CustomException("NB_DIRECT_SMS_FAILED", "Failed sending direct SMS via Ozeki: " + e.getMessage());
        }
    }

    /**
     * Send an SMS straight to Bongatech's Bulk SMS API ({@code POST
     * <directSmsBaseUrl>} — directSmsBaseUrl is expected to already include the
     * {@code /send-sms} path, e.g.
     * {@code https://bulk.bongatech.co.ke/api/v1/send-sms} — with a
     * {@code {sender, message, phone, correlator}} JSON body and a Bearer token),
     * parsing its JSON response ({@code {status, message, data}} on
     * success/failure — see https://bulk.bongatech.co.ke/docs/1.0/send-sms).
     * Never logs the Bearer token or the request/response body — only the
     * parsed outcome, masked where it carries the recipient.
     */
    private NovuClient.NovuResponse sendSmsViaBongatech(String phone, String body, String transactionId) {
        try {
            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("sender", config.getSmsSenderId());
            requestBody.put("message", body);
            requestBody.put("phone", phone);
            requestBody.put("correlator", transactionId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            headers.setBearerAuth(config.getDirectSmsToken());

            String url = config.getDirectSmsBaseUrl();
            log.info("Bongatech direct SMS send: recipient={} txn={}", PiiMask.mask(phone), transactionId);

            ResponseEntity<Map> httpResponse = restTemplate.exchange(url, HttpMethod.POST,
                    new HttpEntity<>(requestBody, headers), Map.class);

            Map<?, ?> parsed = httpResponse.getBody();
            boolean accepted = parsed != null && Boolean.TRUE.equals(parsed.get("status"));
            if (!accepted) {
                log.warn("Bongatech direct SMS rejected: txn={} message={}",
                        transactionId, parsed != null ? parsed.get("message") : null);
                return NovuClient.NovuResponse.builder().statusCode(502)
                        .response(toResponseMap(parsed)).build();
            }

            log.info("Bongatech direct SMS accepted: txn={}", transactionId);
            return NovuClient.NovuResponse.builder().statusCode(200)
                    .response(toResponseMap(parsed)).build();
        } catch (HttpStatusCodeException e) {
            // Bongatech's error shape ({status:false, message:"Unauthenticated."}, etc.)
            // arrives as a non-2xx HTTP status — surface it as a structured failure like
            // the success path above, not a thrown exception, so the pipeline's existing
            // status-code gate persists FAILED with the real reason instead of a generic one.
            log.warn("Bongatech direct SMS failed: txn={} httpStatus={}", transactionId, e.getStatusCode().value());
            Map<String, Object> response = new HashMap<>();
            response.put("httpStatus", e.getStatusCode().value());
            return NovuClient.NovuResponse.builder().statusCode(e.getStatusCode().value()).response(response).build();
        } catch (Exception e) {
            log.error("Bongatech direct SMS failed: txn={}", transactionId, e);
            throw new CustomException("NB_DIRECT_SMS_FAILED", "Failed sending direct SMS via Bongatech: " + e.getMessage());
        }
    }

    /**
     * Send an SMS via Source Code's Bulk SMS API ({@code POST <directSmsBaseUrl>}
     * — directSmsBaseUrl is expected to already include the full path, e.g.
     * {@code https://api.sourcecode.co.ke/sms/sendsms}).
     *
     * <p>Unlike Ozeki (query-param auth) and Bongatech (Bearer header), Source Code
     * carries its credential as {@code api_key} INSIDE the JSON body — so
     * {@code directSmsToken} is written into the payload, never a header. Its
     * sender is {@code shortcode} and its recipient is {@code mobile} (bare
     * {@code 2547XXXXXXXX}, no {@code +}).
     *
     * <p>Source Code answers HTTP 200 even for failures, signalling the real
     * outcome in the {@code status_code} body field ({@code "1000"}/{@code "1"} =
     * success; {@code 1001} invalid sender, {@code 1003} invalid mobile,
     * {@code 1004} low credits, {@code 1006} invalid credentials, …). Comparing
     * as a string because the single-send API documents it quoted while the bulk
     * API returns it numeric. Never logs the api_key or an unmasked recipient.
     */
    private NovuClient.NovuResponse sendSmsViaSourcecode(String phone, String body, String transactionId) {
        try {
            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("api_key", config.getDirectSmsToken());
            requestBody.put("service_id", config.getDirectSmsServiceIdAsInt());
            requestBody.put("mobile", phone);
            requestBody.put("response_type", "json");
            requestBody.put("shortcode", config.getSmsSenderId());
            requestBody.put("message", body);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            String url = config.getDirectSmsBaseUrl();
            log.info("Source Code direct SMS send: recipient={} txn={}", PiiMask.mask(phone), transactionId);

            ResponseEntity<Map> httpResponse = restTemplate.exchange(url, HttpMethod.POST,
                    new HttpEntity<>(requestBody, headers), Map.class);

            Map<?, ?> parsed = httpResponse.getBody();
            String statusCode = parsed != null && parsed.get("status_code") != null
                    ? String.valueOf(parsed.get("status_code")).trim()
                    : null;
            boolean accepted = "1000".equals(statusCode) || "1".equals(statusCode);
            if (!accepted) {
                log.warn("Source Code direct SMS rejected: txn={} status_code={} status_desc={}",
                        transactionId, statusCode, parsed != null ? parsed.get("status_desc") : null);
                return NovuClient.NovuResponse.builder().statusCode(502)
                        .response(sanitizeSourcecodeResponse(parsed)).build();
            }

            log.info("Source Code direct SMS accepted: txn={} messageId={}",
                    transactionId, parsed.get("message_id"));
            return NovuClient.NovuResponse.builder().statusCode(200)
                    .response(sanitizeSourcecodeResponse(parsed)).build();
        } catch (HttpStatusCodeException e) {
            // Mirror the Bongatech path: surface a non-2xx as a structured failure so the
            // pipeline's status-code gate persists FAILED with the real HTTP status rather
            // than a generic thrown-exception reason.
            log.warn("Source Code direct SMS failed: txn={} httpStatus={}", transactionId, e.getStatusCode().value());
            Map<String, Object> response = new HashMap<>();
            response.put("httpStatus", e.getStatusCode().value());
            return NovuClient.NovuResponse.builder().statusCode(e.getStatusCode().value()).response(response).build();
        } catch (Exception e) {
            log.error("Source Code direct SMS failed: txn={}", transactionId, e);
            throw new CustomException("NB_DIRECT_SMS_FAILED", "Failed sending direct SMS via Source Code: " + e.getMessage());
        }
    }

    /**
     * Source Code echoes the recipient back as a full unmasked {@code mobile_number}, and this map
     * is persisted verbatim into {@code nb_dispatch_log.provider_response}. The log deliberately
     * stores the subscriber id rather than a phone number in {@code recipient_value}, so passing
     * the raw MSISDN straight through would reintroduce exactly the PII that design avoids. Mask it
     * on the way in; every other field is kept as-is for diagnostics.
     */
    private static Map<String, Object> sanitizeSourcecodeResponse(Map<?, ?> parsed) {
        Map<String, Object> sanitized = toResponseMap(parsed);
        Object mobile = sanitized.get("mobile_number");
        if (mobile != null) {
            sanitized = new LinkedHashMap<>(sanitized);
            sanitized.put("mobile_number", PiiMask.mask(String.valueOf(mobile)));
        }
        return sanitized;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> toResponseMap(Map<?, ?> parsed) {
        return parsed != null ? (Map<String, Object>) parsed : new HashMap<>();
    }

    /** Send an email straight over SMTP via the auto-configured {@link JavaMailSender}. */
    public NovuClient.NovuResponse sendEmail(String to, String subject, String body, String transactionId) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(config.getDirectEmailFrom());
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);

            log.info("Direct SMTP email send: to={} txn={}", PiiMask.mask(to), transactionId);
            mailSender.send(message);

            Map<String, Object> response = new HashMap<>();
            response.put("transactionId", transactionId);
            return NovuClient.NovuResponse.builder().statusCode(200).response(response).build();
        } catch (MailException e) {
            log.error("Direct SMTP email failed: txn={}", transactionId, e);
            throw new CustomException("NB_DIRECT_EMAIL_FAILED", "Failed sending direct email via SMTP: " + e.getMessage());
        }
    }

    /** Ozeki's response is a trivial, non-nested shape — disallow DOCTYPEs (XXE hardening) and parse with the JDK's built-in DOM parser, no extra dependency needed. */
    private Document parseXml(String xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        DocumentBuilder builder = factory.newDocumentBuilder();
        return builder.parse(new InputSource(new StringReader(xml)));
    }

    private static String textOf(Document doc, String tag) {
        var nodes = doc.getElementsByTagName(tag);
        return nodes.getLength() == 0 ? null : nodes.item(0).getTextContent();
    }
}
