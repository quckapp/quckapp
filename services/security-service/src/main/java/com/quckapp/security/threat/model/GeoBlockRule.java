package com.quckapp.security.threat.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "geo_block_rules")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeoBlockRule {

    @Id
    @Column(length = 36, columnDefinition = "char(36)")
    private String id;

    @Column(name = "country_code", nullable = false, length = 10, unique = true)
    private String countryCode;

    @Column(name = "country_name")
    private String countryName;

    @Column(name = "block_type", nullable = false, length = 20)
    @Builder.Default
    private String blockType = "DENY";

    @Column(length = 500)
    private String reason;

    @Column
    @Builder.Default
    private Boolean enabled = true;

    @Column(name = "created_by", nullable = false, length = 100)
    @Builder.Default
    private String createdBy = "SYSTEM";

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
