package com.quckapp.security.threat.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "threat_rules")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ThreatRule {

    @Id
    @Column(length = 36, columnDefinition = "char(36)")
    private String id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "rule_type", nullable = false, length = 50)
    private String ruleType;

    @Column
    @Builder.Default
    private Boolean enabled = true;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String severity = "MEDIUM";

    @Column(nullable = false)
    @Builder.Default
    private Integer threshold = 5;

    @Column(name = "window_minutes", nullable = false)
    @Builder.Default
    private Integer windowMinutes = 5;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String action = "LOG";

    @Column(name = "auto_block_duration_hours")
    private Integer autoBlockDurationHours;

    @Column(columnDefinition = "JSON")
    private String conditions;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = java.util.UUID.randomUUID().toString();
        }
    }
}
