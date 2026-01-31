import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/permission.dart';

class PermissionService {
  final ApiClient _apiClient;

  PermissionService({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient(baseUrl: ApiConstants.permissionServiceBaseUrl);

  /// Get all permissions for current user
  Future<UserPermissions> getCurrentUserPermissions() async {
    final response = await _apiClient.get('${ApiConstants.userPermissions}/me');
    return UserPermissions.fromJson(response.data as Map<String, dynamic>);
  }

  /// Get permissions for a specific user
  Future<UserPermissions> getUserPermissions(String userId) async {
    final response = await _apiClient.get('${ApiConstants.userPermissions}/$userId');
    return UserPermissions.fromJson(response.data as Map<String, dynamic>);
  }

  /// Get all available roles
  Future<List<Role>> getAllRoles() async {
    final response = await _apiClient.get(ApiConstants.roles);
    final data = response.data as List<dynamic>;
    return data.map((r) => Role.fromJson(r as Map<String, dynamic>)).toList();
  }

  /// Get role by ID
  Future<Role> getRoleById(String roleId) async {
    final response = await _apiClient.get('${ApiConstants.roles}/$roleId');
    return Role.fromJson(response.data as Map<String, dynamic>);
  }

  /// Get all available permissions
  Future<List<Permission>> getAllPermissions() async {
    final response = await _apiClient.get(ApiConstants.permissions);
    final data = response.data as List<dynamic>;
    return data.map((p) => Permission.fromJson(p as Map<String, dynamic>)).toList();
  }

  /// Check if current user has a specific permission
  Future<bool> hasPermission(String permissionName) async {
    try {
      final response = await _apiClient.get(
        '${ApiConstants.userPermissions}/me/check',
        queryParameters: {'permission': permissionName},
      );
      return response.data['hasPermission'] as bool? ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Check if current user has any of the specified permissions
  Future<Map<String, bool>> checkPermissions(List<String> permissionNames) async {
    try {
      final response = await _apiClient.post(
        '${ApiConstants.userPermissions}/me/check-batch',
        data: {'permissions': permissionNames},
      );
      final data = response.data as Map<String, dynamic>;
      return data.map((key, value) => MapEntry(key, value as bool));
    } catch (_) {
      return {for (var p in permissionNames) p: false};
    }
  }

  /// Assign role to user (admin only)
  Future<void> assignRole({
    required String userId,
    required String roleId,
  }) async {
    await _apiClient.post(
      '${ApiConstants.userPermissions}/$userId/roles',
      data: {'roleId': roleId},
    );
  }

  /// Remove role from user (admin only)
  Future<void> removeRole({
    required String userId,
    required String roleId,
  }) async {
    await _apiClient.delete(
      '${ApiConstants.userPermissions}/$userId/roles/$roleId',
    );
  }

  /// Assign direct permission to user (admin only)
  Future<void> assignPermission({
    required String userId,
    required String permissionId,
  }) async {
    await _apiClient.post(
      '${ApiConstants.userPermissions}/$userId/permissions',
      data: {'permissionId': permissionId},
    );
  }

  /// Remove direct permission from user (admin only)
  Future<void> removePermission({
    required String userId,
    required String permissionId,
  }) async {
    await _apiClient.delete(
      '${ApiConstants.userPermissions}/$userId/permissions/$permissionId',
    );
  }
}
