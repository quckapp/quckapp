import 'package:equatable/equatable.dart';
import '../../models/presence.dart';

class PresenceState extends Equatable {
  final Map<String, UserPresence> users;
  final bool isListening;

  const PresenceState({
    this.users = const {},
    this.isListening = false,
  });

  UserPresence? getPresence(String userId) => users[userId];

  bool isOnline(String userId) => users[userId]?.isOnline ?? false;

  PresenceState copyWith({
    Map<String, UserPresence>? users,
    bool? isListening,
  }) {
    return PresenceState(
      users: users ?? this.users,
      isListening: isListening ?? this.isListening,
    );
  }

  @override
  List<Object?> get props => [users, isListening];
}
