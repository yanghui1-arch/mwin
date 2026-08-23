package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.service.application.model.StepSummary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StepRepository extends JpaRepository<Step, UUID> {
    Page<StepSummary> findByProjectId(Long projectId, Pageable pageable);

    @Query("""
        SELECT s.id, s.parentStepId, s.name, s.type, s.tags, s.errorInfo,
               s.model, s.usage, s.startTime, s.endTime
        FROM Step s, Project p
        WHERE s.traceId = :traceId AND s.projectId = p.id AND p.userId = :userId
        ORDER BY s.startTime ASC
        """)
    List<StepSummary> findStepSummariesByTraceIdForUser(
        @Param("traceId") UUID traceId,
        @Param("userId") UUID userId
    );

    @Query("""
        SELECT s.id FROM Step s
        WHERE s.traceId = :traceId
        """)
    List<UUID> findStepIdsByTraceId(@Param("traceId") UUID traceId);

    @Query("""
        SELECT s FROM Step s
        WHERE s.id = :stepId
          AND s.projectId IN (SELECT p.id FROM Project p WHERE p.userId = :userId)
        """)
    Optional<Step> findByIdForUser(
        @Param("stepId") UUID stepId,
        @Param("userId") UUID userId
    );

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
}
