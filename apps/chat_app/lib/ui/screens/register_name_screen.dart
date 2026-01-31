import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../bloc/bloc.dart';
import '../../services/oauth_service.dart';

class RegisterNameScreen extends StatefulWidget {
  const RegisterNameScreen({super.key});

  @override
  State<RegisterNameScreen> createState() => _RegisterNameScreenState();
}

class _RegisterNameScreenState extends State<RegisterNameScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();

  bool _isLoading = false;
  bool _isOAuthLoading = false;
  bool _isEmailVerified = false;
  String? _connectedAvatar;
  String? _oauthProvider; // 'google', 'apple', or 'email'

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        return Scaffold(
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 12),

                    // Avatar or Welcome Icon
                    Center(
                      child: _connectedAvatar != null
                          ? CircleAvatar(
                              radius: 40,
                              backgroundImage: NetworkImage(_connectedAvatar!),
                              backgroundColor: const Color(0xFF4F46E5).withValues(alpha: 0.1),
                            )
                          : Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: const Color(0xFF4F46E5).withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.person_add,
                                size: 40,
                                color: Color(0xFF4F46E5),
                              ),
                            ),
                    ),
                    const SizedBox(height: 16),

                    // Welcome Text
                    Text(
                      'Complete Your Profile',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Add your details to get started',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                    ),
                    const SizedBox(height: 20),

                    // First Name
                    TextFormField(
                      controller: _firstNameController,
                      decoration: const InputDecoration(
                        labelText: 'First Name *',
                        hintText: 'Enter your first name',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      textCapitalization: TextCapitalization.words,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter your first name';
                        }
                        if (value.trim().length < 2) {
                          return 'Name must be at least 2 characters';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),

                    // Last Name
                    TextFormField(
                      controller: _lastNameController,
                      decoration: const InputDecoration(
                        labelText: 'Last Name *',
                        hintText: 'Enter your last name',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      textCapitalization: TextCapitalization.words,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter your last name';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),

                    // Username
                    TextFormField(
                      controller: _usernameController,
                      decoration: const InputDecoration(
                        labelText: 'Username *',
                        hintText: 'Choose a unique username',
                        prefixIcon: Icon(Icons.alternate_email),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter a username';
                        }
                        if (value.trim().length < 3) {
                          return 'Username must be at least 3 characters';
                        }
                        if (!RegExp(r'^[a-zA-Z0-9_]+$').hasMatch(value.trim())) {
                          return 'Only letters, numbers, and underscore allowed';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),

                    // Show verified email if available
                    if (_isEmailVerified && _emailController.text.isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey[300]!),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.email_outlined, color: Colors.grey),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                _emailController.text,
                                style: const TextStyle(fontSize: 16),
                              ),
                            ),
                            const Icon(Icons.verified, color: Colors.green, size: 20),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Connected OAuth badge
                    if (_oauthProvider != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.green[50],
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.green[200]!),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _oauthProvider == 'google'
                                  ? Icons.g_mobiledata
                                  : _oauthProvider == 'apple'
                                      ? Icons.apple
                                      : Icons.email,
                              color: Colors.green[700],
                              size: 22,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Connected with ${_oauthProvider == 'google' ? 'Google' : _oauthProvider == 'apple' ? 'Apple' : 'Email'}',
                                style: TextStyle(
                                  color: Colors.green[700],
                                  fontWeight: FontWeight.w500,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                            IconButton(
                              icon: Icon(Icons.close, color: Colors.green[700], size: 18),
                              onPressed: _disconnectOAuth,
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Continue Button
                    ElevatedButton(
                      onPressed: _isLoading || _isOAuthLoading ? null : _saveAndContinue,
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Continue'),
                    ),
                    const SizedBox(height: 16),

                    // Divider - only show if OAuth not connected
                    if (_oauthProvider == null) ...[
                      Row(
                        children: [
                          Expanded(child: Divider(color: Colors.grey[300])),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              'or connect account',
                              style: TextStyle(color: Colors.grey[500], fontSize: 12),
                            ),
                          ),
                          Expanded(child: Divider(color: Colors.grey[300])),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // OAuth Buttons Section
                      // Google Sign-In - Android only (not available on web)
                      if (!kIsWeb && Theme.of(context).platform == TargetPlatform.android) ...[
                        _buildOAuthButton(
                          icon: Icons.g_mobiledata,
                          label: 'Continue with Google',
                          color: Colors.white,
                          textColor: Colors.black87,
                          borderColor: Colors.grey[300],
                          onTap: () => _connectOAuth('google'),
                        ),
                        const SizedBox(height: 10),
                      ],
                      // Apple Sign-In - iOS only (not available on web)
                      if (!kIsWeb && Theme.of(context).platform == TargetPlatform.iOS) ...[
                        _buildOAuthButton(
                          icon: Icons.apple,
                          label: 'Continue with Apple',
                          color: Colors.black,
                          textColor: Colors.white,
                          onTap: () => _connectOAuth('apple'),
                        ),
                        const SizedBox(height: 10),
                      ],
                      _buildOAuthButton(
                        icon: Icons.email_outlined,
                        label: 'Verify Email',
                        color: const Color(0xFF4F46E5).withValues(alpha: 0.1),
                        textColor: const Color(0xFF4F46E5),
                        onTap: () => _showEmailVerificationDialog(),
                      ),
                      const SizedBox(height: 16),
                    ],
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildOAuthButton({
    required IconData icon,
    required String label,
    required Color color,
    required Color textColor,
    Color? borderColor,
    required VoidCallback onTap,
  }) {
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: _isOAuthLoading ? null : onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: borderColor != null ? Border.all(color: borderColor) : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (_isOAuthLoading)
                SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: textColor,
                  ),
                )
              else ...[
                Icon(icon, color: textColor, size: 24),
                const SizedBox(width: 12),
                Text(
                  label,
                  style: TextStyle(
                    color: textColor,
                    fontWeight: FontWeight.w500,
                    fontSize: 15,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _connectOAuth(String provider) async {
    setState(() => _isOAuthLoading = true);

    try {
      if (provider == 'google') {
        final result = await OAuthService.instance.signInWithGoogle();

        if (result == null) {
          // User cancelled
          if (mounted) {
            setState(() => _isOAuthLoading = false);
          }
          return;
        }

        setState(() {
          _oauthProvider = 'google';
          _connectedAvatar = result.avatarUrl;
          _isEmailVerified = true; // Google email is verified

          // Pre-fill name fields from Google
          if (result.firstName != null && result.firstName!.isNotEmpty) {
            _firstNameController.text = result.firstName!;
          }
          if (result.lastName != null && result.lastName!.isNotEmpty) {
            _lastNameController.text = result.lastName!;
          }

          // Pre-fill email from Google (read-only)
          if (result.email != null && result.email!.isNotEmpty) {
            _emailController.text = result.email!;
          }

          // Generate username suggestion from email
          if (result.email != null && _usernameController.text.isEmpty) {
            final emailPart = result.email!.split('@').first;
            _usernameController.text = emailPart.replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '_');
          }
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Connected with Google'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else if (provider == 'apple') {
        // TODO: Implement Apple Sign-In
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Apple Sign-In coming soon'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('OAuth error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to connect: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isOAuthLoading = false);
      }
    }
  }

  Future<void> _showEmailVerificationDialog() async {
    final emailController = TextEditingController();
    final otpController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool otpSent = false;
    bool isLoading = false;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          title: Text(otpSent ? 'Verify OTP' : 'Verify Email'),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!otpSent) ...[
                  TextFormField(
                    controller: emailController,
                    decoration: const InputDecoration(
                      labelText: 'Email Address',
                      hintText: 'Enter your email',
                      prefixIcon: Icon(Icons.email_outlined),
                    ),
                    keyboardType: TextInputType.emailAddress,
                    autofocus: true,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter your email';
                      }
                      if (!_isValidEmail(value.trim())) {
                        return 'Please enter a valid email';
                      }
                      return null;
                    },
                  ),
                ] else ...[
                  Text(
                    'OTP sent to ${emailController.text}',
                    style: TextStyle(color: Colors.grey[600], fontSize: 14),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: otpController,
                    decoration: const InputDecoration(
                      labelText: 'Enter OTP',
                      hintText: '6-digit code',
                      prefixIcon: Icon(Icons.lock_outline),
                    ),
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    autofocus: true,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter OTP';
                      }
                      if (value.trim().length != 6) {
                        return 'OTP must be 6 digits';
                      }
                      return null;
                    },
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: isLoading ? null : () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: isLoading
                  ? null
                  : () async {
                      if (!formKey.currentState!.validate()) return;

                      setDialogState(() => isLoading = true);

                      try {
                        if (!otpSent) {
                          // Send OTP to email via backend API
                          context.read<AuthBloc>().add(
                            AuthRequestEmailOtp(emailController.text.trim()),
                          );

                          setDialogState(() {
                            otpSent = true;
                            isLoading = false;
                          });

                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('OTP sent to ${emailController.text}'),
                                backgroundColor: Colors.green,
                              ),
                            );
                          }
                        } else {
                          // Verify OTP via backend API
                          context.read<AuthBloc>().add(
                            AuthVerifyEmailOtp(
                              email: emailController.text.trim(),
                              code: otpController.text.trim(),
                            ),
                          );

                          if (mounted) {
                            Navigator.pop(dialogContext);
                            setState(() {
                              _oauthProvider = 'email';
                              _emailController.text = emailController.text.trim();
                              _isEmailVerified = true;
                            });

                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Email verified successfully'),
                                backgroundColor: Colors.green,
                              ),
                            );
                          }
                        }
                      } catch (e) {
                        setDialogState(() => isLoading = false);
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Error: ${e.toString()}'),
                              backgroundColor: Colors.red,
                            ),
                          );
                        }
                      }
                    },
              child: isLoading
                  ? const SizedBox(
                      height: 16,
                      width: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(otpSent ? 'Verify' : 'Send OTP'),
            ),
          ],
        ),
      ),
    );
  }

  bool _isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  void _disconnectOAuth() {
    setState(() {
      _oauthProvider = null;
      _connectedAvatar = null;
      _isEmailVerified = false;
      _emailController.clear();
      // Keep name fields - user might have edited them
    });
  }

  Future<void> _saveAndContinue() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final firstName = _firstNameController.text.trim();
      final lastName = _lastNameController.text.trim();
      final username = _usernameController.text.trim();
      final email = _emailController.text.trim();
      final displayName = '$firstName $lastName';

      // If email is provided and verified, connect it first
      if (email.isNotEmpty && _isEmailVerified) {
        try {
          context.read<AuthBloc>().add(AuthConnectEmail(email));
        } catch (e) {
          debugPrint('Email connect failed: $e');
          final errorMsg = e.toString().toLowerCase();

          if (errorMsg.contains('email') && errorMsg.contains('exists')) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('This email is already registered to another account.'),
                  backgroundColor: Colors.red,
                  duration: Duration(seconds: 4),
                ),
              );
              setState(() => _isLoading = false);
            }
            return; // Don't continue
          }
          rethrow;
        }
      }

      // Update profile with name and username
      context.read<AuthBloc>().add(AuthUpdateProfile(
            firstName: firstName,
            lastName: lastName,
            displayName: displayName,
            username: username,
          ));

      // Success - router will redirect to home
    } catch (e) {
      debugPrint('Profile save failed: $e');
      if (mounted) {
        final errorMsg = e.toString().toLowerCase();
        String message = 'Failed to save profile. Please try again.';

        if (errorMsg.contains('username') && errorMsg.contains('exists')) {
          message = 'This username is already taken. Please choose another.';
        } else if (errorMsg.contains('email') && errorMsg.contains('exists')) {
          message = 'This email is already registered to another account.';
        } else if (errorMsg.contains('phone') && errorMsg.contains('exists')) {
          message = 'This phone number is already registered.';
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}
