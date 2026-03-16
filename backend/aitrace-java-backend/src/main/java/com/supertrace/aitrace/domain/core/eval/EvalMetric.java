package com.supertrace.aitrace.domain.core.eval;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "eval_metric")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvalMetric {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "judge_prompt", columnDefinition = "TEXT")
    private String judgePrompt;

    @Column(name = "score_range_min", precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal scoreRangeMin = BigDecimal.ZERO;

    @Column(name = "score_range_max", precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal scoreRangeMax = new BigDecimal("5");

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
