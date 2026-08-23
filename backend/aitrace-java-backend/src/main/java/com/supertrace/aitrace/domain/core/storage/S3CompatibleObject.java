package com.supertrace.aitrace.domain.core.storage;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "s3_compatible_object")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class S3CompatibleObject {
    @Id
    @Column(name = "object_key", length = 1024)
    private String objectKey;

    @Column(name = "content_type", nullable = false, length = 127)
    private String contentType;

    @Column(name = "content_encoding", nullable = false, length = 32)
    private String contentEncoding;

    @Column(name = "schema_version", nullable = false)
    private Integer schemaVersion;

    @Column(name = "raw_size_bytes", nullable = false)
    private Long rawSizeBytes;

    @Column(name = "stored_size_bytes", nullable = false)
    private Long storedSizeBytes;

    @Column(nullable = false, length = 64)
    private String sha256;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
