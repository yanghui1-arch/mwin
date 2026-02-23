package com.supertrace.aitrace.service.domain;

import com.supertrace.aitrace.domain.core.step.metadata.StepMeta;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;

public interface StepMetaService {
    StepMeta addStepMeta(UUID stepId, String description, String provider, String model, LLMUsage llmUsage);

    Map<UUID, BigDecimal> findCostsByStepIds(Collection<UUID> stepIds);
}
