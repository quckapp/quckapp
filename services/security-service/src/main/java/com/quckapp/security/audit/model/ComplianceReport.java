package com.quckapp.security.audit.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "compliance_reports")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceReport {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "report_type", nullable = false, length = 50)
    private String reportType;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "period_start", nullable = false)
    private Instant periodStart;

    @Column(name = "period_end", nullable = false)
    private Instant periodEnd;

    @Column(columnDefinition = "JSON")
    private String summary;

    @Column(columnDefinition = "JSON")
    private String findings;

    @Column(name = "total_events")
    @Builder.Default
    private Long totalEvents = 0L;

    @Column(name = "critical_findings")
    @Builder.Default
    private Integer criticalFindings = 0;

    @Column(name = "high_findings")
    @Builder.Default
    private Integer highFindings = 0;

    @Column(name = "medium_findings")
    @Builder.Default
    private Integer mediumFindings = 0;

    @Column(name = "low_findings")
    @Builder.Default
    private Integer lowFindings = 0;

    @Column(name = "generated_by", nullable = false, length = 100)
    @Builder.Default
    private String generatedBy = "SYSTEM";

    @Column(name = "generated_at")
    private Instant generatedAt;

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
