package com.supertrace.aitrace.service.domain;

import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.dto.trace.LogTraceRequest;
import com.supertrace.aitrace.service.application.model.TraceSummary;
import com.supertrace.aitrace.service.storage.model.StoredPayload;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Log trace service
 *
 * @author dass90
 * @since 2025-10-24
 */
public interface TraceService {

    /**
     * Store one completed Trace snapshot.
     *
     * @param logTraceRequest log trace request
     * @param projectId project id which trace belongs to
     * @return trace id
     */

    UUID createTrace(LogTraceRequest logTraceRequest, Long projectId);

    /**
     * Get all traces given a project Id
     *
     * @param projectId project id
     * @param page current page
     * @param pageSize page size
     * @return all traces
     */
    Page<TraceSummary> getTraceSummariesByProjectId(Long projectId, int page, int pageSize);

    /**
     * Pagination search traces by a project id with given sort rule.
     *
     * @param projectId project id
     * @param page current page
     * @param pageSize page size
     * @param sort sort rule
     * @return all traces
     */
    Page<TraceSummary> getTraceSummariesByProjectId(Long projectId, int page, int pageSize, Sort sort);

    Optional<Trace> findById(UUID traceId);

    Optional<Trace> findByIdForUser(UUID userId, UUID traceId);

    /**
     * Loads the payload of a Trace owned by the specified user.
     *
     * @param userId owner user ID
     * @param traceId Trace ID
     * @return Trace input and output
     */
    StoredPayload getOwnedTracePayload(UUID userId, UUID traceId);

    long countByProjectId(Long projectId);

    /**
     * Delete trace by trace id
     * @param traceIdsToDelete trace ids to delete
     * @return a list of uuid to delete.
     */
    List<UUID> deleteTraceByTraceId(List<UUID> traceIdsToDelete);
}
