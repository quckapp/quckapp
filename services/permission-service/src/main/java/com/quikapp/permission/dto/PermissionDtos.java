package com.quikapp.permission.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public class PermissionDtos {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CreateRoleRequest {
        @NotNull private UUID workspaceId;
        @NotBlank @Size(max = 50) private String name;
        @Size(max = 255) private String description;
        private int priority;
        private Set<UUID> permissionIds;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UpdateRoleRequest {
        @Size(max = 50) private String name;
        @Size(max = 255) private String description;
        private Integer priority;
        private Set<UUID> permissionIds;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RoleResponse {
        private UUID id;
        private UUID workspaceId;
        private String name;
        private String description;
        private boolean isSystem;
        private int priority;
        private Set<PermissionResponse> permissions;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PermissionResponse {
        private UUID id;
        private String resource;
        private String action;
        private String description;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AssignRoleRequest {
        @NotNull private UUID userId;
        @NotNull private UUID roleId;
        @NotNull private UUID workspaceId;
        private UUID channelId;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserRoleResponse {
        private UUID userId;
        private UUID roleId;
        private String roleName;
        private UUID workspaceId;
        private UUID channelId;
        private UUID grantedBy;
        private Instant grantedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CheckPermissionRequest {
        @NotNull private UUID userId;
        @NotNull private UUID workspaceId;
        @NotBlank private String resource;
        @NotBlank private String action;
        private UUID channelId;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PermissionCheckResponse {
        private boolean allowed;
        private String reason;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserPermissionsResponse {
        private UUID userId;
        private UUID workspaceId;
        private List<RoleResponse> roles;
        private Set<String> permissions;
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
