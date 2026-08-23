package com.supertrace.aitrace.service.application;

import com.supertrace.aitrace.service.application.model.StepSummary;
import com.supertrace.aitrace.service.application.model.TraceSummary;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;

import java.util.UUID;

public interface QueryService {
    /**
     * Get all steps of project which is owned by user uuid.
     * @param userId user uuid
     * @param projectName project name
     * @param page current page
     * @param pageSize page size
     * @return All pagination information about steps.
     */
    Page<StepSummary> getSteps(@NotNull UUID userId, @NotBlank String projectName, int page, int pageSize);

    /**
     * Pagination search traces of project which is owned by user uuid.
     * Search rule: start time later priority higher.
     * @param userId user uuid
     * @param projectName project name
     * @param page current page
     * @param pageSize page size
     * @return All traces
     */
    Page<TraceSummary> getTraces(@NotNull UUID userId, @NotBlank String projectName, int page, int pageSize);
}
