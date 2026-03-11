package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.prompt.Prompt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PromptRepository extends JpaRepository<Prompt, UUID> {
    List<Prompt> findByPromptPipelineIdOrderByCreatedAtDesc(UUID promptPipelineId);
    Optional<Prompt> findByPromptPipelineIdAndVersion(UUID promptPipelineId, String version);
    long countByPromptPipelineId(UUID promptPipelineId);
    void deleteByPromptPipelineId(UUID promptPipelineId);
}
