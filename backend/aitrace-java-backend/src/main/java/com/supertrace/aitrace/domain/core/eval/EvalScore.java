package com.supertrace.aitrace.domain.core.eval;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "eval_score")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvalScore {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "step_id")
    private UUID stepId;

    @Column(name = "trace_id")
    private UUID traceId;

    @Column(name = "prompt_version_id")
    private UUID promptVersionId;

    @NotNull
    @Column(name = "eval_metric_id", nullable = false)
    private UUID evalMetricId;

    @NotBlank
    @Column(name = "evaluator_type", nullable = false, length = 20)
    private String evaluatorType;

    @NotNull
    @Column(name = "score", nullable = false, precision = 7, scale = 2)
    private BigDecimal score;

    @Column(name = "reasoning", columnDefinition = "TEXT")
    private String reasoning;

    @Column(name = "evaluated_by")
    private UUID evaluatedBy;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
