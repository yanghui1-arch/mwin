package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.Project;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findProjectsByUserId(UUID userId);

    List<Project> findProjectsByName(@NotBlank String projectName);

    List<Project> findProjectsByUserIdOrderByLastUpdateTimestampDesc(UUID userId);
}
