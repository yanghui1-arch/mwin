package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.prompt.Prompt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PromptRepository extends JpaRepository<Prompt, UUID> {
    List<Prompt> findByPromptGroupIdOrderByCreatedAtDesc(UUID promptGroupId);
    Optional<Prompt> findByPromptGroupIdAndVersion(UUID promptGroupId, String version);
    long countByPromptGroupId(UUID promptGroupId);
    void deleteByPromptGroupId(UUID promptGroupId);
}
