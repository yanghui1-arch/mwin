package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.Project;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findProjectsByUserId(UUID userId);

    List<Project> findProjectsByName(@NotBlank String projectName);

    List<Project> findProjectsByUserIdOrderByLastUpdateTimestampDesc(UUID userId);

    @Modifying
    @Transactional
    @Query("UPDATE Project p SET p.cost = :cost WHERE p.id = :projectId")
    void updateCost(@Param("projectId") Long projectId, @Param("cost") BigDecimal cost);

    @Modifying
    @Transactional
    @Query("UPDATE Project p SET p.averageDuration = :avgDuration WHERE p.id = :projectId")
    void updateAverageDuration(@Param("projectId") Long projectId, @Param("avgDuration") int avgDuration);
}
