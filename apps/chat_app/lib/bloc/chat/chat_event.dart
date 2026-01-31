import 'package:equatable/equatable.dart';
import '../../models/conversation.dart';
import '../../models/message.dart';

abstract class ChatEvent extends Equatable {
  const ChatEvent();

  @override
  List<Object?> get props => [];
}

/// Load all conversations
class ChatLoadConversations extends ChatEvent {
  const ChatLoadConversations();
}

/// Join a conversation channel
class ChatJoinConversation extends ChatEvent {
  final String conversationId;

  const ChatJoinConversation(this.conversationId);

  @override
  List<Object?> get props => [conversationId];
}

/// Leave a conversation channel
class ChatLeaveConversation extends ChatEvent {
  final String conversationId;

  const ChatLeaveConversation(this.conversationId);

  @override
  List<Object?> get props => [conversationId];
}

/// Send a message
class ChatSendMessage extends ChatEvent {
  final String conversationId;
  final String content;
  final String type;
  final String? replyTo;

  const ChatSendMessage({
    required this.conversationId,
    required this.content,
    this.type = 'text',
    this.replyTo,
  });

  @override
  List<Object?> get props => [conversationId, content, type, replyTo];
}

/// Mark message as read
class ChatMarkAsRead extends ChatEvent {
  final String conversationId;
  final String messageId;

  const ChatMarkAsRead({
    required this.conversationId,
    required this.messageId,
  });

  @override
  List<Object?> get props => [conversationId, messageId];
}

/// Add reaction to message
class ChatAddReaction extends ChatEvent {
  final String conversationId;
  final String messageId;
  final String emoji;

  const ChatAddReaction({
    required this.conversationId,
    required this.messageId,
    required this.emoji,
  });

  @override
  List<Object?> get props => [conversationId, messageId, emoji];
}

/// Remove reaction from message
class ChatRemoveReaction extends ChatEvent {
  final String conversationId;
  final String messageId;
  final String emoji;

  const ChatRemoveReaction({
    required this.conversationId,
    required this.messageId,
    required this.emoji,
  });

  @override
  List<Object?> get props => [conversationId, messageId, emoji];
}

/// New message received (internal event)
class ChatMessageReceived extends ChatEvent {
  final String conversationId;
  final Message message;

  const ChatMessageReceived({
    required this.conversationId,
    required this.message,
  });

  @override
  List<Object?> get props => [conversationId, message];
}

/// Message edited (internal event)
class ChatMessageEdited extends ChatEvent {
  final String conversationId;
  final String messageId;
  final String content;

  const ChatMessageEdited({
    required this.conversationId,
    required this.messageId,
    required this.content,
  });

  @override
  List<Object?> get props => [conversationId, messageId, content];
}

/// Message deleted (internal event)
class ChatMessageDeleted extends ChatEvent {
  final String conversationId;
  final String messageId;

  const ChatMessageDeleted({
    required this.conversationId,
    required this.messageId,
  });

  @override
  List<Object?> get props => [conversationId, messageId];
}

/// Conversations loaded (internal event)
class ChatConversationsLoaded extends ChatEvent {
  final List<Conversation> conversations;

  const ChatConversationsLoaded(this.conversations);

  @override
  List<Object?> get props => [conversations];
}

/// Set active conversation
class ChatSetActiveConversation extends ChatEvent {
  final String? conversationId;

  const ChatSetActiveConversation(this.conversationId);

  @override
  List<Object?> get props => [conversationId];
}

/// Clear error
class ChatClearError extends ChatEvent {
  const ChatClearError();
}
