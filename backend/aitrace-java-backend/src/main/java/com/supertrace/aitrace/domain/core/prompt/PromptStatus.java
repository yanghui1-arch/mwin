package com.supertrace.aitrace.domain.core.prompt;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "prompt_status",
    uniqueConstraints = @UniqueConstraint(columnNames = {"prompt_group_id", "status"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromptStatus {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotNull
    @Column(name = "prompt_group_id", nullable = false)
    private UUID promptPipelineId;

    @NotBlank
    @Column(name = "status", nullable = false, length = 100)
    private String status;

    @NotNull
    @Column(name = "prompt_id", nullable = false)
    private UUID promptId;

    @Column(name = "deployed_by")
    private UUID deployedBy;

    @Column(name = "deployed_at")
    @Builder.Default
    private LocalDateTime deployedAt = LocalDateTime.now();
}
