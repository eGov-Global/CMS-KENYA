package org.egov.novubridge.service.provider;

import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Builds the Novu trigger {@code overrides} envelope that delivers an SMS
 * through a <a href="https://docs.jasminsms.com/en/latest/apis/rest/index.html">Jasmin
 * SMS Gateway REST API</a> behind Novu's built-in {@code generic-sms} provider —
 * same mechanism as {@link OzekiOverridesBuilder} / {@link BongatechOverridesBuilder},
 * with Jasmin's flat {@code {to, from, content[, coding]}} body shape.
 *
 * <p>Why the REST API and not Jasmin's classic HTTP API (port 1401): generic-sms
 * POSTs JSON and reads the message id from a JSON path ({@code idPath}), while the
 * classic API takes query params and answers plain text. The REST API
 * ({@code POST /secure/send}, Basic auth, JSON in/out — reply
 * {@code {"data": "Success \"<id>\""}}) fits generic-sms as-is: integration
 * {@code baseUrl} = {@code http://jasmin-host:8080/secure/send},
 * {@code apiKeyRequestHeader} = {@code Authorization},
 * {@code apiKey} = {@code Basic base64(username:password)}, {@code idPath} = {@code data}.
 * {@code DirectDeliveryService#sendSmsViaJasmin} is the direct (Novu-less) leg and
 * talks to the classic API instead.
 *
 * <p>Shape constraints (same as Ozeki, verified against Novu v2.3.0):
 * <ul>
 *   <li>The provider-overrides key must be {@code generic-sms}; a key like
 *       {@code jasmin} would be silently ignored.</li>
 *   <li>{@code _passthrough.body} is deep-merged into the outgoing JSON with
 *       highest priority, so the request Jasmin receives is exactly this map.
 *       Credentials therefore can NOT travel in the body — they live in the
 *       integration's header config.</li>
 *   <li>Overrides are sent raw — Novu never templates them — so {@code text}
 *       must be the final pre-rendered body.</li>
 *   <li>{@code overrides.sms.integrationIdentifier} pins the (possibly
 *       non-primary) generic-sms integration, letting Jasmin coexist with e.g.
 *       a primary Twilio integration.</li>
 * </ul>
 */
public final class JasminOverridesBuilder {

    /** Novu provider id backing the Jasmin integration — NOT "jasmin". */
    public static final String NOVU_PROVIDER_ID = "generic-sms";

    /** Jasmin data_coding for UCS2 — required for any non-GSM-7 text or it arrives garbled. */
    static final String CODING_UCS2 = "8";

    private JasminOverridesBuilder() {
    }

    /**
     * @param integrationIdentifier identifier of the generic-sms Novu
     *                              integration pointing at Jasmin's REST API;
     *                              blank = omit (Novu falls back to the primary
     *                              SMS integration)
     * @param senderId              Jasmin {@code from} (source address / sender
     *                              id); blank = omitted so Jasmin's per-user
     *                              default source address applies
     * @param transactionId         accepted for symmetry with the other builders;
     *                              Jasmin's REST send has no client-correlation
     *                              field, so the join key is the message id in
     *                              its reply (Novu activity feed via idPath) —
     *                              intentionally NOT put in the body, Jasmin
     *                              rejects unknown parameters
     * @param toAddress             recipient phone number; normalised to bare
     *                              digits (Jasmin rejects a leading {@code +})
     * @param text                  final localized message body
     */
    public static Map<String, Object> build(String integrationIdentifier, String senderId,
                                            String transactionId, String toAddress, String text) {
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("to", digitsOnly(toAddress));
        if (StringUtils.hasText(senderId)) {
            message.put("from", senderId);
        }
        message.put("content", text);
        if (!isGsmSafe(text)) {
            message.put("coding", CODING_UCS2);
        }

        Map<String, Object> overrides = new LinkedHashMap<>();
        if (StringUtils.hasText(integrationIdentifier)) {
            overrides.put("sms", Map.of("integrationIdentifier", integrationIdentifier));
        }
        overrides.put("providers", Map.of(NOVU_PROVIDER_ID,
                Map.of("_passthrough", Map.of("body", message))));
        return overrides;
    }

    /** Jasmin wants the destination as bare digits, no leading {@code +} or separators. */
    static String digitsOnly(String phone) {
        return phone == null ? "" : phone.replaceAll("[^0-9]", "");
    }

    /** Conservative GSM-7 check: pure printable ASCII is always safe; anything else goes UCS2. */
    static boolean isGsmSafe(String text) {
        return text != null && text.chars().allMatch(c -> c >= 0x20 && c < 0x7F);
    }
}
