package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.domain.core.step.StepRef;
import com.supertrace.aitrace.domain.event.StepLoggedEvent;
import com.supertrace.aitrace.dto.step.LogStepRequest;
import com.supertrace.aitrace.factory.StepFactory;
import com.supertrace.aitrace.repository.StepRefRepository;
import com.supertrace.aitrace.repository.StepRepository;
import com.supertrace.aitrace.service.domain.StepService;
import com.supertrace.aitrace.domain.core.prompt.PromptRef;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class StepServiceImpl implements StepService {

    private final StepRepository stepRepository;
    private final StepRefRepository stepRefRepository;
    private final StepFactory stepFactory;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Validate request and persist step.
     * Two conditions to call this function. One is general another is llm calling.
     * If promptRef is not Null generally it means that it's in the second condition. If it's Null, maybe it's the first condition or the second.
     * Because the second condition sometimes not need system prompt OR user doesn't want to track system prompt or doesn't know how to track it.
     *
     * @param userId user uuid
     * @param logStepRequest log step request
     * @param projectId project id which step belongs to. Must ensure the project id exists and belongs to user uuid.
     * @param promptRef resolved prompt group id and prompt version id. It can be Null.
     * @return step id
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public UUID logStep(@NotNull UUID userId, @NotNull LogStepRequest logStepRequest, @NotNull Long projectId, PromptRef promptRef) {
        Step newStep;
        boolean shouldEval = logStepRequest.getOutput().getLlmOutputs() != null;
        // 1. merge or create step
        UUID stepId = UUID.fromString(logStepRequest.getStepId());
        Optional<Step> dbStep = stepRepository.findById(stepId);
        if (dbStep.isPresent()) {
            // enrich tags, output, model and usage
            Step step = dbStep.get();
            newStep = step.enrich(
                logStepRequest.getTags(),
                logStepRequest.getInput(),
                logStepRequest.getOutput(),
                logStepRequest.getModel(),
                logStepRequest.getUsage()
            );
        } else {
            // Create a new step belongs to project. Create a new project without project in database.
            newStep = stepFactory.createStep(logStepRequest, projectId);
        }

        // 2. save step
        stepRepository.saveAndFlush(newStep);

        // 3. save step-prompt relationship if provided
        if (promptRef != null) {
            StepRef stepRef = StepRef.builder()
                .id(newStep.getId())
                .promptId(promptRef.promptPipelineId())
                .promptVersion(promptRef.promptVersion())
                .build();
            stepRefRepository.save(stepRef);
        }

        // 4. publish event after enrich — picked up by EvalJobServiceImpl after commit
        if (shouldEval) {
            UUID traceId = UUID.fromString(logStepRequest.getTraceId());
            String promptVersion = (promptRef != null) ? promptRef.promptVersion() : null;
            eventPublisher.publishEvent(new StepLoggedEvent(newStep.getId(), traceId, projectId, promptVersion));
        }

        // 5. return step id
        return newStep.getId();
    }

    @Override
    public Page<Step> findStepsByProjectId(Long projectId, int page, int pageSize) {
        Pageable pageable = PageRequest.of(page, pageSize);
        return this.stepRepository.findStepsByProjectId(projectId, pageable);
    }

    @Override
    public Page<Step> findStepsByProjectId(Long projectId, int page, int pageSize, Sort sort) {
        Pageable pageable = PageRequest.of(page, pageSize, sort);
        return this.stepRepository.findStepsByProjectId(projectId, pageable);
    }

    @Override
    public List<Step> findStepsByTraceId(@NotNull UUID traceId) {
        return this.stepRepository.findStepsByTraceId(traceId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public List<UUID> deleteStepsByStepUUID(List<UUID> stepIdToDelete) {
        this.stepRepository.deleteAllById(stepIdToDelete);
        return stepIdToDelete;
    }

}
