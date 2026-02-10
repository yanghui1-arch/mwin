package com.supertrace.aitrace.domain.core.step;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
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
import java.util.stream.Stream;

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

    @NotNull
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

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> input;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private StepOutput output;

    @Column(name = "error_info")
    private String errorInfo;

    private String model;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> usage;

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

    /**
     * Enrich step information of tags, output, model and usage.<br/>
     * It's a little difficult to manage all outputs and usage in the sdk
     * Because it's complex to know when callers consumes openai.Stream.
     * Therefore, transfer the complexity of sdk to the server.
     * The function focus on merge <code>tags</code>, <code>output</code>, <code>model</code> and <code>usage</code>
     * <br/>
     * Note: dbstep and logStepRequest id should be the same.
     *
     * @param newTags: new step tags
     * @param newStepOutput: new step output
     * @param newModel: new model of llm
     * @param newUsage: new usage of llm
     * @return enriched step itself.
     */
    public Step enrich(
        @NotNull List<String> newTags,
        Map<String, Object> newStepInput,
        @NotNull StepOutput newStepOutput,
        String newModel,
        Map<String, Object> newUsage
    ) {
        // enrich tags first
        List<String> oldTags = this.getTags();
        List<String> updatedTags = Stream.concat(
                Optional.ofNullable(newTags).orElse(List.of()).stream(),
                Optional.ofNullable(oldTags).orElse(List.of()).stream()
            )
            .filter(Objects::nonNull)
            .distinct()
            .toList();

        // enrich inputs
        Map<String, Object> oldInput = this.getInput();
        Map<String, Object> updatedInput = new HashMap<>();
        updatedInput.put(
            "func_inputs",
            Optional.ofNullable(newStepInput.get("func_inputs")).orElse(oldInput.get("func_inputs"))
        );
        updatedInput.put(
            "llm_inputs",
            Optional.ofNullable(newStepInput.get("llm_inputs")).orElse(oldInput.get("llm_inputs"))
        );

        // enrich outputs
        StepOutput oldOutput = this.getOutput();
        StepOutput updatedOutput = StepOutput.builder()
            .funcOutput(Optional.ofNullable(newStepOutput.getFuncOutput()).orElse(oldOutput.getFuncOutput()))
            .llmOutputs(Optional.ofNullable(newStepOutput.getLlmOutputs()).orElse(oldOutput.getLlmOutputs()))
            .build();

        // enrich llm model and usage
        String updatedModel = Optional.ofNullable(newModel).orElse(this.getModel());
        Map<String, Object> updatedUsage = Optional.ofNullable(newUsage).orElse(this.getUsage());

        this.setTags(updatedTags);
        this.setInput(updatedInput);
        this.setOutput(updatedOutput);
        this.setModel(updatedModel);
        this.setUsage(updatedUsage);
        return this;
    }
}
