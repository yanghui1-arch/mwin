package com.supertrace.aitrace.vo.prompt;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Data;

import com.supertrace.aitrace.domain.core.prompt.ModelConfig;
import com.supertrace.aitrace.domain.core.prompt.Prompt;
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

    public static PromptVO from(Prompt p) {
        return PromptVO.builder()
            .id(p.getId())
            .promptGroupId(p.getPromptGroupId())
            .version(p.getVersion())
            .content(p.getContent())
            .modelConfig(p.getModelConfig())
            .createdBy(p.getCreatedBy())
            .createdAt(p.getCreatedAt())
            .build();
    }
}
