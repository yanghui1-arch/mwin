package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.domain.core.prompt.Prompt;
import com.supertrace.aitrace.domain.core.prompt.PromptPipeline;
import com.supertrace.aitrace.domain.core.prompt.PromptPipelineStatus;
import com.supertrace.aitrace.domain.core.prompt.PromptRef;
import com.supertrace.aitrace.domain.core.prompt.PromptStatus;
import com.supertrace.aitrace.dto.prompt.CreateOrUpdateStatusRequest;
import com.supertrace.aitrace.dto.prompt.CreatePromptPipelineRequest;
import com.supertrace.aitrace.dto.prompt.CreatePromptRequest;
import com.supertrace.aitrace.dto.prompt.UpdatePromptStatusRequest;
import com.supertrace.aitrace.repository.ProjectRepository;
import com.supertrace.aitrace.repository.PromptPipelineRepository;
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

    private final PromptPipelineRepository promptPipelineRepository;
    private final PromptRepository promptRepository;
    private final PromptStatusRepository promptStatusRepository;
    private final ProjectRepository projectRepository;

    @Override
    public UUID createPromptPipeline(CreatePromptPipelineRequest request, UUID userId) {
        PromptPipeline pipeline = PromptPipeline.builder()
            .projectId(request.getProjectId())
            .name(request.getName())
            .description(request.getDescription())
            .build();
        return promptPipelineRepository.save(pipeline).getId();
    }

    @Override
    public List<PromptPipeline> listPromptPipelines(Long projectId) {
        return promptPipelineRepository.findByProjectId(projectId);
    }

    @Override
    public PromptPipeline getPromptPipelineDetail(Long projectId, String promptPipelineName) {
        return promptPipelineRepository.findByProjectIdAndName(projectId, promptPipelineName)
            .orElseThrow(() -> new NoSuchElementException("Prompt pipeline not found: " + promptPipelineName));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deletePromptPipeline(UUID promptPipelineId) {
        promptStatusRepository.deleteByPromptPipelineId(promptPipelineId);
        promptRepository.deleteByPromptPipelineId(promptPipelineId);
        promptPipelineRepository.deleteById(promptPipelineId);
    }

    @Override
    public UUID createPrompt(CreatePromptRequest request, UUID userId) {
        Prompt prompt = Prompt.builder()
            .promptPipelineId(request.getPromptPipelineId())
            .version(request.getVersion())
            .content(request.getContent())
            .modelConfig(request.getModelConfig())
            .createdBy(userId)
            .name(request.getName())
            .description(request.getDescription())
            .changelog(request.getChangelog())
            .build();
        return promptRepository.save(prompt).getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PromptRef findOrCreatePrompt(Long projectId, String promptPipelineName, String version, String content) {
        PromptPipeline pipeline = promptPipelineRepository.findByProjectIdAndName(projectId, promptPipelineName)
            .orElseGet(() -> promptPipelineRepository.save(
                PromptPipeline.builder()
                    .projectId(projectId)
                    .name(promptPipelineName)
                    .build()
            ));

        UUID promptVersionId = promptRepository.findByPromptPipelineIdAndVersion(pipeline.getId(), version)
            .map(Prompt::getId)
            .orElseGet(() -> promptRepository.save(
                Prompt.builder()
                    .promptPipelineId(pipeline.getId())
                    .version(version)
                    .content(content)
                    .build()
            ).getId());

        return new PromptRef(pipeline.getId(), promptVersionId);
    }

    @Override
    public Optional<Prompt> findPromptById(UUID promptId) {
        return promptRepository.findById(promptId);
    }

    @Override
    public List<Prompt> listPrompts(UUID promptPipelineId) {
        return promptRepository.findByPromptPipelineIdOrderByCreatedAtDesc(promptPipelineId);
    }

    @Override
    public long countPrompts(UUID promptPipelineId) {
        return promptRepository.countByPromptPipelineId(promptPipelineId);
    }

    @Override
    public Prompt updatePromptStatus(UUID promptId, UpdatePromptStatusRequest request) {
        Prompt prompt = promptRepository.findById(promptId)
            .orElseThrow(() -> new NoSuchElementException("Prompt not found: " + promptId));
        prompt.setStatus(request.getStatus());
        return promptRepository.save(prompt);
    }

    @Override
    public UUID resolvePrompt(UUID userId, String projectName, String promptPipelineName, String status) {
        List<Project> projects = projectRepository.findProjectsByName(projectName);
        Project project = projects.stream()
            .filter(p -> p.getUserId().equals(userId))
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("Project not found: " + projectName));

        PromptPipeline pipeline = promptPipelineRepository.findByProjectIdAndName(project.getId(), promptPipelineName)
            .orElseThrow(() -> new NoSuchElementException("Prompt pipeline not found: " + promptPipelineName));

        PromptStatus promptStatus = promptStatusRepository.findByPromptPipelineIdAndStatus(pipeline.getId(), status)
            .orElseThrow(() -> new NoSuchElementException(
                "Status '" + status + "' not found for prompt pipeline: " + promptPipelineName));

        return promptStatus.getPromptId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PromptStatus createOrUpdateStatus(CreateOrUpdateStatusRequest request, UUID userId) {
        PromptStatus statusEntity = promptStatusRepository
            .findByPromptPipelineIdAndStatus(request.getPromptPipelineId(), request.getStatus())
            .map(existing -> {
                existing.setPromptId(request.getPromptId());
                existing.setDeployedBy(userId);
                existing.setDeployedAt(LocalDateTime.now());
                return existing;
            })
            .orElseGet(() -> PromptStatus.builder()
                .promptPipelineId(request.getPromptPipelineId())
                .status(request.getStatus())
                .promptId(request.getPromptId())
                .deployedBy(userId)
                .build());

        return promptStatusRepository.save(statusEntity);
    }

    @Override
    public List<PromptStatus> listStatuses(UUID promptPipelineId) {
        return promptStatusRepository.findByPromptPipelineId(promptPipelineId);
    }

    @Override
    public void deleteStatus(UUID statusId) {
        promptStatusRepository.deleteById(statusId);
    }

    @Override
    public void updatePipelineStatus(UUID pipelineId, String status) {
        PromptPipeline pipeline = promptPipelineRepository.findById(pipelineId)
            .orElseThrow(() -> new NoSuchElementException("Prompt pipeline not found: " + pipelineId));
        pipeline.setStatus(PromptPipelineStatus.fromValue(status));
        promptPipelineRepository.save(pipeline);
    }
}
