package com.supertrace.aitrace.service.domain.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.dto.trace.LogTraceRequest;
import com.supertrace.aitrace.factory.TraceFactory;
import com.supertrace.aitrace.repository.TraceRepository;
import com.supertrace.aitrace.service.domain.TraceService;
import com.supertrace.aitrace.service.application.model.TraceSummary;
import com.supertrace.aitrace.service.storage.S3CompatibleObjectService;
import com.supertrace.aitrace.service.storage.model.StoredPayload;
import com.supertrace.aitrace.service.storage.model.TracePayload;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TraceServiceImpl implements TraceService {

    private final TraceRepository traceRepository;
    private final TraceFactory traceFactory;
    private final S3CompatibleObjectService s3CompatibleObjectService;
    private final ObjectMapper objectMapper;

    @Override
    public Optional<Trace> findById(UUID traceId) {
        return traceRepository.findById(traceId);
    }

    @Override
    public Optional<Trace> findByIdForUser(UUID userId, UUID traceId) {
        return traceRepository.findByIdForUser(traceId, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public StoredPayload getOwnedTracePayload(UUID userId, UUID traceId) {
        Trace trace = traceRepository.findByIdForUser(traceId, userId)
            .orElseThrow(() -> new RuntimeException("Trace not found"));
        return s3CompatibleObjectService.loadTracePayload(trace.getPayloadObjectKey()).toStoredPayload();
    }

    @Override
    public long countByProjectId(Long projectId) {
        return traceRepository.countByProjectId(projectId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UUID createTrace(LogTraceRequest logTraceRequest, Long projectId) {
        UUID traceId = UUID.fromString(logTraceRequest.getTraceId());
        TracePayload payload = new TracePayload(
            objectMapper.valueToTree(logTraceRequest.getInput()),
            objectMapper.valueToTree(logTraceRequest.getOutput())
        );
        String payloadObjectKey = s3CompatibleObjectService.storeTracePayload(
            traceId,
            payload
        );
        Trace trace = traceFactory.createTrace(logTraceRequest, projectId, payloadObjectKey);
        traceRepository.save(trace);
        return trace.getId();
    }

    @Override
    public Page<TraceSummary> getTraceSummariesByProjectId(Long projectId, int page, int pageSize) {
        Pageable pageable = PageRequest.of(page, pageSize);
        return this.traceRepository.findByProjectId(projectId, pageable);
    }

    @Override
    public Page<TraceSummary> getTraceSummariesByProjectId(Long projectId, int page, int pageSize, Sort sort) {
        Pageable pageable = PageRequest.of(page, pageSize, sort);
        return this.traceRepository.findByProjectId(projectId, pageable);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public List<UUID> deleteTraceByTraceId(List<UUID> traceIdsToDelete) {
        this.traceRepository.deleteAllById(traceIdsToDelete);
        return traceIdsToDelete;
    }
}
