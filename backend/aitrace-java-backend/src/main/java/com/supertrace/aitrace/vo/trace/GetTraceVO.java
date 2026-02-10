package com.supertrace.aitrace.vo.trace;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class GetTraceVO {
    private UUID id;

    @NotNull
    private String name;

    @NotNull
    private List<String> tags;

    private Map<String, Object> input;

    private Map<String, Object> output;

    private String errorInfo;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss.SSSSSS")
    private LocalDateTime startTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss.SSSSSS")
    private LocalDateTime lastUpdateTimestamp;

}
