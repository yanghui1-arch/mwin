package com.supertrace.aitrace.utils;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ApiKeyUtilsTest {

    // ──────────────────────────────────────────────────────────────────────────
    // concealApiKey
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    void concealApiKey_nullInput_returnsNull() {
        assertNull(ApiKeyUtils.concealApiKey(null));
    }

    @Test
    void concealApiKey_emptyString_returnsEmptyString() {
        assertEquals("", ApiKeyUtils.concealApiKey(""));
    }

    @Test
    void concealApiKey_sixCharsOrLess_returnsUnchanged() {
        // boundary: exactly 6 characters → no concealment
        assertEquals("at-123", ApiKeyUtils.concealApiKey("at-123"));
        assertEquals("ab", ApiKeyUtils.concealApiKey("ab"));
    }

    @Test
    void concealApiKey_normalKey_concealsPositions6Through32() {
        // A real API key: "at-" (3) + 32-char uuid-without-hyphens = 35 chars total.
        // Concealment covers index 6..32 inclusive (27 stars).
        // "at-" (3) + a-z (26) + "123456" (6) = 35 chars.
        String key = "at-abcdefghijklmnopqrstuvwxyz123456";  // length 35
        assertEquals(35, key.length(), "Test setup: key must be 35 chars");
        String concealed = ApiKeyUtils.concealApiKey(key);

        // First 6 chars must remain intact
        assertEquals("at-abc", concealed.substring(0, 6));

        // Positions 6–32 must be '*'
        for (int i = 6; i <= 32; i++) {
            assertEquals('*', concealed.charAt(i), "Position " + i + " must be '*'");
        }

        // Characters after position 32 (indices 33, 34) must remain intact → "56"
        assertEquals("56", concealed.substring(33));
    }

    @Test
    void concealApiKey_keyLengthExactly32_doesNotThrowArrayIndexOutOfBounds() {
        // Pass a 32 size string to conceal
        String key = "at-abcdefghijklmnopqrstuvwxyz012"; // length 32
        assertEquals(32, key.length(), "Test setup: key must be 32 chars");
        assertDoesNotThrow(() -> ApiKeyUtils.concealApiKey(key));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // extractApiKeyFromHttpHeader
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    void extractApiKey_nullHeader_returnsNull() {
        assertNull(ApiKeyUtils.extractApiKeyFromHttpHeader(null));
    }

    @Test
    void extractApiKey_noBearerPrefix_returnsHeaderAsIs() {
        String header = "at-someapikey";
        assertEquals(header, ApiKeyUtils.extractApiKeyFromHttpHeader(header));
    }

    @Test
    void extractApiKey_withBearerPrefix_stripsPrefix() {
        String apiKey = "at-someapikey123456";
        String header = "Bearer " + apiKey;
        assertEquals(apiKey, ApiKeyUtils.extractApiKeyFromHttpHeader(header));
    }

    @Test
    void extractApiKey_bearerPrefixOnly_returnsEmptyString() {
        // "Bearer " is exactly the prefix – the remaining part is ""
        assertEquals("", ApiKeyUtils.extractApiKeyFromHttpHeader("Bearer "));
    }

    @Test
    void extractApiKey_lowercaseBearer_isNotRecognised() {
        // The implementation checks for "Bearer " (capital B) only
        String header = "bearer at-somekey";
        assertEquals(header, ApiKeyUtils.extractApiKeyFromHttpHeader(header));
    }
}
