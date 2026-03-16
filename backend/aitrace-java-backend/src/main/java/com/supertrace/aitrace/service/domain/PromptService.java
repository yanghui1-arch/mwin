package com.supertrace.aitrace.service.domain;

import com.supertrace.aitrace.domain.core.prompt.Prompt;
import com.supertrace.aitrace.domain.core.prompt.PromptPipeline;
import com.supertrace.aitrace.domain.core.prompt.PromptRef;
import com.supertrace.aitrace.domain.core.prompt.PromptStatus;
import com.supertrace.aitrace.dto.prompt.CreateOrUpdateStatusRequest;
import com.supertrace.aitrace.dto.prompt.CreatePromptPipelineRequest;
import com.supertrace.aitrace.dto.prompt.CreatePromptRequest;
import com.supertrace.aitrace.dto.prompt.UpdatePromptStatusRequest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for managing prompt pipelines, prompt versions, and deployment statuses.
 *
 * <p>A {@code PromptPipeline} is a named container scoped to a project that holds multiple
 * versioned {@code Prompt} records. A {@code PromptStatus} maps a named label (e.g.
 * {@code "production"}, {@code "staging"}) to a specific prompt version, enabling callers
 * to resolve the active prompt for a given environment without knowing its version directly.
 */
public interface PromptService {

    // -------------------------------------------------------------------------
    // Prompt Pipeline
    // -------------------------------------------------------------------------

    /**
     * Creates a new prompt pipeline for the given project.
     *
     * <p>The combination of {@code projectId} and {@code name} must be unique.
     * Attempting to create a duplicate will result in a constraint violation.
     *
     * @param request contains {@code projectId}, {@code name}, and optional {@code description}
     * @param userId  the ID of the user performing the operation
     * @return the UUID of the newly created prompt pipeline
     */
    UUID createPromptPipeline(CreatePromptPipelineRequest request, UUID userId);

    /**
     * Returns all prompt pipelines belonging to the given project.
     *
     * @param projectId the project to list pipelines for
     * @return list of prompt pipelines; empty list if none exist
     */
    List<PromptPipeline> listPromptPipelines(Long projectId);

    /**
     * Returns a single prompt pipeline identified by project and name.
     *
     * @param projectId            the project the pipeline belongs to
     * @param promptPipelineName   the unique name of the pipeline within the project
     * @return the prompt pipeline
     * @throws NoSuchElementException if no pipeline with the given name exists in the project
     */
    PromptPipeline getPromptPipelineDetail(Long projectId, String promptPipelineName);

    /**
     * Deletes a prompt pipeline and all associated prompts and deployment statuses.
     *
     * <p>This operation is transactional: if any deletion step fails, all changes
     * are rolled back to preserve consistency.
     *
     * @param promptPipelineId the UUID of the prompt pipeline to delete
     */
    @Transactional
    void deletePromptPipeline(UUID promptPipelineId);

    // -------------------------------------------------------------------------
    // Prompt Version
    // -------------------------------------------------------------------------

    /**
     * Creates a new versioned prompt under an existing prompt pipeline.
     *
     * <p>The combination of {@code promptPipelineId} and {@code version} must be unique.
     *
     * @param request contains {@code promptPipelineId}, {@code version}, {@code content},
     *                and optional {@code modelConfig}
     * @param userId  the ID of the user performing the operation
     * @return the UUID of the newly created prompt
     */
    UUID createPrompt(CreatePromptRequest request, UUID userId);

    /**
     * Finds the prompt identified by {@code (projectId, promptPipelineName, version)},
     * creating the pipeline and/or the prompt with version if they do not yet exist.
     *
     * <p>This method is designed for use during step logging, where the caller knows the
     * prompt content and version at runtime but cannot guarantee prior registration.
     * The operation is transactional: both the pipeline lookup/creation and the prompt
     * lookup/creation are performed atomically.
     *
     * @param projectId           the project the prompt pipeline belongs to
     * @param promptPipelineName  the name of the prompt pipeline; created if absent
     * @param version             the version string of the prompt; created if absent
     * @param content             the prompt content, used only when a new prompt is created
     * @return a {@code PromptRef} holding both the prompt pipeline ID and the prompt version ID
     */
    @Transactional
    PromptRef findOrCreatePrompt(Long projectId, String promptPipelineName, String version, String content);

    /**
     * Returns a single prompt by its UUID.
     *
     * @param promptId the UUID of the prompt
     * @return an {@code Optional} containing the prompt, or empty if not found
     */
    Optional<Prompt> findPromptById(UUID promptId);

    /**
     * Returns all prompt versions for the given pipeline, ordered by creation time descending.
     *
     * @param promptPipelineId the UUID of the prompt pipeline
     * @return list of prompts; empty list if none exist
     */
    List<Prompt> listPrompts(UUID promptPipelineId);

    /**
     * Returns the number of prompt versions in the given pipeline.
     *
     * @param promptPipelineId the UUID of the prompt pipeline
     * @return the version count
     */
    long countPrompts(UUID promptPipelineId);

    /**
     * Updates the status of a prompt version (e.g. {@code "current"}, {@code "deprecated"}).
     *
     * @param promptId the UUID of the prompt to update
     * @param request  contains the new {@code status} value
     * @return the updated {@code Prompt} entity
     * @throws java.util.NoSuchElementException if the prompt does not exist
     */
    Prompt updatePromptStatus(UUID promptId, UpdatePromptStatusRequest request);

    /**
     * Updates the status of a prompt pipeline (e.g. {@code "active"}, {@code "archived"}).
     *
     * @param pipelineId the UUID of the pipeline to update
     * @param status     the new status value
     * @throws java.util.NoSuchElementException if the pipeline does not exist
     */
    void updatePipelineStatus(UUID pipelineId, String status);

    // -------------------------------------------------------------------------
    // Prompt Resolution
    // -------------------------------------------------------------------------

    /**
     * Resolves the active prompt ID for a given project, pipeline, and deployment status label.
     *
     * <p>Looks up the project by {@code projectName} scoped to the user, then finds the
     * prompt pipeline by name, and finally returns the prompt ID mapped to the given status.
     *
     * @param userId               the user who owns the project
     * @param projectName          the name of the project
     * @param promptPipelineName   the name of the prompt pipeline
     * @param status               the deployment label to resolve (e.g. {@code "production"})
     * @return the UUID of the resolved prompt
     * @throws NoSuchElementException if the project, pipeline, or status label is not found
     */
    UUID resolvePrompt(UUID userId, String projectName, String promptPipelineName, String status);

    // -------------------------------------------------------------------------
    // Prompt Status (Deployment Label)
    // -------------------------------------------------------------------------

    /**
     * Creates or updates a deployment status label for a prompt pipeline, pointing it at
     * the specified prompt version.
     *
     * <p>If a status with the given label already exists for the pipeline, its target prompt
     * and deployer information are updated in place. Otherwise a new status record is created.
     * The operation is transactional to ensure the upsert is atomic.
     *
     * @param request contains {@code promptPipelineId}, {@code status} label, and {@code promptId}
     * @param userId  the ID of the user performing the deployment
     * @return the updated or newly created {@code PromptStatus} entity
     */
    @Transactional
    PromptStatus createOrUpdateStatus(CreateOrUpdateStatusRequest request, UUID userId);

    /**
     * Returns all deployment statuses for the given prompt pipeline.
     *
     * @param promptPipelineId the UUID of the prompt pipeline
     * @return list of prompt statuses; empty list if none exist
     */
    List<PromptStatus> listStatuses(UUID promptPipelineId);

    /**
     * Deletes a deployment status by its ID.
     *
     * @param statusId the UUID of the status to delete
     */
    void deleteStatus(UUID statusId);
}
