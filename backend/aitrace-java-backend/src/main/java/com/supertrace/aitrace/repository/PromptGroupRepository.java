package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.prompt.PromptGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PromptGroupRepository extends JpaRepository<PromptGroup, UUID> {
    List<PromptGroup> findByProjectId(Long projectId);
    Optional<PromptGroup> findByProjectIdAndName(Long projectId, String name);
}
