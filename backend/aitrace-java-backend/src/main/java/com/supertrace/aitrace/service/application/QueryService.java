package com.supertrace.aitrace.service.application;

import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.dto.step.StepSearchCriteria;
import com.supertrace.aitrace.dto.trace.TraceSearchCriteria;
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
    Page<Step> getSteps(@NotNull UUID userId, @NotBlank String projectName, int page, int pageSize);

    default Page<Step> getSteps(
        @NotNull UUID userId,
        @NotBlank String projectName,
        int page,
        int pageSize,
        StepSearchCriteria criteria
    ) {
        return getSteps(userId, projectName, page, pageSize);
    }

    /**
     * Pagination search traces of project which is owned by user uuid.
     * Search rule: start time later priority higher.
     * @param userId user uuid
     * @param projectName project name
     * @param page current page
     * @param pageSize page size
     * @return All traces
     */
    Page<Trace> getTraces(@NotNull UUID userId, @NotBlank String projectName, int page, int pageSize);

    default Page<Trace> getTraces(
        @NotNull UUID userId,
        @NotBlank String projectName,
        int page,
        int pageSize,
        TraceSearchCriteria criteria
    ) {
        return getTraces(userId, projectName, page, pageSize);
    }
}
