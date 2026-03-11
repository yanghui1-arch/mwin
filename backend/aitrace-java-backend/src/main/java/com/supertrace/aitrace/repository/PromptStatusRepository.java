package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.prompt.PromptStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PromptStatusRepository extends JpaRepository<PromptStatus, UUID> {
    List<PromptStatus> findByPromptPipelineId(UUID promptPipelineId);
    Optional<PromptStatus> findByPromptPipelineIdAndStatus(UUID promptPipelineId, String status);
    void deleteByPromptPipelineId(UUID promptPipelineId);
}
