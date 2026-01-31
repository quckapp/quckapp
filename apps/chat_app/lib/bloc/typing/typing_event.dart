import 'package:equatable/equatable.dart';

abstract class TypingEvent extends Equatable {
  const TypingEvent();

  @override
  List<Object?> get props => [];
}

/// Subscribe to typing events for a conversation
class TypingSubscribe extends TypingEvent {
  final String conversationId;

  const TypingSubscribe(this.conversationId);

  @override
  List<Object?> get props => [conversationId];
}

/// Unsubscribe from typing events for a conversation
class TypingUnsubscribe extends TypingEvent {
  final String conversationId;

  const TypingUnsubscribe(this.conversationId);

  @override
  List<Object?> get props => [conversationId];
}

/// User started typing
class TypingStarted extends TypingEvent {
  final String conversationId;

  const TypingStarted(this.conversationId);

  @override
  List<Object?> get props => [conversationId];
}

/// User stopped typing
class TypingStopped extends TypingEvent {
  final String conversationId;

  const TypingStopped(this.conversationId);

  @override
  List<Object?> get props => [conversationId];
}

/// Remote user started typing (internal event)
class TypingUserStarted extends TypingEvent {
  final String conversationId;
  final String userId;

  const TypingUserStarted({
    required this.conversationId,
    required this.userId,
  });

  @override
  List<Object?> get props => [conversationId, userId];
}

/// Remote user stopped typing (internal event)
class TypingUserStopped extends TypingEvent {
  final String conversationId;
  final String userId;

  const TypingUserStopped({
    required this.conversationId,
    required this.userId,
  });

  @override
  List<Object?> get props => [conversationId, userId];
}
