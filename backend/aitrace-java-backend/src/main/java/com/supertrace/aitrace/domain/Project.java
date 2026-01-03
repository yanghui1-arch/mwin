package com.supertrace.aitrace.domain;

import com.fasterxml.jackson.annotation.JsonFormat;
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

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "project")
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_uuid", nullable = false)
    private UUID userId;

    @NotBlank
    private String name;

    private String description;

    private String strategy;

    @Column(name = "avg_duration", nullable = false)
    private Integer averageDuration;

    @NotNull
    private BigDecimal cost;

    @Column(name = "created_timestamp", nullable = false)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdTimestamp;

    @Column(name = "last_update_timestamp", nullable = false)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastUpdateTimestamp;

    @PrePersist
    protected void onCreate() {
        this.createdTimestamp = LocalDateTime.now();
    }

    public Project refreshLastUpdateTimestamp() {
        this.lastUpdateTimestamp = LocalDateTime.now();
        return this;
    }

}
