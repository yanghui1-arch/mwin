package com.supertrace.aitrace.vo.prompt;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PromptResolveVO {
    private UUID promptId;

    public static PromptResolveVO from(UUID promptId) {
        return PromptResolveVO.builder().promptId(promptId).build();
    }
}
