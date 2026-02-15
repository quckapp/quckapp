package com.quckapp.security.threat.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "blocked_ips")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockedIp {

    @Id
    @Column(length = 36, columnDefinition = "char(36)")
    private String id;

    @Column(name = "ip_address", nullable = false, length = 45)
    private String ipAddress;

    @Column(name = "cidr_range", length = 50)
    private String cidrRange;

    @Column(nullable = false, length = 500)
    private String reason;

    @Column(name = "blocked_by", nullable = false, length = 100)
    @Builder.Default
    private String blockedBy = "SYSTEM";

    @Column(name = "is_permanent")
    @Builder.Default
    private Boolean isPermanent = false;

    @Column(name = "expires_at")
    private Instant expiresAt;

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
