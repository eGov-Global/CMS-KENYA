package org.egov.novubridge.service.provider;

import org.egov.novubridge.config.NovuBridgeConfiguration;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Coverage of the single provider-name switch shared by NovuClient (PGR pass-through)
 * and DispatchPipelineService (OTP): "ozeki"/"bongatech" resolve to their matching
 * generic-sms overrides envelope; anything else (blank, null, unknown) falls through
 * to Novu's primary SMS integration (no overrides).
 */
class SmsProviderOverridesFactoryTest {

    @SuppressWarnings("unchecked")
    @Test
    void ozeki_buildsMessagesArrayEnvelope() {
        NovuBridgeConfiguration config = new NovuBridgeConfiguration();
        config.setSmsIntegrationIdentifier("ozeki-sms");

        Map<String, Object> overrides = SmsProviderOverridesFactory.build(
                config, "ozeki", "txn-1", "+254712345678", "Hello");

        Map<String, Object> providers = (Map<String, Object>) overrides.get("providers");
        Map<String, Object> genericSms = (Map<String, Object>) providers.get("generic-sms");
        Map<String, Object> passthrough = (Map<String, Object>) genericSms.get("_passthrough");
        Map<String, Object> body = (Map<String, Object>) passthrough.get("body");
        var messages = (java.util.List<Map<String, Object>>) body.get("messages");

        assertEquals("ozeki-sms", ((Map<String, Object>) overrides.get("sms")).get("integrationIdentifier"));
        assertEquals("txn-1", messages.get(0).get("message_id"));
        assertEquals("+254712345678", messages.get(0).get("to_address"));
        assertEquals("Hello", messages.get(0).get("text"));
    }

    @SuppressWarnings("unchecked")
    @Test
    void bongatech_buildsFlatBodyEnvelope() {
        NovuBridgeConfiguration config = new NovuBridgeConfiguration();
        config.setSmsIntegrationIdentifier("bongatech-sms");
        config.setSmsSenderId("CMS-MOZ");

        Map<String, Object> overrides = SmsProviderOverridesFactory.build(
                config, "BONGATECH", "txn-2", "+254712345678", "Hello");

        Map<String, Object> providers = (Map<String, Object>) overrides.get("providers");
        Map<String, Object> genericSms = (Map<String, Object>) providers.get("generic-sms");
        Map<String, Object> passthrough = (Map<String, Object>) genericSms.get("_passthrough");
        Map<String, Object> body = (Map<String, Object>) passthrough.get("body");

        assertEquals("bongatech-sms", ((Map<String, Object>) overrides.get("sms")).get("integrationIdentifier"));
        assertEquals("CMS-MOZ", body.get("sender"));
        assertEquals("Hello", body.get("message"));
        assertEquals("+254712345678", body.get("phone"));
        assertEquals("txn-2", body.get("correlator"));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> passthroughBody(Map<String, Object> overrides) {
        Map<String, Object> providers = (Map<String, Object>) overrides.get("providers");
        Map<String, Object> genericSms = (Map<String, Object>) providers.get("generic-sms");
        Map<String, Object> passthrough = (Map<String, Object>) genericSms.get("_passthrough");
        return (Map<String, Object>) passthrough.get("body");
    }

    @SuppressWarnings("unchecked")
    @Test
    void jasmin_buildsRestApiBodyEnvelope_bareDigitsRecipient() {
        NovuBridgeConfiguration config = new NovuBridgeConfiguration();
        config.setSmsIntegrationIdentifier("jasmin-sms");
        config.setSmsSenderId("CMS-KE");

        Map<String, Object> overrides = SmsProviderOverridesFactory.build(
                config, "jasmin", "txn-4", "+254 712-345678", "Hello");

        Map<String, Object> body = passthroughBody(overrides);
        assertEquals("jasmin-sms", ((Map<String, Object>) overrides.get("sms")).get("integrationIdentifier"));
        assertEquals("254712345678", body.get("to"), "Jasmin rejects a leading '+'");
        assertEquals("CMS-KE", body.get("from"));
        assertEquals("Hello", body.get("content"));
        assertNull(body.get("coding"), "plain ASCII must not be flagged UCS2");
        assertNull(body.get("correlator"), "Jasmin has no correlation field — unknown params are rejected");
    }

    @Test
    void jasmin_nonGsmText_setsUcs2Coding() {
        NovuBridgeConfiguration config = new NovuBridgeConfiguration();
        config.setSmsSenderId("CMS-KE");

        Map<String, Object> overrides = SmsProviderOverridesFactory.build(
                config, "JASMIN", "txn-5", "+254712345678", "Olá — água já disponível");

        assertEquals("8", passthroughBody(overrides).get("coding"));
    }

    @Test
    void jasmin_blankSenderAndIdentifier_omitsFromAndIntegrationPin() {
        NovuBridgeConfiguration config = new NovuBridgeConfiguration();

        Map<String, Object> overrides = SmsProviderOverridesFactory.build(
                config, "jasmin", "txn-6", "+254712345678", "Hello");

        assertNull(overrides.get("sms"), "no identifier → let Novu use the primary SMS integration");
        assertNull(passthroughBody(overrides).get("from"), "no sender id → Jasmin's per-user default source address");
    }

    @Test
    void blankOrUnknownProvider_returnsNull() {
        NovuBridgeConfiguration config = new NovuBridgeConfiguration();

        assertNull(SmsProviderOverridesFactory.build(config, null, "txn-3", "+254712345678", "Hello"));
        assertNull(SmsProviderOverridesFactory.build(config, "", "txn-3", "+254712345678", "Hello"));
        assertNull(SmsProviderOverridesFactory.build(config, "twilio", "txn-3", "+254712345678", "Hello"));
    }
}
