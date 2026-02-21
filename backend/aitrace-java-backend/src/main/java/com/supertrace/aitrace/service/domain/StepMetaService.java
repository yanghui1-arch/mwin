package com.supertrace.aitrace.service.domain;

import com.supertrace.aitrace.domain.core.usage.LLMUsage;

import java.util.UUID;

public interface StepMetaService {
    void addStepMeta(UUID stepId, String description, String provider, String model, LLMUsage llmUsage);
}
