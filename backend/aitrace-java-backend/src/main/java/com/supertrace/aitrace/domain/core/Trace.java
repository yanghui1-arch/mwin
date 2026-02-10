package com.supertrace.aitrace.domain.core;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Trace domain
 * One generation in a complete workflow of agent
 *
 * @author dass90
 * @since 2025-10-24
 */
@Entity
@Table(name = "trace")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class Trace {
    @Id
    private UUID id;

    @NotBlank
    @Column(name = "project_name")
    private String projectName;

    @NotNull
    @Column(name = "project_id")
    private Long projectId;

    @NotBlank
    private String name;

    @NotNull
    @Column(name = "conversation_id")
    private UUID conversationId;

    @JdbcTypeCode(SqlTypes.JSON)
    @NotNull
    @Column(columnDefinition = "jsonb")
    private List<String> tags;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> input;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> output;

    @Column(name = "error_info")
    private String errorInfo;

    @Column(name = "start_time")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss.SSSSSS")
    private LocalDateTime startTime;

    @Column(name = "last_update_timestamp")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss.SSSSSS")
    private LocalDateTime lastUpdateTimestamp;
}
