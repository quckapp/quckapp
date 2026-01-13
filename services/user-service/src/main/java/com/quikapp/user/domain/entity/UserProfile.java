package com.quikapp.user.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_profiles")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserProfile {

    @Id
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 100)
    private String title;

    @Column(length = 100)
    private String department;

    @Column(length = 100)
    private String location;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(length = 200)
    private String customStatus;

    @Column(length = 10)
    private String statusEmoji;

    private Instant statusExpiry;

    @Column(length = 100)
    private String pronouns;

    private Instant birthday;

    @Column(length = 500)
    private String linkedinUrl;

    @Column(length = 500)
    private String twitterUrl;

    @Column(length = 500)
    private String githubUrl;

    @LastModifiedDate
    private Instant updatedAt;
}
