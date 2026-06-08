package com.supertrace.aitrace.service.domain.impl;

import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.dto.trace.LogTraceRequest;
import com.supertrace.aitrace.factory.TraceFactory;
import com.supertrace.aitrace.repository.TraceRepository;
import com.supertrace.aitrace.service.domain.TraceService;
import com.supertrace.aitrace.vo.conversation.ConversationVO;
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

    @Override
    public Optional<Trace> findById(UUID traceId) {
        return traceRepository.findById(traceId);
    }

    @Override
    public long countByProjectId(Long projectId) {
        return traceRepository.countByProjectId(projectId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UUID createTrace(LogTraceRequest logTraceRequest, Long projectId) {
        // 1. using factory to build a trace
        Trace trace = traceFactory.createTrace(logTraceRequest, projectId);
        // 2. save trace
        traceRepository.saveAndFlush(trace);
        // 3. return trace id
        return trace.getId();
    }

    @Override
    public Page<Trace> getTracesByProjectId(Long projectId, int page, int pageSize) {
        Pageable pageable = PageRequest.of(page, pageSize);
        return this.traceRepository.findTracesByProjectId(projectId, pageable);
    }

    @Override
    public Page<Trace> getTracesByProjectId(Long projectId, int page, int pageSize, Sort sort) {
        Pageable pageable = PageRequest.of(page, pageSize, sort);
        return this.traceRepository.findTracesByProjectId(projectId, pageable);
    }

    @Override
    public Page<ConversationVO> getConversationsByProjectId(Long projectId, int page, int pageSize, Sort sort) {
        Pageable pageable = PageRequest.of(page, pageSize, sort);
        return this.traceRepository.findConversationsByProjectId(projectId, pageable);
    }

    @Override
    public Page<Trace> getTracesByProjectIdAndConversationId(
        Long projectId,
        UUID conversationId,
        int page,
        int pageSize,
        Sort sort
    ) {
        Pageable pageable = PageRequest.of(page, pageSize, sort);
        return this.traceRepository.findTracesByProjectIdAndConversationId(projectId, conversationId, pageable);
    }

    @Override
    public boolean existsByProjectIdAndConversationId(Long projectId, UUID conversationId) {
        return this.traceRepository.existsByProjectIdAndConversationId(projectId, conversationId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public List<UUID> deleteTraceByTraceId(List<UUID> traceIdsToDelete) {
        this.traceRepository.deleteAllById(traceIdsToDelete);
        return traceIdsToDelete;
    }
}
