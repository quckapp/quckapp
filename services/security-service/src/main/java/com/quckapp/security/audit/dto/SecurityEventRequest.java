package com.quckapp.security.audit.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SecurityEventRequest {

    @NotBlank(message = "Event type is required")
    private String eventType;

    @Builder.Default
    private String severity = "INFO";

    private String sourceService;
    private String userId;
    private String userEmail;
    private String ipAddress;
    private String userAgent;
    private String resourceType;
    private String resourceId;

    @NotBlank(message = "Action is required")
    private String action;

    @Builder.Default
    private String status = "SUCCESS";

    private String details;
    private String requestId;
    private String sessionId;
}
