package com.supertrace.aitrace.service.domain.model;

import com.supertrace.aitrace.dto.step.LogStepRequest;

/** A Step log request paired with its resolved project ID. */
public record StepBatchItem(LogStepRequest request, Long projectId) {
}
