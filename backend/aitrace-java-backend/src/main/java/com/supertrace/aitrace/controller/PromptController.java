package com.supertrace.aitrace.controller;

import com.supertrace.aitrace.domain.core.prompt.Prompt;
import com.supertrace.aitrace.domain.core.prompt.PromptMetrics;
import com.supertrace.aitrace.domain.core.prompt.PromptPipeline;
import com.supertrace.aitrace.domain.core.prompt.PromptStatus;
import com.supertrace.aitrace.dto.prompt.CreateOrUpdateStatusRequest;
import com.supertrace.aitrace.dto.prompt.CreatePromptPipelineRequest;
import com.supertrace.aitrace.dto.prompt.CreatePromptRequest;
import com.supertrace.aitrace.dto.prompt.UpdatePromptStatusRequest;
import com.supertrace.aitrace.exception.AuthenticationException;
import com.supertrace.aitrace.exception.UserIdNotFoundException;
import com.supertrace.aitrace.response.APIResponse;
import com.supertrace.aitrace.service.application.ApiKeyService;
import com.supertrace.aitrace.service.domain.PromptService;
import com.supertrace.aitrace.utils.ApiKeyUtils;
import com.supertrace.aitrace.vo.prompt.PromptGroupVO;
import com.supertrace.aitrace.vo.prompt.PromptMetricsVO;
import com.supertrace.aitrace.vo.prompt.PromptPipelineVO;
import com.supertrace.aitrace.vo.prompt.PromptResolveVO;
import com.supertrace.aitrace.vo.prompt.PromptStatusVO;
import com.supertrace.aitrace.vo.prompt.PromptVO;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v0/prompt")
@RequiredArgsConstructor
public class PromptController {

    private final PromptService promptService;
    private final ApiKeyService apiKeyService;

    /** Create a new prompt pipeline */
    @PostMapping("/create_prompt_pipeline")
    public ResponseEntity<APIResponse<UUID>> createPromptPipeline(
        HttpServletRequest request,
        @RequestBody CreatePromptPipelineRequest body
    ) {
        try {
            UUID userId = (UUID) request.getAttribute("userId");
            return ResponseEntity.ok(APIResponse.success(promptService.createPromptPipeline(body, userId)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /** List all prompt pipelines for a project, including metrics */
    @GetMapping("/{projectId}")
    public ResponseEntity<APIResponse<List<PromptPipelineVO>>> listPromptPipelines(
        @PathVariable Long projectId
    ) {
        try {
            List<PromptPipelineVO> vos = promptService.listPromptPipelines(projectId).stream()
                .map(this::assemblePipelineVO)
                .toList();
            return ResponseEntity.ok(APIResponse.success(vos));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /** Get prompt pipeline detail with prompt list and statuses */
    @GetMapping("/{projectId}/{promptPipelineName}")
    public ResponseEntity<APIResponse<PromptPipelineVO>> getPromptPipelineDetail(
        @PathVariable Long projectId,
        @PathVariable String promptPipelineName
    ) {
        try {
            PromptPipeline pipeline = promptService.getPromptPipelineDetail(projectId, promptPipelineName);
            return ResponseEntity.ok(APIResponse.success(assemblePipelineVO(pipeline)));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(APIResponse.notFound(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /** Delete a prompt pipeline and cascade */
    @DeleteMapping("/{promptPipelineId}")
    public ResponseEntity<APIResponse<Void>> deletePromptPipeline(@PathVariable UUID promptPipelineId) {
        try {
            promptService.deletePromptPipeline(promptPipelineId);
            return ResponseEntity.ok(APIResponse.success(null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /** Create a new prompt version */
    @PostMapping("/version")
    public ResponseEntity<APIResponse<UUID>> createPrompt(
        HttpServletRequest request,
        @RequestBody CreatePromptRequest body
    ) {
        try {
            UUID userId = (UUID) request.getAttribute("userId");
            return ResponseEntity.ok(APIResponse.success(promptService.createPrompt(body, userId)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /** List prompt versions for a pipeline */
    @GetMapping("/version/{promptPipelineId}")
    public ResponseEntity<APIResponse<List<PromptVO>>> listPrompts(@PathVariable UUID promptPipelineId) {
        try {
            List<PromptVO> vos = promptService.listPrompts(promptPipelineId).stream()
                .map(PromptVO::from)
                .toList();
            return ResponseEntity.ok(APIResponse.success(vos));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /**
     * Resolve (pipeline name + status) → prompt_id.
     * Uses API Key auth (whitelisted from JWT). Called by the mwin SDK.
     */
    @GetMapping("/resolve")
    public ResponseEntity<APIResponse<PromptResolveVO>> resolvePrompt(
        @RequestHeader(value = "Authorization") String authorization,
        @RequestParam String name,
        @RequestParam(defaultValue = "production") String status,
        @RequestParam String projectName
    ) {
        try {
            String apiKey = ApiKeyUtils.extractApiKeyFromHttpHeader(authorization);
            if (!apiKeyService.isApiKeyExist(apiKey)) throw new AuthenticationException();
            UUID userId = apiKeyService.resolveUserIdFromApiKey(apiKey).orElseThrow(UserIdNotFoundException::new);
            UUID promptId = promptService.resolvePrompt(userId, projectName, name, status);
            return ResponseEntity.ok(APIResponse.success(PromptResolveVO.from(promptId)));
        } catch (AuthenticationException | UserIdNotFoundException e) {
            return ResponseEntity.badRequest().body(
                APIResponse.error("Invalid AITrace API key. Please ensure your API Key is valid and not expired.")
            );
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(APIResponse.notFound(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /** Create or update a deployment status label */
    @PostMapping("/status")
    public ResponseEntity<APIResponse<PromptStatusVO>> createOrUpdateStatus(
        HttpServletRequest request,
        @RequestBody CreateOrUpdateStatusRequest body
    ) {
        try {
            UUID userId = (UUID) request.getAttribute("userId");
            PromptStatus status = promptService.createOrUpdateStatus(body, userId);
            String version = promptService.findPromptById(status.getPromptId())
                .map(Prompt::getVersion).orElse(null);
            return ResponseEntity.ok(APIResponse.success(PromptStatusVO.from(status, version)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /** List deployment statuses for a pipeline */
    @GetMapping("/status/{promptPipelineId}")
    public ResponseEntity<APIResponse<List<PromptStatusVO>>> listStatuses(@PathVariable UUID promptPipelineId) {
        try {
            Map<UUID, String> versionMap = promptService.listPrompts(promptPipelineId).stream()
                .collect(Collectors.toMap(Prompt::getId, Prompt::getVersion));
            List<PromptStatusVO> vos = promptService.listStatuses(promptPipelineId).stream()
                .map(s -> PromptStatusVO.from(s, versionMap.get(s.getPromptId())))
                .toList();
            return ResponseEntity.ok(APIResponse.success(vos));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /** Delete a deployment status */
    @DeleteMapping("/status/{statusId}")
    public ResponseEntity<APIResponse<Void>> deleteStatus(@PathVariable UUID statusId) {
        try {
            promptService.deleteStatus(statusId);
            return ResponseEntity.ok(APIResponse.success(null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /** Update pipeline status (active / archived) */
    @PatchMapping("/pipeline/{pipelineId}/status")
    public ResponseEntity<APIResponse<Void>> updatePipelineStatus(
        @PathVariable UUID pipelineId,
        @RequestBody UpdatePromptStatusRequest body
    ) {
        try {
            promptService.updatePipelineStatus(pipelineId, body.getStatus());
            return ResponseEntity.ok(APIResponse.success(null));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(APIResponse.notFound(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /** Update prompt version status (current / deprecated / testing) */
    @PatchMapping("/{promptId}/status")
    public ResponseEntity<APIResponse<PromptVO>> updatePromptStatus(
        @PathVariable UUID promptId,
        @RequestBody UpdatePromptStatusRequest body
    ) {
        try {
            Prompt updated = promptService.updatePromptStatus(promptId, body);
            return ResponseEntity.ok(APIResponse.success(PromptVO.from(updated)));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(APIResponse.notFound(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    private PromptPipelineVO assemblePipelineVO(PromptPipeline pipeline) {
        List<Prompt> prompts = promptService.listPrompts(pipeline.getId());
        Map<UUID, String> versionMap = prompts.stream()
            .collect(Collectors.toMap(Prompt::getId, Prompt::getVersion));
        List<PromptStatusVO> statuses = promptService.listStatuses(pipeline.getId()).stream()
            .map(s -> PromptStatusVO.from(s, versionMap.get(s.getPromptId())))
            .toList();
        Map<UUID, PromptMetrics> metricsMap = promptService.buildMetricsMap(prompts);
        List<PromptGroupVO> groups = prompts.stream()
            .collect(Collectors.groupingBy(
                p -> p.getName() != null ? p.getName() : "",
                LinkedHashMap::new, Collectors.toList()
            ))
            .entrySet().stream()
            .map(e -> {
                List<PromptVO> versions = e.getValue().stream()
                    .map(p -> PromptVO.from(p, PromptMetricsVO.from(metricsMap.getOrDefault(p.getId(), PromptMetrics.empty()))))
                    .toList();
                String desc = e.getValue().stream().map(Prompt::getDescription)
                    .filter(d -> d != null && !d.isEmpty()).findFirst().orElse(null);
                return PromptGroupVO.builder().name(e.getKey()).description(desc).versions(versions).build();
            })
            .toList();
        return PromptPipelineVO.from(pipeline, prompts.size(), statuses, groups);
    }
}
