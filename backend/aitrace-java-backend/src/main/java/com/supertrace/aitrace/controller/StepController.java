package com.supertrace.aitrace.controller;

import com.supertrace.aitrace.dto.step.LogStepRequest;
import com.supertrace.aitrace.exception.AuthenticationException;
import com.supertrace.aitrace.exception.UserIdNotFoundException;
import com.supertrace.aitrace.response.APIResponse;
import com.supertrace.aitrace.service.application.ApiKeyService;
import com.supertrace.aitrace.service.application.LogService;
import com.supertrace.aitrace.service.application.QueryService;
import com.supertrace.aitrace.service.domain.StepMetaService;
import com.supertrace.aitrace.service.domain.StepService;
import com.supertrace.aitrace.service.application.model.StepSummary;
import com.supertrace.aitrace.service.storage.model.StoredPayload;
import com.supertrace.aitrace.utils.ApiKeyUtils;
import com.supertrace.aitrace.vo.PageVO;
import com.supertrace.aitrace.vo.step.GetStepVO;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v0")
@RequiredArgsConstructor
public class StepController {
    private final LogService logService;
    private final QueryService queryService;
    private final ApiKeyService apiKeyService;
    private final StepService stepService;
    private final StepMetaService stepMetaService;

    @PostMapping("/log/step")
    public ResponseEntity<APIResponse<UUID>> createAndLogStep(
        @RequestHeader(value = "Authorization") String authorization,
        @RequestBody LogStepRequest logStepRequest
    ) {
        try {
            String apikey = ApiKeyUtils.extractApiKeyFromHttpHeader(authorization);
            boolean isExisted = this.apiKeyService.isApiKeyExist(apikey);
            if (!isExisted) {
                throw new AuthenticationException();
            }
            UUID userId = this.apiKeyService.resolveUserIdFromApiKey(apikey)
                .orElseThrow(UserIdNotFoundException::new);
            UUID stepId = this.logService.logStep(userId, logStepRequest);
            return ResponseEntity.ok(APIResponse.success(stepId));
        } catch (AuthenticationException | UserIdNotFoundException e) {
            return ResponseEntity.badRequest().body(APIResponse.error("Invalid AITrace API key. Please ensure your API Key is valid and not expired."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /**
     * Get a summary of step excluding input and output
     * This API is for displaying the overview of steps
     *
     * @param request http servlet request
     * @param projectName project name
     * @param page page order
     * @param pageSize page size
     * @return a list of step excludes input and output
     */
    @GetMapping("/step/{projectName}")
    public ResponseEntity<APIResponse<PageVO<GetStepVO>>> getStep(
        HttpServletRequest request,
        @PathVariable String projectName,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "15") int pageSize
    ) {
        try {
            UUID userId = (UUID) request.getAttribute("userId");
            Page<StepSummary> steps = this.queryService.getSteps(userId, projectName, page, pageSize);
            List<UUID> stepIds = steps.stream().map(StepSummary::id).toList();
            Map<UUID, BigDecimal> costMap = this.stepMetaService.findCostsByStepIds(stepIds);
            List<GetStepVO> getStepVOs = steps.stream()
                .map(step -> GetStepVO.builder()
                    .id(step.id())
                    .parentStepId(step.parentStepId())
                    .name(step.name())
                    .type(step.type())
                    .tags(step.tags())
                    .errorInfo(step.errorInfo())
                    .model(step.model())
                    .usage(step.usage())
                    .startTime(step.startTime())
                    .endTime(step.endTime())
                    .cost(costMap.get(step.id()))
                    .payloadSize(step.payloadSize())
                    .build()
                )
                .toList();
            PageVO<GetStepVO> pageVO = PageVO.<GetStepVO>builder()
                .data(getStepVOs)
                .pageCount(steps.getTotalPages())
                .build();
            return ResponseEntity.ok(APIResponse.success(pageVO));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /**
     * Lazily loads a Step's input and output from object storage.
     *
     * @param request authenticated request containing the user ID
     * @param stepId ID of the Step to load
     * @return the Step input and output
     */
    @GetMapping("/step/{stepId}/payload")
    public ResponseEntity<APIResponse<StoredPayload>> getStepPayload(
        HttpServletRequest request,
        @PathVariable String stepId
    ) {
        try {
            UUID userId = (UUID) request.getAttribute("userId");
            StoredPayload payload = this.stepService.getOwnedStepPayload(
                userId,
                UUID.fromString(stepId)
            );
            return ResponseEntity.ok(APIResponse.success(payload));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/step/delete")
    public ResponseEntity<APIResponse<List<UUID>>> deleteSteps(@RequestBody List<String> stepIds) {
        try {
            List<UUID> stepsUUIDToDelete = stepIds.stream().map(UUID::fromString).toList();
            List<UUID> stepsUUIDToDeleteSuccess = this.stepService.deleteStepsByStepUUID(stepsUUIDToDelete);
            return ResponseEntity.ok(APIResponse.success(stepsUUIDToDeleteSuccess));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(APIResponse.error("Please ensure step id to delete is correct."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }
}
