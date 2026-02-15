package com.supertrace.aitrace.domain;

public enum LLMProvider {
    OPEN_ROUTER("open_router"),
    DASHBOARD("dashboard"),
    OPENAI("openai"),
    DEEP_SEEK("deep_seek"),
    ANTHROPIC("anthropic"),
    GOOGLE("google"),
    VLLM("vllm"),
    OLLAMA("ollama"),
    TRANSFORMERS("transformers");

    LLMProvider(String description) {
    }
}

