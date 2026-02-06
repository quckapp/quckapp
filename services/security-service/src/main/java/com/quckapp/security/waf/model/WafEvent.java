package com.quckapp.security.waf.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "waf_events")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WafEvent {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "rule_id", length = 36)
    private String ruleId;

    @Column(name = "rule_name")
    private String ruleName;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(name = "action_taken", nullable = false, length = 50)
    private String actionTaken;

    @Column(name = "source_ip", length = 45)
    private String sourceIp;

    @Column(name = "request_method", length = 10)
    private String requestMethod;

    @Column(name = "request_path", length = 2000)
    private String requestPath;

    @Column(name = "request_headers", columnDefinition = "JSON")
    private String requestHeaders;

    @Column(name = "matched_pattern", columnDefinition = "TEXT")
    private String matchedPattern;

    @Column(name = "matched_content", columnDefinition = "TEXT")
    private String matchedContent;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String severity = "MEDIUM";

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

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
