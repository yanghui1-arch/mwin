package com.supertrace.aitrace.service.application.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import com.supertrace.aitrace.dto.step.LogStepRequest;
import com.supertrace.aitrace.dto.trace.LogTraceRequest;
import com.supertrace.aitrace.dto.log.LogTraceTreeRequest;
import com.supertrace.aitrace.dto.log.LogTraceTreeResponse;
import com.supertrace.aitrace.repository.ProjectRepository;
import com.supertrace.aitrace.service.application.LogService;
import com.supertrace.aitrace.service.domain.ProjectService;
import com.supertrace.aitrace.service.domain.StepMetaService;
import com.supertrace.aitrace.service.domain.StepService;
import com.supertrace.aitrace.service.domain.model.StepBatchItem;
import com.supertrace.aitrace.service.domain.TraceService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class LogServiceImpl implements LogService {
    private final ProjectRepository projectRepository;
    private final ProjectService projectService;
    private final StepService stepService;
    private final StepMetaService stepMetaService;
    private final TraceService traceService;

    /**
     * Log step
     * Log a step with a project. If user doesn't create a project given projectName the function will create a new one.
     *
     * @param userId user uuid
     * @param logStepRequest log step request
     * @return step uuid
     */
    @Override
    public UUID logStep(@NotNull UUID userId, @NotNull LogStepRequest logStepRequest) {
        String projectName = logStepRequest.getProjectName();
        Project projectOwnedByUserId = this.searchProject(userId, projectName);
        Long projectId = projectOwnedByUserId.getId();

        UUID stepId = this.stepService.logStep(userId, logStepRequest, projectId);

        String description = logStepRequest.getDescription();
        String llmProvider = logStepRequest.getLlmProvider();
        LLMUsage llmUsage = logStepRequest.getUsage();

        // Query the step's existing cost BEFORE upsert to compute the true delta.
        // If logStep is called multiple times for the same step, we must not double-count:
        //   delta = updatedCost - prevCost
        //   e.g. prev=5, updated=3 → delta=-2 (cost corrected downward)
        //   e.g. prev=5, updated=5 → delta= 0 (no-usage second call, no change)
        //   e.g. prev=0, updated=5 → delta= 5 (first call, full amount added)
        BigDecimal prevStepCost = this.stepMetaService
            .findCostsByStepIds(Set.of(stepId))
            .getOrDefault(stepId, BigDecimal.ZERO);

        BigDecimal updatedStepCost = this.stepMetaService.addStepMeta(
            stepId, description, llmProvider, logStepRequest.getModel(), llmUsage
        ).getCost();

        BigDecimal newProjectCost = projectOwnedByUserId.getCost().add(updatedStepCost.subtract(prevStepCost));
        this.projectRepository.updateCost(projectId, newProjectCost);
        return stepId;
    }

    /**
     * Log trace
     * Log a trace with a project. If user doesn't create a project given projectName the function will create a new one.
     *
     * @param userId user uuid
     * @param logTraceRequest log trace request
     * @return trace uuid
     */
    @Override
    public UUID logTrace(@NotNull UUID userId, @NotNull LogTraceRequest logTraceRequest) {
        String projectName = logTraceRequest.getProjectName();
        Project projectOwnedByUserId = this.searchProject(userId, projectName);
        Long projectId = projectOwnedByUserId.getId();

        UUID traceId = UUID.fromString(logTraceRequest.getTraceId());
        long newDurationMs = ChronoUnit.MILLIS.between(logTraceRequest.getStartTime(), logTraceRequest.getLastUpdateTimestamp());

        Optional<Trace> existingTrace = this.traceService.findById(traceId);

        this.traceService.createTrace(logTraceRequest, projectId);

        long count = this.traceService.countByProjectId(projectId);
        int oldAvg = projectOwnedByUserId.getAverageDuration();

        // Unified incremental formula: newAvg = oldAvg + (newDurationMs - prevDurationMs) / count
        //
        // Case 1 — new trace (prevDurationMs = oldAvg):
        //   newAvg = oldAvg + (newDurationMs - oldAvg) / (n+1)
        //          = [oldAvg * (n+1) + newDurationMs - oldAvg] / (n+1)
        //          = [oldAvg * n + newDurationMs] / (n+1)
        //          = [n * avg_n + S_{n+1}] / (n+1)               ✓
        //
        // Case 2 — existing trace updated (prevDurationMs = old trace duration):
        //   The trace was already counted in oldAvg. Its duration changed, so we remove
        //   the old contribution and add the new one:
        //   newAvg = oldAvg + (newDurationMs - oldDurationMs) / n
        //          = [oldAvg * n - oldDurationMs + newDurationMs] / n  ✓
        long prevDurationMs = existingTrace
            .map(t -> ChronoUnit.MILLIS.between(t.getStartTime(), t.getLastUpdateTimestamp()))
            .orElse((long) oldAvg);
        int newAvg = (int) (oldAvg + (newDurationMs - prevDurationMs) / count);
        this.projectRepository.updateAverageDuration(projectId, newAvg);

        return traceId;
    }

    /**
     * Persist one complete trace tree in a database transaction. Trace and step
     * IDs remain idempotent, and project aggregates are updated once after the
     * trace tree has been written.
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public LogTraceTreeResponse logTraceTree(
        @NotNull UUID userId,
        @NotNull LogTraceTreeRequest traceTreeRequest
    ) {
        List<LogTraceRequest> traceRequests = traceTreeRequest.getTraces();
        List<LogStepRequest> stepRequests = traceTreeRequest.getSteps();

        Map<String, Project> projects = new LinkedHashMap<>();
        Stream.concat(
                traceRequests.stream().map(LogTraceRequest::getProjectName),
                stepRequests.stream().map(LogStepRequest::getProjectName)
            )
            .distinct()
            .forEach(name -> projects.put(name, this.searchProject(userId, name)));

        Map<Long, BatchAggregate> aggregates = new LinkedHashMap<>();
        for (Project project : projects.values()) {
            aggregates.put(project.getId(), new BatchAggregate(
                project,
                this.traceService.countByProjectId(project.getId())
            ));
        }

        for (LogTraceRequest request : traceRequests) {
            Project project = projects.get(request.getProjectName());
            BatchAggregate aggregate = aggregates.get(project.getId());
            UUID traceId = UUID.fromString(request.getTraceId());
            long newDuration = ChronoUnit.MILLIS.between(
                request.getStartTime(),
                request.getLastUpdateTimestamp()
            );
            Optional<Trace> existing = this.traceService.findById(traceId);
            if (existing.isPresent()) {
                Trace previous = existing.get();
                long previousDuration = ChronoUnit.MILLIS.between(
                    previous.getStartTime(),
                    previous.getLastUpdateTimestamp()
                );
                aggregate.durationDelta += newDuration - previousDuration;
            } else {
                aggregate.durationDelta += newDuration;
                aggregate.newTraceCount += 1;
            }
            aggregate.traceTouched = true;
            this.traceService.createTrace(request, project.getId());
        }

        Set<UUID> incomingStepIds = stepRequests.stream()
            .map(request -> UUID.fromString(request.getStepId()))
            .collect(java.util.stream.Collectors.toSet());
        Map<UUID, BigDecimal> previousCosts = incomingStepIds.isEmpty()
            ? Map.of()
            : this.stepMetaService.findCostsByStepIds(incomingStepIds);

        List<StepBatchItem> stepItems = stepRequests.stream()
            .map(request -> new StepBatchItem(
                request,
                projects.get(request.getProjectName()).getId()
            ))
            .toList();
        this.stepService.logSteps(userId, stepItems);

        for (LogStepRequest request : stepRequests) {
            Project project = projects.get(request.getProjectName());
            BatchAggregate aggregate = aggregates.get(project.getId());
            UUID stepId = UUID.fromString(request.getStepId());
            BigDecimal previousCost = previousCosts.getOrDefault(stepId, BigDecimal.ZERO);
            BigDecimal updatedCost = this.stepMetaService.addStepMeta(
                stepId,
                request.getDescription(),
                request.getLlmProvider(),
                request.getModel(),
                request.getUsage()
            ).getCost();
            aggregate.costDelta = aggregate.costDelta.add(updatedCost.subtract(previousCost));
            aggregate.stepTouched = true;
        }

        for (BatchAggregate aggregate : aggregates.values()) {
            if (aggregate.traceTouched) {
                long totalCount = aggregate.originalTraceCount + aggregate.newTraceCount;
                long oldTotalDuration = (long) aggregate.project.getAverageDuration()
                    * aggregate.originalTraceCount;
                int average = totalCount == 0
                    ? 0
                    : Math.toIntExact((oldTotalDuration + aggregate.durationDelta) / totalCount);
                this.projectRepository.updateAverageDuration(aggregate.project.getId(), average);
            }
            if (aggregate.stepTouched) {
                this.projectRepository.updateCost(
                    aggregate.project.getId(),
                    aggregate.project.getCost().add(aggregate.costDelta)
                );
            }
        }

        return new LogTraceTreeResponse(
            traceRequests.size(),
            stepRequests.size()
        );
    }

    /**
     * Search project given a project name which is owned by user id
     * Create a new project, which name is projectName, if user doesn't have the project.
     * @param userId user uuid
     * @param projectName project name
     * @return a new project
     */
    private Project searchProject(UUID userId, String projectName) {
        List<Project> projects = this.projectRepository.findProjectsByName(projectName);
        return projects.stream()
            .filter(project -> project.getUserId().equals(userId))
            .findFirst()
            // Later in the procedure log something to remind user hasn't this project
            .orElseGet( () -> projectService.createNewProjectByProgram(projectName, userId));
    }

    private static final class BatchAggregate {
        private final Project project;
        private final long originalTraceCount;
        private long newTraceCount;
        private long durationDelta;
        private BigDecimal costDelta = BigDecimal.ZERO;
        private boolean traceTouched;
        private boolean stepTouched;

        private BatchAggregate(Project project, long originalTraceCount) {
            this.project = project;
            this.originalTraceCount = originalTraceCount;
        }
    }

}
