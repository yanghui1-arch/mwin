package com.supertrace.aitrace.vo.prompt;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PromptStatusVO {
    private UUID id;
    private UUID promptGroupId;
    private String status;
    private UUID promptId;
    private String version;
    private UUID deployedBy;
    private LocalDateTime deployedAt;
}
