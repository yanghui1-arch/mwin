package com.supertrace.aitrace.vo.conversation;

import com.supertrace.aitrace.vo.PageVO;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ConversationPageVO<T> {
    private int pageCount;
    private List<T> data;

    public static <T> ConversationPageVO<T> from(PageVO<T> pageVO) {
        return ConversationPageVO.<T>builder()
            .pageCount(pageVO.getPageCount())
            .data(pageVO.getData())
            .build();
    }
}
