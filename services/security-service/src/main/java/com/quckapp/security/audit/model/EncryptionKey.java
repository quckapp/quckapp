package com.quckapp.security.audit.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "encryption_keys")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EncryptionKey {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "key_alias", nullable = false, unique = true)
    private String keyAlias;

    @Column(name = "key_type", nullable = false, length = 50)
    private String keyType;

    @Column(nullable = false, length = 100)
    private String algorithm;

    @Column(name = "key_size", nullable = false)
    private Integer keySize;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "service_name", length = 100)
    private String serviceName;

    @Column(length = 500)
    private String purpose;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "rotated_at")
    private Instant rotatedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "rotation_interval_days")
    @Builder.Default
    private Integer rotationIntervalDays = 90;

    @Column(name = "next_rotation_at")
    private Instant nextRotationAt;

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
