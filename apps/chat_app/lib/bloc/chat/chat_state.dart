import 'package:equatable/equatable.dart';
import '../../models/conversation.dart';
import '../../models/message.dart';

enum ChatStatus { initial, loading, loaded, error }

class ChatState extends Equatable {
  final ChatStatus status;
  final List<Conversation> conversations;
  final Map<String, List<Message>> messages;
  final Map<String, int> unreadCounts;
  final String? activeConversationId;
  final String? error;

  const ChatState({
    this.status = ChatStatus.initial,
    this.conversations = const [],
    this.messages = const {},
    this.unreadCounts = const {},
    this.activeConversationId,
    this.error,
  });

  bool get isLoading => status == ChatStatus.loading;
  bool get hasError => status == ChatStatus.error;

  int get totalUnreadCount => unreadCounts.values.fold(0, (a, b) => a + b);

  List<Message> getMessagesForConversation(String conversationId) {
    return messages[conversationId] ?? [];
  }

  Conversation? getConversation(String conversationId) {
    try {
      return conversations.firstWhere((c) => c.id == conversationId);
    } catch (_) {
      return null;
    }
  }

  ChatState copyWith({
    ChatStatus? status,
    List<Conversation>? conversations,
    Map<String, List<Message>>? messages,
    Map<String, int>? unreadCounts,
    String? activeConversationId,
    String? error,
  }) {
    return ChatState(
      status: status ?? this.status,
      conversations: conversations ?? this.conversations,
      messages: messages ?? this.messages,
      unreadCounts: unreadCounts ?? this.unreadCounts,
      activeConversationId: activeConversationId ?? this.activeConversationId,
      error: error,
    );
  }

  @override
  List<Object?> get props => [
        status,
        conversations,
        messages,
        unreadCounts,
        activeConversationId,
        error,
      ];
}
