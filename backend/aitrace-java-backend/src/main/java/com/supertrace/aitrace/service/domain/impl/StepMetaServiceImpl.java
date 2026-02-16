package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.domain.LLMProvider;
import com.supertrace.aitrace.domain.core.step.metadata.StepMeta;
import com.supertrace.aitrace.domain.core.step.metadata.StepMetadata;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import com.supertrace.aitrace.repository.StepMetaRepository;
import com.supertrace.aitrace.service.domain.StepMetaService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StepMetaServiceImpl implements StepMetaService {
    private final StepMetaRepository stepMetaRepository;

    /**
     * Add step meta in db
     * This function have to handle the condition of provider is null or invalid
     *
     * @param stepId step id.
     * @param stepMetadata step meta data.
     * @param provider llm provider which is used in the step.
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void addStepMeta(UUID stepId, StepMetadata stepMetadata, String provider, LLMUsage llmUsage) {
        // > llm provider is null -> null
        // > llm provider is not null but not in LLMProvider enum -> null but have to log (log is not implement now)
        // > llm provider is not null and in LLMProvider enum -> come in.
        String llmProvider = Optional.ofNullable(provider)
            .filter(
                s -> Arrays.stream(LLMProvider.values())
                    .anyMatch(e -> e.name().equals(s))
            )
            .orElse(null);

        StepMeta stepMeta = StepMeta.builder()
            .id(stepId)
            .metadata(stepMetadata)
            .cost(
                Optional.ofNullable(llmUsage)
                    .map(LLMUsage::getCost)
                    .orElse(BigDecimal.ZERO)
            )
            .build();
        stepMetaRepository.save(stepMeta);
    }
}
