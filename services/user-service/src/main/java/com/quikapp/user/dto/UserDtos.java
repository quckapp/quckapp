package com.quikapp.user.dto;

import com.quikapp.user.domain.entity.User.UserStatus;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class UserDtos {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CreateUserRequest {
        @NotBlank @Email private String email;
        @NotBlank @Size(min = 3, max = 50) @Pattern(regexp = "^[a-zA-Z0-9_-]+$") private String username;
        @Size(max = 100) private String displayName;
        @Size(max = 500) private String avatarUrl;
        private String phone;
        private String timezone;
        private String locale;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UpdateUserRequest {
        @Size(max = 100) private String displayName;
        @Size(max = 500) private String avatarUrl;
        private String phone;
        private String timezone;
        private String locale;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserResponse {
        private UUID id;
        private String email;
        private String username;
        private String displayName;
        private String avatarUrl;
        private String phone;
        private String timezone;
        private String locale;
        private UserStatus status;
        private boolean emailVerified;
        private boolean phoneVerified;
        private Instant lastLoginAt;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserSummaryResponse {
        private UUID id;
        private String username;
        private String displayName;
        private String avatarUrl;
        private UserStatus status;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UpdateProfileRequest {
        @Size(max = 100) private String title;
        @Size(max = 100) private String department;
        @Size(max = 100) private String location;
        @Size(max = 1000) private String bio;
        @Size(max = 200) private String customStatus;
        @Size(max = 10) private String statusEmoji;
        private Instant statusExpiry;
        private String pronouns;
        private Instant birthday;
        private String linkedinUrl;
        private String twitterUrl;
        private String githubUrl;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProfileResponse {
        private UUID userId;
        private String title;
        private String department;
        private String location;
        private String bio;
        private String customStatus;
        private String statusEmoji;
        private Instant statusExpiry;
        private String pronouns;
        private Instant birthday;
        private String linkedinUrl;
        private String twitterUrl;
        private String githubUrl;
        private Instant updatedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UpdatePreferencesRequest {
        private Boolean pushEnabled;
        private Boolean emailEnabled;
        private Boolean smsEnabled;
        private Boolean desktopNotifications;
        private Boolean soundEnabled;
        private LocalTime quietHoursStart;
        private LocalTime quietHoursEnd;
        private Boolean quietHoursEnabled;
        private String theme;
        private String language;
        private Boolean compactMode;
        private Boolean sidebarCollapsed;
        private Boolean showUnreadOnly;
        private Boolean messagePreview;
        private Boolean enterToSend;
        private Boolean markdownEnabled;
        private Boolean emojiSuggestionsEnabled;
        private Boolean showOnlineStatus;
        private Boolean showTypingIndicator;
        private Boolean showReadReceipts;
        private Boolean reducedMotion;
        private Boolean highContrast;
        @Min(10) @Max(24) private Integer fontSize;
        private Map<String, Object> customSettings;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PreferencesResponse {
        private UUID userId;
        private boolean pushEnabled;
        private boolean emailEnabled;
        private boolean smsEnabled;
        private boolean desktopNotifications;
        private boolean soundEnabled;
        private LocalTime quietHoursStart;
        private LocalTime quietHoursEnd;
        private boolean quietHoursEnabled;
        private String theme;
        private String language;
        private boolean compactMode;
        private boolean sidebarCollapsed;
        private boolean showUnreadOnly;
        private boolean messagePreview;
        private boolean enterToSend;
        private boolean markdownEnabled;
        private boolean emojiSuggestionsEnabled;
        private boolean showOnlineStatus;
        private boolean showTypingIndicator;
        private boolean showReadReceipts;
        private boolean reducedMotion;
        private boolean highContrast;
        private int fontSize;
        private Map<String, Object> customSettings;
        private Instant updatedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SearchUsersRequest {
        @NotBlank @Size(min = 2, max = 100) private String query;
        private UserStatus status;
        @Min(0) private Integer page = 0;
        @Min(1) @Max(100) private Integer size = 20;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PageResponse<T> {
        private List<T> content;
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
        private boolean first;
        private boolean last;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ApiResponse<T> {
        private boolean success;
        private String message;
        private T data;
        private Instant timestamp;

        public static <T> ApiResponse<T> success(T data) {
            return ApiResponse.<T>builder().success(true).data(data).timestamp(Instant.now()).build();
        }
        public static <T> ApiResponse<T> success(String message, T data) {
            return ApiResponse.<T>builder().success(true).message(message).data(data).timestamp(Instant.now()).build();
        }
        public static <T> ApiResponse<T> error(String message) {
            return ApiResponse.<T>builder().success(false).message(message).timestamp(Instant.now()).build();
        }
    }
}
