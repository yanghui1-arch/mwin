package com.supertrace.aitrace.vo.step;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.supertrace.aitrace.domain.core.usage.LLMUsage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class GetStepVO {
    private UUID id;

    private UUID parentStepId;

    @NotNull
    private String name;

    @NotBlank
    private String type;

    @NotNull
    private List<String> tags;

    private String errorInfo;

    private String model;

    private LLMUsage usage;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss.SSSSSS")
    private LocalDateTime startTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss.SSSSSS")
    private LocalDateTime endTime;

    private BigDecimal cost;

    /** Raw (uncompressed) input+output payload size in bytes; never null (the payload object is required). */
    @NotNull
    private Long payloadSize;

}
