package com.supertrace.aitrace.controller;

import com.supertrace.aitrace.service.application.ApiKeyService;
import com.supertrace.aitrace.service.application.DeleteService;
import com.supertrace.aitrace.service.application.LogService;
import com.supertrace.aitrace.service.application.QueryService;
import com.supertrace.aitrace.service.application.model.TraceSummary;
import com.supertrace.aitrace.service.domain.StepMetaService;
import com.supertrace.aitrace.service.domain.StepService;
import com.supertrace.aitrace.service.domain.TraceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller tests for the Trace list endpoint using a standalone MockMvc
 * setup with mocked dependencies. No Spring application context is loaded.
 */
class TraceControllerTest {

    private MockMvc mockMvc;

    private QueryService queryService;

    @BeforeEach
    void setUp() {
        queryService = mock(QueryService.class);
        TraceController controller = new TraceController(
            mock(ApiKeyService.class),
            mock(LogService.class),
            queryService,
            mock(DeleteService.class),
            mock(StepService.class),
            mock(StepMetaService.class),
            mock(TraceService.class)
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void getTrace_returnsSizeAndStepCountColumns() throws Exception {
        UUID userId = UUID.randomUUID();
        TraceSummary trace = new TraceSummary(
            UUID.randomUUID(), null, "trace1", List.of("t1"), null,
            LocalDateTime.now(), LocalDateTime.now(), 256L, 3L
        );
        when(queryService.getTraces(eq(userId), eq("proj"), eq(0), eq(10)))
            .thenReturn(new PageImpl<>(List.of(trace)));

        mockMvc.perform(get("/api/v0/trace/proj")
                .requestAttr("userId", userId)
                .param("page", "0")
                .param("pageSize", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.data[0].name").value("trace1"))
            .andExpect(jsonPath("$.data.data[0].payloadSize").value(256))
            .andExpect(jsonPath("$.data.data[0].stepCount").value(3))
            .andExpect(jsonPath("$.data.pageCount").value(1));
    }
}
