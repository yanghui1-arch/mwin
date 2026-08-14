package com.supertrace.aitrace.dto.log;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.supertrace.aitrace.dto.step.LogStepRequest;
import com.supertrace.aitrace.dto.trace.LogTraceRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
public class LogTraceTreeRequest {
    @Valid
    @NotNull
    private List<LogTraceRequest> traces;

    @Valid
    @NotNull
    private List<LogStepRequest> steps;
}
