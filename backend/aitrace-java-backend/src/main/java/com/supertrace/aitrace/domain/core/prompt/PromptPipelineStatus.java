package com.supertrace.aitrace.domain.core.prompt;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum PromptPipelineStatus {
    ACTIVE("active"),
    ARCHIVED("archived");

    private final String value;

    PromptPipelineStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static PromptPipelineStatus fromValue(String value) {
        for (PromptPipelineStatus s : values()) {
            if (s.value.equalsIgnoreCase(value)) return s;
        }
        throw new IllegalArgumentException("Unknown PromptPipelineStatus: " + value);
    }

    /** Stores lowercase ("active" / "archived") in the database. */
    @Converter
    public static class JpaConverter implements AttributeConverter<PromptPipelineStatus, String> {
        @Override
        public String convertToDatabaseColumn(PromptPipelineStatus attr) {
            return attr == null ? null : attr.value;
        }

        @Override
        public PromptPipelineStatus convertToEntityAttribute(String db) {
            return db == null ? null : fromValue(db);
        }
    }
}
