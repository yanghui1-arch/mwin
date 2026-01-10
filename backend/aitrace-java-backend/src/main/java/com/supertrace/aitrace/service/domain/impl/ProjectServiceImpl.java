package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.dto.project.CreateProjectRequest;
import com.supertrace.aitrace.exception.ProjectNotFoundException;
import com.supertrace.aitrace.exception.project.DuplicateProjectNameException;
import com.supertrace.aitrace.repository.ProjectRepository;
import com.supertrace.aitrace.service.domain.ProjectService;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;

    @Autowired
    public ProjectServiceImpl(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    /**
     * Create a new project by manual creation.
     * Throw DuplicateProjectNameException when project name is duplicate for user uuid.
     *
     * @param createProjectRequest create project request
     * @param userId user uuid
     * @return New project
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Project createNewProjectByManualCreation(CreateProjectRequest createProjectRequest,
                                                    UUID userId) {
        String projectName = createProjectRequest.getProjectName();
        String projectDescription = createProjectRequest.getProjectDescription();

        // Check whether project name has been belongs to this userId
        List<Project> projectsOwnedByUserId = this.projectRepository.findProjectsByUserId(userId);
        boolean invalidProjectName = projectsOwnedByUserId.stream().anyMatch(p -> p.getName().equals(projectName));
        if (invalidProjectName) {
            throw new DuplicateProjectNameException();
        }


        Project project = Project.builder()
            .userId(userId)
            .name(projectName)
            .description(projectDescription)
            .averageDuration(0)
            .cost(BigDecimal.ZERO)
            .lastUpdateTimestamp(LocalDateTime.now())
            .build();

        this.projectRepository.save(project);
        return project;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Project createNewProjectByProgram(String projectName,
                                             UUID userId) {
        List<Project> projectsOwnedByUserId = this.projectRepository.findProjectsByUserId(userId);
        boolean invalidProjectName = projectsOwnedByUserId.stream().anyMatch(p -> p.getName().equals(projectName));
        if (invalidProjectName) {
            throw new DuplicateProjectNameException();
        }
        Project project = Project.builder()
            .userId(userId)
            .name(projectName)
            .averageDuration(0)
            .cost(BigDecimal.ZERO)
            .lastUpdateTimestamp(LocalDateTime.now())
            .build();
        this.projectRepository.save(project);
        return project;
    }

    @Override
    public List<Project> getProjectsByUserId(UUID userId) {
        return this.projectRepository.findProjectsByUserIdOrderByLastUpdateTimestampDesc(userId);
    }

    @Override
    public Optional<Project> getProjectByUserIdAndName(UUID userId, String projectName) {
        List<Project> projectsOwnedByUserId = this.projectRepository.findProjectsByUserId(userId);
        return projectsOwnedByUserId.stream()
            .filter(p -> p.getName().equals(projectName))
            .findFirst();
    }

    @Override
    public Project updateProjectAfterLogging(UUID userId,
                                             String projectName,
                                             BigDecimal costGeneratedFromThisLog,
                                             LocalDateTime logEndTimestamp,
                                             BigDecimal durationOfThisLog) {
        return null;
    }

    /**
     * Update project description
     * New description can be null or blank.
     *
     * @param userId user uuid
     * @param projectId project id to be updated
     * @param projectDescription new project description
     * @return Updated project
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Project updateProject(@NotNull UUID userId, @NotNull Long projectId, String projectDescription) {
        List<Project> userProjects = this.projectRepository.findProjectsByUserId(userId);
        Project projectToUpdate = userProjects.stream()
            .filter(p -> p.getId().equals(projectId))
            .findFirst()
            .orElseThrow(() -> new ProjectNotFoundException("Failed to find project with project id " + projectId));
        projectToUpdate.setDescription(projectDescription);
        projectToUpdate = projectToUpdate.refreshLastUpdateTimestamp();
        this.projectRepository.save(projectToUpdate);
        return projectToUpdate;
    }

    @Override
    public Project deleteProject(UUID userId,
                                 String projectName) {
        List<Project> projectsOwnedByUserId = this.projectRepository.findProjectsByUserId(userId);
        if (projectsOwnedByUserId.isEmpty()) {
            throw new IllegalArgumentException("No projects owned by this user: " + userId);
        } else {
            Project projectToDelete = projectsOwnedByUserId.stream()
                .filter(p -> p.getName().equals(projectName))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
            this.projectRepository.deleteById(projectToDelete.getId());
            return projectToDelete;
        }
    }
}
