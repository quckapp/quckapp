import 'package:flutter/material.dart';
import '../../../core/theme/theme.dart';

/// Button variants
enum AppButtonVariant {
  filled,
  outlined,
  text,
  tonal,
}

/// Button sizes
enum AppButtonSize {
  small,
  medium,
  large,
}

/// Reusable styled button widget
class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final AppButtonSize size;
  final IconData? leadingIcon;
  final IconData? trailingIcon;
  final bool isLoading;
  final bool isFullWidth;
  final Color? backgroundColor;
  final Color? foregroundColor;

  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.filled,
    this.size = AppButtonSize.medium,
    this.leadingIcon,
    this.trailingIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.backgroundColor,
    this.foregroundColor,
  });

  // Named constructors for common variants
  const AppButton.filled({
    super.key,
    required this.label,
    this.onPressed,
    this.size = AppButtonSize.medium,
    this.leadingIcon,
    this.trailingIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.backgroundColor,
    this.foregroundColor,
  }) : variant = AppButtonVariant.filled;

  const AppButton.outlined({
    super.key,
    required this.label,
    this.onPressed,
    this.size = AppButtonSize.medium,
    this.leadingIcon,
    this.trailingIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.backgroundColor,
    this.foregroundColor,
  }) : variant = AppButtonVariant.outlined;

  const AppButton.text({
    super.key,
    required this.label,
    this.onPressed,
    this.size = AppButtonSize.medium,
    this.leadingIcon,
    this.trailingIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.backgroundColor,
    this.foregroundColor,
  }) : variant = AppButtonVariant.text;

  const AppButton.tonal({
    super.key,
    required this.label,
    this.onPressed,
    this.size = AppButtonSize.medium,
    this.leadingIcon,
    this.trailingIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.backgroundColor,
    this.foregroundColor,
  }) : variant = AppButtonVariant.tonal;

  @override
  Widget build(BuildContext context) {
    final effectiveOnPressed = isLoading ? null : onPressed;

    final buttonStyle = _getButtonStyle(context);
    final child = _buildChild(context);

    Widget button;
    switch (variant) {
      case AppButtonVariant.filled:
        button = FilledButton(
          onPressed: effectiveOnPressed,
          style: buttonStyle,
          child: child,
        );
        break;
      case AppButtonVariant.outlined:
        button = OutlinedButton(
          onPressed: effectiveOnPressed,
          style: buttonStyle,
          child: child,
        );
        break;
      case AppButtonVariant.text:
        button = TextButton(
          onPressed: effectiveOnPressed,
          style: buttonStyle,
          child: child,
        );
        break;
      case AppButtonVariant.tonal:
        button = FilledButton.tonal(
          onPressed: effectiveOnPressed,
          style: buttonStyle,
          child: child,
        );
        break;
    }

    if (isFullWidth) {
      return SizedBox(
        width: double.infinity,
        child: button,
      );
    }

    return button;
  }

  ButtonStyle _getButtonStyle(BuildContext context) {
    final height = switch (size) {
      AppButtonSize.small => AppSpacing.buttonHeightSm,
      AppButtonSize.medium => AppSpacing.buttonHeightMd,
      AppButtonSize.large => AppSpacing.buttonHeightLg,
    };

    final padding = switch (size) {
      AppButtonSize.small => const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      AppButtonSize.medium => const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      AppButtonSize.large => const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
    };

    final textStyle = switch (size) {
      AppButtonSize.small => AppTypography.labelMedium,
      AppButtonSize.medium => AppTypography.labelLarge,
      AppButtonSize.large => AppTypography.titleSmall,
    };

    return ButtonStyle(
      minimumSize: WidgetStatePropertyAll(Size(64, height)),
      padding: WidgetStatePropertyAll(padding),
      textStyle: WidgetStatePropertyAll(textStyle),
      backgroundColor: backgroundColor != null
          ? WidgetStatePropertyAll(backgroundColor)
          : null,
      foregroundColor: foregroundColor != null
          ? WidgetStatePropertyAll(foregroundColor)
          : null,
    );
  }

  Widget _buildChild(BuildContext context) {
    if (isLoading) {
      return SizedBox(
        height: size == AppButtonSize.small ? 16 : 20,
        width: size == AppButtonSize.small ? 16 : 20,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          color: variant == AppButtonVariant.filled
              ? Theme.of(context).colorScheme.onPrimary
              : Theme.of(context).colorScheme.primary,
        ),
      );
    }

    if (leadingIcon != null || trailingIcon != null) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (leadingIcon != null) ...[
            Icon(leadingIcon, size: size == AppButtonSize.small ? 16 : 20),
            SizedBox(width: size == AppButtonSize.small ? 6 : 8),
          ],
          Text(label),
          if (trailingIcon != null) ...[
            SizedBox(width: size == AppButtonSize.small ? 6 : 8),
            Icon(trailingIcon, size: size == AppButtonSize.small ? 16 : 20),
          ],
        ],
      );
    }

    return Text(label);
  }
}

/// Icon button with consistent styling
class AppIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final String? tooltip;
  final double? size;
  final Color? color;
  final Color? backgroundColor;

  const AppIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.tooltip,
    this.size,
    this.color,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final iconButton = IconButton(
      icon: Icon(icon, size: size ?? AppSpacing.iconMd),
      onPressed: onPressed,
      color: color,
      style: backgroundColor != null
          ? IconButton.styleFrom(backgroundColor: backgroundColor)
          : null,
    );

    if (tooltip != null) {
      return Tooltip(
        message: tooltip!,
        child: iconButton,
      );
    }

    return iconButton;
  }
}
