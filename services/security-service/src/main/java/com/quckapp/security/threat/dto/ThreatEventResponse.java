package com.quckapp.security.threat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ThreatEventResponse {

    private String id;
    private String eventType;
    private String severity;
    private String sourceIp;
    private String targetUserId;
    private String targetEmail;
    private String description;
    private String details;
    private String country;
    private String city;
    private Boolean resolved;
    private Instant resolvedAt;
    private String resolvedBy;
    private Instant createdAt;

    public static ThreatEventResponse from(com.quckapp.security.threat.model.ThreatEvent event) {
        return ThreatEventResponse.builder()
                .id(event.getId())
                .eventType(event.getEventType())
                .severity(event.getSeverity())
                .sourceIp(event.getSourceIp())
                .targetUserId(event.getTargetUserId())
                .targetEmail(event.getTargetEmail())
                .description(event.getDescription())
                .details(event.getDetails())
                .country(event.getCountry())
                .city(event.getCity())
                .resolved(event.getResolved())
                .resolvedAt(event.getResolvedAt())
                .resolvedBy(event.getResolvedBy())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
