package com.supertrace.aitrace.response;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class APIResponseTest {

    @Test
    void success_withData_returns200AndDefaultMessage() {
        APIResponse<String> response = APIResponse.success("hello");
        assertEquals(200, response.getCode());
        assertEquals("Response successfully", response.getMessage());
        assertEquals("hello", response.getData());
    }

    @Test
    void success_withNullData_stillReturns200() {
        APIResponse<Object> response = APIResponse.success(null);
        assertEquals(200, response.getCode());
        assertNull(response.getData());
    }

    @Test
    void success_withCustomMessage_usesProvidedMessage() {
        APIResponse<Integer> response = APIResponse.success(42, "Custom OK");
        assertEquals(200, response.getCode());
        assertEquals("Custom OK", response.getMessage());
        assertEquals(42, response.getData());
    }

    @Test
    void error_returns400WithNullData() {
        APIResponse<Object> response = APIResponse.error("Something went wrong");
        assertEquals(400, response.getCode());
        assertEquals("Something went wrong", response.getMessage());
        assertNull(response.getData());
    }

    @Test
    void notFound_returns404WithNullData() {
        APIResponse<Object> response = APIResponse.notFound("Resource not found");
        assertEquals(404, response.getCode());
        assertEquals("Resource not found", response.getMessage());
        assertNull(response.getData());
    }

    @Test
    void responses_areIndependent_noSharedState() {
        APIResponse<String> r1 = APIResponse.success("a");
        APIResponse<String> r2 = APIResponse.error("b");

        assertEquals(200, r1.getCode());
        assertEquals(400, r2.getCode());
        assertEquals("a", r1.getData());
        assertNull(r2.getData());
    }
}
