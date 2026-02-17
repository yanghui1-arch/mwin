package com.supertrace.aitrace.dto.step;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.supertrace.aitrace.domain.core.step.StepOutput;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import com.supertrace.aitrace.domain.core.usage.OpenRouterUsage;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
public class LogStepRequest {
    @NotNull
    private String projectName;

    @NotNull
    private String stepName;

    @NotNull
    private String stepId;

    @NotNull
    private String traceId;

    private String parentStepId;

    @NotNull
    @Pattern(regexp = "customized|llm_response|retrieve|tool",
            message = "step type must be one of `customized`, `llm_response`, `retrieve` and tool.")
    private String stepType;

    @NotNull
    private List<String> tags;

    private Map<String, Object> input;

    private StepOutput output;

    private String errorInfo;

    private String model;

    private String llmProvider;

    @JsonTypeInfo(
        use = JsonTypeInfo.Id.NAME,
        include = JsonTypeInfo.As.EXTERNAL_PROPERTY,
        property = "llm_provider",
        defaultImpl = LLMUsage.class,
        visible = true
    )
    @JsonSubTypes({
        @JsonSubTypes.Type(value = LLMUsage.class, names = "openai"),
        @JsonSubTypes.Type(value = OpenRouterUsage.class, name = "open_router"),
    })
    private LLMUsage usage;

    @NotNull
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss[.SSSSSS]")
    private LocalDateTime startTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss[.SSSSSS]")
    private LocalDateTime endTime;

    private String description;
}
