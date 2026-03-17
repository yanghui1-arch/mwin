package com.supertrace.aitrace.controller;

import com.supertrace.aitrace.domain.core.prompt.Prompt;
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
import com.supertrace.aitrace.vo.prompt.PromptGroupSummaryVO;
import com.supertrace.aitrace.vo.prompt.PromptMetricsVO;
import com.supertrace.aitrace.vo.prompt.PromptPipelineVO;
import com.supertrace.aitrace.vo.prompt.PromptResolveVO;
import com.supertrace.aitrace.vo.prompt.PromptStatusVO;
import com.supertrace.aitrace.vo.prompt.PromptVO;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
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

    /** List all prompt pipelines for a project — counts only, no prompt data or metrics */
    @GetMapping("/{projectId}")
    public ResponseEntity<APIResponse<List<PromptPipelineVO>>> listPromptPipelines(
        @PathVariable Long projectId
    ) {
        try {
            List<PromptPipeline> pipelines = promptService.listPromptPipelines(projectId);
            List<UUID> ids = pipelines.stream().map(PromptPipeline::getId).toList();
            Map<UUID, long[]> counts = promptService.countPromptsByPipelines(ids);
            List<PromptPipelineVO> vos = pipelines.stream()
                .map(p -> {
                    long[] c = counts.getOrDefault(p.getId(), new long[]{0L, 0L});
                    return PromptPipelineVO.from(p, c[0], c[1]);
                })
                .toList();
            return ResponseEntity.ok(APIResponse.success(vos));
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

    /** Get full detail (content + metrics) for a single prompt version */
    @GetMapping("/version/{promptId}/detail")
    public ResponseEntity<APIResponse<PromptVO>> getVersionDetail(@PathVariable UUID promptId) {
        try {
            Prompt prompt = promptService.findPromptById(promptId)
                .orElseThrow(() -> new NoSuchElementException("Prompt not found: " + promptId));
            PromptMetricsVO metrics = promptService.buildMetricsMap(List.of(prompt))
                .entrySet().stream()
                .filter(e -> e.getKey().equals(promptId))
                .findFirst()
                .map(e -> PromptMetricsVO.from(e.getValue()))
                .orElse(PromptMetricsVO.empty());
            return ResponseEntity.ok(APIResponse.success(PromptVO.from(prompt, metrics)));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(APIResponse.notFound(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /** List prompts grouped by name for a pipeline — lightweight: id, version, status, createdAt only */
    @GetMapping("/pipeline/{pipelineId}/prompts")
    public ResponseEntity<APIResponse<List<PromptGroupSummaryVO>>> listPipelinePrompts(
        @PathVariable UUID pipelineId
    ) {
        try {
            List<Prompt> prompts = promptService.listPrompts(pipelineId);
            Map<String, List<Prompt>> grouped = new LinkedHashMap<>();
            for (Prompt p : prompts) {
                String key = p.getName() != null ? p.getName() : "";
                grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(p);
            }
            List<PromptGroupSummaryVO> result = grouped.entrySet().stream()
                .map(e -> PromptGroupSummaryVO.from(e.getKey(), e.getValue()))
                .toList();
            return ResponseEntity.ok(APIResponse.success(result));
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

    /** Update prompt version status (current / deprecated) */
    @PostMapping("/{promptId}/status")
    public ResponseEntity<APIResponse<String>> updatePromptStatus(
        @PathVariable UUID promptId,
        @RequestBody UpdatePromptStatusRequest request
    ) {
        try {
            String newStatus = request.getStatus();
            Prompt updatedPrompt = promptService.updatePromptStatus(promptId, newStatus);
            return ResponseEntity.ok(APIResponse.success(updatedPrompt.getStatus()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(APIResponse.notFound(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }
}
