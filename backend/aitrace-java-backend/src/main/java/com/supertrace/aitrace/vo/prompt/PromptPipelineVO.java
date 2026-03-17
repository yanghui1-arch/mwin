package com.supertrace.aitrace.vo.prompt;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Data;

import com.supertrace.aitrace.domain.core.prompt.PromptPipeline;
import com.supertrace.aitrace.domain.core.prompt.PromptPipelineStatus;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PromptPipelineVO {
    private UUID id;
    private Long projectId;
    private String name;
    private String description;
    private LocalDateTime createdAt;
    private PromptPipelineStatus status;
    private long promptCount;
    private long versionCount;

    public static PromptPipelineVO from(PromptPipeline pipeline, long promptCount, long versionCount) {
        return PromptPipelineVO.builder()
            .id(pipeline.getId())
            .projectId(pipeline.getProjectId())
            .name(pipeline.getName())
            .description(pipeline.getDescription())
            .createdAt(pipeline.getCreatedAt())
            .status(pipeline.getStatus())
            .promptCount(promptCount)
            .versionCount(versionCount)
            .build();
    }
}
