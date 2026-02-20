package com.supertrace.aitrace.utils;

public class ApiKeyUtils {

    public static String concealApiKey(String apiKey) {
        if (apiKey == null || apiKey.length() <= 32) {
            return apiKey;
        }

        int start = 6;
        int end = 32;

        StringBuilder sb = new StringBuilder(apiKey);
        for (int i = start; i <= end; i++) {
            sb.setCharAt(i, '*');
        }
        return sb.toString();
    }

    /**
     * Extract apikey from http request header
     *
     * @param authorizationHeader http request authorization header
     * @return api key
     */
    public static String extractApiKeyFromHttpHeader(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return authorizationHeader;
        }
        return authorizationHeader.substring("Bearer ".length());
    }
}
