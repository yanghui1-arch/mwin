package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.eval.EvalScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EvalScoreRepository extends JpaRepository<EvalScore, UUID> {

    List<EvalScore> findByStepIdInAndEvalMetricId(List<UUID> stepIds, UUID evalMetricId);
}
