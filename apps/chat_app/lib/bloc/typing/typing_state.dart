import 'package:equatable/equatable.dart';

class TypingState extends Equatable {
  final Map<String, Set<String>> typingUsers; // conversationId -> userIds

  const TypingState({
    this.typingUsers = const {},
  });

  Set<String> getTypingUsers(String conversationId) {
    return typingUsers[conversationId] ?? {};
  }

  bool isTyping(String conversationId, String userId) {
    return typingUsers[conversationId]?.contains(userId) ?? false;
  }

  bool hasTypingUsers(String conversationId) {
    return typingUsers[conversationId]?.isNotEmpty ?? false;
  }

  TypingState copyWith({
    Map<String, Set<String>>? typingUsers,
  }) {
    return TypingState(
      typingUsers: typingUsers ?? this.typingUsers,
    );
  }

  @override
  List<Object?> get props => [typingUsers];
}
