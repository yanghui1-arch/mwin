package com.supertrace.aitrace.controller;

import com.supertrace.aitrace.dto.log.LogTraceTreeRequest;
import com.supertrace.aitrace.dto.log.LogTraceTreeResponse;
import com.supertrace.aitrace.exception.AuthenticationException;
import com.supertrace.aitrace.exception.UserIdNotFoundException;
import com.supertrace.aitrace.response.APIResponse;
import com.supertrace.aitrace.service.application.ApiKeyService;
import com.supertrace.aitrace.service.application.LogService;
import com.supertrace.aitrace.utils.ApiKeyUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v0")
public class LogController {
    private final ApiKeyService apiKeyService;
    private final LogService logService;

    @PostMapping("/log/trace_tree")
    public ResponseEntity<APIResponse<LogTraceTreeResponse>> logTraceTree(
        @RequestHeader(value = "Authorization") String authorization,
        @Valid @RequestBody LogTraceTreeRequest request
    ) {
        try {
            String apiKey = ApiKeyUtils.extractApiKeyFromHttpHeader(authorization);
            if (!this.apiKeyService.isApiKeyExist(apiKey)) {
                throw new AuthenticationException();
            }
            UUID userId = this.apiKeyService.resolveUserIdFromApiKey(apiKey)
                .orElseThrow(UserIdNotFoundException::new);
            return ResponseEntity.ok(APIResponse.success(this.logService.logTraceTree(userId, request)));
        } catch (Exception exception) {
            return ResponseEntity.badRequest().body(APIResponse.error(exception.getMessage()));
        }
    }
}
