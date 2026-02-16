package com.supertrace.aitrace.service.application.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.domain.core.step.metadata.StepMetadata;
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
        StepMetadata stepMetadata = StepMetadata.builder()
            .description(logStepRequest.getDescription())
            .build();
        String llmProvider = logStepRequest.getLlmProvider();
        LLMUsage llmUsage = logStepRequest.getUsage();
        this.stepMetaService.addStepMeta(stepId, stepMetadata, llmProvider, llmUsage);
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
        return this.traceService.createTrace(logTraceRequest, projectOwnedByUserId.getId());
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
