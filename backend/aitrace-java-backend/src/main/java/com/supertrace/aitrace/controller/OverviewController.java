package com.supertrace.aitrace.controller;

import com.supertrace.aitrace.response.APIResponse;
import com.supertrace.aitrace.service.application.OverviewService;
import com.supertrace.aitrace.service.application.model.OverviewTokenCurveQuery;
import com.supertrace.aitrace.vo.overview.OverviewSummaryVO;
import com.supertrace.aitrace.vo.overview.OverviewTokenCurveVO;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v0/overview")
@RequiredArgsConstructor
public class OverviewController {
    private static final int DEFAULT_WINDOW_HOURS = 24 * 30;

    private final OverviewService overviewService;

    @GetMapping("/summary")
    public ResponseEntity<APIResponse<OverviewSummaryVO>> getSummary(HttpServletRequest request) {
        try {
            UUID userId = (UUID) request.getAttribute("userId");
            return ResponseEntity.ok(APIResponse.success(OverviewSummaryVO.from(overviewService.getSummary(userId))));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/token-curve")
    public ResponseEntity<APIResponse<OverviewTokenCurveVO>> getTokenCurve(
        HttpServletRequest request,
        @RequestParam(name = "window_hours", required = false, defaultValue = "720") Integer windowHours,
        @RequestParam(name = "project_ids", required = false) String projectIds
    ) {
        try {
            UUID userId = (UUID) request.getAttribute("userId");
            OverviewTokenCurveQuery query = new OverviewTokenCurveQuery(
                windowHours == null ? DEFAULT_WINDOW_HOURS : windowHours,
                parseProjectIds(projectIds)
            );
            return ResponseEntity.ok(APIResponse.success(OverviewTokenCurveVO.from(overviewService.getTokenCurve(userId, query))));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(APIResponse.error(e.getMessage()));
        }
    }

    private List<Long> parseProjectIds(String projectIds) {
        if (projectIds == null || projectIds.isBlank()) {
            return List.of();
        }
        return Arrays.stream(projectIds.split(","))
            .map(String::trim)
            .filter(value -> !value.isEmpty())
            .map(Long::valueOf)
            .toList();
    }
}
