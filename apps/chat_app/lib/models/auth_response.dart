import 'user.dart';

class AuthResponse {
  final String accessToken;
  final String refreshToken;
  final User user;

  const AuthResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      user: User.fromJson(json['user'] as Map<String, dynamic>),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'user': user.toJson(),
    };
  }
}

class Session {
  final String id;
  final String deviceInfo;
  final String ipAddress;
  final DateTime lastActiveAt;
  final DateTime createdAt;
  final bool isCurrent;

  const Session({
    required this.id,
    required this.deviceInfo,
    required this.ipAddress,
    required this.lastActiveAt,
    required this.createdAt,
    required this.isCurrent,
  });

  factory Session.fromJson(Map<String, dynamic> json) {
    return Session(
      id: json['id'] as String,
      deviceInfo: json['deviceInfo'] as String? ?? 'Unknown device',
      ipAddress: json['ipAddress'] as String? ?? 'Unknown',
      lastActiveAt: DateTime.parse(json['lastActiveAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      isCurrent: json['isCurrent'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'deviceInfo': deviceInfo,
      'ipAddress': ipAddress,
      'lastActiveAt': lastActiveAt.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'isCurrent': isCurrent,
    };
  }
}
