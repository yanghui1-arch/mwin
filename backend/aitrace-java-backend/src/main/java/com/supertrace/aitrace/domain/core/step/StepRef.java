package com.supertrace.aitrace.domain.core.step;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "step_ref")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class StepRef {
    @Id
    // must be step id.
    private UUID id;

    @Column(name = "prompt_id")
    private UUID promptId;

    @Column(name = "prompt_version")
    private String promptVersion;
}
