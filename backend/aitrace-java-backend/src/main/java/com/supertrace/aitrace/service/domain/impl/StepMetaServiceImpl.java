package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.domain.core.step.metadata.StepMeta;
import com.supertrace.aitrace.domain.core.step.metadata.StepMetadata;
import com.supertrace.aitrace.repository.StepMetaRepository;
import com.supertrace.aitrace.service.domain.StepMetaService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StepMetaServiceImpl implements StepMetaService {
    private final StepMetaRepository stepMetaRepository;


    @Override
    @Transactional(rollbackFor = Exception.class)
    public void addStepMeta(UUID stepId, StepMetadata stepMetadata) {
        StepMeta stepMeta = StepMeta.builder()
            .id(stepId)
            .metadata(stepMetadata)
            .build();
        stepMetaRepository.save(stepMeta);
    }
}
