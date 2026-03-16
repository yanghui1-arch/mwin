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
import com.supertrace.aitrace.vo.prompt.PromptGroupVO;
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
            UUID promptPipelineId = promptService.createPromptPipeline(body, userId);
            return ResponseEntity.ok(APIResponse.success(promptPipelineId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /** List all prompt pipelines for a project */
    @GetMapping("/{projectId}")
    public ResponseEntity<APIResponse<List<PromptPipelineVO>>> listPromptPipelines(
        @PathVariable Long projectId
    ) {
        try {
            List<PromptPipelineVO> vos = promptService.listPromptPipelines(projectId).stream()
                .map(this::toPromptPipelineVO)
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
            return ResponseEntity.ok(APIResponse.success(toPromptPipelineVO(pipeline)));
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

    /** Create a new prompt */
    @PostMapping("/version")
    public ResponseEntity<APIResponse<UUID>> createPrompt(
        HttpServletRequest request,
        @RequestBody CreatePromptRequest body
    ) {
        try {
            UUID userId = (UUID) request.getAttribute("userId");
            UUID promptId = promptService.createPrompt(body, userId);
            return ResponseEntity.ok(APIResponse.success(promptId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /** List prompts for a prompt pipeline */
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
     * Resolve (prompt pipeline name + status) → prompt_id (API Key auth, whitelisted from JWT).
     * Called by mwin SDK. Uses Authorization header for API key validation.
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
            if (!apiKeyService.isApiKeyExist(apiKey)) {
                throw new AuthenticationException();
            }
            UUID userId = apiKeyService.resolveUserIdFromApiKey(apiKey)
                .orElseThrow(UserIdNotFoundException::new);
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

    /** Create or update a status pointer */
    @PostMapping("/status")
    public ResponseEntity<APIResponse<PromptStatusVO>> createOrUpdateStatus(
        HttpServletRequest request,
        @RequestBody CreateOrUpdateStatusRequest body
    ) {
        try {
            UUID userId = (UUID) request.getAttribute("userId");
            PromptStatus status = promptService.createOrUpdateStatus(body, userId);
            String version = promptService.findPromptById(status.getPromptId())
                .map(Prompt::getVersion)
                .orElse(null);
            return ResponseEntity.ok(APIResponse.success(PromptStatusVO.from(status, version)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /** List statuses for a prompt pipeline */
    @GetMapping("/status/{promptPipelineId}")
    public ResponseEntity<APIResponse<List<PromptStatusVO>>> listStatuses(@PathVariable UUID promptPipelineId) {
        try {
            List<PromptStatus> statuses = promptService.listStatuses(promptPipelineId);
            Map<UUID, String> versionMap = promptService.listPrompts(promptPipelineId).stream()
                .collect(Collectors.toMap(Prompt::getId, Prompt::getVersion));
            List<PromptStatusVO> vos = statuses.stream()
                .map(s -> PromptStatusVO.from(s, versionMap.get(s.getPromptId())))
                .toList();
            return ResponseEntity.ok(APIResponse.success(vos));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /** Delete a status */
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


    // ─── Assembler ────────────────────────────────────────────────────────────

    private PromptPipelineVO toPromptPipelineVO(PromptPipeline pipeline) {
        List<Prompt> allPrompts = promptService.listPrompts(pipeline.getId());

        // Build version map for status VO resolution
        Map<UUID, String> versionMap = allPrompts.stream()
            .collect(Collectors.toMap(Prompt::getId, Prompt::getVersion));
        List<PromptStatusVO> statusVOs = promptService.listStatuses(pipeline.getId()).stream()
            .map(s -> PromptStatusVO.from(s, versionMap.get(s.getPromptId())))
            .toList();

        // Group prompt versions by name (null name → "" as fallback key)
        Map<String, List<Prompt>> grouped = allPrompts.stream()
            .collect(Collectors.groupingBy(
                p -> p.getName() != null ? p.getName() : "",
                LinkedHashMap::new,
                Collectors.toList()
            ));

        List<PromptGroupVO> promptGroups = grouped.entrySet().stream()
            .map(entry -> {
                List<PromptVO> versions = entry.getValue().stream()
                    .map(PromptVO::from)
                    .toList();
                String desc = entry.getValue().stream()
                    .map(Prompt::getDescription)
                    .filter(d -> d != null && !d.isEmpty())
                    .findFirst()
                    .orElse(null);
                return PromptGroupVO.builder()
                    .name(entry.getKey())
                    .description(desc)
                    .versions(versions)
                    .build();
            })
            .toList();

        return PromptPipelineVO.from(pipeline, allPrompts.size(), statusVOs, promptGroups);
    }
}
