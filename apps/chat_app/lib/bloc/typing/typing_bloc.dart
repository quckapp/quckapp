import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../services/chat_service.dart';
import 'typing_event.dart';
import 'typing_state.dart';

class TypingBloc extends Bloc<TypingEvent, TypingState> {
  final ChatService _chatService;
  final Map<String, StreamSubscription<Map<String, dynamic>>> _subscriptions = {};
  Timer? _typingTimer;
  String? _currentlyTypingIn;

  static const _typingDebounce = Duration(milliseconds: 500);
  static const _typingTimeout = Duration(seconds: 5);
  static const _remoteTypingTimeout = Duration(seconds: 10);

  TypingBloc({required ChatService chatService})
      : _chatService = chatService,
        super(const TypingState()) {
    on<TypingSubscribe>(_onSubscribe);
    on<TypingUnsubscribe>(_onUnsubscribe);
    on<TypingStarted>(_onStarted);
    on<TypingStopped>(_onStopped);
    on<TypingUserStarted>(_onUserStarted);
    on<TypingUserStopped>(_onUserStopped);
  }

  void _onSubscribe(
    TypingSubscribe event,
    Emitter<TypingState> emit,
  ) {
    final conversationId = event.conversationId;
    if (_subscriptions.containsKey(conversationId)) return;

    _subscriptions[conversationId] = _chatService
        .getEventStream(conversationId)
        .listen((event) => _handleEvent(conversationId, event));
  }

  void _onUnsubscribe(
    TypingUnsubscribe event,
    Emitter<TypingState> emit,
  ) {
    final conversationId = event.conversationId;
    _subscriptions[conversationId]?.cancel();
    _subscriptions.remove(conversationId);

    // Clear typing users for this conversation
    final typingUsers = Map<String, Set<String>>.from(state.typingUsers);
    typingUsers.remove(conversationId);
    emit(state.copyWith(typingUsers: typingUsers));
  }

  void _onStarted(
    TypingStarted event,
    Emitter<TypingState> emit,
  ) {
    _typingTimer?.cancel();

    // Debounce to avoid spamming the server
    _typingTimer = Timer(_typingDebounce, () {
      if (_currentlyTypingIn != event.conversationId) {
        // Stop typing in previous conversation
        if (_currentlyTypingIn != null) {
          _chatService.stopTyping(_currentlyTypingIn!);
        }

        // Start typing in new conversation
        _chatService.startTyping(event.conversationId);
        _currentlyTypingIn = event.conversationId;
      }

      // Auto-stop after timeout
      _typingTimer = Timer(_typingTimeout, () {
        _stopTyping();
      });
    });
  }

  void _onStopped(
    TypingStopped event,
    Emitter<TypingState> emit,
  ) {
    _typingTimer?.cancel();
    _stopTyping();
  }

  void _onUserStarted(
    TypingUserStarted event,
    Emitter<TypingState> emit,
  ) {
    final typingUsers = Map<String, Set<String>>.from(state.typingUsers);
    typingUsers.putIfAbsent(event.conversationId, () => {});
    typingUsers[event.conversationId] = Set<String>.from(typingUsers[event.conversationId]!)
      ..add(event.userId);
    emit(state.copyWith(typingUsers: typingUsers));

    // Auto-remove after timeout
    Timer(_remoteTypingTimeout, () {
      add(TypingUserStopped(conversationId: event.conversationId, userId: event.userId));
    });
  }

  void _onUserStopped(
    TypingUserStopped event,
    Emitter<TypingState> emit,
  ) {
    final typingUsers = Map<String, Set<String>>.from(state.typingUsers);
    if (typingUsers.containsKey(event.conversationId)) {
      typingUsers[event.conversationId] = Set<String>.from(typingUsers[event.conversationId]!)
        ..remove(event.userId);
      if (typingUsers[event.conversationId]!.isEmpty) {
        typingUsers.remove(event.conversationId);
      }
      emit(state.copyWith(typingUsers: typingUsers));
    }
  }

  void _handleEvent(String conversationId, Map<String, dynamic> event) {
    final eventType = event['event'] as String?;
    final payload = event['payload'] as Map<String, dynamic>?;

    if (eventType == null || payload == null) return;

    final userId = payload['userId'] as String?;
    if (userId == null) return;

    switch (eventType) {
      case 'typing_start':
        add(TypingUserStarted(conversationId: conversationId, userId: userId));
        break;
      case 'typing_stop':
        add(TypingUserStopped(conversationId: conversationId, userId: userId));
        break;
    }
  }

  void _stopTyping() {
    if (_currentlyTypingIn != null) {
      _chatService.stopTyping(_currentlyTypingIn!);
      _currentlyTypingIn = null;
    }
  }

  @override
  Future<void> close() {
    _typingTimer?.cancel();
    for (final subscription in _subscriptions.values) {
      subscription.cancel();
    }
    _subscriptions.clear();
    return super.close();
  }
}
