package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.eval.EvalJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface EvalJobRepository extends JpaRepository<EvalJob, UUID> {

    /** Used to prevent duplicate trace-level eval jobs for the same trace. */
    boolean existsByTraceIdAndJobType(UUID traceId, String jobType);
}
