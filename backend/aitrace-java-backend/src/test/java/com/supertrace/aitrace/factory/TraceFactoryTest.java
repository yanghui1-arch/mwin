package com.supertrace.aitrace.factory;

import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.dto.trace.LogTraceRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class TraceFactoryTest {

    private TraceFactory factory;

    @BeforeEach
    void setUp() {
        factory = new TraceFactory();
    }

    private LogTraceRequest buildRequest() {
        LogTraceRequest req = new LogTraceRequest();
        req.setProjectName("my-project");
        req.setTraceId(UUID.randomUUID().toString());
        req.setTraceName("my-trace");
        req.setConversationId(UUID.randomUUID().toString());
        req.setTags(List.of("t1", "t2"));
        req.setInput(Map.of("prompt", "hello"));
        req.setOutput(Map.of("response", "world"));
        req.setErrorInfo(null);
        req.setStartTime(LocalDateTime.now().minusSeconds(10));
        req.setLastUpdateTimestamp(LocalDateTime.now());
        return req;
    }

    @Test
    void createTrace_allFieldsMappedCorrectly() {
        LogTraceRequest req = buildRequest();
        Long projectId = 42L;

        Trace trace = factory.createTrace(req, projectId);

        assertEquals(UUID.fromString(req.getTraceId()), trace.getId());
        assertEquals(req.getProjectName(), trace.getProjectName());
        assertEquals(projectId, trace.getProjectId());
        assertEquals(req.getTraceName(), trace.getName());
        assertEquals(UUID.fromString(req.getConversationId()), trace.getConversationId());
        assertEquals(req.getTags(), trace.getTags());
        assertEquals(req.getInput(), trace.getInput());
        assertEquals(req.getOutput(), trace.getOutput());
        assertNull(trace.getErrorInfo());
        assertEquals(req.getStartTime(), trace.getStartTime());
        assertEquals(req.getLastUpdateTimestamp(), trace.getLastUpdateTimestamp());
    }

    @Test
    void createTrace_invalidTraceId_throwsException() {
        LogTraceRequest req = buildRequest();
        req.setTraceId("not-a-uuid");

        assertThrows(IllegalArgumentException.class, () -> factory.createTrace(req, 1L));
    }

    @Test
    void createTrace_invalidConversationId_throwsException() {
        LogTraceRequest req = buildRequest();
        req.setConversationId("bad");

        assertThrows(IllegalArgumentException.class, () -> factory.createTrace(req, 1L));
    }

    @Test
    void createTrace_differentProjectIds_assignedCorrectly() {
        LogTraceRequest req = buildRequest();

        Trace t1 = factory.createTrace(req, 10L);
        Trace t2 = factory.createTrace(req, 20L);

        assertEquals(10L, t1.getProjectId());
        assertEquals(20L, t2.getProjectId());
    }
}
