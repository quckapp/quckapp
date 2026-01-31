import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../bloc/bloc.dart';
import '../../core/theme/theme.dart';
import '../widgets/adaptive/adaptive_widgets.dart';
import '../widgets/common/app_avatar.dart';

class SettingsScreen extends StatelessWidget {
  final VoidCallback? onToggleTheme;
  final bool isDarkMode;

  const SettingsScreen({
    super.key,
    this.onToggleTheme,
    this.isDarkMode = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        final user = authState.user;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Settings'),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => context.pop(),
            ),
          ),
          body: ListView(
            children: [
              // Profile section
              Container(
                padding: AppSpacing.paddingLg,
                child: Row(
                  children: [
                    AppAvatar(
                      imageUrl: user?.avatar,
                      initials: user?.initials,
                      name: user?.fullName,
                      size: AppAvatarSize.lg,
                    ),
                    AppSpacing.horizontalSpaceMd,
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.fullName ?? 'User',
                            style: AppTypography.titleLarge.copyWith(
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.onSurface,
                            ),
                          ),
                          AppSpacing.verticalSpaceXxs,
                          if (user?.phoneNumber case final phone?)
                            Text(
                              phone,
                              style: AppTypography.bodyMedium.copyWith(
                                color: AppColors.grey600,
                              ),
                            ),
                          if (user?.email case final email?)
                            Text(
                              email,
                              style: AppTypography.bodyMedium.copyWith(
                                color: AppColors.grey500,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Settings sections
              _buildSection(
                context,
                title: 'Account',
                children: [
                  _buildSettingsTile(
                    context,
                    icon: Icons.person_outline,
                    title: 'Edit Profile',
                    onTap: () {
                      // TODO: Navigate to edit profile
                    },
                  ),
                  _buildSettingsTile(
                    context,
                    icon: Icons.lock_outline,
                    title: 'Change Password',
                    onTap: () {
                      // TODO: Navigate to change password
                    },
                  ),
                  _buildSettingsTile(
                    context,
                    icon: Icons.security_outlined,
                    title: 'Two-Factor Authentication',
                    onTap: () {
                      // TODO: Navigate to 2FA settings
                    },
                  ),
                  _buildSettingsTile(
                    context,
                    icon: Icons.devices_outlined,
                    title: 'Active Sessions',
                    onTap: () {
                      // TODO: Navigate to sessions
                    },
                  ),
                ],
              ),

              _buildSection(
                context,
                title: 'Preferences',
                children: [
                  _buildSettingsTile(
                    context,
                    icon: Icons.notifications_outlined,
                    title: 'Notifications',
                    onTap: () {
                      // TODO: Navigate to notifications settings
                    },
                  ),
                  _buildSwitchTile(
                    context,
                    icon: Icons.dark_mode_outlined,
                    title: 'Dark Mode',
                    subtitle: isDarkMode ? 'On' : 'Off',
                    value: isDarkMode,
                    onChanged: (value) => onToggleTheme?.call(),
                  ),
                  _buildSettingsTile(
                    context,
                    icon: Icons.language_outlined,
                    title: 'Language',
                    subtitle: 'English',
                    onTap: () {
                      // TODO: Navigate to language settings
                    },
                  ),
                ],
              ),

              _buildSection(
                context,
                title: 'Privacy',
                children: [
                  _buildSettingsTile(
                    context,
                    icon: Icons.visibility_outlined,
                    title: 'Online Status',
                    subtitle: 'Visible to everyone',
                    onTap: () {
                      // TODO: Navigate to privacy settings
                    },
                  ),
                  _buildSettingsTile(
                    context,
                    icon: Icons.block_outlined,
                    title: 'Blocked Users',
                    onTap: () {
                      // TODO: Navigate to blocked users
                    },
                  ),
                ],
              ),

              _buildSection(
                context,
                title: 'Support',
                children: [
                  _buildSettingsTile(
                    context,
                    icon: Icons.help_outline,
                    title: 'Help Center',
                    onTap: () {
                      // TODO: Navigate to help
                    },
                  ),
                  _buildSettingsTile(
                    context,
                    icon: Icons.feedback_outlined,
                    title: 'Send Feedback',
                    onTap: () {
                      // TODO: Navigate to feedback
                    },
                  ),
                  _buildSettingsTile(
                    context,
                    icon: Icons.info_outline,
                    title: 'About',
                    onTap: () => _showAboutDialog(context),
                  ),
                ],
              ),

              AppSpacing.verticalSpaceMd,

              // Logout button
              Padding(
                padding: AppSpacing.horizontalMd,
                child: OutlinedButton.icon(
                  onPressed: () => _confirmLogout(context),
                  icon: const Icon(Icons.logout, color: AppColors.error),
                  label: Text(
                    'Sign Out',
                    style: AppTypography.labelLarge.copyWith(
                      color: AppColors.error,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.error),
                    minimumSize: const Size.fromHeight(AppSpacing.buttonHeightLg),
                    shape: RoundedRectangleBorder(
                      borderRadius: AppSpacing.borderRadiusMd,
                    ),
                  ),
                ),
              ),

              AppSpacing.verticalSpaceXl,
            ],
          ),
        );
      },
    );
  }

  Widget _buildSection(
    BuildContext context, {
    required String title,
    required List<Widget> children,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text(
            title,
            style: AppTypography.titleSmall.copyWith(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        ...children,
      ],
    );
  }

  Widget _buildSettingsTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: AppColors.grey600),
      title: Text(title, style: AppTypography.bodyLarge),
      subtitle: subtitle != null
          ? Text(subtitle, style: AppTypography.bodySmall.copyWith(color: AppColors.grey500))
          : null,
      trailing: const Icon(Icons.chevron_right, color: AppColors.grey400),
      onTap: onTap,
    );
  }

  Widget _buildSwitchTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    String? subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return ListTile(
      leading: Icon(icon, color: AppColors.grey600),
      title: Text(title, style: AppTypography.bodyLarge),
      subtitle: subtitle != null
          ? Text(subtitle, style: AppTypography.bodySmall.copyWith(color: AppColors.grey500))
          : null,
      trailing: AdaptiveSwitch(
        value: value,
        onChanged: onChanged,
        activeColor: AppColors.primary,
      ),
      onTap: () => onChanged(!value),
    );
  }

  Future<void> _confirmLogout(BuildContext context) async {
    final confirmed = await AdaptiveDialog.show<bool>(
      context: context,
      title: 'Sign Out',
      content: 'Are you sure you want to sign out?',
      actions: [
        AdaptiveDialogAction(
          label: 'Cancel',
          onPressed: () => Navigator.pop(context, false),
        ),
        AdaptiveDialogAction(
          label: 'Sign Out',
          isDestructive: true,
          onPressed: () => Navigator.pop(context, true),
        ),
      ],
    );

    if (confirmed == true && context.mounted) {
      context.read<AuthBloc>().add(const AuthLogout());
    }
  }

  void _showAboutDialog(BuildContext context) {
    showAboutDialog(
      context: context,
      applicationName: 'QuickApp Chat',
      applicationVersion: '1.0.0',
      applicationIcon: Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: AppSpacing.borderRadiusMd,
        ),
        child: const Icon(
          Icons.chat_bubble_rounded,
          color: AppColors.white,
          size: 32,
        ),
      ),
      children: [
        AppSpacing.verticalSpaceMd,
        Text(
          'A modern chat application built with Flutter and BLoC.',
          style: AppTypography.bodyMedium.copyWith(color: AppColors.grey600),
        ),
      ],
    );
  }
}
