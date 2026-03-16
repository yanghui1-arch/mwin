package com.supertrace.aitrace.dto.prompt;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdatePromptStatusRequest {
    @NotBlank
    private String status;
}
