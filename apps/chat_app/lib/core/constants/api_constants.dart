class ApiConstants {
  ApiConstants._();

  // Change this to your computer's IP if using physical device
  // For Android emulator: 10.0.2.2
  // For physical device: your computer's IP (e.g., 192.168.29.198)
  // For web browser: localhost
  static const String _host = '127.0.0.1';

  // Base URLs (including context paths)
  static const String authServiceBaseUrl = 'http://$_host:8081/api/auth';
  static const String userServiceBaseUrl = 'http://$_host:8082';
  static const String permissionServiceBaseUrl = 'http://$_host:8083';
  static const String gatewayBaseUrl = 'http://$_host:3000';

  // Elixir Services
  static const String realtimeServiceWsUrl = 'ws://$_host:4003/socket/websocket';
  static const String messageServiceBaseUrl = 'http://$_host:4006';

  // Auth endpoints - Phone OTP
  static const String requestOtp = '/v1/auth/phone/request-otp';
  static const String loginWithOtp = '/v1/auth/phone/login';
  static const String resendOtp = '/v1/auth/phone/resend-otp';

  // Auth endpoints - Email OTP (for email verification)
  static const String requestEmailOtp = '/v1/auth/email/request-otp';
  static const String verifyEmailOtp = '/v1/auth/email/verify-otp';
  static const String requestEmailOtpAuthenticated = '/v1/auth/email/request-otp/authenticated';
  static const String verifyEmailOtpAuthenticated = '/v1/auth/email/verify-otp/authenticated';

  // Auth endpoints - General
  static const String logout = '/v1/logout';
  static const String refreshToken = '/v1/token/refresh';
  static const String sessions = '/v1/sessions';
  static const String me = '/v1/users/me';

  // User endpoints
  static const String users = '/api/users/v1';
  static const String userProfile = '/api/users/v1/profile';
  static const String searchUsers = '/api/users/v1/search';

  // Permission endpoints
  static const String permissions = '/api/permissions/v1';
  static const String roles = '/api/permissions/v1/roles';
  static const String userPermissions = '/api/permissions/v1/users';

  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
