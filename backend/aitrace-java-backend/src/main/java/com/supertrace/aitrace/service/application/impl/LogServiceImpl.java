package com.supertrace.aitrace.service.application.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import com.supertrace.aitrace.dto.step.LogStepRequest;
import com.supertrace.aitrace.dto.trace.LogTraceRequest;
import com.supertrace.aitrace.repository.ProjectRepository;
import com.supertrace.aitrace.service.application.LogService;
import com.supertrace.aitrace.service.domain.ProjectService;
import com.supertrace.aitrace.service.domain.StepMetaService;
import com.supertrace.aitrace.service.domain.StepService;
import com.supertrace.aitrace.service.domain.TraceService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.temporal.ChronoUnit;
import java.util.*;

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
        UUID stepId = this.stepService.logStep(userId, logStepRequest, projectOwnedByUserId.getId());

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
        this.projectRepository.updateCost(projectOwnedByUserId.getId(), newProjectCost);
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

}
