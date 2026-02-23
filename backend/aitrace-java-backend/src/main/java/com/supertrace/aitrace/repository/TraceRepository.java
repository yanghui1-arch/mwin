package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.Trace;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TraceRepository extends JpaRepository<Trace, UUID> {
    Page<Trace> findTracesByProjectId(@NotNull Long projectId, Pageable pageable);

    long countByProjectId(@NotNull Long projectId);
}
