import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/user.dart';

class UserService {
  final ApiClient _apiClient;

  UserService({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient(baseUrl: ApiConstants.userServiceBaseUrl);

  /// Get user by ID
  Future<User> getUserById(String userId) async {
    final response = await _apiClient.get('${ApiConstants.users}/$userId');
    return User.fromJson(response.data as Map<String, dynamic>);
  }

  /// Get current user profile
  Future<User> getProfile() async {
    final response = await _apiClient.get(ApiConstants.userProfile);
    return User.fromJson(response.data as Map<String, dynamic>);
  }

  /// Update user profile
  Future<User> updateProfile({
    String? firstName,
    String? lastName,
    String? displayName,
    String? avatar,
  }) async {
    final response = await _apiClient.patch(
      ApiConstants.userProfile,
      data: {
        if (firstName != null) 'firstName': firstName,
        if (lastName != null) 'lastName': lastName,
        if (displayName != null) 'displayName': displayName,
        if (avatar != null) 'avatar': avatar,
      },
    );
    return User.fromJson(response.data as Map<String, dynamic>);
  }

  /// Search users by query
  Future<List<User>> searchUsers({
    required String query,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _apiClient.get(
      ApiConstants.searchUsers,
      queryParameters: {
        'q': query,
        'page': page,
        'limit': limit,
      },
    );

    final data = response.data;
    if (data is List) {
      return data.map((u) => User.fromJson(u as Map<String, dynamic>)).toList();
    } else if (data is Map<String, dynamic>) {
      final users = data['users'] as List<dynamic>? ?? [];
      return users.map((u) => User.fromJson(u as Map<String, dynamic>)).toList();
    }
    return [];
  }

  /// Get multiple users by IDs
  Future<List<User>> getUsersByIds(List<String> userIds) async {
    final response = await _apiClient.post(
      '${ApiConstants.users}/batch',
      data: {'ids': userIds},
    );

    final data = response.data as List<dynamic>;
    return data.map((u) => User.fromJson(u as Map<String, dynamic>)).toList();
  }

  /// Update user status
  Future<void> updateStatus(UserStatus status) async {
    await _apiClient.patch(
      '${ApiConstants.userProfile}/status',
      data: {'status': status.name},
    );
  }

  /// Upload avatar
  Future<String> uploadAvatar(String filePath) async {
    // For file uploads, you might need to use FormData
    // This is a simplified example
    final response = await _apiClient.post(
      '${ApiConstants.userProfile}/avatar',
      data: {'filePath': filePath},
    );
    return response.data['avatarUrl'] as String;
  }

  /// Delete user account
  Future<void> deleteAccount() async {
    await _apiClient.delete(ApiConstants.userProfile);
  }
}
