package com.supertrace.aitrace.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.supertrace.aitrace.dto.step.LogStepRequest;
import com.supertrace.aitrace.service.application.ApiKeyService;
import com.supertrace.aitrace.service.application.LogService;
import com.supertrace.aitrace.service.application.QueryService;
import com.supertrace.aitrace.service.domain.StepMetaService;
import com.supertrace.aitrace.service.domain.StepService;
import com.supertrace.aitrace.service.application.model.StepSummary;
import com.supertrace.aitrace.service.storage.model.StoredPayload;
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

        StepController controller = new StepController(
            logService,
            queryService,
            apiKeyService,
            stepService,
            stepMetaService
        );
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
        StepSummary step = new StepSummary(
            UUID.randomUUID(), null, "step1", "llm_response", List.of(), null,
            null, null, LocalDateTime.now(), LocalDateTime.now(), 128L
        );
        Page<StepSummary> page = new PageImpl<>(List.of(step));

        when(queryService.getSteps(eq(userId), eq("proj"), eq(0), eq(15))).thenReturn(page);

        mockMvc.perform(get("/api/v0/step/proj")
                .requestAttr("userId", userId)
                .param("page", "0")
                .param("pageSize", "15"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.data").isArray())
            .andExpect(jsonPath("$.data.data.length()").value(1))
            .andExpect(jsonPath("$.data.data[0].input").doesNotExist())
            .andExpect(jsonPath("$.data.data[0].output").doesNotExist())
            .andExpect(jsonPath("$.data.data[0].payloadSize").value(128))
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

    // ── GET /api/v0/step/{stepId}/payload ───────────────────────────────────

    @Test
    void getStepPayload_ownedStep_returnsPayload() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID stepId = UUID.randomUUID();
        StoredPayload payload = new StoredPayload(
            mapper.valueToTree(Map.of("prompt", "hello")),
            mapper.valueToTree(Map.of("answer", "world"))
        );
        when(stepService.getOwnedStepPayload(userId, stepId)).thenReturn(payload);

        mockMvc.perform(get("/api/v0/step/{stepId}/payload", stepId)
                .requestAttr("userId", userId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.input.prompt").value("hello"))
            .andExpect(jsonPath("$.data.output.answer").value("world"));

        verify(stepService).getOwnedStepPayload(userId, stepId);
    }

    @Test
    void getStepPayload_stepNotOwned_returns400() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID stepId = UUID.randomUUID();
        when(stepService.getOwnedStepPayload(userId, stepId))
            .thenThrow(new RuntimeException("Step not found"));

        mockMvc.perform(get("/api/v0/step/{stepId}/payload", stepId)
                .requestAttr("userId", userId))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Step not found"));
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
