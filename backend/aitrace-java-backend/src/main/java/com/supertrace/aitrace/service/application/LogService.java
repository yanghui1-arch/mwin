package com.supertrace.aitrace.service.application;

import com.supertrace.aitrace.dto.step.LogStepRequest;
import com.supertrace.aitrace.dto.trace.LogTraceRequest;
import com.supertrace.aitrace.dto.log.LogTraceTreeRequest;
import com.supertrace.aitrace.dto.log.LogTraceTreeResponse;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public interface LogService {
    UUID logStep(@NotNull UUID userId, @NotNull LogStepRequest logStepRequest);

    UUID logTrace(@NotNull UUID userId, @NotNull LogTraceRequest logTraceRequest);

    LogTraceTreeResponse logTraceTree(
        @NotNull UUID userId,
        @NotNull LogTraceTreeRequest request
    );
}
