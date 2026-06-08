package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.service.application.model.ConversationSummaryData;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TraceRepository extends JpaRepository<Trace, UUID> {
    Page<Trace> findTracesByProjectId(@NotNull Long projectId, Pageable pageable);

    List<Trace> findTracesByProjectIdAndConversationIdOrderByStartTimeAsc(
        @NotNull Long projectId,
        @NotNull UUID conversationId
    );

    long countByProjectId(@NotNull Long projectId);

    @Query(value = """
        WITH trace_summary AS (
            SELECT conversation_id,
                   COUNT(*) AS trace_count,
                   MIN(start_time) AS start_time,
                   MAX(last_update_timestamp) AS last_update_timestamp,
                   BOOL_OR(error_info IS NOT NULL) AS trace_has_error,
                   SUM(EXTRACT(EPOCH FROM (COALESCE(last_update_timestamp, start_time) - start_time)) * 1000)::bigint AS duration_millis
            FROM trace
            WHERE project_id = :projectId
            GROUP BY conversation_id
        ), step_summary AS (
            SELECT t.conversation_id,
                   BOOL_OR(s.error_info IS NOT NULL) AS step_has_error,
                   COALESCE(SUM(COALESCE(CAST(s.usage ->> 'total_tokens' AS bigint), 0)), 0) AS total_tokens,
                   COALESCE(SUM(COALESCE(sm.cost, CAST(s.usage ->> 'cost' AS numeric), 0)), 0) AS total_cost
            FROM trace t
            JOIN step s ON s.trace_id = t.id
            LEFT JOIN step_meta sm ON sm.id = s.id
            WHERE t.project_id = :projectId
            GROUP BY t.conversation_id
        )
        SELECT ts.conversation_id AS "conversationId",
               ts.trace_count AS "traceCount",
               ts.start_time AS "startTime",
               ts.last_update_timestamp AS "lastUpdateTimestamp",
               (ts.trace_has_error OR COALESCE(ss.step_has_error, false)) AS "hasError",
               COALESCE(ts.duration_millis, 0) AS "durationMillis",
               COALESCE(ss.total_tokens, 0) AS "totalTokens",
               COALESCE(ss.total_cost, 0) AS "totalCost"
        FROM trace_summary ts
        LEFT JOIN step_summary ss ON ss.conversation_id = ts.conversation_id
        ORDER BY ts.last_update_timestamp DESC NULLS LAST, ts.start_time DESC
        """, countQuery = """
        SELECT COUNT(*) FROM (
            SELECT conversation_id FROM trace WHERE project_id = :projectId GROUP BY conversation_id
        ) conversations
        """, nativeQuery = true)
    Page<ConversationSummaryData> findConversationSummariesByProjectId(@NotNull Long projectId, Pageable pageable);
}
