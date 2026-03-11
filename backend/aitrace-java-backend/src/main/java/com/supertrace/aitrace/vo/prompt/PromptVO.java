package com.supertrace.aitrace.vo.prompt;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Data;

import com.supertrace.aitrace.domain.core.prompt.ModelConfig;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PromptVO {
    private UUID id;
    private UUID promptGroupId;
    private String version;
    private String content;
    private ModelConfig modelConfig;
    private UUID createdBy;
    private LocalDateTime createdAt;
}
