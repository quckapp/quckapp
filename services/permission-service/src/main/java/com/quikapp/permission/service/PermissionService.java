package com.quikapp.permission.service;

import com.quikapp.permission.domain.entity.*;
import com.quikapp.permission.domain.repository.*;
import com.quikapp.permission.dto.PermissionDtos.*;
import com.quikapp.permission.exception.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PermissionService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRoleRepository userRoleRepository;

    // ===== Role Operations =====

    public RoleResponse createRole(CreateRoleRequest request) {
        if (roleRepository.existsByWorkspaceIdAndName(request.getWorkspaceId(), request.getName())) {
            throw new DuplicateResourceException("Role already exists in workspace");
        }

        Role role = Role.builder()
            .workspaceId(request.getWorkspaceId())
            .name(request.getName())
            .description(request.getDescription())
            .priority(request.getPriority())
            .build();

        if (request.getPermissionIds() != null && !request.getPermissionIds().isEmpty()) {
            Set<Permission> permissions = new HashSet<>(permissionRepository.findByIdIn(new ArrayList<>(request.getPermissionIds())));
            role.setPermissions(permissions);
        }

        role = roleRepository.save(role);
        log.info("Created role {} in workspace {}", role.getName(), role.getWorkspaceId());
        return mapToRoleResponse(role);
    }

    @Cacheable(value = "roles", key = "#id")
    @Transactional(readOnly = true)
    public RoleResponse getRoleById(UUID id) {
        Role role = roleRepository.findByIdWithPermissions(id)
            .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        return mapToRoleResponse(role);
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> getRolesByWorkspace(UUID workspaceId) {
        return roleRepository.findByWorkspaceIdWithPermissions(workspaceId).stream()
            .map(this::mapToRoleResponse).toList();
    }

    @CacheEvict(value = "roles", key = "#id")
    public RoleResponse updateRole(UUID id, UpdateRoleRequest request) {
        Role role = roleRepository.findByIdWithPermissions(id)
            .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        if (role.isSystem()) throw new IllegalStateException("Cannot modify system role");

        if (request.getName() != null) role.setName(request.getName());
        if (request.getDescription() != null) role.setDescription(request.getDescription());
        if (request.getPriority() != null) role.setPriority(request.getPriority());
        if (request.getPermissionIds() != null) {
            Set<Permission> permissions = new HashSet<>(permissionRepository.findByIdIn(new ArrayList<>(request.getPermissionIds())));
            role.setPermissions(permissions);
        }

        role = roleRepository.save(role);
        return mapToRoleResponse(role);
    }

    @CacheEvict(value = "roles", key = "#id")
    public void deleteRole(UUID id) {
        Role role = roleRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        if (role.isSystem()) throw new IllegalStateException("Cannot delete system role");
        roleRepository.delete(role);
    }

    // ===== Permission Operations =====

    @Transactional(readOnly = true)
    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAll().stream().map(this::mapToPermissionResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> getPermissionsByResource(String resource) {
        return permissionRepository.findByResource(resource).stream().map(this::mapToPermissionResponse).toList();
    }

    // ===== User Role Operations =====

    @CacheEvict(value = "userPermissions", key = "#request.userId + ':' + #request.workspaceId")
    public UserRoleResponse assignRole(AssignRoleRequest request, UUID grantedBy) {
        if (userRoleRepository.existsByUserIdAndRoleIdAndWorkspaceId(request.getUserId(), request.getRoleId(), request.getWorkspaceId())) {
            throw new DuplicateResourceException("User already has this role");
        }

        Role role = roleRepository.findById(request.getRoleId())
            .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        UserRole userRole = UserRole.builder()
            .userId(request.getUserId())
            .roleId(request.getRoleId())
            .workspaceId(request.getWorkspaceId())
            .channelId(request.getChannelId())
            .grantedBy(grantedBy)
            .build();

        userRole = userRoleRepository.save(userRole);
        log.info("Assigned role {} to user {} in workspace {}", role.getName(), request.getUserId(), request.getWorkspaceId());

        return UserRoleResponse.builder()
            .userId(userRole.getUserId())
            .roleId(userRole.getRoleId())
            .roleName(role.getName())
            .workspaceId(userRole.getWorkspaceId())
            .channelId(userRole.getChannelId())
            .grantedBy(userRole.getGrantedBy())
            .grantedAt(userRole.getGrantedAt())
            .build();
    }

    @CacheEvict(value = "userPermissions", key = "#userId + ':' + #workspaceId")
    public void revokeRole(UUID userId, UUID roleId, UUID workspaceId) {
        userRoleRepository.deleteByUserIdAndRoleIdAndWorkspaceId(userId, roleId, workspaceId);
        log.info("Revoked role {} from user {} in workspace {}", roleId, userId, workspaceId);
    }

    @Cacheable(value = "userPermissions", key = "#userId + ':' + #workspaceId")
    @Transactional(readOnly = true)
    public UserPermissionsResponse getUserPermissions(UUID userId, UUID workspaceId) {
        List<UserRole> userRoles = userRoleRepository.findByUserIdAndWorkspaceIdWithRoleAndPermissions(userId, workspaceId);

        Set<String> allPermissions = new HashSet<>();
        List<RoleResponse> roles = new ArrayList<>();

        for (UserRole ur : userRoles) {
            Role role = ur.getRole();
            roles.add(mapToRoleResponse(role));
            role.getPermissions().forEach(p -> allPermissions.add(p.getKey()));
        }

        return UserPermissionsResponse.builder()
            .userId(userId)
            .workspaceId(workspaceId)
            .roles(roles)
            .permissions(allPermissions)
            .build();
    }

    @Transactional(readOnly = true)
    public PermissionCheckResponse checkPermission(CheckPermissionRequest request) {
        UserPermissionsResponse userPerms = getUserPermissions(request.getUserId(), request.getWorkspaceId());
        String permKey = request.getResource() + ":" + request.getAction();

        boolean allowed = userPerms.getPermissions().contains(permKey) || userPerms.getPermissions().contains(request.getResource() + ":*");

        return PermissionCheckResponse.builder()
            .allowed(allowed)
            .reason(allowed ? "Permission granted" : "Permission denied")
            .build();
    }

    // ===== Mappers =====

    private RoleResponse mapToRoleResponse(Role role) {
        return RoleResponse.builder()
            .id(role.getId())
            .workspaceId(role.getWorkspaceId())
            .name(role.getName())
            .description(role.getDescription())
            .isSystem(role.isSystem())
            .priority(role.getPriority())
            .permissions(role.getPermissions().stream().map(this::mapToPermissionResponse).collect(Collectors.toSet()))
            .createdAt(role.getCreatedAt())
            .updatedAt(role.getUpdatedAt())
            .build();
    }

    private PermissionResponse mapToPermissionResponse(Permission p) {
        return PermissionResponse.builder()
            .id(p.getId())
            .resource(p.getResource())
            .action(p.getAction())
            .description(p.getDescription())
            .build();
    }
}
