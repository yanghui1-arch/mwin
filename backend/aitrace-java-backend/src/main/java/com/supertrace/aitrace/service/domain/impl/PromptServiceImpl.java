package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.domain.core.prompt.Prompt;
import com.supertrace.aitrace.domain.core.prompt.PromptPipeline;
import com.supertrace.aitrace.domain.core.prompt.PromptPipelineStatus;
import com.supertrace.aitrace.domain.core.prompt.PromptRef;
import com.supertrace.aitrace.domain.core.prompt.PromptStatus;
import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.domain.core.step.metadata.StepMeta;
import com.supertrace.aitrace.dto.prompt.CreatePromptPipelineRequest;
import com.supertrace.aitrace.dto.prompt.CreatePromptRequest;
import com.supertrace.aitrace.repository.EvalMetricRepository;
import com.supertrace.aitrace.repository.EvalScoreRepository;
import com.supertrace.aitrace.repository.PromptPipelineRepository;
import com.supertrace.aitrace.repository.PromptRepository;
import com.supertrace.aitrace.repository.PromptStatusRepository;
import com.supertrace.aitrace.repository.StepMetaRepository;
import com.supertrace.aitrace.repository.StepRefRepository;
import com.supertrace.aitrace.repository.StepRepository;
import com.supertrace.aitrace.domain.core.prompt.PromptMetrics;
import com.supertrace.aitrace.service.domain.PromptService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PromptServiceImpl implements PromptService {

    private final PromptPipelineRepository promptPipelineRepository;
    private final PromptRepository promptRepository;
    private final PromptStatusRepository promptStatusRepository;
    private final StepRefRepository stepRefRepository;
    private final StepRepository stepRepository;
    private final StepMetaRepository stepMetaRepository;
    private final EvalMetricRepository evalMetricRepository;
    private final EvalScoreRepository evalScoreRepository;

    @Override
    public UUID createPromptPipeline(CreatePromptPipelineRequest request, UUID userId) {
        PromptPipeline pipeline = PromptPipeline.builder()
            .projectId(request.getProjectId())
            .name(request.getName())
            .description(request.getDescription())
            .build();
        return promptPipelineRepository.save(pipeline).getId();
    }

    @Override
    public List<PromptPipeline> listPromptPipelines(Long projectId) {
        return promptPipelineRepository.findByProjectId(projectId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deletePromptPipeline(UUID promptPipelineId) {
        promptStatusRepository.deleteByPromptPipelineId(promptPipelineId);
        promptRepository.deleteByPromptPipelineId(promptPipelineId);
        promptPipelineRepository.deleteById(promptPipelineId);
    }

    @Override
    public UUID createPrompt(CreatePromptRequest request, UUID userId) {
        Prompt prompt = Prompt.builder()
            .promptPipelineId(request.getPromptPipelineId())
            .version(request.getVersion())
            .content(request.getContent())
            .modelConfig(request.getModelConfig())
            .createdBy(userId)
            .name(request.getName())
            .description(request.getDescription())
            .changelog(request.getChangelog())
            .build();
        return promptRepository.save(prompt).getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PromptRef findOrCreatePrompt(Long projectId, @NotNull String promptPipelineName, String promptName, @NotNull String version, @NotNull String content) {
        PromptPipeline pipeline = promptPipelineRepository.findByProjectIdAndName(projectId, promptPipelineName)
            .orElseGet(() -> promptPipelineRepository.save(
                PromptPipeline.builder()
                    .projectId(projectId)
                    .name(promptPipelineName)
                    .build()
            ));

        String finalPromptName = promptName == null || promptName.isEmpty() ? "Default-" + version : promptName;
        String promptVersion = promptRepository.findByPromptPipelineIdAndVersion(pipeline.getId(), version)
            .map(Prompt::getVersion)
            .orElseGet(
                () -> promptRepository.save(
                    Prompt.builder()
                        .promptPipelineId(pipeline.getId())
                        .version(version)
                        .content(content)
                        .name(finalPromptName)
                        .build()
                ).getVersion()
            );

        return new PromptRef(pipeline.getId(), promptVersion);
    }

    @Override
    public Optional<Prompt> findPromptById(UUID promptId) {
        return promptRepository.findById(promptId);
    }

    @Override
    public List<Prompt> listPrompts(UUID promptPipelineId) {
        return promptRepository.findByPromptPipelineIdOrderByCreatedAtDesc(promptPipelineId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Prompt updatePromptStatus(UUID promptId, String status) {
        Prompt prompt = promptRepository.findById(promptId)
            .orElseThrow(() -> new NoSuchElementException("Prompt not found: " + promptId));
        if ("current".equals(status)) {
            // 1. Get the prompt name of this promptId belongs to
            // 2. Get all prompts of this prompt name
            // 3. Traverse the prompts and check whether prompt is set current. If exist current prompt, set it as active.
            // 4. Set the promptId status as current
            String promptName = prompt.getName();
            List<Prompt> sameNamePrompts = promptRepository.findByPromptPipelineIdAndName(prompt.getPromptPipelineId(), promptName);
            sameNamePrompts.stream()
                .filter(p -> "current".equals(p.getStatus()) && !p.getId().equals(promptId))
                .forEach(p -> {
                    p.setStatus("active");
                    promptRepository.save(p);
                });
        }
        prompt.setStatus(status);
        return promptRepository.save(prompt);
    }


    @Override
    public List<PromptStatus> listStatuses(UUID promptPipelineId) {
        return promptStatusRepository.findByPromptPipelineId(promptPipelineId);
    }


    @Override
    public void updatePipelineStatus(UUID pipelineId, String status) {
        PromptPipeline pipeline = promptPipelineRepository.findById(pipelineId)
            .orElseThrow(() -> new NoSuchElementException("Prompt pipeline not found: " + pipelineId));
        pipeline.setStatus(PromptPipelineStatus.fromValue(status));
        promptPipelineRepository.save(pipeline);
    }

    // ── Counts ────────────────────────────────────────────────────────────────────

    @Override
    public Map<UUID, long[]> countPromptsByPipelines(List<UUID> pipelineIds) {
        if (pipelineIds.isEmpty()) return Map.of();
        return promptRepository.findCountsByPipelineIds(pipelineIds).stream()
            .collect(Collectors.toMap(
                PromptRepository.PipelineCounts::getPipelineId,
                c -> new long[]{c.getPromptCount(), c.getVersionCount()}
            ));
    }


    @Override
    public PromptMetrics buildMetric(@NotNull Prompt prompt) {

        String version = prompt.getVersion();

        // step_ref: version → step IDs
        List<UUID> stepIds = this.stepRefRepository.findIdsByPromptVersion(version);
        Set<UUID> allStepIds = new HashSet<>(stepIds);
        if (allStepIds.isEmpty()) return PromptMetrics.empty();

        // step: latency + token counts
        List<Step> steps = this.stepRepository.findAllById(allStepIds);

        // step_meta: cost
        List<StepMeta> stepMetas = stepMetaRepository.findAllById(allStepIds);

        // eval_score: success rate by step_id (more reliable than prompt_version_id)
        List<Double> successScoreList = fetchSuccessRateByStep(allStepIds);
        return this.computeMetrics(steps, stepMetas, successScoreList);
    }

    private List<Double> fetchSuccessRateByStep(Set<UUID> stepIds) {
        return evalMetricRepository.findByName("Success Rate")
            .map(metric -> evalScoreRepository
                .findByStepIdInAndEvalMetricId(List.copyOf(stepIds), metric.getId())
                .stream()
                .filter(s -> s.getStepId() != null)
                .map(s -> s.getScore().doubleValue())
                .toList()
            ).orElse(List.of());
    }

    private PromptMetrics computeMetrics(
        List<Step> steps,
        List<StepMeta> stepMetas,
        List<Double> successScoreList
    ) {
        List<Step> completedSteps = steps.stream()
            .filter(s -> s != null && s.getEndTime() != null)
            .toList();

        double avgLatencyMs = completedSteps.stream()
            .mapToLong(s -> Duration.between(s.getStartTime(), s.getEndTime()).toMillis())
            .average().orElse(0.0);

        double totalCost = stepMetas.stream()
            .filter(m -> m != null && m.getCost() != null)
            .mapToDouble(m -> m.getCost().doubleValue())
            .sum();

        long totalTokens = completedSteps.stream()
            .filter(s -> s.getUsage() != null && s.getUsage().getTotalTokens() != null)
            .mapToLong(s -> s.getUsage().getTotalTokens())
            .sum();

        double successRate = successScoreList.stream()
            .filter(Objects::nonNull)
            .mapToDouble(Double::doubleValue)
            .average().orElse(0.0) * 100.0; // score 1.0 = 100%

        return PromptMetrics.builder()
            .usageCount(completedSteps.size())
            .avgLatencyMs(avgLatencyMs)
            .tokenCostPer1k(totalTokens > 0 ? totalCost * 1000.0 / totalTokens : 0.0)
            .successRate(successRate)
            .build();
    }

}
