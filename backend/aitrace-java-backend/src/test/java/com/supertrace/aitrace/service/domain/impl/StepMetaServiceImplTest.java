package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.domain.core.step.metadata.StepMeta;
import com.supertrace.aitrace.domain.core.step.metadata.StepMetadata;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import com.supertrace.aitrace.domain.core.usage.OpenRouterUsage;
import com.supertrace.aitrace.repository.StepMetaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StepMetaServiceImplTest {

    @Mock
    private StepMetaRepository stepMetaRepository;

    @InjectMocks
    private StepMetaServiceImpl service;

    private final UUID stepId = UUID.randomUUID();
    private final StepMetadata metadata = StepMetadata.builder().description("test step").build();

    // ── Provider validation ───────────────────────────────────────────────────

    @Test
    void addStepMeta_nullProvider_savesWithNullProvider() {
        // We can only observe the saved StepMeta since provider isn't stored on StepMeta.
        // The important thing is that the save is called without throwing.
        service.addStepMeta(stepId, metadata, null, null);
        verify(stepMetaRepository).save(any(StepMeta.class));
    }

    @Test
    void addStepMeta_validProvider_savesWithZeroCostWhenNoUsage() {
        // "OPENAI" is a valid LLMProvider enum value
        service.addStepMeta(stepId, metadata, "OPENAI", null);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());

        StepMeta saved = captor.getValue();
        assertEquals(BigDecimal.ZERO, saved.getCost(),
            "When usage is null, cost must be BigDecimal.ZERO");
    }

    @Test
    void addStepMeta_invalidProvider_savesWithoutThrowingException() {
        // An unrecognised provider must be silently treated as null (per the impl comment).
        assertDoesNotThrow(() -> service.addStepMeta(stepId, metadata, "NONEXISTENT_PROVIDER", null));
        verify(stepMetaRepository).save(any(StepMeta.class));
    }

    @Test
    void addStepMeta_emptyStringProvider_treatedAsInvalidSavesSuccessfully() {
        assertDoesNotThrow(() -> service.addStepMeta(stepId, metadata, "", null));
        verify(stepMetaRepository).save(any(StepMeta.class));
    }

    // ── Cost extraction from LLMUsage ─────────────────────────────────────────

    @Test
    void addStepMeta_nullUsage_costIsZero() {
        service.addStepMeta(stepId, metadata, "OPENAI", null);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals(BigDecimal.ZERO, captor.getValue().getCost());
    }

    @Test
    void addStepMeta_baseLLMUsageCostIsNull_costFallsBackToZero() {
        // Base LLMUsage.getCost() returns null → must be treated as ZERO
        LLMUsage baseUsage = new LLMUsage(100, 50, 150, null, null);

        service.addStepMeta(stepId, metadata, "OPENAI", baseUsage);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals(BigDecimal.ZERO, captor.getValue().getCost());
    }

    @Test
    void addStepMeta_openRouterUsageWithCost_costIsUsed() {
        BigDecimal expectedCost = new BigDecimal("0.00123");
        OpenRouterUsage usage = new OpenRouterUsage(expectedCost, null);

        service.addStepMeta(stepId, metadata, "OPEN_ROUTER", usage);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals(expectedCost, captor.getValue().getCost());
    }

    @Test
    void addStepMeta_openRouterUsageWithNullCost_costFallsBackToZero() {
        OpenRouterUsage usage = new OpenRouterUsage(null, null);

        service.addStepMeta(stepId, metadata, "OPEN_ROUTER", usage);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals(BigDecimal.ZERO, captor.getValue().getCost());
    }

    // ── StepId is passed correctly ────────────────────────────────────────────

    @Test
    void addStepMeta_stepIdIsSetOnSavedEntity() {
        service.addStepMeta(stepId, metadata, null, null);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals(stepId, captor.getValue().getId());
    }

    // ── Metadata is passed correctly ──────────────────────────────────────────

    @Test
    void addStepMeta_metadataIsSetOnSavedEntity() {
        service.addStepMeta(stepId, metadata, null, null);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals("test step", captor.getValue().getMetadata().getDescription());
    }
}
