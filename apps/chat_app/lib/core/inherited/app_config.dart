import 'package:flutter/material.dart';

/// App configuration that can be accessed anywhere in the widget tree
class AppConfig {
  final String appName;
  final String appVersion;
  final String baseUrl;
  final String wsUrl;
  final bool isDebug;
  final int maxMessageLength;
  final int maxFileSize;
  final Duration connectionTimeout;
  final Duration messageRetryDelay;

  const AppConfig({
    this.appName = 'QuickApp Chat',
    this.appVersion = '1.0.0',
    this.baseUrl = 'http://localhost:8080',
    this.wsUrl = 'ws://localhost:4000/socket',
    this.isDebug = true,
    this.maxMessageLength = 4000,
    this.maxFileSize = 10 * 1024 * 1024, // 10 MB
    this.connectionTimeout = const Duration(seconds: 30),
    this.messageRetryDelay = const Duration(seconds: 3),
  });

  // Production config
  factory AppConfig.production() => const AppConfig(
        appName: 'QuickApp Chat',
        baseUrl: 'https://api.quickapp.com',
        wsUrl: 'wss://realtime.quickapp.com/socket',
        isDebug: false,
      );

  // Staging config
  factory AppConfig.staging() => const AppConfig(
        appName: 'QuickApp Chat (Staging)',
        baseUrl: 'https://staging-api.quickapp.com',
        wsUrl: 'wss://staging-realtime.quickapp.com/socket',
        isDebug: true,
      );
}

/// InheritedWidget to provide AppConfig down the widget tree
class AppConfigProvider extends InheritedWidget {
  final AppConfig config;

  const AppConfigProvider({
    super.key,
    required this.config,
    required super.child,
  });

  static AppConfig of(BuildContext context) {
    final provider =
        context.dependOnInheritedWidgetOfExactType<AppConfigProvider>();
    return provider?.config ?? const AppConfig();
  }

  static AppConfig? maybeOf(BuildContext context) {
    final provider =
        context.dependOnInheritedWidgetOfExactType<AppConfigProvider>();
    return provider?.config;
  }

  @override
  bool updateShouldNotify(AppConfigProvider oldWidget) {
    return config != oldWidget.config;
  }
}

/// Extension for easy access to AppConfig
extension AppConfigExtension on BuildContext {
  AppConfig get appConfig => AppConfigProvider.of(this);
}
