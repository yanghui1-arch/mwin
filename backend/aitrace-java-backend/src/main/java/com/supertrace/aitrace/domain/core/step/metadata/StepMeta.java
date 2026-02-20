package com.supertrace.aitrace.domain.core.step.metadata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "step_meta")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class StepMeta {
    @Id
    // must be step id.
    private UUID id;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private StepMetadata metadata;

    @Column(precision = 10, scale = 6)
    private BigDecimal cost;
}
