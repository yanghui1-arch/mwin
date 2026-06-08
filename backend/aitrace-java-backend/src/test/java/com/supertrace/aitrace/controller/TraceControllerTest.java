package com.supertrace.aitrace.controller;

import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.dto.trace.TraceSearchCriteria;
import com.supertrace.aitrace.service.application.ApiKeyService;
import com.supertrace.aitrace.service.application.DeleteService;
import com.supertrace.aitrace.service.application.LogService;
import com.supertrace.aitrace.service.application.QueryService;
import com.supertrace.aitrace.service.domain.StepMetaService;
import com.supertrace.aitrace.service.domain.StepService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TraceControllerTest {
    private MockMvc mockMvc;
    private QueryService queryService;

    @BeforeEach
    void setUp() {
        ApiKeyService apiKeyService = mock(ApiKeyService.class);
        LogService logService = mock(LogService.class);
        queryService = mock(QueryService.class);
        DeleteService deleteService = mock(DeleteService.class);
        StepService stepService = mock(StepService.class);
        StepMetaService stepMetaService = mock(StepMetaService.class);

        TraceController controller = new TraceController(
            apiKeyService,
            logService,
            queryService,
            deleteService,
            stepService,
            stepMetaService
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void getTrace_filterQueryParams_buildsSearchCriteriaAndKeepsPagination() throws Exception {
        UUID userId = UUID.randomUUID();
        when(queryService.getTraces(any(), any(), anyInt(), anyInt(), any())).thenReturn(Page.<Trace>empty());

        mockMvc.perform(get("/api/v0/trace/proj")
                .requestAttr("userId", userId)
                .param("page", "2")
                .param("pageSize", "25")
                .param("start_time_from", "2024-01-01 10:00:00")
                .param("start_time_to", "2024-01-02 11:30:00")
                .param("has_error", "false")
                .param("tag", "prod")
                .param("keyword", "timeout")
                .param("min_duration_ms", "100")
                .param("max_duration_ms", "5000"))
            .andExpect(status().isOk());

        verify(queryService).getTraces(eq(userId), eq("proj"), eq(2), eq(25), argThat(criteria ->
            criteria.getStartTimeFrom().equals(LocalDateTime.of(2024, 1, 1, 10, 0))
                && criteria.getStartTimeTo().equals(LocalDateTime.of(2024, 1, 2, 11, 30))
                && Boolean.FALSE.equals(criteria.getHasError())
                && criteria.getTag().equals("prod")
                && criteria.getKeyword().equals("timeout")
                && criteria.getMinDurationMs().equals(100L)
                && criteria.getMaxDurationMs().equals(5000L)
        ));
    }

    @Test
    void getTrace_defaultPagination_usesDefaultValues() throws Exception {
        UUID userId = UUID.randomUUID();
        when(queryService.getTraces(any(), any(), anyInt(), anyInt(), any())).thenReturn(Page.<Trace>empty());

        mockMvc.perform(get("/api/v0/trace/proj")
                .requestAttr("userId", userId))
            .andExpect(status().isOk());

        verify(queryService).getTraces(eq(userId), eq("proj"), eq(0), eq(10), any(TraceSearchCriteria.class));
    }
}
