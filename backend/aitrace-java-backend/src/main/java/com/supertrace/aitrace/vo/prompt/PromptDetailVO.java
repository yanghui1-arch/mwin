package com.supertrace.aitrace.vo.prompt;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Data;

import com.supertrace.aitrace.domain.core.prompt.ModelConfig;
import com.supertrace.aitrace.domain.core.prompt.Prompt;
import java.time.LocalDateTime;

@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PromptDetailVO {
    private String name;
    private String version;
    private String content;
    private ModelConfig modelConfig;
    private LocalDateTime createdAt;
    private String status;
    private String description;
    private PromptMetricsVO metrics;


    public static PromptDetailVO from(Prompt p, PromptMetricsVO metrics) {
        return PromptDetailVO.builder()
            .version(p.getVersion())
            .content(p.getContent())
            .modelConfig(p.getModelConfig())
            .createdAt(p.getCreatedAt())
            .status(p.getStatus())
            .name(p.getName())
            .description(p.getDescription())
            .metrics(metrics)
            .build();
    }
}
