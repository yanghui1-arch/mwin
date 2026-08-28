package com.supertrace.aitrace.service.domain.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.dto.step.LogStepRequest;
import com.supertrace.aitrace.factory.StepFactory;
import com.supertrace.aitrace.repository.StepRepository;
import com.supertrace.aitrace.service.domain.StepService;
import com.supertrace.aitrace.service.domain.model.StepBatchItem;
import com.supertrace.aitrace.service.application.model.StepSummary;
import com.supertrace.aitrace.service.storage.S3CompatibleObjectService;
import com.supertrace.aitrace.service.storage.model.StepPayload;
import com.supertrace.aitrace.service.storage.model.StepPayloadChunkEntry;
import com.supertrace.aitrace.service.storage.model.StoredPayload;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
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

    private static final int STEP_CHUNK_SIZE = 16;

    private final StepRepository stepRepository;
    private final StepFactory stepFactory;
    private final S3CompatibleObjectService s3CompatibleObjectService;
    private final ObjectMapper objectMapper;

    /**
     * Persist one completed Step snapshot.
     *
     * @param userId user uuid
     * @param logStepRequest log step request
     * @param projectId project id which step belongs to. Must ensure the project id exists and belongs to user uuid.
     * @return step id
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public UUID logStep(@NotNull UUID userId, @NotNull LogStepRequest logStepRequest, @NotNull Long projectId) {
        UUID stepId = UUID.fromString(logStepRequest.getStepId());
        StepPayload payload = new StepPayload(
            objectMapper.valueToTree(logStepRequest.getInput()),
            objectMapper.valueToTree(logStepRequest.getOutput())
        );
        String payloadObjectKey = s3CompatibleObjectService.storeStepPayload(
            stepId,
            payload
        );
        Step newStep = stepFactory.createStep(logStepRequest, projectId, payloadObjectKey);
        stepRepository.saveAndFlush(newStep);
        return newStep.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void logSteps(@NotNull UUID userId, @NotNull List<StepBatchItem> items) {
        List<PreparedStep> preparedSteps = items.stream()
            .map(item -> {
                LogStepRequest request = item.request();
                UUID stepId = UUID.fromString(request.getStepId());
                return new PreparedStep(
                    request,
                    item.projectId(),
                    stepId,
                    new StepPayload(
                        objectMapper.valueToTree(request.getInput()),
                        objectMapper.valueToTree(request.getOutput())
                    )
                );
            })
            .toList();

        List<Step> steps = new ArrayList<>(preparedSteps.size());
        for (int offset = 0; offset < preparedSteps.size(); offset += STEP_CHUNK_SIZE) {
            List<PreparedStep> chunk = preparedSteps.subList(
                offset,
                Math.min(offset + STEP_CHUNK_SIZE, preparedSteps.size())
            );
            List<StepPayloadChunkEntry> entries = chunk.stream()
                .map(step -> new StepPayloadChunkEntry(
                    step.id(),
                    step.payload().input(),
                    step.payload().output()
                ))
                .toList();
            String payloadObjectKey = s3CompatibleObjectService.storeStepPayloadChunk(entries);
            chunk.stream()
                .map(step -> stepFactory.createStep(step.request(), step.projectId(), payloadObjectKey))
                .forEach(steps::add);
        }
        stepRepository.saveAllAndFlush(steps);
    }

    @Override
    public Page<StepSummary> findStepSummariesByProjectId(Long projectId, int page, int pageSize) {
        Pageable pageable = PageRequest.of(page, pageSize);
        return this.stepRepository.findByProjectId(projectId, pageable);
    }

    @Override
    public Page<StepSummary> findStepSummariesByProjectId(Long projectId, int page, int pageSize, Sort sort) {
        Pageable pageable = PageRequest.of(page, pageSize, sort);
        return this.stepRepository.findByProjectId(projectId, pageable);
    }

    @Override
    public List<StepSummary> findStepSummariesByTraceId(@NotNull UUID userId, @NotNull UUID traceId) {
        return this.stepRepository.findStepSummariesByTraceIdForUser(traceId, userId);
    }

    @Override
    public List<UUID> findStepIdsByTraceId(@NotNull UUID traceId) {
        return this.stepRepository.findStepIdsByTraceId(traceId);
    }

    @Override
    @Transactional(readOnly = true)
    public StoredPayload getOwnedStepPayload(UUID userId, UUID stepId) {
        Step step = this.stepRepository.findByIdForUser(stepId, userId)
            .orElseThrow(() -> new RuntimeException("Step not found"));
        return s3CompatibleObjectService.loadStepPayload(step.getPayloadObjectKey(), stepId).toStoredPayload();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public List<UUID> deleteStepsByStepUUID(List<UUID> stepIdToDelete) {
        this.stepRepository.deleteAllById(stepIdToDelete);
        return stepIdToDelete;
    }

    private record PreparedStep(
        LogStepRequest request,
        Long projectId,
        UUID id,
        StepPayload payload
    ) {
    }

}
