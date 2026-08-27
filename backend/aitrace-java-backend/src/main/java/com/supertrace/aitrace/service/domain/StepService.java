package com.supertrace.aitrace.service.domain;

import com.supertrace.aitrace.dto.step.LogStepRequest;
import com.supertrace.aitrace.service.domain.model.StepBatchItem;
import com.supertrace.aitrace.service.application.model.StepSummary;
import com.supertrace.aitrace.service.storage.model.StoredPayload;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.UUID;

/**
 * Log step service
 *
 * @author dass90
 * @since 2025-10-23
 */
public interface StepService {
    /**
     * Store one completed Step snapshot.
     *
     * @param userId user uuid
     * @param logStepRequest log step request
     * @return step id
     */
    UUID logStep(UUID userId, LogStepRequest logStepRequest, Long projectId);

    /** Stores TraceTree Steps in fixed-size OSS payload chunks. */
    void logSteps(UUID userId, List<StepBatchItem> items);

    /**
     * get all steps of a project which is owned by userId
     *
     * @param projectId project id.
     * @param page current page
     * @param pageSize page size
     * @return all pagination information about steps.
     */
    Page<StepSummary> findStepSummariesByProjectId(Long projectId, int page, int pageSize);

    /**
     * Pagination search steps by a project id
     * Designed for sort search steps.
     *
     * @param projectId project id.
     * @param page current page
     * @param pageSize page size
     * @param sort sort rule
     * @return one pagination information about steps.
     */
    Page<StepSummary> findStepSummariesByProjectId(Long projectId, int page, int pageSize, Sort sort);

    /**
     * Find all related steps by trace id
     * @param traceId trace id
     * @return all related steps.
     */
    List<StepSummary> findStepSummariesByTraceId(@NotNull UUID userId, @NotNull UUID traceId);

    List<UUID> findStepIdsByTraceId(@NotNull UUID traceId);

    /**
     * Loads the payload of a Step owned by the specified user.
     *
     * @param userId owner user ID
     * @param stepId Step ID
     * @return Step input and output
     */
    StoredPayload getOwnedStepPayload(@NotNull UUID userId, @NotNull UUID stepId);

    /**
     * Delete steps by their uuid.
     * The function doesn't check whether the uuids of stepIdToDelete all exist in the database.
     * If some don't exist, it will ignore them.
     *
     * @param stepIdToDelete a list step uuid to delete
     * @return delete steps uuid
     */
    List<UUID> deleteStepsByStepUUID(List<UUID> stepIdToDelete);
}
