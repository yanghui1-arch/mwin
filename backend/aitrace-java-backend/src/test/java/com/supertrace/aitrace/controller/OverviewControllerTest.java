package com.supertrace.aitrace.controller;

import com.supertrace.aitrace.service.application.OverviewService;
import com.supertrace.aitrace.service.application.model.OverviewProjectTokenCurveData;
import com.supertrace.aitrace.service.application.model.OverviewSummaryData;
import com.supertrace.aitrace.service.application.model.OverviewTokenCurveData;
import com.supertrace.aitrace.service.application.model.OverviewTokenCurvePointData;
import com.supertrace.aitrace.service.application.model.OverviewTokenCurveQuery;
import com.supertrace.aitrace.service.application.model.OverviewTopCostDriversData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OverviewControllerTest {

    private MockMvc mockMvc;
    private OverviewService overviewService;

    @BeforeEach
    void setUp() {
        overviewService = mock(OverviewService.class);
        OverviewController controller = new OverviewController(overviewService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void getSummary_returns200WithSummaryData() throws Exception {
        UUID userId = UUID.randomUUID();
        OverviewSummaryData summary = new OverviewSummaryData(
            3,
            1200L,
            300L,
            450L,
            50.0,
            20.0
        );
        when(overviewService.getSummary(userId)).thenReturn(summary);

        mockMvc.perform(get("/api/v0/overview/summary").requestAttr("userId", userId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.tracked_project_count").value(3))
            .andExpect(jsonPath("$.data.today_total_tokens").value(450));
    }

    @Test
    void getTokenCurve_parsesProjectIdsAndReturnsSeries() throws Exception {
        UUID userId = UUID.randomUUID();
        OverviewTokenCurveData curve = new OverviewTokenCurveData(
            168,
            "day",
            List.of(1L, 2L),
            List.of(
                new OverviewProjectTokenCurveData(
                    1L,
                    "Alpha",
                    List.of(new OverviewTokenCurvePointData(LocalDateTime.of(2026, 4, 20, 0, 0), 30L))
                ),
                new OverviewProjectTokenCurveData(
                    2L,
                    "Beta",
                    List.of(new OverviewTokenCurvePointData(LocalDateTime.of(2026, 4, 20, 0, 0), 45L))
                )
            )
        );
        OverviewTokenCurveQuery query = new OverviewTokenCurveQuery(168, List.of(1L, 2L));
        when(overviewService.getTokenCurve(userId, query)).thenReturn(curve);

        mockMvc.perform(get("/api/v0/overview/token-curve")
                .requestAttr("userId", userId)
                .param("window_hours", "168")
                .param("project_ids", "1, 2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.window_hours").value(168))
            .andExpect(jsonPath("$.data.project_ids.length()").value(2))
            .andExpect(jsonPath("$.data.series[0].project_id").value(1))
            .andExpect(jsonPath("$.data.series[0].project_name").value("Alpha"))
            .andExpect(jsonPath("$.data.series[0].points[0].tokens").value(30));

        verify(overviewService).getTokenCurve(eq(userId), eq(query));
    }

    @Test
    void getTopCostDrivers_returnsGroupedCostDrivers() throws Exception {
        UUID userId = UUID.randomUUID();
        OverviewTopCostDriversData data = new OverviewTopCostDriversData(
            24,
            LocalDateTime.of(2026, 4, 20, 0, 0),
            LocalDateTime.of(2026, 4, 21, 0, 0),
            List.of(new OverviewTopCostDriversData.CostDriverData("Alpha", new BigDecimal("2.500000"), 100L, 40L, 60L, null, null, 1L, "Alpha", null, null)),
            List.of(new OverviewTopCostDriversData.CostDriverData("openai/gpt-4o", new BigDecimal("1.500000"), 80L, 30L, 50L, "openai", "openai/gpt-4o", null, null, null, null)),
            List.of(new OverviewTopCostDriversData.CostDriverData("trace checkout", new BigDecimal("1.250000"), 70L, 25L, 45L, "openai", "openai/gpt-4o", 1L, "Alpha", "trace-1", null)),
            List.of(new OverviewTopCostDriversData.CostDriverData("llm call", new BigDecimal("0.750000"), 40L, 15L, 25L, "openai", "openai/gpt-4o", 1L, "Alpha", "trace-1", "step-1"))
        );
        when(overviewService.getTopCostDrivers(userId, 24, 3)).thenReturn(data);

        mockMvc.perform(get("/api/v0/overview/top-cost-drivers")
                .requestAttr("userId", userId)
                .param("window_hours", "24")
                .param("limit", "3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.window_hours").value(24))
            .andExpect(jsonPath("$.data.projects[0].display_name").value("Alpha"))
            .andExpect(jsonPath("$.data.models[0].provider").value("openai"))
            .andExpect(jsonPath("$.data.traces[0].trace_id").value("trace-1"))
            .andExpect(jsonPath("$.data.steps[0].step_id").value("step-1"));

        verify(overviewService).getTopCostDrivers(userId, 24, 3);
    }
}
