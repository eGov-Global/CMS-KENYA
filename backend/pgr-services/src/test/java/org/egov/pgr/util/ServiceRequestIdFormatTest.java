package org.egov.pgr.util;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ServiceRequestIdFormatTest {

    @Test
    void stripsIdgenZeroPaddingFromTheSequence() {
        assertEquals("BNG-2026-125", ServiceRequestIdFormat.stripSequencePadding("BNG-2026-000125"));
    }

    @Test
    void keepsTheDatePartsOfTheFormatIntact() {
        assertEquals("PB-PGR-2026-01-05-7", ServiceRequestIdFormat.stripSequencePadding("PB-PGR-2026-01-05-000007"));
    }

    @Test
    void leavesAnUnpaddedSequenceAlone() {
        assertEquals("BNG-2026-125000", ServiceRequestIdFormat.stripSequencePadding("BNG-2026-125000"));
    }

    @Test
    void keepsOneDigitWhenTheSequenceIsAllZeros() {
        assertEquals("BNG-2026-0", ServiceRequestIdFormat.stripSequencePadding("BNG-2026-000000"));
    }

    @Test
    void leavesIdsWithoutANumericSequenceAlone() {
        assertEquals("BNG-2026-00A12", ServiceRequestIdFormat.stripSequencePadding("BNG-2026-00A12"));
        assertEquals("000125", ServiceRequestIdFormat.stripSequencePadding("000125"));
    }

    @Test
    void toleratesANullId() {
        assertEquals(null, ServiceRequestIdFormat.stripSequencePadding(null));
    }

    @Test
    void searchMatchesBothSpellingsWhateverTheUserTyped() {
        Set<String> fromUnpadded = ServiceRequestIdFormat.searchVariants("BNG-2026-125");
        Set<String> fromPadded = ServiceRequestIdFormat.searchVariants("BNG-2026-000125");

        assertEquals(Set.of("BNG-2026-125", "BNG-2026-000125"), fromUnpadded);
        assertEquals(Set.of("BNG-2026-125", "BNG-2026-000125"), fromPadded);
    }

    @Test
    void searchDoesNotPadASequenceThatIsAlreadyWideEnough() {
        assertEquals(Set.of("BNG-2026-1234567"), ServiceRequestIdFormat.searchVariants("BNG-2026-1234567"));
    }

    @Test
    void searchOnAnUnrecognisedIdFallsBackToAnExactMatch() {
        assertEquals(Set.of("not-an-id"), ServiceRequestIdFormat.searchVariants("not-an-id"));
    }

    @Test
    void searchDropsANullIdRatherThanQueryingForIt() {
        assertTrue(ServiceRequestIdFormat.searchVariants(null).isEmpty());
    }
}
