package com.quckapp.security.threat.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "threat_events")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ThreatEvent {

    @Id
    @Column(length = 36, columnDefinition = "char(36)")
    private String id;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String severity = "MEDIUM";

    @Column(name = "source_ip", length = 45)
    private String sourceIp;

    @Column(name = "target_user_id", length = 36, columnDefinition = "char(36)")
    private String targetUserId;

    @Column(name = "target_email")
    private String targetEmail;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "JSON")
    private String details;

    @Column(length = 100)
    private String country;

    @Column(length = 100)
    private String city;

    @Column
    @Builder.Default
    private Boolean resolved = false;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

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
