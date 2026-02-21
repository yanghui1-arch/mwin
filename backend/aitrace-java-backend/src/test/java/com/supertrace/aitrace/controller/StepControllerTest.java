package com.supertrace.aitrace.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.domain.core.step.StepOutput;
import com.supertrace.aitrace.dto.step.LogStepRequest;
import com.supertrace.aitrace.service.application.ApiKeyService;
import com.supertrace.aitrace.service.application.LogService;
import com.supertrace.aitrace.service.application.QueryService;
import com.supertrace.aitrace.service.domain.StepMetaService;
import com.supertrace.aitrace.service.domain.StepService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller unit tests using standalone MockMvc setup.
 * No Spring application context is loaded – all dependencies are mocked.
 */
class StepControllerTest {

    private MockMvc mockMvc;

    private LogService logService;
    private QueryService queryService;
    private ApiKeyService apiKeyService;
    private StepService stepService;
    private StepMetaService stepMetaService;

    private ObjectMapper mapper;

    @BeforeEach
    void setUp() {
        logService = mock(LogService.class);
        queryService = mock(QueryService.class);
        apiKeyService = mock(ApiKeyService.class);
        stepService = mock(StepService.class);
        stepMetaService = mock(StepMetaService.class);

        StepController controller = new StepController(logService, queryService, apiKeyService, stepService, stepMetaService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();

        mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    private String buildLogStepJson() throws Exception {
        LogStepRequest req = new LogStepRequest();
        req.setProjectName("proj");
        req.setStepName("step1");
        req.setStepId(UUID.randomUUID().toString());
        req.setTraceId(UUID.randomUUID().toString());
        req.setStepType("llm_response");
        req.setTags(List.of("t1"));
        req.setStartTime(LocalDateTime.now());
        return mapper.writeValueAsString(req);
    }

    // ── POST /api/v0/log/step ─────────────────────────────────────────────────

    @Test
    void logStep_validApiKey_returns200WithStepId() throws Exception {
        UUID stepId = UUID.randomUUID();
        when(apiKeyService.isApiKeyExist(any())).thenReturn(true);
        when(apiKeyService.resolveUserIdFromApiKey(any())).thenReturn(Optional.of(UUID.randomUUID()));
        when(logService.logStep(any(), any())).thenReturn(stepId);

        mockMvc.perform(post("/api/v0/log/step")
                .header("Authorization", "Bearer at-validkey123456789012345678901")
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildLogStepJson()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data").value(stepId.toString()));
    }

    @Test
    void logStep_apiKeyNotFound_returns400() throws Exception {
        when(apiKeyService.isApiKeyExist(any())).thenReturn(false);

        mockMvc.perform(post("/api/v0/log/step")
                .header("Authorization", "Bearer at-invalid")
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildLogStepJson()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void logStep_apiKeyExistsButUserNotFound_returns400() throws Exception {
        when(apiKeyService.isApiKeyExist(any())).thenReturn(true);
        when(apiKeyService.resolveUserIdFromApiKey(any())).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v0/log/step")
                .header("Authorization", "Bearer at-keyexists")
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildLogStepJson()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void logStep_logServiceThrows_returns400WithErrorMessage() throws Exception {
        when(apiKeyService.isApiKeyExist(any())).thenReturn(true);
        when(apiKeyService.resolveUserIdFromApiKey(any())).thenReturn(Optional.of(UUID.randomUUID()));
        when(logService.logStep(any(), any())).thenThrow(new RuntimeException("DB error"));

        mockMvc.perform(post("/api/v0/log/step")
                .header("Authorization", "Bearer at-somekey")
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildLogStepJson()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(400))
            .andExpect(jsonPath("$.message").value("DB error"));
    }

    @Test
    void logStep_missingAuthorizationHeader_returns400() throws Exception {
        // Without auth header the request still reaches the controller
        // which will try to extract key from null and will throw
        mockMvc.perform(post("/api/v0/log/step")
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildLogStepJson()))
            .andExpect(status().isBadRequest());
    }

    // ── GET /api/v0/step/{projectName} ────────────────────────────────────────

    @Test
    void getStep_projectFound_returns200WithPageVO() throws Exception {
        UUID userId = UUID.randomUUID();
        Step step = Step.builder()
            .id(UUID.randomUUID()).name("step1").traceId(UUID.randomUUID())
            .type("llm_response").tags(List.of()).input(new HashMap<>())
            .output(StepOutput.builder().build())
            .projectName("proj").projectId(1L).startTime(LocalDateTime.now())
            .build();
        Page<Step> page = new PageImpl<>(List.of(step));

        when(queryService.getSteps(eq(userId), eq("proj"), eq(0), eq(15))).thenReturn(page);

        mockMvc.perform(get("/api/v0/step/proj")
                .requestAttr("userId", userId)
                .param("page", "0")
                .param("pageSize", "15"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.data").isArray())
            .andExpect(jsonPath("$.data.data.length()").value(1))
            .andExpect(jsonPath("$.data.pageCount").value(1));
    }

    @Test
    void getStep_defaultPagination_usesDefaultValues() throws Exception {
        UUID userId = UUID.randomUUID();
        when(queryService.getSteps(any(), any(), eq(0), eq(15))).thenReturn(Page.empty());

        mockMvc.perform(get("/api/v0/step/proj")
                .requestAttr("userId", userId))
            .andExpect(status().isOk());

        verify(queryService).getSteps(any(), eq("proj"), eq(0), eq(15));
    }

    @Test
    void getStep_queryServiceThrows_returns400() throws Exception {
        UUID userId = UUID.randomUUID();
        when(queryService.getSteps(any(), any(), anyInt(), anyInt()))
            .thenThrow(new RuntimeException("Project not found: proj"));

        mockMvc.perform(get("/api/v0/step/proj")
                .requestAttr("userId", userId))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(400));
    }

    // ── POST /api/v0/step/delete ──────────────────────────────────────────────

    @Test
    void deleteSteps_validUUIDs_returns200WithDeletedIds() throws Exception {
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        List<UUID> ids = List.of(id1, id2);
        when(stepService.deleteStepsByStepUUID(ids)).thenReturn(ids);

        mockMvc.perform(post("/api/v0/step/delete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(List.of(id1.toString(), id2.toString()))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    void deleteSteps_invalidUUIDFormat_returns400() throws Exception {
        mockMvc.perform(post("/api/v0/step/delete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(List.of("not-a-uuid"))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(400))
            .andExpect(jsonPath("$.message").value("Please ensure step id to delete is correct."));
    }

    @Test
    void deleteSteps_emptyList_returns200() throws Exception {
        when(stepService.deleteStepsByStepUUID(List.of())).thenReturn(List.of());

        mockMvc.perform(post("/api/v0/step/delete")
                .contentType(MediaType.APPLICATION_JSON)
                .content("[]"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void deleteSteps_stepServiceThrows_returns400WithMessage() throws Exception {
        UUID id = UUID.randomUUID();
        when(stepService.deleteStepsByStepUUID(any())).thenThrow(new RuntimeException("delete failed"));

        mockMvc.perform(post("/api/v0/step/delete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(List.of(id.toString()))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("delete failed"));
    }
}
