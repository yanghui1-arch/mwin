package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.Project;
import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.domain.core.storage.S3CompatibleObject;
import com.supertrace.aitrace.service.storage.PayloadFormat;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@Transactional
class SummaryProjectionRepositoryTest {
    @Autowired private StepRepository stepRepository;
    @Autowired private TraceRepository traceRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private S3CompatibleObjectRepository s3CompatibleObjectRepository;

    @Test
    void summaryProjectionsExecuteWithoutExplicitConstructorExpressions() {
        UUID userId = UUID.randomUUID();
        UUID traceId = UUID.randomUUID();
        UUID stepId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();

        Project project = projectRepository.save(Project.builder()
            .userId(userId)
            .name("projection-test")
            .averageDuration(0)
            .cost(BigDecimal.ZERO)
            .lastUpdateTimestamp(now)
            .build());
        S3CompatibleObject payloadObject = s3CompatibleObjectRepository.save(
            S3CompatibleObject.builder()
                .objectKey("tests/projections/" + UUID.randomUUID())
                .contentType("application/json")
                .contentEncoding("gzip")
                .schemaVersion(PayloadFormat.CURRENT_VERSION)
                .rawSizeBytes(2L)
                .storedSizeBytes(22L)
                .sha256("0".repeat(64))
                .createdAt(now)
                .updatedAt(now)
                .build()
        );
        traceRepository.save(Trace.builder()
            .id(traceId)
            .projectName(project.getName())
            .projectId(project.getId())
            .name("trace")
            .conversationId(UUID.randomUUID())
            .tags(List.of("test"))
            .payloadObjectKey(payloadObject.getObjectKey())
            .startTime(now)
            .lastUpdateTimestamp(now)
            .build());
        stepRepository.save(Step.builder()
            .id(stepId)
            .name("step")
            .traceId(traceId)
            .type("LLM")
            .tags(List.of("test"))
            .payloadObjectKey(payloadObject.getObjectKey())
            .projectName(project.getName())
            .projectId(project.getId())
            .startTime(now)
            .build());

        assertEquals(stepId,
            stepRepository.findByProjectId(project.getId(), PageRequest.of(0, 1))
                .getContent().get(0).id());
        assertEquals(traceId,
            traceRepository.findByProjectId(project.getId(), PageRequest.of(0, 1))
                .getContent().get(0).id());
        assertEquals(stepId,
            stepRepository.findStepSummariesByTraceIdForUser(traceId, userId)
                .get(0).id());
    }
}
