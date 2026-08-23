package com.supertrace.aitrace.domain.core.step;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
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
import java.util.*;

@Entity
@Table(name = "step")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class Step {
    @Id
    // @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotNull
    private String name;

    @Column(name = "trace_id")
    private UUID traceId;

    @Column(name = "parent_step_id")
    private UUID parentStepId;

    @NotBlank
    private String type;

    @JdbcTypeCode(SqlTypes.JSON)
    @NotNull
    @Column(columnDefinition = "jsonb")
    private List<String> tags;

    @NotBlank
    @Column(name = "payload_object_key", nullable = false, length = 1024)
    private String payloadObjectKey;

    @Column(name = "error_info")
    private String errorInfo;

    private String model;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private LLMUsage usage;

    @NotBlank
    @Column(name = "project_name")
    private String projectName;

    @NotNull
    @Column(name = "project_id")
    private Long projectId;

    @NotNull
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss.SSSSSS")
    @Column(name = "start_time")
    private LocalDateTime startTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss.SSSSSS")
    @Column(name = "end_time")
    private LocalDateTime endTime;

}
