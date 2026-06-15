package com.supertrace.aitrace.service.application;

import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.service.application.model.ConversationSummaryData;
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

    /**
     * Pagination search conversation summaries of project which is owned by user uuid.
     *
     * @param userId user uuid
     * @param projectName project name
     * @param page current page
     * @param pageSize page size
     * @return conversation summaries
     */
    Page<ConversationSummaryData> getConversationSummaries(
        @NotNull UUID userId,
        @NotBlank String projectName,
        int page,
        int pageSize
    );

    /**
     * Pagination search conversation summaries of project id which is owned by user uuid.
     *
     * @param userId user uuid
     * @param projectId project id
     * @param page current page
     * @param pageSize page size
     * @return conversation summaries
     */
    Page<ConversationSummaryData> getConversationSummaries(
        @NotNull UUID userId,
        @NotNull Long projectId,
        int page,
        int pageSize
    );
}
