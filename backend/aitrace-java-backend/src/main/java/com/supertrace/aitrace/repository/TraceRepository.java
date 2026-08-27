package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.service.application.model.TraceSummary;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.Optional;

@Repository
public interface TraceRepository extends JpaRepository<Trace, UUID> {
    @Query("""
        SELECT t.id, t.parentTraceId, t.name, t.tags, t.errorInfo,
               t.startTime, t.lastUpdateTimestamp,
               o.rawSizeBytes,
               (SELECT COUNT(s.id) FROM Step s WHERE s.traceId = t.id)
        FROM Trace t
        JOIN S3CompatibleObject o ON o.objectKey = t.payloadObjectKey
        WHERE t.projectId = :projectId
        """)
    Page<TraceSummary> findByProjectId(@Param("projectId") Long projectId, Pageable pageable);

    @Query("""
        SELECT t FROM Trace t
        WHERE t.id = :traceId
          AND t.projectId IN (SELECT p.id FROM Project p WHERE p.userId = :userId)
        """)
    Optional<Trace> findByIdForUser(
        @Param("traceId") UUID traceId,
        @Param("userId") UUID userId
    );

    long countByProjectId(@NotNull Long projectId);
}
