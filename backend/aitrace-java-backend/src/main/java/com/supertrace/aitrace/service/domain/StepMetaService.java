package com.supertrace.aitrace.service.domain;

import com.supertrace.aitrace.domain.core.step.metadata.StepMetadata;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;

import java.util.UUID;

public interface StepMetaService {
    void addStepMeta(UUID stepId, StepMetadata stepMetadata, String provider, LLMUsage llmUsage);
}
