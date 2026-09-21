package org.egov.novubridge.service.provider;

import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Builds the Novu trigger {@code overrides} envelope that delivers an SMS
 * through <a href="https://bulk.bongatech.co.ke/docs/1.0/send-sms">Bongatech's
 * Bulk SMS API</a> behind Novu's built-in {@code generic-sms} provider — same
 * mechanism as {@link OzekiOverridesBuilder}, just with Bongatech's flat
 * {@code {sender, message, phone, correlator}} body shape instead of Ozeki's
 * {@code messages[]} array.
 *
 * <p>As with Ozeki, {@code _passthrough.body} is deep-merged into the
 * outgoing JSON with highest priority, so the request Bongatech actually
 * receives is exactly this map — no key-casing transform, no wrapping.
 */
public final class BongatechOverridesBuilder {

    /** Novu provider id backing the Bongatech integration — NOT "bongatech". */
    public static final String NOVU_PROVIDER_ID = "generic-sms";

    private BongatechOverridesBuilder() {
    }

    /**
     * @param integrationIdentifier identifier of the generic-sms Novu
     *                              integration pointing at Bongatech; blank =
     *                              omit (Novu falls back to the primary SMS
     *                              integration)
     * @param senderId              Bongatech sender id (registered short
     *                              code/name)
     * @param transactionId         echoed back as {@code correlator} — the
     *                              correlation key across nb_dispatch_log and
     *                              the Bongatech message store
     * @param toAddress             recipient phone number
     * @param text                  final localized message body
     */
    public static Map<String, Object> build(String integrationIdentifier, String senderId,
                                            String transactionId, String toAddress, String text) {
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("sender", senderId);
        message.put("message", text);
        message.put("phone", toAddress);
        message.put("correlator", transactionId);

        Map<String, Object> overrides = new LinkedHashMap<>();
        if (StringUtils.hasText(integrationIdentifier)) {
            overrides.put("sms", Map.of("integrationIdentifier", integrationIdentifier));
        }
        overrides.put("providers", Map.of(NOVU_PROVIDER_ID,
                Map.of("_passthrough", Map.of("body", message))));
        return overrides;
    }
}
