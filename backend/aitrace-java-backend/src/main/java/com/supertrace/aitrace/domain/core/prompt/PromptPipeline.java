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
@Table(name = "prompt_pipeline",
    uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "name"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromptPipeline {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotNull
    @Column(name = "project_id")
    private Long projectId;

    @NotBlank
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Convert(converter = PromptPipelineStatus.JpaConverter.class)
    @Column(name = "status", nullable = false, length = 20, columnDefinition = "varchar(20) not null default 'active'")
    @Builder.Default
    private PromptPipelineStatus status = PromptPipelineStatus.ACTIVE;
}
