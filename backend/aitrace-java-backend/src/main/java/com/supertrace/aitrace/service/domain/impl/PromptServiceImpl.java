package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.domain.core.prompt.Prompt;
import com.supertrace.aitrace.domain.core.prompt.PromptGroup;
import com.supertrace.aitrace.domain.core.prompt.PromptStatus;
import com.supertrace.aitrace.dto.prompt.CreateOrUpdateStatusRequest;
import com.supertrace.aitrace.dto.prompt.CreatePromptGroupRequest;
import com.supertrace.aitrace.dto.prompt.CreatePromptRequest;
import com.supertrace.aitrace.repository.ProjectRepository;
import com.supertrace.aitrace.repository.PromptGroupRepository;
import com.supertrace.aitrace.repository.PromptRepository;
import com.supertrace.aitrace.repository.PromptStatusRepository;
import com.supertrace.aitrace.service.domain.PromptService;
import com.supertrace.aitrace.vo.prompt.PromptGroupVO;
import com.supertrace.aitrace.domain.core.prompt.PromptRef;
import com.supertrace.aitrace.vo.prompt.PromptResolveVO;
import com.supertrace.aitrace.vo.prompt.PromptStatusVO;
import com.supertrace.aitrace.vo.prompt.PromptVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;

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
    public List<PromptGroupVO> listPromptGroups(Long projectId) {
        List<PromptGroup> groups = promptGroupRepository.findByProjectId(projectId);
        return groups.stream().map(this::toPromptGroupVO).toList();
    }

    @Override
    public PromptGroupVO getPromptGroupDetail(Long projectId, String promptGroupName) {
        PromptGroup group = promptGroupRepository.findByProjectIdAndName(projectId, promptGroupName)
            .orElseThrow(() -> new NoSuchElementException("Prompt group not found: " + promptGroupName));
        return toPromptGroupVO(group);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deletePromptGroup(UUID promptGroupId) {
        promptStatusRepository.deleteByPromptGroupId(promptGroupId);
        promptRepository.deleteByPromptGroupId(promptGroupId);
        promptGroupRepository.deleteById(promptGroupId);
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
    public List<PromptVO> listPrompts(UUID promptGroupId) {
        return promptRepository.findByPromptGroupIdOrderByCreatedAtDesc(promptGroupId)
            .stream()
            .map(this::toPromptVO)
            .toList();
    }

    @Override
    public PromptResolveVO resolvePrompt(UUID userId, String projectName, String promptGroupName, String status) {
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

        return PromptResolveVO.builder()
            .promptId(promptStatus.getPromptId())
            .build();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PromptStatusVO createOrUpdateStatus(CreateOrUpdateStatusRequest request, UUID userId) {
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

        PromptStatus saved = promptStatusRepository.save(statusEntity);

        String versionStr = promptRepository.findById(saved.getPromptId())
            .map(Prompt::getVersion)
            .orElse(null);

        return toStatusVO(saved, versionStr);
    }

    @Override
    public List<PromptStatusVO> listStatuses(UUID promptGroupId) {
        List<PromptStatus> statuses = promptStatusRepository.findByPromptGroupId(promptGroupId);

        Map<UUID, String> versionMap = promptRepository
            .findAllById(statuses.stream().map(PromptStatus::getPromptId).toList())
            .stream()
            .collect(Collectors.toMap(Prompt::getId, Prompt::getVersion));

        return statuses.stream()
            .map(s -> toStatusVO(s, versionMap.get(s.getPromptId())))
            .toList();
    }

    @Override
    public void deleteStatus(UUID statusId) {
        promptStatusRepository.deleteById(statusId);
    }

    // --- Mappers ---

    private PromptGroupVO toPromptGroupVO(PromptGroup group) {
        long versionCount = promptRepository.countByPromptGroupId(group.getId());
        List<PromptStatusVO> statuses = listStatuses(group.getId());
        return PromptGroupVO.builder()
            .id(group.getId())
            .projectId(group.getProjectId())
            .name(group.getName())
            .description(group.getDescription())
            .createdAt(group.getCreatedAt())
            .versionCount(versionCount)
            .statuses(statuses)
            .build();
    }

    private PromptVO toPromptVO(Prompt p) {
        return PromptVO.builder()
            .id(p.getId())
            .promptGroupId(p.getPromptGroupId())
            .version(p.getVersion())
            .content(p.getContent())
            .modelConfig(p.getModelConfig())
            .createdBy(p.getCreatedBy())
            .createdAt(p.getCreatedAt())
            .build();
    }

    private PromptStatusVO toStatusVO(PromptStatus s, String version) {
        return PromptStatusVO.builder()
            .id(s.getId())
            .promptGroupId(s.getPromptGroupId())
            .status(s.getStatus())
            .promptId(s.getPromptId())
            .version(version)
            .deployedBy(s.getDeployedBy())
            .deployedAt(s.getDeployedAt())
            .build();
    }
}
