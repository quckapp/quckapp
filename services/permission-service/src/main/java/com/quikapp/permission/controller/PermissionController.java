package com.quikapp.permission.controller;

import com.quikapp.permission.dto.PermissionDtos.*;
import com.quikapp.permission.service.PermissionService;
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
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
@Tag(name = "Permissions", description = "RBAC permission management APIs")
public class PermissionController {

    private final PermissionService permissionService;

    // ===== Role Endpoints =====

    @PostMapping("/roles")
    @Operation(summary = "Create a new role")
    public ResponseEntity<ApiResponse<RoleResponse>> createRole(@Valid @RequestBody CreateRoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Role created", permissionService.createRole(request)));
    }

    @GetMapping("/roles/{id}")
    @Operation(summary = "Get role by ID")
    public ResponseEntity<ApiResponse<RoleResponse>> getRoleById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(permissionService.getRoleById(id)));
    }

    @GetMapping("/roles/workspace/{workspaceId}")
    @Operation(summary = "Get roles by workspace")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getRolesByWorkspace(@PathVariable UUID workspaceId) {
        return ResponseEntity.ok(ApiResponse.success(permissionService.getRolesByWorkspace(workspaceId)));
    }

    @PutMapping("/roles/{id}")
    @Operation(summary = "Update role")
    public ResponseEntity<ApiResponse<RoleResponse>> updateRole(@PathVariable UUID id, @Valid @RequestBody UpdateRoleRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Role updated", permissionService.updateRole(id, request)));
    }

    @DeleteMapping("/roles/{id}")
    @Operation(summary = "Delete role")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable UUID id) {
        permissionService.deleteRole(id);
        return ResponseEntity.ok(ApiResponse.success("Role deleted", null));
    }

    // ===== Permission Endpoints =====

    @GetMapping
    @Operation(summary = "Get all permissions")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getAllPermissions() {
        return ResponseEntity.ok(ApiResponse.success(permissionService.getAllPermissions()));
    }

    @GetMapping("/resource/{resource}")
    @Operation(summary = "Get permissions by resource")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getPermissionsByResource(@PathVariable String resource) {
        return ResponseEntity.ok(ApiResponse.success(permissionService.getPermissionsByResource(resource)));
    }

    // ===== User Role Endpoints =====

    @PostMapping("/users/assign")
    @Operation(summary = "Assign role to user")
    public ResponseEntity<ApiResponse<UserRoleResponse>> assignRole(
            @Valid @RequestBody AssignRoleRequest request,
            @RequestHeader(value = "X-User-Id", required = false) UUID grantedBy) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Role assigned", permissionService.assignRole(request, grantedBy)));
    }

    @DeleteMapping("/users/{userId}/roles/{roleId}/workspace/{workspaceId}")
    @Operation(summary = "Revoke role from user")
    public ResponseEntity<ApiResponse<Void>> revokeRole(
            @PathVariable UUID userId, @PathVariable UUID roleId, @PathVariable UUID workspaceId) {
        permissionService.revokeRole(userId, roleId, workspaceId);
        return ResponseEntity.ok(ApiResponse.success("Role revoked", null));
    }

    @GetMapping("/users/{userId}/workspace/{workspaceId}")
    @Operation(summary = "Get user permissions in workspace")
    public ResponseEntity<ApiResponse<UserPermissionsResponse>> getUserPermissions(
            @PathVariable UUID userId, @PathVariable UUID workspaceId) {
        return ResponseEntity.ok(ApiResponse.success(permissionService.getUserPermissions(userId, workspaceId)));
    }

    @PostMapping("/check")
    @Operation(summary = "Check if user has permission")
    public ResponseEntity<ApiResponse<PermissionCheckResponse>> checkPermission(@Valid @RequestBody CheckPermissionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(permissionService.checkPermission(request)));
    }
}
