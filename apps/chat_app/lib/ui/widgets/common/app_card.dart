import 'package:flutter/material.dart';
import '../../../core/theme/theme.dart';

/// Reusable styled card widget
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final Color? borderColor;
  final double? borderWidth;
  final BorderRadius? borderRadius;
  final double? elevation;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final Clip clipBehavior;

  const AppCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.color,
    this.borderColor,
    this.borderWidth,
    this.borderRadius,
    this.elevation,
    this.onTap,
    this.onLongPress,
    this.clipBehavior = Clip.antiAlias,
  });

  // Named constructor for outlined card
  const AppCard.outlined({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.color,
    this.borderColor,
    this.borderWidth = 1,
    this.borderRadius,
    this.onTap,
    this.onLongPress,
    this.clipBehavior = Clip.antiAlias,
  }) : elevation = 0;

  // Named constructor for elevated card
  const AppCard.elevated({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.color,
    this.borderRadius,
    this.elevation = 2,
    this.onTap,
    this.onLongPress,
    this.clipBehavior = Clip.antiAlias,
  })  : borderColor = null,
        borderWidth = null;

  @override
  Widget build(BuildContext context) {
    final effectiveBorderRadius = borderRadius ?? AppSpacing.borderRadiusMd;

    Widget card = Card(
      elevation: elevation ?? 0,
      color: color,
      margin: margin ?? EdgeInsets.zero,
      clipBehavior: clipBehavior,
      shape: RoundedRectangleBorder(
        borderRadius: effectiveBorderRadius,
        side: borderColor != null || borderWidth != null
            ? BorderSide(
                color: borderColor ?? AppColors.grey200,
                width: borderWidth ?? 1,
              )
            : BorderSide.none,
      ),
      child: padding != null
          ? Padding(padding: padding!, child: child)
          : child,
    );

    if (onTap != null || onLongPress != null) {
      card = Card(
        elevation: elevation ?? 0,
        color: color,
        margin: margin ?? EdgeInsets.zero,
        clipBehavior: clipBehavior,
        shape: RoundedRectangleBorder(
          borderRadius: effectiveBorderRadius,
          side: borderColor != null || borderWidth != null
              ? BorderSide(
                  color: borderColor ?? AppColors.grey200,
                  width: borderWidth ?? 1,
                )
              : BorderSide.none,
        ),
        child: InkWell(
          onTap: onTap,
          onLongPress: onLongPress,
          borderRadius: effectiveBorderRadius,
          child: padding != null
              ? Padding(padding: padding!, child: child)
              : child,
        ),
      );
    }

    return card;
  }
}

/// Info card for displaying status messages
class AppInfoCard extends StatelessWidget {
  final String message;
  final String? title;
  final IconData? icon;
  final AppInfoCardType type;
  final VoidCallback? onDismiss;
  final VoidCallback? onAction;
  final String? actionLabel;

  const AppInfoCard({
    super.key,
    required this.message,
    this.title,
    this.icon,
    this.type = AppInfoCardType.info,
    this.onDismiss,
    this.onAction,
    this.actionLabel,
  });

  const AppInfoCard.success({
    super.key,
    required this.message,
    this.title,
    this.icon = Icons.check_circle_outline,
    this.onDismiss,
    this.onAction,
    this.actionLabel,
  }) : type = AppInfoCardType.success;

  const AppInfoCard.warning({
    super.key,
    required this.message,
    this.title,
    this.icon = Icons.warning_amber_outlined,
    this.onDismiss,
    this.onAction,
    this.actionLabel,
  }) : type = AppInfoCardType.warning;

  const AppInfoCard.error({
    super.key,
    required this.message,
    this.title,
    this.icon = Icons.error_outline,
    this.onDismiss,
    this.onAction,
    this.actionLabel,
  }) : type = AppInfoCardType.error;

  @override
  Widget build(BuildContext context) {
    final colors = _getColors();

    return Container(
      padding: AppSpacing.paddingMd,
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: AppSpacing.borderRadiusMd,
        border: Border.all(color: colors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (icon != null) ...[
            Icon(icon, color: colors.icon, size: AppSpacing.iconMd),
            AppSpacing.horizontalSpaceSm,
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null) ...[
                  Text(
                    title!,
                    style: AppTypography.titleSmall.copyWith(
                      color: colors.text,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  AppSpacing.verticalSpaceXxs,
                ],
                Text(
                  message,
                  style: AppTypography.bodyMedium.copyWith(
                    color: colors.text,
                  ),
                ),
                if (onAction != null && actionLabel != null) ...[
                  AppSpacing.verticalSpaceSm,
                  TextButton(
                    onPressed: onAction,
                    style: TextButton.styleFrom(
                      foregroundColor: colors.icon,
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(actionLabel!),
                  ),
                ],
              ],
            ),
          ),
          if (onDismiss != null) ...[
            AppSpacing.horizontalSpaceSm,
            IconButton(
              icon: Icon(Icons.close, size: 18, color: colors.icon),
              onPressed: onDismiss,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ],
      ),
    );
  }

  _InfoCardColors _getColors() {
    switch (type) {
      case AppInfoCardType.info:
        return _InfoCardColors(
          background: AppColors.infoLight,
          border: AppColors.info.withValues(alpha: 0.3),
          icon: AppColors.info,
          text: AppColors.info,
        );
      case AppInfoCardType.success:
        return _InfoCardColors(
          background: AppColors.successLight,
          border: AppColors.success.withValues(alpha: 0.3),
          icon: AppColors.success,
          text: AppColors.success,
        );
      case AppInfoCardType.warning:
        return _InfoCardColors(
          background: AppColors.warningLight,
          border: AppColors.warning.withValues(alpha: 0.3),
          icon: AppColors.warning,
          text: Color(0xFF92400E),
        );
      case AppInfoCardType.error:
        return _InfoCardColors(
          background: AppColors.errorLight,
          border: AppColors.error.withValues(alpha: 0.3),
          icon: AppColors.error,
          text: AppColors.error,
        );
    }
  }
}

enum AppInfoCardType { info, success, warning, error }

class _InfoCardColors {
  final Color background;
  final Color border;
  final Color icon;
  final Color text;

  const _InfoCardColors({
    required this.background,
    required this.border,
    required this.icon,
    required this.text,
  });
}
