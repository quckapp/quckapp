package com.quikapp.permission.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_roles", indexes = {
    @Index(name = "idx_user_roles_user", columnList = "user_id"),
    @Index(name = "idx_user_roles_workspace", columnList = "workspace_id")
})
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@IdClass(UserRoleId.class)
public class UserRole {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Id
    @Column(name = "role_id")
    private UUID roleId;

    @Id
    @Column(name = "workspace_id")
    private UUID workspaceId;

    @Column(name = "channel_id")
    private UUID channelId;

    @Column(name = "granted_by")
    private UUID grantedBy;

    @CreatedDate
    @Column(name = "granted_at", updatable = false)
    private Instant grantedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", insertable = false, updatable = false)
    private Role role;
}
