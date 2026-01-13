package com.quikapp.user.controller;

import com.quikapp.user.dto.UserDtos.*;
import com.quikapp.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User management APIs")
public class UserController {

    private final UserService userService;

    @PostMapping
    @Operation(summary = "Create a new user")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("User created", userService.createUser(request)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(id)));
    }

    @GetMapping("/email/{email}")
    @Operation(summary = "Get user by email")
    public ResponseEntity<ApiResponse<UserResponse>> getUserByEmail(@PathVariable String email) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserByEmail(email)));
    }

    @GetMapping("/username/{username}")
    @Operation(summary = "Get user by username")
    public ResponseEntity<ApiResponse<UserResponse>> getUserByUsername(@PathVariable String username) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserByUsername(username)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update user")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(@PathVariable UUID id, @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.success("User updated", userService.updateUser(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Deactivate user")
    public ResponseEntity<ApiResponse<Void>> deactivateUser(@PathVariable UUID id) {
        userService.deactivateUser(id);
        return ResponseEntity.ok(ApiResponse.success("User deactivated", null));
    }

    @PostMapping("/{id}/suspend")
    @Operation(summary = "Suspend user")
    public ResponseEntity<ApiResponse<Void>> suspendUser(@PathVariable UUID id) {
        userService.suspendUser(id);
        return ResponseEntity.ok(ApiResponse.success("User suspended", null));
    }

    @GetMapping("/search")
    @Operation(summary = "Search users")
    public ResponseEntity<ApiResponse<PageResponse<UserSummaryResponse>>> searchUsers(
            @RequestParam String query, @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        SearchUsersRequest request = SearchUsersRequest.builder().query(query)
            .status(status != null ? com.quikapp.user.domain.entity.User.UserStatus.valueOf(status.toUpperCase()) : null)
            .page(page).size(size).build();
        return ResponseEntity.ok(ApiResponse.success(userService.searchUsers(request)));
    }

    @PostMapping("/batch")
    @Operation(summary = "Get users by IDs")
    public ResponseEntity<ApiResponse<List<UserSummaryResponse>>> getUsersByIds(@RequestBody List<UUID> ids) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUsersByIds(ids)));
    }

    @GetMapping("/{id}/profile")
    @Operation(summary = "Get user profile")
    public ResponseEntity<ApiResponse<ProfileResponse>> getProfile(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(userService.getProfile(id)));
    }

    @PatchMapping("/{id}/profile")
    @Operation(summary = "Update user profile")
    public ResponseEntity<ApiResponse<ProfileResponse>> updateProfile(@PathVariable UUID id, @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Profile updated", userService.updateProfile(id, request)));
    }

    @GetMapping("/{id}/preferences")
    @Operation(summary = "Get user preferences")
    public ResponseEntity<ApiResponse<PreferencesResponse>> getPreferences(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(userService.getPreferences(id)));
    }

    @PatchMapping("/{id}/preferences")
    @Operation(summary = "Update user preferences")
    public ResponseEntity<ApiResponse<PreferencesResponse>> updatePreferences(@PathVariable UUID id, @Valid @RequestBody UpdatePreferencesRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Preferences updated", userService.updatePreferences(id, request)));
    }
}
