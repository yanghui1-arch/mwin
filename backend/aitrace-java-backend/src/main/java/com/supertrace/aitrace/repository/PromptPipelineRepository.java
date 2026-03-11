package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.prompt.PromptPipeline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PromptPipelineRepository extends JpaRepository<PromptPipeline, UUID> {
    List<PromptPipeline> findByProjectId(Long projectId);
    Optional<PromptPipeline> findByProjectIdAndName(Long projectId, String name);
}
