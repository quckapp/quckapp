import 'package:flutter/foundation.dart';
import '../core/constants/api_constants.dart';
import '../core/exceptions/api_exception.dart';
import '../core/network/api_client.dart';
import '../core/storage/secure_storage.dart';
import '../models/auth_response.dart';
import '../models/user.dart';
import 'oauth_service.dart';

class AuthService {
  final ApiClient _apiClient;
  final SecureStorage _storage;

  AuthService({ApiClient? apiClient, SecureStorage? storage})
      : _apiClient = apiClient ?? ApiClient(baseUrl: ApiConstants.authServiceBaseUrl),
        _storage = storage ?? SecureStorage.instance;

  /// Request OTP for phone number
  Future<OtpRequestResponse> requestOtp({
    required String phoneNumber,
  }) async {
    debugPrint('Requesting OTP for: $phoneNumber');
    debugPrint('URL: ${ApiConstants.authServiceBaseUrl}${ApiConstants.requestOtp}');

    final response = await _apiClient.post(
      ApiConstants.requestOtp,
      data: {
        'phoneNumber': phoneNumber,
      },
    );

    debugPrint('Response: ${response.data}');
    final data = response.data as Map<String, dynamic>;

    if (data['success'] != true) {
      throw ApiException(message: data['message'] ?? 'Failed to send OTP');
    }

    // Store phone number for later use
    await _storage.saveVerificationData(
      verificationId: '',
      phoneNumber: phoneNumber,
    );

    return OtpRequestResponse(
      maskedPhone: data['maskedPhone'] as String?,
      expiresInSeconds: data['expiresInSeconds'] as int?,
      resendCooldownSeconds: data['resendCooldownSeconds'] as int?,
    );
  }

  /// Login with OTP - verifies OTP and returns auth tokens
  Future<AuthResponse> loginWithOtp({
    required String phoneNumber,
    required String code,
  }) async {
    final response = await _apiClient.post(
      ApiConstants.loginWithOtp,
      data: {
        'phoneNumber': phoneNumber,
        'code': code,
      },
    );

    final data = response.data as Map<String, dynamic>;

    if (data['success'] != true) {
      final remainingAttempts = data['remainingAttempts'] as int?;
      String message = data['message'] ?? 'Invalid OTP';
      if (remainingAttempts != null) {
        message = '$message ($remainingAttempts attempts remaining)';
      }
      throw ApiException(message: message);
    }

    final authResponse = AuthResponse(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
      user: User.fromJson(data['user'] as Map<String, dynamic>),
    );

    await _saveAuthData(authResponse);
    await _storage.clearVerificationData();
    return authResponse;
  }

  /// Resend OTP
  Future<OtpRequestResponse> resendOtp() async {
    final phoneNumber = await _storage.getPhoneNumber();
    if (phoneNumber == null) {
      throw ApiException(message: 'No phone number found');
    }
    return requestOtp(phoneNumber: phoneNumber);
  }

  /// Logout current user
  Future<void> logout() async {
    debugPrint('AuthService: Starting logout...');
    try {
      // Sign out from backend
      await _apiClient.post(ApiConstants.logout);
      debugPrint('AuthService: Backend logout successful');
    } catch (e) {
      debugPrint('AuthService: Backend logout error (ignored): $e');
    }

    // Sign out from OAuth providers
    try {
      await OAuthService.instance.signOutGoogle();
      debugPrint('AuthService: Google sign out successful');
    } catch (e) {
      debugPrint('AuthService: Google sign out error (ignored): $e');
    }

    // Clear all local storage
    try {
      await _storage.clearAll();
      debugPrint('AuthService: Storage cleared');
    } catch (e) {
      debugPrint('AuthService: Storage clear error: $e');
    }

    debugPrint('AuthService: Logout complete');
  }

  /// Refresh the access token
  Future<AuthResponse> refreshToken() async {
    final refreshToken = await _storage.getRefreshToken();
    if (refreshToken == null) {
      throw UnauthorizedException(message: 'No refresh token available');
    }

    final response = await _apiClient.post(
      ApiConstants.refreshToken,
      data: {'refreshToken': refreshToken},
    );

    final data = response.data as Map<String, dynamic>;
    final authResponse = AuthResponse(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
      user: User.fromJson(data['user'] as Map<String, dynamic>),
    );

    await _saveAuthData(authResponse);
    return authResponse;
  }

  /// Get current user profile
  Future<User> getCurrentUser() async {
    final response = await _apiClient.get(ApiConstants.me);
    return User.fromJson(response.data as Map<String, dynamic>);
  }

  /// Get all active sessions
  Future<List<Session>> getSessions() async {
    final response = await _apiClient.get(ApiConstants.sessions);
    final data = response.data as List<dynamic>;
    return data.map((s) => Session.fromJson(s as Map<String, dynamic>)).toList();
  }

  /// Revoke a specific session
  Future<void> revokeSession(String sessionId) async {
    await _apiClient.delete('${ApiConstants.sessions}/$sessionId');
  }

  /// Revoke all sessions except current
  Future<void> revokeAllSessions() async {
    await _apiClient.delete(ApiConstants.sessions);
  }

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    return await _storage.hasTokens();
  }

  /// Get stored access token
  Future<String?> getAccessToken() async {
    return await _storage.getAccessToken();
  }

  /// Get stored phone number
  Future<String?> getStoredPhoneNumber() async {
    return await _storage.getPhoneNumber();
  }

  /// Update user profile
  Future<User> updateProfile({
    String? firstName,
    String? lastName,
    String? displayName,
    String? username,
  }) async {
    final data = <String, dynamic>{};
    if (firstName != null) data['firstName'] = firstName;
    if (lastName != null) data['lastName'] = lastName;
    if (displayName != null) data['displayName'] = displayName;
    if (username != null) data['username'] = username;

    debugPrint('Updating profile with data: $data');

    final response = await _apiClient.patch(
      '/v1/users/profile',
      data: data,
    );

    debugPrint('Profile update response: ${response.data}');
    final responseData = response.data as Map<String, dynamic>;

    // Handle both wrapped response {success, user} and direct user object
    final userData = responseData['user'] ?? responseData;
    return User.fromJson(userData as Map<String, dynamic>);
  }

  /// Connect email to account
  Future<void> connectEmail({required String email}) async {
    debugPrint('Connecting email: $email');

    final response = await _apiClient.post(
      '/v1/users/email/connect',
      data: {'email': email},
    );

    debugPrint('Email connect response: ${response.data}');
    final responseData = response.data as Map<String, dynamic>;

    if (responseData['success'] != true) {
      throw ApiException(message: responseData['message'] ?? 'Failed to connect email');
    }
  }

  /// Request email OTP for verification (authenticated user)
  Future<EmailOtpResponse> requestEmailOtp({required String email}) async {
    debugPrint('Requesting email OTP for: $email');

    final response = await _apiClient.post(
      ApiConstants.requestEmailOtpAuthenticated,
      data: {'email': email},
    );

    debugPrint('Email OTP response: ${response.data}');
    final data = response.data as Map<String, dynamic>;

    if (data['success'] != true) {
      throw ApiException(message: data['message'] ?? 'Failed to send email OTP');
    }

    return EmailOtpResponse(
      maskedEmail: data['maskedEmail'] as String?,
      expiresInSeconds: data['expiresInSeconds'] as int?,
      resendCooldownSeconds: data['resendCooldownSeconds'] as int?,
    );
  }

  /// Verify email OTP (authenticated user)
  Future<void> verifyEmailOtp({
    required String email,
    required String code,
  }) async {
    debugPrint('Verifying email OTP for: $email');

    final response = await _apiClient.post(
      ApiConstants.verifyEmailOtpAuthenticated,
      data: {
        'email': email,
        'code': code,
      },
    );

    debugPrint('Email verify response: ${response.data}');
    final data = response.data as Map<String, dynamic>;

    if (data['success'] != true) {
      final remainingAttempts = data['remainingAttempts'] as int?;
      String message = data['message'] ?? 'Invalid OTP';
      if (remainingAttempts != null) {
        message = '$message ($remainingAttempts attempts remaining)';
      }
      throw ApiException(message: message);
    }
  }

  Future<void> _saveAuthData(AuthResponse authResponse) async {
    await _storage.saveTokens(
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
    );
    await _storage.saveUserInfo(
      id: authResponse.user.id,
      phoneNumber: authResponse.user.phoneNumber,
    );
  }
}

/// Response from OTP request
class OtpRequestResponse {
  final String? maskedPhone;
  final int? expiresInSeconds;
  final int? resendCooldownSeconds;

  OtpRequestResponse({
    this.maskedPhone,
    this.expiresInSeconds,
    this.resendCooldownSeconds,
  });
}

/// Response from Email OTP request
class EmailOtpResponse {
  final String? maskedEmail;
  final int? expiresInSeconds;
  final int? resendCooldownSeconds;

  EmailOtpResponse({
    this.maskedEmail,
    this.expiresInSeconds,
    this.resendCooldownSeconds,
  });
}
