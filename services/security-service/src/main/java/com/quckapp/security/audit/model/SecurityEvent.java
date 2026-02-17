package com.quckapp.security.audit.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "security_events")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SecurityEvent {

    @Id
    @Column(length = 36, columnDefinition = "char(36)")
    private String id;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String severity = "INFO";

    @Column(name = "source_service", length = 100)
    private String sourceService;

    @Column(name = "user_id", length = 36, columnDefinition = "char(36)")
    private String userId;

    @Column(name = "user_email")
    private String userEmail;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "resource_type", length = 100)
    private String resourceType;

    @Column(name = "resource_id")
    private String resourceId;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "SUCCESS";

    @Column(columnDefinition = "JSON")
    private String details;

    @Column(name = "request_id")
    private String requestId;

    @Column(name = "session_id")
    private String sessionId;

    @Column(length = 100)
    private String country;

    @Column(length = 100)
    private String city;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = java.util.UUID.randomUUID().toString();
        }
    }
}
