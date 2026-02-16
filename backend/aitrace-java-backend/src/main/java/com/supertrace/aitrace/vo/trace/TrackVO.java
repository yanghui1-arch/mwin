package com.supertrace.aitrace.vo.trace;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.supertrace.aitrace.domain.core.step.StepOutput;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class TrackVO {
    private UUID id;

    private UUID parentStepId;

    @NotNull
    private String name;

    @NotBlank
    private String type;

    @NotNull
    private List<String> tags;

    private Map<String, Object> input;

    private StepOutput output;

    private String errorInfo;

    private String model;

    private LLMUsage usage;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

}
