import 'package:equatable/equatable.dart';

class Permission extends Equatable {
  final String id;
  final String name;
  final String? description;
  final String? resource;
  final String? action;
  final DateTime? createdAt;

  const Permission({
    required this.id,
    required this.name,
    this.description,
    this.resource,
    this.action,
    this.createdAt,
  });

  factory Permission.fromJson(Map<String, dynamic> json) {
    return Permission(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      resource: json['resource'] as String?,
      action: json['action'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'resource': resource,
      'action': action,
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [id, name, description, resource, action, createdAt];
}

class Role extends Equatable {
  final String id;
  final String name;
  final String? description;
  final List<Permission> permissions;
  final DateTime? createdAt;

  const Role({
    required this.id,
    required this.name,
    this.description,
    this.permissions = const [],
    this.createdAt,
  });

  factory Role.fromJson(Map<String, dynamic> json) {
    return Role(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      permissions: (json['permissions'] as List<dynamic>?)
              ?.map((p) => Permission.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'permissions': permissions.map((p) => p.toJson()).toList(),
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  bool hasPermission(String permissionName) {
    return permissions.any((p) => p.name == permissionName);
  }

  @override
  List<Object?> get props => [id, name, description, permissions, createdAt];
}

class UserPermissions extends Equatable {
  final String userId;
  final List<Role> roles;
  final List<Permission> directPermissions;

  const UserPermissions({
    required this.userId,
    this.roles = const [],
    this.directPermissions = const [],
  });

  List<Permission> get allPermissions {
    final Set<Permission> allPerms = {...directPermissions};
    for (final role in roles) {
      allPerms.addAll(role.permissions);
    }
    return allPerms.toList();
  }

  bool hasPermission(String permissionName) {
    // Check direct permissions
    if (directPermissions.any((p) => p.name == permissionName)) {
      return true;
    }
    // Check role permissions
    return roles.any((r) => r.hasPermission(permissionName));
  }

  bool hasRole(String roleName) {
    return roles.any((r) => r.name == roleName);
  }

  factory UserPermissions.fromJson(Map<String, dynamic> json) {
    return UserPermissions(
      userId: json['userId'] as String,
      roles: (json['roles'] as List<dynamic>?)
              ?.map((r) => Role.fromJson(r as Map<String, dynamic>))
              .toList() ??
          [],
      directPermissions: (json['directPermissions'] as List<dynamic>?)
              ?.map((p) => Permission.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'roles': roles.map((r) => r.toJson()).toList(),
      'directPermissions': directPermissions.map((p) => p.toJson()).toList(),
    };
  }

  @override
  List<Object?> get props => [userId, roles, directPermissions];
}
