package com.supertrace.aitrace.factory;

import com.supertrace.aitrace.domain.core.step.Step;
import com.supertrace.aitrace.dto.step.LogStepRequest;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
public class StepFactory {
    /**
     * Create a step from log step request
     *
     * @param request log step request DTO
     * @return step domain
     */
    public Step createStep(LogStepRequest request, Long projectId) {
        return Step.builder()
            .id(UUID.fromString(request.getStepId()))
            .name(request.getStepName())
            .traceId(Optional.ofNullable(request.getTraceId())
                .map(UUID::fromString)
                .orElse(null))
            .parentStepId(Optional.ofNullable(request.getParentStepId())
                .map(UUID::fromString)
                .orElse(null))
            .type(request.getStepType())
            .tags(request.getTags())
            .input(request.getInput())
            .output(request.getOutput())
            .errorInfo(request.getErrorInfo())
            .model(request.getModel())
            .usage(request.getUsage())
            .projectName(request.getProjectName())
            .projectId(projectId)
            .startTime(request.getStartTime())
            .endTime(request.getEndTime())
            .build();
    }
}
