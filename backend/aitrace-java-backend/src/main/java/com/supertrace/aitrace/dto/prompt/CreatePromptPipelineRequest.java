package com.supertrace.aitrace.dto.prompt;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
public class CreatePromptPipelineRequest {
    @NotNull
    private Long projectId;

    @NotBlank
    private String name;

    private String description;
}
