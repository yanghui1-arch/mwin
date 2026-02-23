package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.domain.LLMProvider;
import com.supertrace.aitrace.domain.core.step.metadata.StepMeta;
import com.supertrace.aitrace.domain.core.step.metadata.StepMetadata;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import com.supertrace.aitrace.repository.StepMetaRepository;
import com.supertrace.aitrace.service.domain.StepMetaService;
import com.supertrace.aitrace.utils.llm.UsageCostCalcUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StepMetaServiceImpl implements StepMetaService {
    private final StepMetaRepository stepMetaRepository;

     /**
     * Upsert step meta.
     *
     * <p>Because a step can be logged in two separate calls (e.g. once with input/llm data,
     * once with output/usage data), this method merges rather than overwrites:
     * <ul>
     *   <li><b>description</b> — updated only when the incoming value is non-null.</li>
     *   <li><b>cost</b> — updated only when the newly calculated cost is &gt; 0;
     *       a zero cost never overwrites a previously stored non-zero cost.</li>
     * </ul>
     *
     * <p>Cost resolution order for each call:
     * <ol>
     *   <li>Cost embedded in the usage object (e.g. OpenRouter returns it directly).</li>
     *   <li>Calculated via {@link UsageCostCalcUtils} using the configured pricing table.</li>
     *   <li>Zero when provider/model is unknown or usage is absent.</li>
     * </ol>
     *
     * @param stepId      step id
     * @param description step description; {@code null} leaves any existing value unchanged
     * @param provider    LLM provider string (must match a {@link LLMProvider} enum name); null is allowed
     * @param model       model name used in the step; null is allowed
     * @param llmUsage    token usage reported by the provider; null is allowed
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public StepMeta addStepMeta(UUID stepId, String description, String provider, String model, LLMUsage llmUsage) {
        LLMProvider resolvedProvider = LLMProvider.fromString(provider);

        BigDecimal newCost = Optional.ofNullable(llmUsage)
            .map(LLMUsage::getCost)
            .orElseGet(() -> UsageCostCalcUtils.calcUsageCost(resolvedProvider, model, llmUsage));

        StepMeta toSave = stepMetaRepository.findById(stepId)
            .map(existing -> {
                // Second call: merge — never regress description or cost with a weaker value
                String mergedDescription = description != null
                    ? description
                    : (existing.getMetadata() != null ? existing.getMetadata().getDescription() : null);

                BigDecimal mergedCost = newCost.compareTo(BigDecimal.ZERO) > 0
                    ? newCost
                    : existing.getCost();

                return StepMeta.builder()
                    .id(stepId)
                    .metadata(StepMetadata.builder().description(mergedDescription).build())
                    .cost(mergedCost)
                    .build();
            })
            .orElseGet(() -> StepMeta.builder()
                .id(stepId)
                .metadata(StepMetadata.builder().description(description).build())
                .cost(newCost)
                .build());

        return stepMetaRepository.save(toSave);
    }

    @Override
    public Map<UUID, BigDecimal> findCostsByStepIds(Collection<UUID> stepIds) {
        return stepMetaRepository.findAllById(stepIds)
            .stream()
            .collect(Collectors.toMap(StepMeta::getId, StepMeta::getCost));
    }
}
