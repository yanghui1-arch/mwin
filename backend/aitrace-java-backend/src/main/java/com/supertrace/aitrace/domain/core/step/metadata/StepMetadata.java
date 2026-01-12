package com.supertrace.aitrace.domain.core.step.metadata;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StepMetadata {
    private String description;
}
