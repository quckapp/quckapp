import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../bloc/bloc.dart';

class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        return Scaffold(
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 40),
                  // Header
                  Text(
                    'Complete Your Profile',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Choose how you want to set up your profile',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Colors.grey[600],
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 48),

                  // Personal Details Option
                  _SetupOptionCard(
                    icon: Icons.person_outline,
                    title: 'Enter Personal Details',
                    subtitle: 'Fill in your name and other information',
                    onTap: () => context.push('/profile-setup/details'),
                  ),
                  const SizedBox(height: 16),

                  // Divider with "or"
                  Row(
                    children: [
                      Expanded(child: Divider(color: Colors.grey[300])),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Text(
                          'or connect with',
                          style: TextStyle(color: Colors.grey[500]),
                        ),
                      ),
                      Expanded(child: Divider(color: Colors.grey[300])),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Social Login Options
                  _SocialLoginButton(
                    icon: 'assets/icons/google.png',
                    iconWidget: const Icon(Icons.g_mobiledata, size: 28),
                    label: 'Continue with Google',
                    backgroundColor: Colors.white,
                    textColor: Colors.black87,
                    borderColor: Colors.grey[300],
                    onTap: () => _connectWithGoogle(),
                  ),
                  const SizedBox(height: 12),

                  _SocialLoginButton(
                    icon: 'assets/icons/apple.png',
                    iconWidget: const Icon(Icons.apple, size: 28),
                    label: 'Continue with Apple',
                    backgroundColor: Colors.black,
                    textColor: Colors.white,
                    onTap: () => _connectWithApple(),
                  ),
                  const SizedBox(height: 12),

                  _SocialLoginButton(
                    icon: 'assets/icons/email.png',
                    iconWidget: const Icon(Icons.email_outlined, size: 24),
                    label: 'Continue with Email',
                    backgroundColor: const Color(0xFF4F46E5),
                    textColor: Colors.white,
                    onTap: () => context.push('/profile-setup/email'),
                  ),

                  const Spacer(),

                  // Skip button
                  TextButton(
                    onPressed: () => _skipSetup(),
                    child: Text(
                      'Skip for now',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _connectWithGoogle() {
    // TODO: Implement Google OAuth connection
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Google sign-in coming soon')),
    );
  }

  void _connectWithApple() {
    // TODO: Implement Apple OAuth connection
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Apple sign-in coming soon')),
    );
  }

  void _skipSetup() {
    context.read<AuthBloc>().add(const AuthCompleteProfileSetup());
    context.go('/');
  }
}

class _SetupOptionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _SetupOptionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey[200]!),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF4F46E5).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: const Color(0xFF4F46E5), size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.grey[400]),
            ],
          ),
        ),
      ),
    );
  }
}

class _SocialLoginButton extends StatelessWidget {
  final String icon;
  final Widget? iconWidget;
  final String label;
  final Color backgroundColor;
  final Color textColor;
  final Color? borderColor;
  final VoidCallback onTap;

  const _SocialLoginButton({
    required this.icon,
    this.iconWidget,
    required this.label,
    required this.backgroundColor,
    required this.textColor,
    this.borderColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: backgroundColor,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: borderColor != null
                ? Border.all(color: borderColor!)
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (iconWidget != null)
                iconWidget!
              else
                Image.asset(icon, height: 24, width: 24),
              const SizedBox(width: 12),
              Text(
                label,
                style: TextStyle(
                  color: textColor,
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
