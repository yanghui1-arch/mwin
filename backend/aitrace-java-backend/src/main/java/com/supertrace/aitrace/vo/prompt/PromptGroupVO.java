package com.supertrace.aitrace.vo.prompt;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Data;

import com.supertrace.aitrace.domain.core.prompt.PromptGroup;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PromptGroupVO {
    private UUID id;
    private Long projectId;
    private String name;
    private String description;
    private LocalDateTime createdAt;
    private long versionCount;
    private List<PromptStatusVO> statuses;

    public static PromptGroupVO from(PromptGroup group, long versionCount, List<PromptStatusVO> statuses) {
        return PromptGroupVO.builder()
            .id(group.getId())
            .projectId(group.getProjectId())
            .name(group.getName())
            .description(group.getDescription())
            .createdAt(group.getCreatedAt())
            .versionCount(versionCount)
            .statuses(statuses)
            .build();
    }
}
