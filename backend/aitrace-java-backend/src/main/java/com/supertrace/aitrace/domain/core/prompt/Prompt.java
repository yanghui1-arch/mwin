package com.supertrace.aitrace.domain.core.prompt;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "prompt",
    uniqueConstraints = @UniqueConstraint(columnNames = {"prompt_pipeline_id", "version"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prompt {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotNull
    @Column(name = "prompt_pipeline_id", nullable = false)
    private UUID promptPipelineId;

    @NotBlank
    @Column(name = "version", nullable = false, length = 50)
    private String version;

    @NotNull
    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "model_config", columnDefinition = "jsonb")
    private ModelConfig modelConfig;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "status", nullable = false, length = 20, columnDefinition = "varchar(20) not null default 'active'")
    @Builder.Default
    private String status = "active";

    @Column(name = "name", length = 200)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "changelog", columnDefinition = "TEXT")
    private String changelog;
}
