import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/theme/theme.dart';

/// Avatar sizes
enum AppAvatarSize {
  xs, // 24
  sm, // 32
  md, // 40
  lg, // 56
  xl, // 80
  xxl, // 120
}

/// Reusable avatar widget
class AppAvatar extends StatelessWidget {
  final String? imageUrl;
  final String? initials;
  final String? name;
  final AppAvatarSize size;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final VoidCallback? onTap;
  final bool showOnlineIndicator;
  final bool isOnline;
  final Widget? badge;

  const AppAvatar({
    super.key,
    this.imageUrl,
    this.initials,
    this.name,
    this.size = AppAvatarSize.md,
    this.backgroundColor,
    this.foregroundColor,
    this.onTap,
    this.showOnlineIndicator = false,
    this.isOnline = false,
    this.badge,
  });

  double get _size => switch (size) {
        AppAvatarSize.xs => AppSpacing.avatarXs,
        AppAvatarSize.sm => AppSpacing.avatarSm,
        AppAvatarSize.md => AppSpacing.avatarMd,
        AppAvatarSize.lg => AppSpacing.avatarLg,
        AppAvatarSize.xl => AppSpacing.avatarXl,
        AppAvatarSize.xxl => AppSpacing.avatarXxl,
      };

  double get _fontSize => switch (size) {
        AppAvatarSize.xs => 10,
        AppAvatarSize.sm => 12,
        AppAvatarSize.md => 14,
        AppAvatarSize.lg => 20,
        AppAvatarSize.xl => 28,
        AppAvatarSize.xxl => 40,
      };

  double get _indicatorSize => switch (size) {
        AppAvatarSize.xs => 8,
        AppAvatarSize.sm => 10,
        AppAvatarSize.md => 12,
        AppAvatarSize.lg => 14,
        AppAvatarSize.xl => 16,
        AppAvatarSize.xxl => 20,
      };

  String get _displayInitials {
    if (initials != null && initials!.isNotEmpty) {
      return initials!.toUpperCase();
    }
    if (name != null && name!.isNotEmpty) {
      final parts = name!.trim().split(' ');
      if (parts.length >= 2) {
        return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
      }
      return parts[0][0].toUpperCase();
    }
    return '?';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Widget avatar = Container(
      width: _size,
      height: _size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: backgroundColor ?? theme.colorScheme.primaryContainer,
      ),
      clipBehavior: Clip.antiAlias,
      child: imageUrl != null && imageUrl!.isNotEmpty
          ? CachedNetworkImage(
              imageUrl: imageUrl!,
              fit: BoxFit.cover,
              placeholder: (context, url) => _buildPlaceholder(context),
              errorWidget: (context, url, error) => _buildInitials(context),
            )
          : _buildInitials(context),
    );

    if (showOnlineIndicator || badge != null) {
      avatar = Stack(
        children: [
          avatar,
          if (showOnlineIndicator)
            Positioned(
              right: 0,
              bottom: 0,
              child: _buildOnlineIndicator(context),
            ),
          if (badge != null)
            Positioned(
              right: 0,
              top: 0,
              child: badge!,
            ),
        ],
      );
    }

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: avatar,
      );
    }

    return avatar;
  }

  Widget _buildInitials(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Text(
        _displayInitials,
        style: TextStyle(
          fontSize: _fontSize,
          fontWeight: FontWeight.w600,
          color: foregroundColor ?? theme.colorScheme.primary,
        ),
      ),
    );
  }

  Widget _buildPlaceholder(BuildContext context) {
    return Container(
      color: AppColors.grey200,
      child: Center(
        child: SizedBox(
          width: _size * 0.4,
          height: _size * 0.4,
          child: const CircularProgressIndicator(strokeWidth: 2),
        ),
      ),
    );
  }

  Widget _buildOnlineIndicator(BuildContext context) {
    return Container(
      width: _indicatorSize,
      height: _indicatorSize,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isOnline ? AppColors.online : AppColors.offline,
        border: Border.all(
          color: Theme.of(context).scaffoldBackgroundColor,
          width: 2,
        ),
      ),
    );
  }
}

/// Avatar group for showing multiple users
class AppAvatarGroup extends StatelessWidget {
  final List<AvatarData> avatars;
  final int maxVisible;
  final AppAvatarSize size;
  final VoidCallback? onTap;

  const AppAvatarGroup({
    super.key,
    required this.avatars,
    this.maxVisible = 3,
    this.size = AppAvatarSize.sm,
    this.onTap,
  });

  double get _size => switch (size) {
        AppAvatarSize.xs => AppSpacing.avatarXs,
        AppAvatarSize.sm => AppSpacing.avatarSm,
        AppAvatarSize.md => AppSpacing.avatarMd,
        AppAvatarSize.lg => AppSpacing.avatarLg,
        AppAvatarSize.xl => AppSpacing.avatarXl,
        AppAvatarSize.xxl => AppSpacing.avatarXxl,
      };

  @override
  Widget build(BuildContext context) {
    final visibleAvatars = avatars.take(maxVisible).toList();
    final remaining = avatars.length - maxVisible;

    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        height: _size,
        child: Stack(
          children: [
            ...visibleAvatars.asMap().entries.map((entry) {
              final index = entry.key;
              final avatar = entry.value;
              return Positioned(
                left: index * (_size * 0.7),
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Theme.of(context).scaffoldBackgroundColor,
                      width: 2,
                    ),
                  ),
                  child: AppAvatar(
                    imageUrl: avatar.imageUrl,
                    initials: avatar.initials,
                    name: avatar.name,
                    size: size,
                  ),
                ),
              );
            }),
            if (remaining > 0)
              Positioned(
                left: maxVisible * (_size * 0.7),
                child: Container(
                  width: _size,
                  height: _size,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.grey200,
                    border: Border.all(
                      color: Theme.of(context).scaffoldBackgroundColor,
                      width: 2,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      '+$remaining',
                      style: TextStyle(
                        fontSize: _size * 0.35,
                        fontWeight: FontWeight.w600,
                        color: AppColors.grey600,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Data class for avatar information
class AvatarData {
  final String? imageUrl;
  final String? initials;
  final String? name;

  const AvatarData({
    this.imageUrl,
    this.initials,
    this.name,
  });
}
