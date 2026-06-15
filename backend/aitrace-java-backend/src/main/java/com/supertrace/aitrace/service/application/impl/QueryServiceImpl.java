package com.supertrace.aitrace.service.application.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.service.application.model.ConversationSummaryData;
import com.supertrace.aitrace.service.domain.ProjectService;
import com.supertrace.aitrace.service.application.QueryService;
import com.supertrace.aitrace.service.domain.StepService;
import com.supertrace.aitrace.service.domain.TraceService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
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
    public Page<Step> getSteps(UUID userId, String projectName, int page, int pageSize) {
        Project project = this.projectService.getProjectByUserIdAndName(userId, projectName)
            .orElseThrow(() -> new RuntimeException("Project not found: " + projectName));
        Long projectId = project.getId();
        Sort sort = Sort.by(Sort.Direction.DESC, "startTime");
        return this.stepService.findStepsByProjectId(projectId, page, pageSize, sort);
    }

    @Override
    public Page<Trace> getTraces(UUID userId, @NotNull String projectName, int page, int pageSize) {
        Project project = this.projectService.getProjectByUserIdAndName(userId, projectName)
            .orElseThrow(() -> new RuntimeException("Project not found: " + projectName));
        Long projectId = project.getId();
        Sort sort = Sort.by(Sort.Direction.DESC, "startTime");
        return this.traceService.getTracesByProjectId(projectId, page, pageSize, sort);
    }

    @Override
    public Page<ConversationSummaryData> getConversationSummaries(UUID userId, Long projectId, int page, int pageSize) {
        ensureProjectOwnedByUser(userId, projectId);
        return this.traceService.getConversationSummariesByProjectId(projectId, page, pageSize);
    }

    @Override
    public List<Trace> getConversationTraceTimeline(UUID userId, Long projectId, UUID conversationId) {
        ensureProjectOwnedByUser(userId, projectId);
        return this.traceService.getConversationTraceTimeline(projectId, conversationId);
    }

    private void ensureProjectOwnedByUser(UUID userId, Long projectId) {
        boolean canAccessProject = this.projectService.getProjectsByUserId(userId).stream()
            .anyMatch(project -> project.getId().equals(projectId));
        if (!canAccessProject) {
            throw new RuntimeException("Project not found: " + projectId);
        }
    }
}
