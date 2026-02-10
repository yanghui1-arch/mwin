package com.supertrace.aitrace.dto.trace;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
public class LogTraceRequest {
    @NotNull
    private String projectName;

    @NotNull
    private String traceId;

    @NotNull
    private String traceName;

    @NotNull
    private String conversationId;

    @NotNull
    private List<String> tags;

    private Map<String, Object> input;

    private Map<String, Object> output;

    private String errorInfo;

    @NotNull
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss[.SSSSSS]")
    private LocalDateTime startTime;

    @NotNull
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss[.SSSSSS]")
    private LocalDateTime lastUpdateTimestamp;

}
