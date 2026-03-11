package com.supertrace.aitrace.dto.prompt;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
public class CreateOrUpdateStatusRequest {
    @NotNull
    private UUID promptPipelineId;

    @NotBlank
    private String status;

    @NotNull
    private UUID promptId;
}
