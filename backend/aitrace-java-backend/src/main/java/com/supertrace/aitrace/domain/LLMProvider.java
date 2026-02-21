package com.supertrace.aitrace.domain;

import lombok.Getter;

import java.util.Arrays;
import java.util.Optional;

@Getter
public enum LLMProvider {
    OPEN_ROUTER("open_router"),
    DASH_SCOPE("dash_scope"),
    OPENAI("openai"),
    DEEP_SEEK("deep_seek"),
    ANTHROPIC("anthropic"),
    GOOGLE("google"),
    VLLM("vllm"),
    OLLAMA("ollama"),
    TRANSFORMERS("transformers");

    private final String value;
    LLMProvider(String value) {
        this.value = value;
    }

    public static LLMProvider fromString(String value) {

        return Optional.ofNullable(value)
            .map(String::toUpperCase)
            .filter(s -> Arrays.stream(LLMProvider.values()).anyMatch(e -> e.name().equals(s)))
            .map(LLMProvider::valueOf)
            .orElse(null);
    }
}

