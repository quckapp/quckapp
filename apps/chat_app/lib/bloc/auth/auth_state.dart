import 'package:equatable/equatable.dart';
import '../../models/user.dart';

export '../../models/user.dart';

/// Authentication status
enum AuthStatus {
  initial,
  loading,
  authenticated,
  unauthenticated,
  otpSent,
  profileSetup, // New user needs to complete profile
  error,
}

class AuthState extends Equatable {
  final AuthStatus status;
  final User? user;
  final String? error;
  final String? phoneNumber;
  final bool isNewUser;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.error,
    this.phoneNumber,
    this.isNewUser = false,
  });

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.loading;
  bool get isOtpSent => status == AuthStatus.otpSent;
  bool get needsProfileSetup => status == AuthStatus.profileSetup;
  bool get hasError => error != null;

  AuthState copyWith({
    AuthStatus? status,
    User? user,
    String? error,
    String? phoneNumber,
    bool? isNewUser,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      error: error,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      isNewUser: isNewUser ?? this.isNewUser,
    );
  }

  @override
  List<Object?> get props => [status, user, error, phoneNumber, isNewUser];
}
