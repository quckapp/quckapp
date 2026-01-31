import 'package:equatable/equatable.dart';
import 'message.dart';
import 'participant.dart';

/// Represents a chat conversation (direct or group)
class Conversation extends Equatable {
  final String id;
  final String type;
  final String? name;
  final String? description;
  final String? avatar;
  final List<Participant> participants;
  final Message? lastMessage;
  final int unreadCount;
  final bool isMuted;
  final bool isPinned;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const Conversation({
    required this.id,
    this.type = 'direct',
    this.name,
    this.description,
    this.avatar,
    this.participants = const [],
    this.lastMessage,
    this.unreadCount = 0,
    this.isMuted = false,
    this.isPinned = false,
    required this.createdAt,
    this.updatedAt,
  });

  bool get isDirect => type == 'direct';
  bool get isGroup => type == 'group';
  bool get hasUnread => unreadCount > 0;

  /// Get the display name for the conversation
  String displayName(String currentUserId) {
    if (name != null && name!.isNotEmpty) {
      return name!;
    }

    if (isDirect) {
      // For direct chats, show the other participant's name
      final otherParticipant = getOtherParticipant(currentUserId);
      if (otherParticipant != null) {
        return otherParticipant.name;
      }
      return participants.isNotEmpty ? participants.first.name : 'Unknown';
    }

    // For group chats without a name, show participant names
    final names = participants
        .where((p) => p.id != currentUserId)
        .take(3)
        .map((p) => p.name)
        .toList();

    if (names.isEmpty) return 'Empty conversation';
    if (participants.length > 3) {
      return '${names.join(', ')} +${participants.length - 3}';
    }
    return names.join(', ');
  }

  /// Get the avatar for the conversation
  String? displayAvatar(String currentUserId) {
    if (avatar != null) return avatar;

    if (isDirect) {
      final otherParticipant = getOtherParticipant(currentUserId);
      return otherParticipant?.avatar;
    }

    return null;
  }

  /// Get other participant (for direct chats)
  Participant? getOtherParticipant(String currentUserId) {
    if (!isDirect) return null;
    try {
      return participants.firstWhere((p) => p.id != currentUserId);
    } catch (_) {
      return null;
    }
  }

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? 'direct',
      name: json['name'] as String?,
      description: json['description'] as String?,
      avatar: json['avatar'] as String?,
      participants: (json['participants'] as List<dynamic>?)
              ?.map((p) => Participant.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
      lastMessage: json['lastMessage'] != null
          ? Message.fromJson(json['lastMessage'] as Map<String, dynamic>)
          : json['last_message'] != null
              ? Message.fromJson(json['last_message'] as Map<String, dynamic>)
              : null,
      unreadCount: json['unreadCount'] as int? ?? json['unread_count'] as int? ?? 0,
      isMuted: json['isMuted'] as bool? ?? json['is_muted'] as bool? ?? false,
      isPinned: json['isPinned'] as bool? ?? json['is_pinned'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : json['created_at'] != null
              ? DateTime.parse(json['created_at'] as String)
              : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : json['updated_at'] != null
              ? DateTime.parse(json['updated_at'] as String)
              : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'name': name,
      'description': description,
      'avatar': avatar,
      'participants': participants.map((p) => p.toJson()).toList(),
      'lastMessage': lastMessage?.toJson(),
      'unreadCount': unreadCount,
      'isMuted': isMuted,
      'isPinned': isPinned,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  Conversation copyWith({
    String? id,
    String? type,
    String? name,
    String? description,
    String? avatar,
    List<Participant>? participants,
    Message? lastMessage,
    int? unreadCount,
    bool? isMuted,
    bool? isPinned,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Conversation(
      id: id ?? this.id,
      type: type ?? this.type,
      name: name ?? this.name,
      description: description ?? this.description,
      avatar: avatar ?? this.avatar,
      participants: participants ?? this.participants,
      lastMessage: lastMessage ?? this.lastMessage,
      unreadCount: unreadCount ?? this.unreadCount,
      isMuted: isMuted ?? this.isMuted,
      isPinned: isPinned ?? this.isPinned,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        type,
        name,
        description,
        avatar,
        participants,
        lastMessage,
        unreadCount,
        isMuted,
        isPinned,
        createdAt,
        updatedAt,
      ];
}
