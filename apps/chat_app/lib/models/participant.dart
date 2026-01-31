import 'package:equatable/equatable.dart';

/// Represents a participant in a conversation
class Participant extends Equatable {
  final String id;
  final String? username;
  final String? displayName;
  final String? firstName;
  final String? lastName;
  final String? avatar;
  final ParticipantRole role;
  final DateTime joinedAt;

  const Participant({
    required this.id,
    this.username,
    this.displayName,
    this.firstName,
    this.lastName,
    this.avatar,
    this.role = ParticipantRole.member,
    required this.joinedAt,
  });

  String get name {
    if (displayName != null && displayName!.isNotEmpty) {
      return displayName!;
    }
    if (firstName != null && lastName != null) {
      return '$firstName $lastName';
    }
    return firstName ?? lastName ?? username ?? 'Unknown';
  }

  String get initials {
    if (firstName != null && lastName != null) {
      return '${firstName![0]}${lastName![0]}'.toUpperCase();
    }
    if (firstName != null) {
      return firstName![0].toUpperCase();
    }
    if (name.isNotEmpty) {
      return name[0].toUpperCase();
    }
    return '?';
  }

  factory Participant.fromJson(Map<String, dynamic> json) {
    return Participant(
      id: json['id'] as String? ?? json['userId'] as String? ?? '',
      username: json['username'] as String?,
      displayName: json['displayName'] as String?,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      avatar: json['avatar'] as String?,
      role: ParticipantRole.fromString(json['role'] as String?),
      joinedAt: json['joinedAt'] != null
          ? DateTime.parse(json['joinedAt'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'displayName': displayName,
      'firstName': firstName,
      'lastName': lastName,
      'avatar': avatar,
      'role': role.name,
      'joinedAt': joinedAt.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [id, username, displayName, firstName, lastName, avatar, role, joinedAt];
}

enum ParticipantRole {
  owner,
  admin,
  member;

  static ParticipantRole fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'owner':
        return ParticipantRole.owner;
      case 'admin':
        return ParticipantRole.admin;
      default:
        return ParticipantRole.member;
    }
  }
}
