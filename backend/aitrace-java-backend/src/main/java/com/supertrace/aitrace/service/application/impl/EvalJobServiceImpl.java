package com.supertrace.aitrace.service.application.impl;

import com.supertrace.aitrace.domain.core.eval.EvalJob;
import com.supertrace.aitrace.domain.event.StepLoggedEvent;
import com.supertrace.aitrace.domain.event.TraceFinishedEvent;
import com.supertrace.aitrace.repository.EvalJobRepository;
import com.supertrace.aitrace.service.application.EvalJobService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.UUID;

/**
 * Application service responsible for enqueueing background LLM eval jobs.
 *
 * <p>Listens to domain events published by the step and trace domain services.
 * Using {@code @TransactionalEventListener(AFTER_COMMIT)} guarantees the listener
 * only runs after the originating transaction has committed, so the step/trace row
 * is always visible before the eval job is created.
 *
 * <p>{@code Propagation.REQUIRES_NEW} opens a fresh transaction for each enqueue.
 * PostgreSQL makes {@code pg_notify} transactional — the notification is held until
 * this inner transaction commits, at which point the eval_job row is already durable.
 * No {@code TransactionSynchronizationManager} tricks needed.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EvalJobServiceImpl implements EvalJobService {

    private final EvalJobRepository evalJobRepository;
    private final JdbcTemplate jdbcTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onStepLogged(StepLoggedEvent event) {
        enqueueStepJob(event.stepId(), event.traceId(), event.projectId(), event.promptVersionId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onTraceFinished(TraceFinishedEvent event) {
        enqueueTraceJob(event.traceId(), event.projectId());
    }

    @Override
    public void enqueueStepJob(UUID stepId, UUID traceId, Long projectId, UUID promptVersionId) {
        EvalJob job = EvalJob.builder()
                .jobType("step")
                .stepId(stepId)
                .traceId(traceId)
                .projectId(projectId)
                .promptVersionId(promptVersionId)
                .build();
        EvalJob saved = evalJobRepository.saveAndFlush(job);
        sendNotify(saved.getId());
    }

    @Override
    public void enqueueTraceJob(UUID traceId, Long projectId) {
        if (evalJobRepository.existsByTraceIdAndJobType(traceId, "trace")) {
            return;
        }
        EvalJob job = EvalJob.builder()
                .jobType("trace")
                .traceId(traceId)
                .projectId(projectId)
                .build();
        EvalJob saved = evalJobRepository.saveAndFlush(job);
        sendNotify(saved.getId());
    }

    private void sendNotify(UUID jobId) {
        try {
            jdbcTemplate.execute("SELECT pg_notify('eval_job_created', '" + jobId + "')");
        } catch (Exception e) {
            log.warn("pg_notify failed for eval_job {}: {}", jobId, e.getMessage());
        }
    }
}
