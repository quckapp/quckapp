package com.quckapp.promotion;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity that records every promotion (or emergency activation) that
 * passes through the promotion gate. This provides a full audit trail
 * queryable per service, environment, and API version.
 */
@Entity
@Table(name = "promotion_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromotionRecord {

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    @Column(name = "service_key", nullable = false, length = 128)
    private String serviceKey;

    @Column(name = "api_version", nullable = false, length = 32)
    private String apiVersion;

    @Column(name = "from_environment", nullable = false, length = 64)
    private String fromEnvironment;

    @Column(name = "to_environment", nullable = false, length = 64)
    private String toEnvironment;

    /**
     * "normal" for standard chain promotions, "emergency" for dual-approval
     * emergency activations.
     */
    @Column(name = "promotion_type", nullable = false, length = 32)
    private String promotionType;

    /**
     * Current status: pending, approved, rejected, completed.
     */
    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "promoted_by", length = 255)
    private String promotedBy;

    @Column(name = "approver1", length = 255)
    private String approver1;

    @Column(name = "approver2", length = 255)
    private String approver2;

    @Column(name = "jira_ticket", length = 128)
    private String jiraTicket;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Sets defaults before the entity is first persisted.
     */
    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
        if (this.status == null) {
            this.status = "pending";
        }
        if (this.promotionType == null) {
            this.promotionType = "normal";
        }
    }
}
