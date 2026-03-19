package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.step.StepRef;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StepRefRepository extends JpaRepository<StepRef, UUID> {
    @Query("SELECT s.id FROM StepRef s WHERE s.promptVersion = :promptVersion")
    List<UUID> findIdsByPromptVersion(String promptVersion);
}
