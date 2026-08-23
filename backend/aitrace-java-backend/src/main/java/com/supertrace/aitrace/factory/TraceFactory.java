package com.supertrace.aitrace.factory;

import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.dto.trace.LogTraceRequest;
import jakarta.validation.constraints.NotNull;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class TraceFactory {
    /**
     * Create a trace
     * @param logTraceRequest log trace request
     * @param projectId project id which trace belongs to
     * @return a new trace
     */
    public Trace createTrace(
        LogTraceRequest logTraceRequest,
        @NotNull Long projectId,
        String payloadObjectKey
    ) {
        return Trace.builder()
            .id(UUID.fromString(logTraceRequest.getTraceId()))
            .parentTraceId(logTraceRequest.getParentTraceId() == null
                ? null
                : UUID.fromString(logTraceRequest.getParentTraceId()))
            .projectName(logTraceRequest.getProjectName())
            .projectId(projectId)
            .name(logTraceRequest.getTraceName())
            .conversationId(UUID.fromString(logTraceRequest.getConversationId()))
            .tags(logTraceRequest.getTags())
            .payloadObjectKey(payloadObjectKey)
            .errorInfo(logTraceRequest.getErrorInfo())
            .startTime(logTraceRequest.getStartTime())
            .lastUpdateTimestamp(logTraceRequest.getLastUpdateTimestamp())
            .build();
    }
}
