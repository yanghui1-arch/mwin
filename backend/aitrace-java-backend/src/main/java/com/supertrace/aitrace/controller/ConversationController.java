package com.supertrace.aitrace.controller;

import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.response.APIResponse;
import com.supertrace.aitrace.service.application.QueryService;
import com.supertrace.aitrace.vo.PageVO;
import com.supertrace.aitrace.vo.conversation.ConversationVO;
import com.supertrace.aitrace.vo.trace.GetTraceVO;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v0/conversations")
public class ConversationController {
    private final QueryService queryService;

    @GetMapping("/{projectName}")
    public ResponseEntity<APIResponse<PageVO<ConversationVO>>> getConversations(
        HttpServletRequest request,
        @PathVariable String projectName,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int pageSize
    ) {
        try {
            UUID userId = (UUID) request.getAttribute("userId");
            Page<ConversationVO> conversations = this.queryService.getConversations(userId, projectName, page, pageSize);
            PageVO<ConversationVO> pageVO = PageVO.<ConversationVO>builder()
                .data(conversations.getContent())
                .pageCount(conversations.getTotalPages())
                .build();
            return ResponseEntity.ok(APIResponse.success(pageVO));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(APIResponse.notFound("Project not found"));
        }
    }

    @GetMapping("/{projectName}/{conversationId}/traces")
    public ResponseEntity<APIResponse<PageVO<GetTraceVO>>> getConversationTraces(
        HttpServletRequest request,
        @PathVariable String projectName,
        @PathVariable UUID conversationId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int pageSize
    ) {
        try {
            UUID userId = (UUID) request.getAttribute("userId");
            Page<Trace> traces = this.queryService.getConversationTraces(
                userId, projectName, conversationId, page, pageSize);
            PageVO<GetTraceVO> pageVO = PageVO.<GetTraceVO>builder()
                .data(toTraceVOs(traces))
                .pageCount(traces.getTotalPages())
                .build();
            return ResponseEntity.ok(APIResponse.success(pageVO));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(APIResponse.notFound("Conversation not found"));
        }
    }

    private List<GetTraceVO> toTraceVOs(Page<Trace> traces) {
        return traces.stream()
            .map(trace -> GetTraceVO.builder()
                .id(trace.getId())
                .name(trace.getName())
                .tags(trace.getTags())
                .input(trace.getInput())
                .output(trace.getOutput())
                .errorInfo(trace.getErrorInfo())
                .startTime(trace.getStartTime())
                .lastUpdateTimestamp(trace.getLastUpdateTimestamp())
                .build())
            .toList();
    }
}
