package com.supertrace.aitrace.service.domain;

import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.dto.step.LogStepRequest;
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
     * Store step into the database
     * If step id is not in the db create one and store it else update it.
     *
     * @param userId user uuid
     * @param logStepRequest log step request
     * @return step id
     */
    UUID logStep(UUID userId, LogStepRequest logStepRequest, Long projectId);

    /**
     * get all steps of a project which is owned by userId
     *
     * @param projectId project id.
     * @param page current page
     * @param pageSize page size
     * @return all pagination information about steps.
     */
    Page<Step> findStepsByProjectId(Long projectId, int page, int pageSize);

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
    Page<Step> findStepsByProjectId(Long projectId, int page, int pageSize, Sort sort);

    /**
     * Find all related steps by trace id
     * @param traceId trace id
     * @return all related steps.
     */
    List<Step> findStepsByTraceId(@NotNull UUID traceId);

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
