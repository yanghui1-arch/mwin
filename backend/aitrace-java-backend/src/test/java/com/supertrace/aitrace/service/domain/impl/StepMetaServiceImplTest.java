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
import java.util.Optional;
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

    // ── Provider validation ───────────────────────────────────────────────────

    @Test
    void addStepMeta_nullProvider_savesWithoutThrowing() {
        service.addStepMeta(stepId, null, null, null, null);
        verify(stepMetaRepository).save(any(StepMeta.class));
    }

    @Test
    void addStepMeta_validProvider_savesWithZeroCostWhenNoUsage() {
        service.addStepMeta(stepId, null, "OPENAI", null, null);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals(BigDecimal.ZERO, captor.getValue().getCost(),
            "When usage is null, cost must be BigDecimal.ZERO");
    }

    @Test
    void addStepMeta_invalidProvider_savesWithoutThrowingException() {
        assertDoesNotThrow(() -> service.addStepMeta(stepId, null, "NONEXISTENT_PROVIDER", null, null));
        verify(stepMetaRepository).save(any(StepMeta.class));
    }

    @Test
    void addStepMeta_emptyStringProvider_treatedAsInvalidSavesSuccessfully() {
        assertDoesNotThrow(() -> service.addStepMeta(stepId, null, "", null, null));
        verify(stepMetaRepository).save(any(StepMeta.class));
    }

    // ── Cost extraction from LLMUsage ─────────────────────────────────────────

    @Test
    void addStepMeta_nullUsage_costIsZero() {
        service.addStepMeta(stepId, null, "OPENAI", null, null);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals(BigDecimal.ZERO, captor.getValue().getCost());
    }

    @Test
    void addStepMeta_baseLLMUsageCostIsNull_costFallsBackToZero() {
        // Base LLMUsage.getCost() returns null → must be treated as ZERO
        LLMUsage baseUsage = new LLMUsage(100, 50, 150, null, null);

        service.addStepMeta(stepId, null, "OPENAI", null, baseUsage);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals(BigDecimal.ZERO, captor.getValue().getCost());
    }

    @Test
    void addStepMeta_openRouterUsageWithCost_costIsUsed() {
        BigDecimal expectedCost = new BigDecimal("0.00123");
        OpenRouterUsage usage = new OpenRouterUsage(expectedCost, null);

        service.addStepMeta(stepId, null, "OPEN_ROUTER", null, usage);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals(expectedCost, captor.getValue().getCost());
    }

    @Test
    void addStepMeta_openRouterUsageWithNullCost_costFallsBackToZero() {
        OpenRouterUsage usage = new OpenRouterUsage(null, null);

        service.addStepMeta(stepId, null, "OPEN_ROUTER", null, usage);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals(BigDecimal.ZERO, captor.getValue().getCost());
    }

    // ── StepId and description are stored correctly ───────────────────────────

    @Test
    void addStepMeta_stepIdIsSetOnSavedEntity() {
        service.addStepMeta(stepId, null, null, null, null);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals(stepId, captor.getValue().getId());
    }

    @Test
    void addStepMeta_descriptionIsSetOnSavedEntity() {
        service.addStepMeta(stepId, "test step", null, null, null);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals("test step", captor.getValue().getMetadata().getDescription());
    }

    // ── Second-call (upsert / merge) behaviour ────────────────────────────────

    @Test
    void addStepMeta_secondCall_preservesCostWhenNewCostIsZero() {
        BigDecimal existingCost = new BigDecimal("0.00123");
        when(stepMetaRepository.findById(stepId)).thenReturn(Optional.of(
            StepMeta.builder()
                .id(stepId)
                .metadata(StepMetadata.builder().description("desc").build())
                .cost(existingCost)
                .build()
        ));

        // Second call carries no usage → newCost = 0
        service.addStepMeta(stepId, null, null, null, null);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals(existingCost, captor.getValue().getCost(),
            "A zero new-cost must never overwrite an already-stored non-zero cost");
    }

    @Test
    void addStepMeta_secondCall_updatesCostWhenImproved() {
        when(stepMetaRepository.findById(stepId)).thenReturn(Optional.of(
            StepMeta.builder()
                .id(stepId)
                .metadata(StepMetadata.builder().description("desc").build())
                .cost(BigDecimal.ZERO)
                .build()
        ));

        BigDecimal newCost = new BigDecimal("0.00456");
        service.addStepMeta(stepId, null, "OPEN_ROUTER", null, new OpenRouterUsage(newCost, null));

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals(newCost, captor.getValue().getCost(),
            "A non-zero new-cost must replace a previously-stored zero cost");
    }

    @Test
    void addStepMeta_secondCall_updatesDescriptionWhenProvided() {
        when(stepMetaRepository.findById(stepId)).thenReturn(Optional.of(
            StepMeta.builder()
                .id(stepId)
                .metadata(StepMetadata.builder().description(null).build())
                .cost(BigDecimal.ZERO)
                .build()
        ));

        service.addStepMeta(stepId, "new description", null, null, null);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals("new description", captor.getValue().getMetadata().getDescription());
    }

    @Test
    void addStepMeta_secondCall_preservesDescriptionWhenNewIsNull() {
        when(stepMetaRepository.findById(stepId)).thenReturn(Optional.of(
            StepMeta.builder()
                .id(stepId)
                .metadata(StepMetadata.builder().description("keep this").build())
                .cost(BigDecimal.ZERO)
                .build()
        ));

        service.addStepMeta(stepId, null, null, null, null);

        ArgumentCaptor<StepMeta> captor = ArgumentCaptor.forClass(StepMeta.class);
        verify(stepMetaRepository).save(captor.capture());
        assertEquals("keep this", captor.getValue().getMetadata().getDescription(),
            "A null new-description must never overwrite an existing description");
    }
}
