package com.supertrace.aitrace.service.application;

import java.util.UUID;

public interface EvalJobService {

    void enqueueStepJob(UUID stepId, UUID traceId, Long projectId, String promptVersion);

    void enqueueTraceJob(UUID traceId, Long projectId);
}
