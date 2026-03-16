package com.supertrace.aitrace.domain.core.eval;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "eval_job",
    indexes = @Index(name = "idx_eval_job_status", columnList = "status")
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvalJob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** "step" or "trace" */
    @Column(name = "job_type", nullable = false, length = 10)
    private String jobType;

    /** Non-null for step jobs */
    @Column(name = "step_id")
    private UUID stepId;

    /** Always set */
    @Column(name = "trace_id")
    private UUID traceId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    /** May be null for trace jobs or un-versioned steps */
    @Column(name = "prompt_version_id")
    private UUID promptVersionId;

    /** pending → processing → done | failed */
    @Column(name = "status", nullable = false, length = 12)
    @Builder.Default
    private String status = "pending";

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private int retryCount = 0;

    @Column(name = "error_msg", columnDefinition = "TEXT")
    private String errorMsg;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
