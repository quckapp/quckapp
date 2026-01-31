import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

/// Check initial auth status (on app start)
class AuthCheckStatus extends AuthEvent {
  const AuthCheckStatus();
}

/// Request OTP for phone number
class AuthRequestOtp extends AuthEvent {
  final String phoneNumber;

  const AuthRequestOtp(this.phoneNumber);

  @override
  List<Object?> get props => [phoneNumber];
}

/// Verify OTP code
class AuthVerifyOtp extends AuthEvent {
  final String otp;

  const AuthVerifyOtp(this.otp);

  @override
  List<Object?> get props => [otp];
}

/// Resend OTP
class AuthResendOtp extends AuthEvent {
  const AuthResendOtp();
}

/// Cancel OTP flow (go back to login)
class AuthCancelOtp extends AuthEvent {
  const AuthCancelOtp();
}

/// Logout user
class AuthLogout extends AuthEvent {
  const AuthLogout();
}

/// Update user profile
class AuthUpdateProfile extends AuthEvent {
  final String? firstName;
  final String? lastName;
  final String? displayName;
  final String? username;

  const AuthUpdateProfile({
    this.firstName,
    this.lastName,
    this.displayName,
    this.username,
  });

  @override
  List<Object?> get props => [firstName, lastName, displayName, username];
}

/// Skip profile setup and go to authenticated
class AuthCompleteProfileSetup extends AuthEvent {
  const AuthCompleteProfileSetup();
}

/// Request email OTP for verification
class AuthRequestEmailOtp extends AuthEvent {
  final String email;

  const AuthRequestEmailOtp(this.email);

  @override
  List<Object?> get props => [email];
}

/// Verify email OTP
class AuthVerifyEmailOtp extends AuthEvent {
  final String email;
  final String code;

  const AuthVerifyEmailOtp({
    required this.email,
    required this.code,
  });

  @override
  List<Object?> get props => [email, code];
}

/// Connect email to account
class AuthConnectEmail extends AuthEvent {
  final String email;

  const AuthConnectEmail(this.email);

  @override
  List<Object?> get props => [email];
}

/// Refresh user data
class AuthRefreshUser extends AuthEvent {
  const AuthRefreshUser();
}

/// Clear error state
class AuthClearError extends AuthEvent {
  const AuthClearError();
}

/// Internal event: Auth status changed
class AuthStatusChanged extends AuthEvent {
  final AuthEventStatus status;

  const AuthStatusChanged(this.status);

  @override
  List<Object?> get props => [status];
}

/// Helper enum for internal status changes
enum AuthEventStatus {
  authenticated,
  unauthenticated,
  profileSetup,
}
