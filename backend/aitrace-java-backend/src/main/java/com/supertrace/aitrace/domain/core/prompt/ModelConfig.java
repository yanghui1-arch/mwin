package com.supertrace.aitrace.domain.core.prompt;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ModelConfig {
    private String model;

    @Builder.Default
    private Double temperature = 1.0;

    private Integer topK;

    private Double topP;
}
