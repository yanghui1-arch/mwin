package com.supertrace.aitrace.service.domain;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.dto.project.CreateProjectRequest;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectService {
    /**
     * Create a new project and store it into database.
     * It's forbidden to create the same project name under a user and should be implemented in this function.
     *
     * @param createProjectRequest create project request
     * @param userId user uuid
     * @return Project
     */
    Project createNewProjectByManualCreation(CreateProjectRequest createProjectRequest, UUID userId);

    /**
     * Create a new project in program
     *
     * @param projectName project name
     * @param userId user uuid who owns the project
     * @return Project
     */
    Project createNewProjectByProgram(String projectName, UUID userId);

    /**
     * Get all projects of user uuid
     *
     * @param userId user uuid
     * @return List of projects owned by user uuid
     */
    List<Project> getProjectsByUserId(UUID userId);

    /**
     * Get project all information of project name owned by user uuid
     *
     * @param userId user uuid
     * @param projectName project name
     * @return Project optional
     */
    Optional<Project> getProjectByUserIdAndName(UUID userId, String projectName);

    /**
     * Get project by id when it is owned by user uuid.
     *
     * @param userId user uuid
     * @param projectId project id
     * @return Project optional
     */
    Optional<Project> getProjectByUserIdAndId(UUID userId, Long projectId);

    /**
     * Update project after logging.
     * Offer parameters are all raw data of this log. Complex calculation is implemented in this function.
     * Average calculation is implemented using stream update method.
     *
     * @param userId user uuid
     * @param projectName project name
     * @param costGeneratedFromThisLog LLM cost generation from this log
     * @param logEndTimestamp log end timestamp
     * @param durationOfThisLog duration of this log
     * @return Updated project
     */
    Project updateProjectAfterLogging(UUID userId, String projectName, BigDecimal costGeneratedFromThisLog, LocalDateTime logEndTimestamp, BigDecimal durationOfThisLog);

    /**
     * Update project description
     * @param userId user uuid
     * @param projectId project id to be updated
     * @param projectDescription new project description
     * @return updated project
     */
    Project updateProject(UUID userId, Long projectId, String projectDescription);

    /**
     * Delete a project of a user by project name
     *
     * @param userId user uuid which want to delete
     * @param projectName project name to delete
     * @return Project to delete
     */
    Project deleteProject(UUID userId, String projectName);
}
