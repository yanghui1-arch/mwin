package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.step.metadata.StepMeta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface StepMetaRepository extends JpaRepository<StepMeta, UUID> {
}
