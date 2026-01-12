package com.supertrace.aitrace.service.domain;

import com.supertrace.aitrace.domain.core.step.metadata.StepMetadata;

import java.util.UUID;

public interface StepMetaService {
    void addStepMeta(UUID stepId, StepMetadata stepMetadata);
}
