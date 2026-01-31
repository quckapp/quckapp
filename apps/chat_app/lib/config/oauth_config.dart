/// OAuth Configuration
///
/// To set up Google Sign-In:
/// 1. Go to https://console.cloud.google.com/
/// 2. Create a new project or select existing
/// 3. Enable Google Sign-In API
/// 4. Go to Credentials > Create Credentials > OAuth Client ID
/// 5. Create TWO credentials:
///    a) Web application (for serverClientId - needed for ID tokens)
///    b) Android (with package name and SHA-1)
///
/// Android Configuration:
/// - Package name: com.quckapp.chat_app
/// - SHA-1 (debug): 12:C8:A2:16:4E:51:B7:57:DA:07:69:02:3A:FC:DD:DD:E6:F0:D4:00
///
/// After creating, paste the Web client ID below:
class OAuthConfig {
  /// Web OAuth Client ID from Google Cloud Console
  /// This is required to get ID tokens for backend verification
  /// Format: xxxx.apps.googleusercontent.com
  static const String? googleWebClientId = null; // TODO: Add your web client ID

  /// Whether to use ID tokens for backend authentication
  static bool get useIdToken => googleWebClientId != null;
}
