package com.supertrace.aitrace.vo.prompt;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Data;

import com.supertrace.aitrace.domain.core.prompt.PromptPipeline;
import java.time.LocalDateTime;
import java.util.List;
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
    private long versionCount;
    private List<PromptStatusVO> statuses;

    public static PromptPipelineVO from(PromptPipeline pipeline, long versionCount, List<PromptStatusVO> statuses) {
        return PromptPipelineVO.builder()
            .id(pipeline.getId())
            .projectId(pipeline.getProjectId())
            .name(pipeline.getName())
            .description(pipeline.getDescription())
            .createdAt(pipeline.getCreatedAt())
            .versionCount(versionCount)
            .statuses(statuses)
            .build();
    }
}
