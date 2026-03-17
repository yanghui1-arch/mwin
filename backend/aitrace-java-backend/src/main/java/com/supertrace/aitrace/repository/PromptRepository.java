package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.prompt.Prompt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PromptRepository extends JpaRepository<Prompt, UUID> {
    List<Prompt> findByPromptPipelineIdOrderByCreatedAtDesc(UUID promptPipelineId);
    List<Prompt> findByPromptPipelineIdAndName(UUID promptPipelineId, String name);
    Optional<Prompt> findByPromptPipelineIdAndVersion(UUID promptPipelineId, String version);
    void deleteByPromptPipelineId(UUID promptPipelineId);

    interface PipelineCounts {
        UUID getPipelineId();
        long getVersionCount();
        long getPromptCount();
    }

    @Query("""
        SELECT p.promptPipelineId AS pipelineId,
               COUNT(p)           AS versionCount,
               COUNT(DISTINCT COALESCE(p.name, ''))  AS promptCount
        FROM Prompt p
        WHERE p.promptPipelineId IN :pipelineIds
        GROUP BY p.promptPipelineId
        """)
    List<PipelineCounts> findCountsByPipelineIds(@Param("pipelineIds") List<UUID> pipelineIds);
}
