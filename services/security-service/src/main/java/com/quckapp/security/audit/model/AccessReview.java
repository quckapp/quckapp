package com.quckapp.security.audit.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "access_reviews")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessReview {

    @Id
    @Column(length = 36, columnDefinition = "char(36)")
    private String id;

    @Column(name = "review_type", nullable = false, length = 50)
    @Builder.Default
    private String reviewType = "PERIODIC";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "user_id", nullable = false, length = 36, columnDefinition = "char(36)")
    private String userId;

    @Column(name = "user_email")
    private String userEmail;

    @Column(name = "current_roles", columnDefinition = "JSON")
    private String currentRoles;

    @Column(name = "current_permissions", columnDefinition = "JSON")
    private String currentPermissions;

    @Column(length = 50)
    private String recommendation;

    @Column(name = "reviewer_id", length = 36, columnDefinition = "char(36)")
    private String reviewerId;

    @Column(name = "reviewer_email")
    private String reviewerEmail;

    @Column(name = "review_notes", columnDefinition = "TEXT")
    private String reviewNotes;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "due_date")
    private Instant dueDate;

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
