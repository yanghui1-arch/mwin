package com.supertrace.aitrace.service.domain;

import com.supertrace.aitrace.domain.core.prompt.Prompt;
import com.supertrace.aitrace.domain.core.prompt.PromptPipeline;
import com.supertrace.aitrace.domain.core.prompt.PromptRef;
import com.supertrace.aitrace.domain.core.prompt.PromptStatus;
import com.supertrace.aitrace.dto.prompt.CreatePromptPipelineRequest;
import com.supertrace.aitrace.dto.prompt.CreatePromptRequest;
import com.supertrace.aitrace.domain.core.prompt.PromptMetrics;
import jakarta.validation.constraints.NotNull;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
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
    PromptRef findOrCreatePrompt(Long projectId, @NotNull String promptPipelineName, String promptName, @NotNull String version, @NotNull String content);

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
     * Updates the status of a prompt version.
     * If update its status as current other prompts which are belongs to this prompt's pipeline are marked deprecated.
     * In other words one and only one prompt status of a pipeline is current.
     *
     * @param promptId the UUID of the prompt to update
     * @param status  prompt status to update
     * @return the updated {@code Prompt} entity
     * @throws java.util.NoSuchElementException if the prompt does not exist
     */
    Prompt updatePromptStatus(UUID promptId, String status);

    /**
     * Updates the status of a prompt pipeline (e.g. {@code "active"}, {@code "archived"}).
     *
     * @param pipelineId the UUID of the pipeline to update
     * @param status     the new status value
     * @throws java.util.NoSuchElementException if the pipeline does not exist
     */
    void updatePipelineStatus(UUID pipelineId, String status);


    // -------------------------------------------------------------------------
    // Prompt Status (Deployment Label)
    // -------------------------------------------------------------------------


    /**
     * Returns all deployment statuses for the given prompt pipeline.
     *
     * @param promptPipelineId the UUID of the prompt pipeline
     * @return list of prompt statuses; empty list if none exist
     */
    List<PromptStatus> listStatuses(UUID promptPipelineId);


    // -------------------------------------------------------------------------
    // Metrics
    // -------------------------------------------------------------------------

    /**
     * Returns prompt and version counts for the given pipelines in a single query.
     * Each {@code long[]} contains {@code [promptCount, versionCount]}.
     *
     * @param pipelineIds the pipeline UUIDs to count for
     * @return map from pipeline ID to {@code [promptCount, versionCount]}; missing entry means zero
     */
    Map<UUID, long[]> countPromptsByPipelines(List<UUID> pipelineIds);

    /**
     * Computes usage metrics for a list of prompt versions.
     *
     * @param prompts the prompt versions to compute metrics for
     * @return a map from prompt version ID to its computed metrics
     */
    Map<UUID, PromptMetrics> buildMetricsMap(List<Prompt> prompts);
}
