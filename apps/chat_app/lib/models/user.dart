import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String id;
  final String phoneNumber;
  final String? email;
  final String? username;
  final String? firstName;
  final String? lastName;
  final String? displayName;
  final String? avatar;
  final bool phoneVerified;
  final bool isNewUser;
  final DateTime? createdAt;
  final UserStatus status;

  const User({
    required this.id,
    required this.phoneNumber,
    this.email,
    this.username,
    this.firstName,
    this.lastName,
    this.displayName,
    this.avatar,
    this.phoneVerified = false,
    this.isNewUser = false,
    this.createdAt,
    this.status = UserStatus.offline,
  });

  String get fullName {
    if (firstName != null && lastName != null) {
      return '$firstName $lastName';
    }
    return firstName ?? lastName ?? displayName ?? phoneNumber;
  }

  String get initials {
    if (firstName != null && lastName != null) {
      return '${firstName![0]}${lastName![0]}'.toUpperCase();
    }
    if (firstName != null) {
      return firstName![0].toUpperCase();
    }
    // Use last 2 digits of phone number
    return phoneNumber.substring(phoneNumber.length - 2);
  }

  factory User.fromJson(Map<String, dynamic> json) {
    // Handle both UUID (from backend UserProfileDto) and String ID
    final rawId = json['id'];
    final String id = rawId is String ? rawId : rawId.toString();

    // Extract displayName - try to split into firstName/lastName if not provided
    final displayName = json['displayName'] as String?;
    String? firstName = json['firstName'] as String?;
    String? lastName = json['lastName'] as String?;

    // If no firstName/lastName but we have displayName, try to split it
    if (firstName == null && lastName == null && displayName != null) {
      final parts = displayName.trim().split(' ');
      if (parts.length >= 2) {
        firstName = parts.first;
        lastName = parts.sublist(1).join(' ');
      } else if (parts.isNotEmpty) {
        firstName = parts.first;
      }
    }

    return User(
      id: id,
      phoneNumber: json['phoneNumber'] as String? ?? json['phone'] as String? ?? '',
      email: json['email'] as String?,
      username: json['username'] as String?,
      firstName: firstName,
      lastName: lastName,
      displayName: displayName,
      avatar: json['avatar'] as String?,
      phoneVerified: json['phoneVerified'] as bool? ?? false,
      isNewUser: json['newUser'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      status: UserStatus.fromString(json['status'] as String?),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phoneNumber': phoneNumber,
      'email': email,
      'username': username,
      'firstName': firstName,
      'lastName': lastName,
      'displayName': displayName,
      'avatar': avatar,
      'phoneVerified': phoneVerified,
      'newUser': isNewUser,
      'createdAt': createdAt?.toIso8601String(),
      'status': status.name,
    };
  }

  User copyWith({
    String? id,
    String? phoneNumber,
    String? email,
    String? username,
    String? firstName,
    String? lastName,
    String? displayName,
    String? avatar,
    bool? phoneVerified,
    bool? isNewUser,
    DateTime? createdAt,
    UserStatus? status,
  }) {
    return User(
      id: id ?? this.id,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      email: email ?? this.email,
      username: username ?? this.username,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      displayName: displayName ?? this.displayName,
      avatar: avatar ?? this.avatar,
      phoneVerified: phoneVerified ?? this.phoneVerified,
      isNewUser: isNewUser ?? this.isNewUser,
      createdAt: createdAt ?? this.createdAt,
      status: status ?? this.status,
    );
  }

  @override
  List<Object?> get props => [
        id,
        phoneNumber,
        email,
        username,
        firstName,
        lastName,
        displayName,
        avatar,
        phoneVerified,
        isNewUser,
        createdAt,
        status,
      ];
}

enum UserStatus {
  online,
  offline,
  away;

  static UserStatus fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'online':
        return UserStatus.online;
      case 'away':
        return UserStatus.away;
      default:
        return UserStatus.offline;
    }
  }
}
