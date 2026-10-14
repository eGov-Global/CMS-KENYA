package org.egov.pgr.util;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * egov-idgen expands the [SEQ_*] placeholder with a hardcoded six-digit zero pad, so a format of
 * BNG-[cy:yyyy]-[SEQ_EG_CMSNAIROBI] yields BNG-2026-000125. Nairobi wants the bare sequence number,
 * which the format string cannot express - the padding is trimmed here instead.
 */
public final class ServiceRequestIdFormat {

    /** Trailing sequence segment: a leading run of zeros followed by the significant digits. */
    private static final Pattern PADDED_SEQUENCE = Pattern.compile("^(.*-)(0+)(\\d+)$");

    /** Width egov-idgen pads to, needed to reconstruct pre-cutover ids when searching. */
    private static final int IDGEN_SEQUENCE_WIDTH = 6;

    private ServiceRequestIdFormat() {
    }

    /**
     * Drops the zero padding from the trailing sequence segment, leaving ids whose last segment is
     * not a padded number untouched.
     */
    public static String stripSequencePadding(String serviceRequestId) {
        if (serviceRequestId == null)
            return null;

        Matcher matcher = PADDED_SEQUENCE.matcher(serviceRequestId);
        if (!matcher.matches())
            return serviceRequestId;

        return matcher.group(1) + matcher.group(3);
    }

    /**
     * Both spellings of a complaint number, so a search still resolves complaints filed before the
     * padding was dropped. The idgen sequence never repeats, so the padded and unpadded forms can
     * only ever name the same complaint.
     */
    public static Set<String> searchVariants(String serviceRequestId) {
        Set<String> variants = new LinkedHashSet<>();
        variants.add(serviceRequestId);

        String unpadded = stripSequencePadding(serviceRequestId);
        variants.add(unpadded);
        variants.add(padSequence(unpadded));

        variants.remove(null);
        return variants;
    }

    /** Re-applies the idgen padding, used only to match complaints created before the cutover. */
    private static String padSequence(String serviceRequestId) {
        if (serviceRequestId == null)
            return null;

        int separator = serviceRequestId.lastIndexOf('-');
        if (separator < 0 || separator == serviceRequestId.length() - 1)
            return serviceRequestId;

        String sequence = serviceRequestId.substring(separator + 1);
        if (!sequence.chars().allMatch(Character::isDigit) || sequence.length() >= IDGEN_SEQUENCE_WIDTH)
            return serviceRequestId;

        StringBuilder padded = new StringBuilder(serviceRequestId.substring(0, separator + 1));
        for (int i = sequence.length(); i < IDGEN_SEQUENCE_WIDTH; i++) {
            padded.append('0');
        }
        return padded.append(sequence).toString();
    }
}
