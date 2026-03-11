package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.domain.core.prompt.Prompt;
import com.supertrace.aitrace.domain.core.prompt.PromptGroup;
import com.supertrace.aitrace.domain.core.prompt.PromptRef;
import com.supertrace.aitrace.domain.core.prompt.PromptStatus;
import com.supertrace.aitrace.dto.prompt.CreateOrUpdateStatusRequest;
import com.supertrace.aitrace.dto.prompt.CreatePromptGroupRequest;
import com.supertrace.aitrace.dto.prompt.CreatePromptRequest;
import com.supertrace.aitrace.repository.ProjectRepository;
import com.supertrace.aitrace.repository.PromptGroupRepository;
import com.supertrace.aitrace.repository.PromptRepository;
import com.supertrace.aitrace.repository.PromptStatusRepository;
import com.supertrace.aitrace.service.domain.PromptService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PromptServiceImpl implements PromptService {

    private final PromptGroupRepository promptGroupRepository;
    private final PromptRepository promptRepository;
    private final PromptStatusRepository promptStatusRepository;
    private final ProjectRepository projectRepository;

    @Override
    public UUID createPromptGroup(CreatePromptGroupRequest request, UUID userId) {
        PromptGroup group = PromptGroup.builder()
            .projectId(request.getProjectId())
            .name(request.getName())
            .description(request.getDescription())
            .build();
        return promptGroupRepository.save(group).getId();
    }

    @Override
    public List<PromptGroup> listPromptGroups(Long projectId) {
        return promptGroupRepository.findByProjectId(projectId);
    }

    @Override
    public PromptGroup getPromptGroupDetail(Long projectId, String promptGroupName) {
        return promptGroupRepository.findByProjectIdAndName(projectId, promptGroupName)
            .orElseThrow(() -> new NoSuchElementException("Prompt group not found: " + promptGroupName));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deletePromptGroup(UUID promptGroupId) {
        promptStatusRepository.deleteByPromptGroupId(promptGroupId);
        promptRepository.deleteByPromptGroupId(promptGroupId);
        promptGroupRepository.deleteById(promptGroupId);
    }

    @Override
    public UUID createPrompt(CreatePromptRequest request, UUID userId) {
        Prompt prompt = Prompt.builder()
            .promptGroupId(request.getPromptGroupId())
            .version(request.getVersion())
            .content(request.getContent())
            .modelConfig(request.getModelConfig())
            .createdBy(userId)
            .build();
        return promptRepository.save(prompt).getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PromptRef findOrCreatePrompt(Long projectId, String promptGroupName, String version, String content) {
        PromptGroup group = promptGroupRepository.findByProjectIdAndName(projectId, promptGroupName)
            .orElseGet(() -> promptGroupRepository.save(
                PromptGroup.builder()
                    .projectId(projectId)
                    .name(promptGroupName)
                    .build()
            ));

        UUID promptVersionId = promptRepository.findByPromptGroupIdAndVersion(group.getId(), version)
            .map(Prompt::getId)
            .orElseGet(() -> promptRepository.save(
                Prompt.builder()
                    .promptGroupId(group.getId())
                    .version(version)
                    .content(content)
                    .build()
            ).getId());

        return new PromptRef(group.getId(), promptVersionId);
    }

    @Override
    public Optional<Prompt> findPromptById(UUID promptId) {
        return promptRepository.findById(promptId);
    }

    @Override
    public List<Prompt> listPrompts(UUID promptGroupId) {
        return promptRepository.findByPromptGroupIdOrderByCreatedAtDesc(promptGroupId);
    }

    @Override
    public long countPrompts(UUID promptGroupId) {
        return promptRepository.countByPromptGroupId(promptGroupId);
    }

    @Override
    public UUID resolvePrompt(UUID userId, String projectName, String promptGroupName, String status) {
        List<Project> projects = projectRepository.findProjectsByName(projectName);
        Project project = projects.stream()
            .filter(p -> p.getUserId().equals(userId))
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("Project not found: " + projectName));

        PromptGroup group = promptGroupRepository.findByProjectIdAndName(project.getId(), promptGroupName)
            .orElseThrow(() -> new NoSuchElementException("Prompt group not found: " + promptGroupName));

        PromptStatus promptStatus = promptStatusRepository.findByPromptGroupIdAndStatus(group.getId(), status)
            .orElseThrow(() -> new NoSuchElementException(
                "Status '" + status + "' not found for prompt group: " + promptGroupName));

        return promptStatus.getPromptId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PromptStatus createOrUpdateStatus(CreateOrUpdateStatusRequest request, UUID userId) {
        PromptStatus statusEntity = promptStatusRepository
            .findByPromptGroupIdAndStatus(request.getPromptGroupId(), request.getStatus())
            .map(existing -> {
                existing.setPromptId(request.getPromptId());
                existing.setDeployedBy(userId);
                existing.setDeployedAt(LocalDateTime.now());
                return existing;
            })
            .orElseGet(() -> PromptStatus.builder()
                .promptGroupId(request.getPromptGroupId())
                .status(request.getStatus())
                .promptId(request.getPromptId())
                .deployedBy(userId)
                .build());

        return promptStatusRepository.save(statusEntity);
    }

    @Override
    public List<PromptStatus> listStatuses(UUID promptGroupId) {
        return promptStatusRepository.findByPromptGroupId(promptGroupId);
    }

    @Override
    public void deleteStatus(UUID statusId) {
        promptStatusRepository.deleteById(statusId);
    }
}
