package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.step.Step;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface StepRepository extends JpaRepository<Step, UUID> {

    List<Step> findStepsByTraceId(@NotNull UUID traceId);

    Page<Step> findStepsByProjectId(@NotNull Long projectId, Pageable pageable);

    @Query(value = """
        SELECT start_time, COALESCE(CAST(usage ->> 'total_tokens' AS bigint), 0)
        FROM step
        WHERE project_id IN (:projectIds)
        """, nativeQuery = true)
    List<Object[]> findTokenSnapshotsByProjectIds(Collection<Long> projectIds);

    @Query(value = """
        SELECT project_id, start_time, COALESCE(CAST(usage ->> 'total_tokens' AS bigint), 0)
        FROM step
        WHERE project_id IN (:projectIds)
          AND start_time >= :startTime
          AND start_time < :endTime
        """, nativeQuery = true)
    List<Object[]> findProjectTokenSnapshotsByProjectIdsAndStartTimeBetween(
        Collection<Long> projectIds,
        LocalDateTime startTime,
        LocalDateTime endTime
    );

    @Query(value = """
        SELECT s.project_id, s.project_name, NULL, NULL,
               SUM(COALESCE(sm.cost, 0)),
               SUM(COALESCE(CAST(s.usage ->> 'total_tokens' AS bigint), 0)),
               SUM(COALESCE(CAST(s.usage ->> 'prompt_tokens' AS bigint), 0)),
               SUM(COALESCE(CAST(s.usage ->> 'completion_tokens' AS bigint), 0)),
               NULL, NULL, NULL
        FROM step s
        LEFT JOIN step_meta sm ON sm.id = s.id
        WHERE s.project_id IN (:projectIds)
          AND s.start_time >= :startTime
          AND s.start_time < :endTime
        GROUP BY s.project_id, s.project_name
        ORDER BY SUM(COALESCE(sm.cost, 0)) DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findTopProjectCostDrivers(Collection<Long> projectIds, LocalDateTime startTime, LocalDateTime endTime, int limit);

    @Query(value = """
        SELECT NULL, NULL, split_part(COALESCE(s.model, ''), '/', 1), COALESCE(s.model, 'unknown'),
               SUM(COALESCE(sm.cost, 0)),
               SUM(COALESCE(CAST(s.usage ->> 'total_tokens' AS bigint), 0)),
               SUM(COALESCE(CAST(s.usage ->> 'prompt_tokens' AS bigint), 0)),
               SUM(COALESCE(CAST(s.usage ->> 'completion_tokens' AS bigint), 0)),
               NULL, NULL, NULL
        FROM step s
        LEFT JOIN step_meta sm ON sm.id = s.id
        WHERE s.project_id IN (:projectIds)
          AND s.start_time >= :startTime
          AND s.start_time < :endTime
        GROUP BY COALESCE(s.model, 'unknown')
        ORDER BY SUM(COALESCE(sm.cost, 0)) DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findTopModelCostDrivers(Collection<Long> projectIds, LocalDateTime startTime, LocalDateTime endTime, int limit);

    @Query(value = """
        SELECT s.project_id, s.project_name, split_part(MIN(COALESCE(s.model, 'unknown')), '/', 1), MIN(COALESCE(s.model, 'unknown')),
               SUM(COALESCE(sm.cost, 0)),
               SUM(COALESCE(CAST(s.usage ->> 'total_tokens' AS bigint), 0)),
               SUM(COALESCE(CAST(s.usage ->> 'prompt_tokens' AS bigint), 0)),
               SUM(COALESCE(CAST(s.usage ->> 'completion_tokens' AS bigint), 0)),
               s.trace_id::text, NULL, t.name
        FROM step s
        LEFT JOIN step_meta sm ON sm.id = s.id
        LEFT JOIN trace t ON t.id = s.trace_id
        WHERE s.project_id IN (:projectIds)
          AND s.start_time >= :startTime
          AND s.start_time < :endTime
        GROUP BY s.project_id, s.project_name, s.trace_id, t.name
        ORDER BY SUM(COALESCE(sm.cost, 0)) DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findTopTraceCostDrivers(Collection<Long> projectIds, LocalDateTime startTime, LocalDateTime endTime, int limit);

    @Query(value = """
        SELECT s.project_id, s.project_name, split_part(COALESCE(s.model, ''), '/', 1), COALESCE(s.model, 'unknown'),
               COALESCE(sm.cost, 0),
               COALESCE(CAST(s.usage ->> 'total_tokens' AS bigint), 0),
               COALESCE(CAST(s.usage ->> 'prompt_tokens' AS bigint), 0),
               COALESCE(CAST(s.usage ->> 'completion_tokens' AS bigint), 0),
               s.trace_id::text, s.id::text, s.name
        FROM step s
        LEFT JOIN step_meta sm ON sm.id = s.id
        WHERE s.project_id IN (:projectIds)
          AND s.start_time >= :startTime
          AND s.start_time < :endTime
        ORDER BY COALESCE(sm.cost, 0) DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findTopStepCostDrivers(Collection<Long> projectIds, LocalDateTime startTime, LocalDateTime endTime, int limit);
}
