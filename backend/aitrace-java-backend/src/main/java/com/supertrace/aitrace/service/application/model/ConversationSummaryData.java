package com.supertrace.aitrace.service.application.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public interface ConversationSummaryData {
    UUID getConversationId();

    long getTraceCount();

    LocalDateTime getStartTime();

    LocalDateTime getLastUpdateTimestamp();

    boolean getHasError();

    long getDurationMillis();

    long getTotalTokens();

    BigDecimal getTotalCost();
}
