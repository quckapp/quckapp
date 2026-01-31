import 'dart:io';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../../core/theme/theme.dart';

/// Check if platform is iOS or macOS
bool get isApplePlatform {
  try {
    return Platform.isIOS || Platform.isMacOS;
  } catch (_) {
    return false; // Web platform
  }
}

/// Adaptive dialog that shows Material or Cupertino style
class AdaptiveDialog extends StatelessWidget {
  final String title;
  final String? content;
  final Widget? contentWidget;
  final List<AdaptiveDialogAction> actions;

  const AdaptiveDialog({
    super.key,
    required this.title,
    this.content,
    this.contentWidget,
    required this.actions,
  });

  static Future<T?> show<T>({
    required BuildContext context,
    required String title,
    String? content,
    Widget? contentWidget,
    required List<AdaptiveDialogAction> actions,
    bool barrierDismissible = true,
  }) {
    if (isApplePlatform) {
      return showCupertinoDialog<T>(
        context: context,
        barrierDismissible: barrierDismissible,
        builder: (context) => AdaptiveDialog(
          title: title,
          content: content,
          contentWidget: contentWidget,
          actions: actions,
        ),
      );
    }

    return showDialog<T>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (context) => AdaptiveDialog(
        title: title,
        content: content,
        contentWidget: contentWidget,
        actions: actions,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isApplePlatform) {
      return CupertinoAlertDialog(
        title: Text(title),
        content: contentWidget ?? (content != null ? Text(content!) : null),
        actions: actions.map((action) {
          return CupertinoDialogAction(
            onPressed: action.onPressed,
            isDefaultAction: action.isDefault,
            isDestructiveAction: action.isDestructive,
            child: Text(action.label),
          );
        }).toList(),
      );
    }

    return AlertDialog(
      title: Text(title),
      content: contentWidget ?? (content != null ? Text(content!) : null),
      actions: actions.map((action) {
        if (action.isDestructive) {
          return TextButton(
            onPressed: action.onPressed,
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: Text(action.label),
          );
        }
        if (action.isDefault) {
          return FilledButton(
            onPressed: action.onPressed,
            child: Text(action.label),
          );
        }
        return TextButton(
          onPressed: action.onPressed,
          child: Text(action.label),
        );
      }).toList(),
    );
  }
}

class AdaptiveDialogAction {
  final String label;
  final VoidCallback? onPressed;
  final bool isDefault;
  final bool isDestructive;

  const AdaptiveDialogAction({
    required this.label,
    this.onPressed,
    this.isDefault = false,
    this.isDestructive = false,
  });
}

/// Adaptive action sheet
class AdaptiveActionSheet extends StatelessWidget {
  final String? title;
  final String? message;
  final List<AdaptiveSheetAction> actions;
  final AdaptiveSheetAction? cancelAction;

  const AdaptiveActionSheet({
    super.key,
    this.title,
    this.message,
    required this.actions,
    this.cancelAction,
  });

  static Future<T?> show<T>({
    required BuildContext context,
    String? title,
    String? message,
    required List<AdaptiveSheetAction> actions,
    AdaptiveSheetAction? cancelAction,
  }) {
    if (isApplePlatform) {
      return showCupertinoModalPopup<T>(
        context: context,
        builder: (context) => AdaptiveActionSheet(
          title: title,
          message: message,
          actions: actions,
          cancelAction: cancelAction,
        ),
      );
    }

    return showModalBottomSheet<T>(
      context: context,
      builder: (context) => AdaptiveActionSheet(
        title: title,
        message: message,
        actions: actions,
        cancelAction: cancelAction,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isApplePlatform) {
      return CupertinoActionSheet(
        title: title != null ? Text(title!) : null,
        message: message != null ? Text(message!) : null,
        actions: actions.map((action) {
          return CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context);
              action.onPressed?.call();
            },
            isDefaultAction: action.isDefault,
            isDestructiveAction: action.isDestructive,
            child: Text(action.label),
          );
        }).toList(),
        cancelButton: cancelAction != null
            ? CupertinoActionSheetAction(
                onPressed: () {
                  Navigator.pop(context);
                  cancelAction!.onPressed?.call();
                },
                child: Text(cancelAction!.label),
              )
            : null,
      );
    }

    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (title != null || message != null)
            Padding(
              padding: AppSpacing.paddingMd,
              child: Column(
                children: [
                  if (title != null)
                    Text(
                      title!,
                      style: AppTypography.titleMedium,
                      textAlign: TextAlign.center,
                    ),
                  if (message != null) ...[
                    AppSpacing.verticalSpaceXs,
                    Text(
                      message!,
                      style: AppTypography.bodyMedium.copyWith(
                        color: AppColors.grey600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ],
              ),
            ),
          const Divider(height: 1),
          ...actions.map((action) {
            return ListTile(
              leading: action.icon != null ? Icon(action.icon) : null,
              title: Text(
                action.label,
                style: TextStyle(
                  color: action.isDestructive ? AppColors.error : null,
                ),
              ),
              onTap: () {
                Navigator.pop(context);
                action.onPressed?.call();
              },
            );
          }),
          if (cancelAction != null) ...[
            const Divider(height: 1),
            ListTile(
              title: Text(
                cancelAction!.label,
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              onTap: () {
                Navigator.pop(context);
                cancelAction!.onPressed?.call();
              },
            ),
          ],
        ],
      ),
    );
  }
}

class AdaptiveSheetAction {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool isDefault;
  final bool isDestructive;

  const AdaptiveSheetAction({
    required this.label,
    this.icon,
    this.onPressed,
    this.isDefault = false,
    this.isDestructive = false,
  });
}

/// Adaptive switch
class AdaptiveSwitch extends StatelessWidget {
  final bool value;
  final ValueChanged<bool>? onChanged;
  final Color? activeColor;

  const AdaptiveSwitch({
    super.key,
    required this.value,
    this.onChanged,
    this.activeColor,
  });

  @override
  Widget build(BuildContext context) {
    if (isApplePlatform) {
      return CupertinoSwitch(
        value: value,
        onChanged: onChanged,
        activeTrackColor: activeColor,
      );
    }

    return Switch(
      value: value,
      onChanged: onChanged,
      activeColor: activeColor,
    );
  }
}

/// Adaptive progress indicator
class AdaptiveProgressIndicator extends StatelessWidget {
  final double? value;
  final Color? color;

  const AdaptiveProgressIndicator({
    super.key,
    this.value,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    if (isApplePlatform) {
      return CupertinoActivityIndicator(
        color: color,
      );
    }

    return CircularProgressIndicator(
      value: value,
      color: color,
    );
  }
}

/// Adaptive refresh indicator
class AdaptiveRefreshIndicator extends StatelessWidget {
  final Widget child;
  final Future<void> Function() onRefresh;

  const AdaptiveRefreshIndicator({
    super.key,
    required this.child,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (isApplePlatform) {
      return CustomScrollView(
        slivers: [
          CupertinoSliverRefreshControl(
            onRefresh: onRefresh,
          ),
          SliverFillRemaining(
            child: child,
          ),
        ],
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: child,
    );
  }
}

/// Adaptive text field
class AdaptiveTextField extends StatelessWidget {
  final TextEditingController? controller;
  final String? placeholder;
  final String? labelText;
  final bool obscureText;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onEditingComplete;
  final Widget? prefix;
  final Widget? suffix;

  const AdaptiveTextField({
    super.key,
    this.controller,
    this.placeholder,
    this.labelText,
    this.obscureText = false,
    this.keyboardType,
    this.onChanged,
    this.onEditingComplete,
    this.prefix,
    this.suffix,
  });

  @override
  Widget build(BuildContext context) {
    if (isApplePlatform) {
      return CupertinoTextField(
        controller: controller,
        placeholder: placeholder ?? labelText,
        obscureText: obscureText,
        keyboardType: keyboardType,
        onChanged: onChanged,
        onEditingComplete: onEditingComplete,
        prefix: prefix,
        suffix: suffix,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: CupertinoColors.systemGrey6,
          borderRadius: AppSpacing.borderRadiusMd,
        ),
      );
    }

    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      onChanged: onChanged,
      onEditingComplete: onEditingComplete,
      decoration: InputDecoration(
        labelText: labelText,
        hintText: placeholder,
        prefixIcon: prefix,
        suffixIcon: suffix,
      ),
    );
  }
}

/// Adaptive slider
class AdaptiveSlider extends StatelessWidget {
  final double value;
  final double min;
  final double max;
  final int? divisions;
  final ValueChanged<double>? onChanged;
  final Color? activeColor;

  const AdaptiveSlider({
    super.key,
    required this.value,
    this.min = 0.0,
    this.max = 1.0,
    this.divisions,
    this.onChanged,
    this.activeColor,
  });

  @override
  Widget build(BuildContext context) {
    if (isApplePlatform) {
      return CupertinoSlider(
        value: value,
        min: min,
        max: max,
        divisions: divisions,
        onChanged: onChanged,
        activeColor: activeColor,
      );
    }

    return Slider(
      value: value,
      min: min,
      max: max,
      divisions: divisions,
      onChanged: onChanged,
      activeColor: activeColor,
    );
  }
}
