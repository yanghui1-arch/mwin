package com.supertrace.aitrace.service.domain;

import com.supertrace.aitrace.dto.prompt.CreateOrUpdateStatusRequest;
import com.supertrace.aitrace.dto.prompt.CreatePromptGroupRequest;
import com.supertrace.aitrace.dto.prompt.CreatePromptRequest;
import com.supertrace.aitrace.vo.prompt.PromptGroupVO;
import com.supertrace.aitrace.domain.core.prompt.PromptRef;
import com.supertrace.aitrace.vo.prompt.PromptResolveVO;
import com.supertrace.aitrace.vo.prompt.PromptStatusVO;
import com.supertrace.aitrace.vo.prompt.PromptVO;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

/**
 * Service for managing prompt groups, prompt versions, and deployment statuses.
 *
 * <p>A {@code PromptGroup} is a named container scoped to a project that holds multiple
 * versioned {@code Prompt} records. A {@code PromptStatus} maps a named label (e.g.
 * {@code "production"}, {@code "staging"}) to a specific prompt version, enabling callers
 * to resolve the active prompt for a given environment without knowing its version directly.
 */
public interface PromptService {

    // -------------------------------------------------------------------------
    // Prompt Group
    // -------------------------------------------------------------------------

    /**
     * Creates a new prompt group for the given project.
     *
     * <p>The combination of {@code projectId} and {@code name} must be unique.
     * Attempting to create a duplicate will result in a constraint violation.
     *
     * @param request contains {@code projectId}, {@code name}, and optional {@code description}
     * @param userId  the ID of the user performing the operation
     * @return the UUID of the newly created prompt group
     */
    UUID createPromptGroup(CreatePromptGroupRequest request, UUID userId);

    /**
     * Returns all prompt groups belonging to the given project, including their
     * version count and current deployment statuses.
     *
     * @param projectId the project to list groups for
     * @return list of prompt group view objects; empty list if none exist
     */
    List<PromptGroupVO> listPromptGroups(Long projectId);

    /**
     * Returns the detail of a single prompt group identified by project and name,
     * including its version count and current deployment statuses.
     *
     * @param projectId       the project the group belongs to
     * @param promptGroupName the unique name of the group within the project
     * @return the prompt group view object
     * @throws NoSuchElementException if no group with the given name exists in the project
     */
    PromptGroupVO getPromptGroupDetail(Long projectId, String promptGroupName);

    /**
     * Deletes a prompt group and all associated prompts and deployment statuses.
     *
     * <p>This operation is transactional: if any deletion step fails, all changes
     * are rolled back to preserve consistency.
     *
     * @param promptGroupId the UUID of the prompt group to delete
     */
    @Transactional
    void deletePromptGroup(UUID promptGroupId);

    // -------------------------------------------------------------------------
    // Prompt Version
    // -------------------------------------------------------------------------

    /**
     * Creates a new versioned prompt under an existing prompt group.
     *
     * <p>The combination of {@code promptGroupId} and {@code version} must be unique.
     *
     * @param request contains {@code promptGroupId}, {@code version}, {@code content},
     *                and optional {@code modelConfig}
     * @param userId  the ID of the user performing the operation
     * @return the UUID of the newly created prompt
     */
    UUID createPrompt(CreatePromptRequest request, UUID userId);

    /**
     * Finds the prompt identified by {@code (projectId, promptGroupName, version)},
     * creating the group and/or the prompt version if they do not yet exist.
     *
     * <p>This method is designed for use during step logging, where the caller knows the
     * prompt content and version at runtime but cannot guarantee prior registration.
     * The operation is transactional: both the group lookup/creation and the prompt
     * lookup/creation are performed atomically.
     *
     * @param projectId       the project the prompt group belongs to
     * @param promptGroupName the name of the prompt group; created if absent
     * @param version         the version string of the prompt; created if absent
     * @param content         the prompt content, used only when a new prompt is created
     * @return the UUID of the existing or newly created prompt
     */
    @Transactional
    PromptRef findOrCreatePrompt(Long projectId, String promptGroupName, String version, String content);

    /**
     * Returns all prompt versions for the given group, ordered by creation time descending.
     *
     * @param promptGroupId the UUID of the prompt group
     * @return list of prompt view objects; empty list if none exist
     */
    List<PromptVO> listPrompts(UUID promptGroupId);

    // -------------------------------------------------------------------------
    // Prompt Resolution
    // -------------------------------------------------------------------------

    /**
     * Resolves the active prompt for a given project, group, and deployment status label.
     *
     * <p>Looks up the project by {@code projectName} scoped to the user, then finds the
     * prompt group by name, and finally returns the prompt ID mapped to the given status.
     *
     * @param userId          the user who owns the project
     * @param projectName     the name of the project
     * @param promptGroupName the name of the prompt group
     * @param status          the deployment label to resolve (e.g. {@code "production"})
     * @return a view object containing the resolved prompt ID
     * @throws NoSuchElementException if the project, group, or status label is not found
     */
    PromptResolveVO resolvePrompt(UUID userId, String projectName, String promptGroupName, String status);

    // -------------------------------------------------------------------------
    // Prompt Status (Deployment Label)
    // -------------------------------------------------------------------------

    /**
     * Creates or updates a deployment status label for a prompt group, pointing it at
     * the specified prompt version.
     *
     * <p>If a status with the given label already exists for the group, its target prompt
     * and deployer information are updated in place. Otherwise a new status record is created.
     * The operation is transactional to ensure the upsert is atomic.
     *
     * @param request contains {@code promptGroupId}, {@code status} label, and {@code promptId}
     * @param userId  the ID of the user performing the deployment
     * @return the updated or newly created status view object, including the resolved version string
     */
    @Transactional
    PromptStatusVO createOrUpdateStatus(CreateOrUpdateStatusRequest request, UUID userId);

    /**
     * Returns all deployment statuses for the given prompt group.
     *
     * @param promptGroupId the UUID of the prompt group
     * @return list of status view objects; empty list if none exist
     */
    List<PromptStatusVO> listStatuses(UUID promptGroupId);

    /**
     * Deletes a deployment status by its ID.
     *
     * @param statusId the UUID of the status to delete
     */
    void deleteStatus(UUID statusId);
}
