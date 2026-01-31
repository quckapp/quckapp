import 'package:equatable/equatable.dart';

/// Represents a user's presence status
class UserPresence extends Equatable {
  final String userId;
  final PresenceStatus status;
  final DateTime? lastSeen;
  final String? statusMessage;
  final Map<String, dynamic>? meta;

  const UserPresence({
    required this.userId,
    this.status = PresenceStatus.offline,
    this.lastSeen,
    this.statusMessage,
    this.meta,
  });

  bool get isOnline => status == PresenceStatus.online;
  bool get isAway => status == PresenceStatus.away;
  bool get isOffline => status == PresenceStatus.offline;

  String get statusText {
    switch (status) {
      case PresenceStatus.online:
        return 'Online';
      case PresenceStatus.away:
        return 'Away';
      case PresenceStatus.offline:
        if (lastSeen != null) {
          return 'Last seen ${_formatLastSeen(lastSeen!)}';
        }
        return 'Offline';
    }
  }

  String _formatLastSeen(DateTime lastSeen) {
    final now = DateTime.now();
    final difference = now.difference(lastSeen);

    if (difference.inMinutes < 1) {
      return 'just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return 'a while ago';
    }
  }

  factory UserPresence.fromJson(Map<String, dynamic> json) {
    return UserPresence(
      userId: json['userId'] as String? ?? json['user_id'] as String? ?? '',
      status: PresenceStatus.fromString(json['status'] as String?),
      lastSeen: json['lastSeen'] != null
          ? DateTime.parse(json['lastSeen'] as String)
          : json['last_seen'] != null
              ? DateTime.parse(json['last_seen'] as String)
              : null,
      statusMessage: json['statusMessage'] as String? ?? json['status_message'] as String?,
      meta: json['meta'] as Map<String, dynamic>?,
    );
  }

  /// Parse Phoenix presence state format
  factory UserPresence.fromPhoenixPresence(String userId, Map<String, dynamic> presenceData) {
    // Phoenix presence format: { metas: [{ phx_ref: "...", online_at: ..., status: "..." }] }
    final metas = presenceData['metas'] as List<dynamic>?;
    if (metas == null || metas.isEmpty) {
      return UserPresence(userId: userId);
    }

    final meta = metas.first as Map<String, dynamic>;
    return UserPresence(
      userId: userId,
      status: PresenceStatus.fromString(meta['status'] as String?),
      lastSeen: meta['online_at'] != null
          ? DateTime.fromMillisecondsSinceEpoch((meta['online_at'] as num).toInt() * 1000)
          : null,
      meta: meta,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'status': status.name,
      'lastSeen': lastSeen?.toIso8601String(),
      'statusMessage': statusMessage,
      'meta': meta,
    };
  }

  UserPresence copyWith({
    String? userId,
    PresenceStatus? status,
    DateTime? lastSeen,
    String? statusMessage,
    Map<String, dynamic>? meta,
  }) {
    return UserPresence(
      userId: userId ?? this.userId,
      status: status ?? this.status,
      lastSeen: lastSeen ?? this.lastSeen,
      statusMessage: statusMessage ?? this.statusMessage,
      meta: meta ?? this.meta,
    );
  }

  @override
  List<Object?> get props => [userId, status, lastSeen, statusMessage, meta];
}

enum PresenceStatus {
  online,
  away,
  offline;

  static PresenceStatus fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'online':
        return PresenceStatus.online;
      case 'away':
        return PresenceStatus.away;
      default:
        return PresenceStatus.offline;
    }
  }
}
