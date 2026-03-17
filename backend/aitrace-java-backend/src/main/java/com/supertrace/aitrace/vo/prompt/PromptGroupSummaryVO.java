package com.supertrace.aitrace.vo.prompt;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.supertrace.aitrace.domain.core.prompt.Prompt;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Lightweight summary of a named prompt and its versions — no content or metrics. */
@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PromptGroupSummaryVO {

    private String name;
    private List<VersionSummary> versions;

    @Data
    @Builder
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class VersionSummary {
        private UUID id;
        private String version;
        private String status;
        private LocalDateTime createdAt;

        public static VersionSummary from(Prompt p) {
            return VersionSummary.builder()
                .id(p.getId())
                .version(p.getVersion())
                .status(p.getStatus())
                .createdAt(p.getCreatedAt())
                .build();
        }
    }

    public static PromptGroupSummaryVO from(String name, List<Prompt> prompts) {
        return PromptGroupSummaryVO.builder()
            .name(name)
            .versions(prompts.stream().map(VersionSummary::from).toList())
            .build();
    }
}
