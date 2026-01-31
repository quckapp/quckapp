import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../core/exceptions/api_exception.dart';
import '../../services/auth_service.dart';
import '../../services/realtime_service.dart';
import 'auth_event.dart';
import 'auth_state.dart';

export 'auth_event.dart';
export 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthService _authService;
  final RealtimeService? _realtimeService;

  AuthBloc({
    required AuthService authService,
    RealtimeService? realtimeService,
  })  : _authService = authService,
        _realtimeService = realtimeService,
        super(const AuthState()) {
    on<AuthCheckStatus>(_onCheckStatus);
    on<AuthRequestOtp>(_onRequestOtp);
    on<AuthVerifyOtp>(_onVerifyOtp);
    on<AuthResendOtp>(_onResendOtp);
    on<AuthCancelOtp>(_onCancelOtp);
    on<AuthLogout>(_onLogout);
    on<AuthUpdateProfile>(_onUpdateProfile);
    on<AuthCompleteProfileSetup>(_onCompleteProfileSetup);
    on<AuthRequestEmailOtp>(_onRequestEmailOtp);
    on<AuthVerifyEmailOtp>(_onVerifyEmailOtp);
    on<AuthConnectEmail>(_onConnectEmail);
    on<AuthRefreshUser>(_onRefreshUser);
    on<AuthClearError>(_onClearError);

    // Check auth status on initialization
    add(const AuthCheckStatus());
  }

  Future<void> _onCheckStatus(
    AuthCheckStatus event,
    Emitter<AuthState> emit,
  ) async {
    try {
      final isLoggedIn = await _authService.isLoggedIn();

      if (isLoggedIn) {
        // If we have valid tokens, try to get user info
        User? user;
        try {
          user = await _authService.getCurrentUser();
          debugPrint('AuthBloc: Got user info - username: ${user.username}, isNewUser: ${user.isNewUser}');
        } catch (e) {
          // User info fetch failed, but we still have valid tokens
          debugPrint('AuthBloc: Failed to get user info: $e');
        }

        // Check if user needs profile setup (username is null, empty, or temporary)
        final needsProfileSetup = user != null &&
            (user.username == null || user.username!.isEmpty || user.username!.startsWith('user_'));

        debugPrint('AuthBloc: needsProfileSetup = $needsProfileSetup');

        if (needsProfileSetup) {
          emit(AuthState(
            status: AuthStatus.profileSetup,
            user: user,
            isNewUser: true,
          ));
        } else {
          emit(AuthState(
            status: AuthStatus.authenticated,
            user: user,
          ));
        }
      } else {
        emit(const AuthState(status: AuthStatus.unauthenticated));
      }
    } catch (e) {
      // If anything fails during auth check, default to unauthenticated
      debugPrint('AuthBloc: Auth check failed: $e');
      emit(const AuthState(status: AuthStatus.unauthenticated));
    }
  }

  Future<void> _onRequestOtp(
    AuthRequestOtp event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(status: AuthStatus.loading, error: null));

    try {
      await _authService.requestOtp(phoneNumber: event.phoneNumber);
      emit(AuthState(
        status: AuthStatus.otpSent,
        phoneNumber: event.phoneNumber,
      ));
    } catch (e) {
      emit(AuthState(
        status: AuthStatus.error,
        error: e is ApiException ? e.message : 'Failed to send OTP. Please try again.',
      ));
    }
  }

  Future<void> _onVerifyOtp(
    AuthVerifyOtp event,
    Emitter<AuthState> emit,
  ) async {
    if (state.phoneNumber == null) {
      emit(state.copyWith(
        error: 'Phone number not found. Please try again.',
      ));
      return;
    }

    emit(state.copyWith(status: AuthStatus.loading, error: null));

    try {
      final response = await _authService.loginWithOtp(
        phoneNumber: state.phoneNumber!,
        code: event.otp,
      );

      // Check if user is new - redirect to name registration
      if (response.user.isNewUser) {
        emit(AuthState(
          status: AuthStatus.profileSetup,
          user: response.user,
          isNewUser: true,
        ));
      } else {
        emit(AuthState(
          status: AuthStatus.authenticated,
          user: response.user,
        ));
      }
    } catch (e) {
      emit(state.copyWith(
        status: AuthStatus.otpSent,
        error: e is ApiException ? e.message : 'Invalid OTP. Please try again.',
      ));
    }
  }

  Future<void> _onResendOtp(
    AuthResendOtp event,
    Emitter<AuthState> emit,
  ) async {
    if (state.phoneNumber == null) return;

    emit(state.copyWith(status: AuthStatus.loading, error: null));

    try {
      await _authService.resendOtp();
      emit(state.copyWith(status: AuthStatus.otpSent));
    } catch (e) {
      emit(state.copyWith(
        status: AuthStatus.otpSent,
        error: e is ApiException ? e.message : 'Failed to resend OTP.',
      ));
    }
  }

  void _onCancelOtp(
    AuthCancelOtp event,
    Emitter<AuthState> emit,
  ) {
    emit(const AuthState(status: AuthStatus.unauthenticated));
  }

  Future<void> _onLogout(
    AuthLogout event,
    Emitter<AuthState> emit,
  ) async {
    debugPrint('AuthBloc: Starting logout...');
    try {
      // Disconnect from realtime service first
      _realtimeService?.disconnect();
      debugPrint('AuthBloc: Realtime service disconnected');

      await _authService.logout();
      debugPrint('AuthBloc: AuthService logout complete');
    } catch (e) {
      debugPrint('AuthBloc: Logout error: $e');
    } finally {
      debugPrint('AuthBloc: Setting state to unauthenticated');
      emit(const AuthState(status: AuthStatus.unauthenticated));
      debugPrint('AuthBloc: State is now: ${state.status}');
    }
  }

  Future<void> _onUpdateProfile(
    AuthUpdateProfile event,
    Emitter<AuthState> emit,
  ) async {
    debugPrint('AuthBloc: Updating profile...');
    try {
      final updatedUser = await _authService.updateProfile(
        firstName: event.firstName,
        lastName: event.lastName,
        displayName: event.displayName,
        username: event.username,
      );
      debugPrint('AuthBloc: Profile updated, setting state to authenticated');
      emit(AuthState(
        status: AuthStatus.authenticated,
        user: updatedUser,
      ));
      debugPrint('AuthBloc: State is now: ${state.status}');
    } catch (e) {
      debugPrint('AuthBloc: Profile update failed: $e');
      throw e is ApiException ? e : ApiException(message: 'Failed to update profile');
    }
  }

  void _onCompleteProfileSetup(
    AuthCompleteProfileSetup event,
    Emitter<AuthState> emit,
  ) {
    emit(AuthState(
      status: AuthStatus.authenticated,
      user: state.user,
    ));
  }

  Future<void> _onRequestEmailOtp(
    AuthRequestEmailOtp event,
    Emitter<AuthState> emit,
  ) async {
    try {
      await _authService.requestEmailOtp(email: event.email);
    } catch (e) {
      throw e is ApiException ? e : ApiException(message: 'Failed to send email OTP');
    }
  }

  Future<void> _onVerifyEmailOtp(
    AuthVerifyEmailOtp event,
    Emitter<AuthState> emit,
  ) async {
    try {
      await _authService.verifyEmailOtp(email: event.email, code: event.code);
      // Update user with verified email
      final updatedUser = state.user?.copyWith(email: event.email);
      emit(state.copyWith(user: updatedUser));
    } catch (e) {
      throw e is ApiException ? e : ApiException(message: 'Failed to verify email OTP');
    }
  }

  Future<void> _onConnectEmail(
    AuthConnectEmail event,
    Emitter<AuthState> emit,
  ) async {
    try {
      await _authService.connectEmail(email: event.email);
      // Update user with email
      final updatedUser = state.user?.copyWith(email: event.email);
      emit(AuthState(
        status: AuthStatus.authenticated,
        user: updatedUser,
      ));
    } catch (e) {
      throw e is ApiException ? e : ApiException(message: 'Failed to connect email');
    }
  }

  Future<void> _onRefreshUser(
    AuthRefreshUser event,
    Emitter<AuthState> emit,
  ) async {
    try {
      final user = await _authService.getCurrentUser();
      emit(state.copyWith(user: user));
    } catch (_) {
      // Ignore refresh errors
    }
  }

  void _onClearError(
    AuthClearError event,
    Emitter<AuthState> emit,
  ) {
    emit(state.copyWith(error: null));
  }
}
