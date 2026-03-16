package com.supertrace.aitrace.domain.event;

import java.util.UUID;

/**
 * Published by TraceServiceImpl when a trace log arrives with output populated,
 * indicating the agent run has completed.
 * Consumed by the eval application service to enqueue a background trace eval job.
 */
public record TraceFinishedEvent(UUID traceId, Long projectId) {}
