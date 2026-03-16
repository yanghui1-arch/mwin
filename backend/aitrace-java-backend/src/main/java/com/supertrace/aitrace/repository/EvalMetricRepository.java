package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.eval.EvalMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EvalMetricRepository extends JpaRepository<EvalMetric, UUID> {
    Optional<EvalMetric> findByName(String name);
}
