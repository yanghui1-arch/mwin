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
}
