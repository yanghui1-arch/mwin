package com.supertrace.aitrace.dto.prompt;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import com.supertrace.aitrace.domain.core.prompt.ModelConfig;
import java.util.UUID;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
public class CreatePromptRequest {
    @NotNull
    private UUID promptPipelineId;

    @NotBlank
    private String version;

    @NotNull
    private String content;

    private ModelConfig modelConfig;

}
