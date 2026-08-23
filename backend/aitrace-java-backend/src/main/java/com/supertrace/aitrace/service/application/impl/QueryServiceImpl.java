package com.supertrace.aitrace.service.application.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.service.application.model.StepSummary;
import com.supertrace.aitrace.service.application.model.TraceSummary;
import com.supertrace.aitrace.service.domain.ProjectService;
import com.supertrace.aitrace.service.application.QueryService;
import com.supertrace.aitrace.service.domain.StepService;
import com.supertrace.aitrace.service.domain.TraceService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QueryServiceImpl implements QueryService {
    private final StepService stepService;
    private final TraceService traceService;
    private final ProjectService projectService;

    /**
     * Get a page steps of project which is owned by user uuid.
     * The search logic: start time later display higher priority.
     *
     * @param userId user uuid
     * @param projectName project name
     * @param page current page
     * @param pageSize page size
     * @return All steps
     */
    @Override
    public Page<StepSummary> getSteps(UUID userId, String projectName, int page, int pageSize) {
        Project project = this.projectService.getProjectByUserIdAndName(userId, projectName)
            .orElseThrow(() -> new RuntimeException("Project not found: " + projectName));
        Long projectId = project.getId();
        Sort sort = Sort.by(Sort.Direction.DESC, "startTime");
        return this.stepService.findStepSummariesByProjectId(projectId, page, pageSize, sort);
    }

    @Override
    public Page<TraceSummary> getTraces(UUID userId, @NotNull String projectName, int page, int pageSize) {
        Project project = this.projectService.getProjectByUserIdAndName(userId, projectName)
            .orElseThrow(() -> new RuntimeException("Project not found: " + projectName));
        Long projectId = project.getId();
        Sort sort = Sort.by(Sort.Direction.DESC, "startTime");
        return this.traceService.getTraceSummariesByProjectId(projectId, page, pageSize, sort);
    }
}
