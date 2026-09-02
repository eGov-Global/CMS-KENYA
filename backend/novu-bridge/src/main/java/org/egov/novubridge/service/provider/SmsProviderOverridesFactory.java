package org.egov.novubridge.service.provider;

import org.egov.novubridge.config.NovuBridgeConfiguration;

import java.util.Map;

/**
 * Single switch point mapping the string value of {@code novu.bridge.sms.provider}
 * / {@code novu.bridge.otp.sms.provider} ("ozeki" or "bongatech") to the matching
 * Novu generic-sms overrides builder. Shared by {@code NovuClient} (PGR
 * pass-through SMS) and {@code DispatchPipelineService} (OTP) so both legs
 * resolve a provider name identically — adding a new provider means one more
 * {@code case} here, not a new {@code isXyzEnabled()} method per call site.
 */
public final class SmsProviderOverridesFactory {

    private SmsProviderOverridesFactory() {
    }

    /**
     * @return the overrides envelope for {@code provider}, or {@code null} when
     *         {@code provider} is blank or unrecognized — callers fall through
     *         to Novu's primary SMS integration (unchanged trigger, no overrides).
     */
    public static Map<String, Object> build(NovuBridgeConfiguration config, String provider,
                                            String transactionId, String toAddress, String text) {
        if (provider == null || provider.isBlank()) {
            return null;
        }
        switch (provider.trim().toLowerCase()) {
            case "ozeki":
                return OzekiOverridesBuilder.build(config.getSmsIntegrationIdentifier(), transactionId, toAddress, text);
            case "bongatech":
                return BongatechOverridesBuilder.build(config.getSmsIntegrationIdentifier(),
                        config.getSmsSenderId(), transactionId, toAddress, text);
            default:
                return null;
        }
    }
}
