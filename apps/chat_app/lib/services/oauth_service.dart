import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../config/oauth_config.dart';

/// Result from OAuth sign-in
class OAuthResult {
  final String provider;
  final String? email;
  final String? firstName;
  final String? lastName;
  final String? displayName;
  final String? avatarUrl;
  final String? idToken;
  final String? accessToken;

  const OAuthResult({
    required this.provider,
    this.email,
    this.firstName,
    this.lastName,
    this.displayName,
    this.avatarUrl,
    this.idToken,
    this.accessToken,
  });

  @override
  String toString() {
    return 'OAuthResult(provider: $provider, email: $email, displayName: $displayName)';
  }
}

/// Service to handle OAuth sign-in (Google, Apple, etc.)
class OAuthService {
  static final OAuthService _instance = OAuthService._internal();
  factory OAuthService() => _instance;

  static OAuthService get instance => _instance;

  // Google Sign-In instance
  late final GoogleSignIn _googleSignIn;

  OAuthService._internal() {
    _googleSignIn = GoogleSignIn(
      scopes: [
        'email',
        'profile',
      ],
      // Server client ID is required to get ID tokens for backend verification
      serverClientId: OAuthConfig.googleWebClientId,
    );
  }

  /// Sign in with Google
  Future<OAuthResult?> signInWithGoogle() async {
    try {
      debugPrint('Starting Google Sign-In...');

      // Trigger the authentication flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        // User cancelled the sign-in
        debugPrint('Google Sign-In cancelled by user');
        return null;
      }

      debugPrint('Google Sign-In successful: ${googleUser.email}');

      // Obtain the auth details from the request
      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      // Parse display name into first/last name
      String? firstName;
      String? lastName;
      if (googleUser.displayName != null) {
        final nameParts = googleUser.displayName!.trim().split(' ');
        if (nameParts.isNotEmpty) {
          firstName = nameParts.first;
          if (nameParts.length > 1) {
            lastName = nameParts.sublist(1).join(' ');
          }
        }
      }

      return OAuthResult(
        provider: 'google',
        email: googleUser.email,
        firstName: firstName,
        lastName: lastName,
        displayName: googleUser.displayName,
        avatarUrl: googleUser.photoUrl,
        idToken: googleAuth.idToken,
        accessToken: googleAuth.accessToken,
      );
    } catch (e) {
      debugPrint('Google Sign-In error: $e');
      rethrow;
    }
  }

  /// Sign out from Google
  Future<void> signOutGoogle() async {
    try {
      await _googleSignIn.signOut();
      debugPrint('Google Sign-Out successful');
    } catch (e) {
      debugPrint('Google Sign-Out error: $e');
    }
  }

  /// Disconnect Google account (revokes access)
  Future<void> disconnectGoogle() async {
    try {
      await _googleSignIn.disconnect();
      debugPrint('Google Disconnect successful');
    } catch (e) {
      debugPrint('Google Disconnect error: $e');
    }
  }

  /// Check if user is currently signed in with Google
  Future<bool> isSignedInWithGoogle() async {
    return await _googleSignIn.isSignedIn();
  }

  /// Get current Google user (if signed in silently)
  Future<OAuthResult?> getCurrentGoogleUser() async {
    try {
      final GoogleSignInAccount? googleUser =
          await _googleSignIn.signInSilently();

      if (googleUser == null) {
        return null;
      }

      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      String? firstName;
      String? lastName;
      if (googleUser.displayName != null) {
        final nameParts = googleUser.displayName!.trim().split(' ');
        if (nameParts.isNotEmpty) {
          firstName = nameParts.first;
          if (nameParts.length > 1) {
            lastName = nameParts.sublist(1).join(' ');
          }
        }
      }

      return OAuthResult(
        provider: 'google',
        email: googleUser.email,
        firstName: firstName,
        lastName: lastName,
        displayName: googleUser.displayName,
        avatarUrl: googleUser.photoUrl,
        idToken: googleAuth.idToken,
        accessToken: googleAuth.accessToken,
      );
    } catch (e) {
      debugPrint('Get current Google user error: $e');
      return null;
    }
  }

  // TODO: Add Apple Sign-In implementation
  // Future<OAuthResult?> signInWithApple() async { ... }
}
