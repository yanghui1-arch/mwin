package com.supertrace.aitrace.controller;

import com.supertrace.aitrace.dto.trace.GetTracksRequest;
import com.supertrace.aitrace.dto.trace.LogTraceRequest;
import com.supertrace.aitrace.exception.AuthenticationException;
import com.supertrace.aitrace.exception.UserIdNotFoundException;
import com.supertrace.aitrace.response.APIResponse;
import com.supertrace.aitrace.service.application.ApiKeyService;
import com.supertrace.aitrace.service.application.DeleteService;
import com.supertrace.aitrace.service.application.LogService;
import com.supertrace.aitrace.service.application.QueryService;
import com.supertrace.aitrace.service.domain.StepMetaService;
import com.supertrace.aitrace.service.domain.StepService;
import com.supertrace.aitrace.service.domain.TraceService;
import com.supertrace.aitrace.service.application.model.StepSummary;
import com.supertrace.aitrace.service.application.model.TraceSummary;
import com.supertrace.aitrace.service.storage.model.StoredPayload;
import com.supertrace.aitrace.utils.ApiKeyUtils;
import com.supertrace.aitrace.vo.PageVO;
import com.supertrace.aitrace.vo.trace.GetTraceVO;
import com.supertrace.aitrace.vo.trace.TrackVO;
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
@RequiredArgsConstructor
@RequestMapping("/api/v0")
public class TraceController {
    private final ApiKeyService apiKeyService;
    private final LogService logService;
    private final QueryService queryService;
    private final DeleteService deleteService;
    private final StepService stepService;
    private final StepMetaService stepMetaService;
    private final TraceService traceService;

    @PostMapping("/log/trace")
    public ResponseEntity<APIResponse<UUID>> createAndLogStep(
        @RequestHeader(value = "Authorization") String authorization,
        @RequestBody LogTraceRequest logTraceRequest
    ) {
        try {
            String apikey = ApiKeyUtils.extractApiKeyFromHttpHeader(authorization);
            boolean isExisted = this.apiKeyService.isApiKeyExist(apikey);
            if (!isExisted) {
                throw new AuthenticationException();
            }
            UUID userId = this.apiKeyService.resolveUserIdFromApiKey(apikey)
                .orElseThrow(UserIdNotFoundException::new);
            UUID traceId = this.logService.logTrace(userId, logTraceRequest);
            return ResponseEntity.ok(APIResponse.success(traceId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/trace/{projectName}")
    public ResponseEntity<APIResponse<PageVO<GetTraceVO>>> getTrace(
        HttpServletRequest request,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int pageSize,
        @PathVariable("projectName") String projectName
    ) {
        try {
            UUID userId = (UUID) request.getAttribute("userId");
            Page<TraceSummary> traces = this.queryService.getTraces(userId, projectName, page, pageSize);
            List<GetTraceVO> getTraceVOs = traces.stream()
                .map(trace -> GetTraceVO.builder()
                    .id(trace.id())
                    .parentTraceId(trace.parentTraceId())
                    .name(trace.name())
                    .tags(trace.tags())
                    .errorInfo(trace.errorInfo())
                    .startTime(trace.startTime())
                    .lastUpdateTimestamp(trace.lastUpdateTimestamp())
                    .payloadSize(trace.payloadSize())
                    .stepCount(trace.stepCount())
                    .build()
                )
                .toList();
            PageVO<GetTraceVO> pageVO = PageVO.<GetTraceVO>builder()
                .data(getTraceVOs)
                .pageCount(traces.getTotalPages())
                .build();
            return ResponseEntity.ok(APIResponse.success(pageVO));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    /**
     * Lazily loads a Trace's input and output from object storage.
     *
     * @param request authenticated request containing the user ID
     * @param traceId ID of the Trace to load
     * @return the Trace input and output
     */
    @GetMapping("/trace/{traceId}/payload")
    public ResponseEntity<APIResponse<StoredPayload>> getTracePayload(
        HttpServletRequest request,
        @PathVariable String traceId
    ) {
        try {
            UUID userId = (UUID) request.getAttribute("userId");
            StoredPayload payload = this.traceService.getOwnedTracePayload(
                userId,
                UUID.fromString(traceId)
            );
            return ResponseEntity.ok(APIResponse.success(payload));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/trace/delete")
    public ResponseEntity<APIResponse<List<UUID>>> deleteSteps(@RequestBody List<String> traceIds) {
        try {
            List<UUID> tracesUUIDToDelete = traceIds.stream().map(UUID::fromString).toList();
            List<UUID> tracesUUIDToDeleteSuccess = this.deleteService.deleteTracesAndRelatedStepsByTraceIds(tracesUUIDToDelete);
            return ResponseEntity.ok(APIResponse.success(tracesUUIDToDeleteSuccess));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(APIResponse.error("Please ensure trace id to delete is correct."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/trace/get_tracks")
    public ResponseEntity<APIResponse<List<TrackVO>>> getTracks(
        HttpServletRequest httpRequest,
        @RequestBody GetTracksRequest request
    ) {
        try {
            UUID userId = (UUID) httpRequest.getAttribute("userId");
            List<StepSummary> steps = this.stepService.findStepSummariesByTraceId(
                userId,
                UUID.fromString(request.getTraceId())
            );
            List<UUID> stepIds = steps.stream().map(StepSummary::id).toList();
            Map<UUID, BigDecimal> costMap = this.stepMetaService.findCostsByStepIds(stepIds);
            List<TrackVO> tracks = steps.stream()
                .map(s -> TrackVO.builder()
                    .id(s.id())
                    .parentStepId(s.parentStepId())
                    .name(s.name())
                    .type(s.type())
                    .tags(s.tags())
                    .errorInfo(s.errorInfo())
                    .model(s.model())
                    .usage(s.usage())
                    .cost(costMap.get(s.id()))
                    .startTime(s.startTime())
                    .endTime(s.endTime())
                    .build())
                .toList();
            return ResponseEntity.ok(APIResponse.success(tracks));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }
}
