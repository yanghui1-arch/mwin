package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.Trace;
import com.supertrace.aitrace.vo.conversation.ConversationVO;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TraceRepository extends JpaRepository<Trace, UUID> {
    Page<Trace> findTracesByProjectId(@NotNull Long projectId, Pageable pageable);

    Page<Trace> findTracesByProjectIdAndConversationId(
        @NotNull Long projectId,
        @NotNull UUID conversationId,
        Pageable pageable
    );

    boolean existsByProjectIdAndConversationId(@NotNull Long projectId, @NotNull UUID conversationId);

    @Query("""
        select new com.supertrace.aitrace.vo.conversation.ConversationVO(
            t.conversationId,
            count(t.id),
            min(t.startTime),
            max(t.lastUpdateTimestamp)
        )
        from Trace t
        where t.projectId = :projectId
        group by t.conversationId
        order by max(t.lastUpdateTimestamp) desc
        """,
        countQuery = "select count(distinct t.conversationId) from Trace t where t.projectId = :projectId")
    Page<ConversationVO> findConversationsByProjectId(@NotNull Long projectId, Pageable pageable);

    long countByProjectId(@NotNull Long projectId);
}
