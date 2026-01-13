package com.quikapp.user.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "user_preferences")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserPreferences {

    @Id
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Builder.Default private boolean pushEnabled = true;
    @Builder.Default private boolean emailEnabled = true;
    @Builder.Default private boolean smsEnabled = false;
    @Builder.Default private boolean desktopNotifications = true;
    @Builder.Default private boolean soundEnabled = true;

    private LocalTime quietHoursStart;
    private LocalTime quietHoursEnd;
    @Builder.Default private boolean quietHoursEnabled = false;

    @Column(length = 20) @Builder.Default private String theme = "system";
    @Column(length = 10) @Builder.Default private String language = "en";
    @Builder.Default private boolean compactMode = false;
    @Builder.Default private boolean sidebarCollapsed = false;
    @Builder.Default private boolean showUnreadOnly = false;
    @Builder.Default private boolean messagePreview = true;
    @Builder.Default private boolean enterToSend = true;
    @Builder.Default private boolean markdownEnabled = true;
    @Builder.Default private boolean emojiSuggestionsEnabled = true;
    @Builder.Default private boolean showOnlineStatus = true;
    @Builder.Default private boolean showTypingIndicator = true;
    @Builder.Default private boolean showReadReceipts = true;
    @Builder.Default private boolean reducedMotion = false;
    @Builder.Default private boolean highContrast = false;
    @Builder.Default private int fontSize = 14;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    @Builder.Default
    private Map<String, Object> customSettings = new HashMap<>();

    @LastModifiedDate
    private Instant updatedAt;
}
