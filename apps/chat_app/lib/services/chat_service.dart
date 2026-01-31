import 'dart:async';
import 'package:flutter/foundation.dart';
import '../core/constants/websocket_constants.dart';
import '../core/websocket/phoenix_channel.dart';
import '../models/message.dart';
import 'realtime_service.dart';

/// Service for real-time chat functionality
class ChatService {
  final RealtimeService _realtimeService;

  final Map<String, PhoenixChannel> _conversationChannels = {};
  final Map<String, StreamController<Message>> _messageControllers = {};
  final Map<String, StreamController<Map<String, dynamic>>> _eventControllers = {};

  ChatService(this._realtimeService);

  /// Join a conversation channel
  Future<bool> joinConversation(String conversationId) async {
    if (_conversationChannels.containsKey(conversationId)) {
      return true;
    }

    final channel = _realtimeService.getConversationChannel(conversationId);
    final reply = await channel.join();

    if (reply.isOk) {
      _conversationChannels[conversationId] = channel;
      _setupChannelHandlers(conversationId, channel);
      debugPrint('ChatService: Joined conversation $conversationId');
      return true;
    } else {
      debugPrint('ChatService: Failed to join conversation $conversationId: ${reply.response}');
      return false;
    }
  }

  /// Leave a conversation channel
  void leaveConversation(String conversationId) {
    final channel = _conversationChannels.remove(conversationId);
    if (channel != null) {
      channel.leave();
      _realtimeService.leaveConversationChannel(conversationId);
    }

    _messageControllers[conversationId]?.close();
    _messageControllers.remove(conversationId);

    _eventControllers[conversationId]?.close();
    _eventControllers.remove(conversationId);

    debugPrint('ChatService: Left conversation $conversationId');
  }

  /// Send a message to a conversation
  Future<PhoenixReply> sendMessage({
    required String conversationId,
    required String content,
    String type = 'text',
    List<Map<String, dynamic>>? attachments,
    String? replyTo,
    String? clientId,
  }) async {
    final channel = _conversationChannels[conversationId];
    if (channel == null || !channel.isJoined) {
      return PhoenixReply(status: 'error', response: {'reason': 'not_joined'});
    }

    final payload = {
      'conversationId': conversationId,
      'type': type,
      'content': content,
      if (attachments != null) 'attachments': attachments,
      if (replyTo != null) 'replyTo': replyTo,
      if (clientId != null) 'clientId': clientId,
    };

    return channel.push(WebSocketConstants.messageSend, payload);
  }

  /// Edit a message
  Future<PhoenixReply> editMessage({
    required String conversationId,
    required String messageId,
    required String content,
  }) async {
    final channel = _conversationChannels[conversationId];
    if (channel == null || !channel.isJoined) {
      return PhoenixReply(status: 'error', response: {'reason': 'not_joined'});
    }

    return channel.push(WebSocketConstants.messageEdit, {
      'messageId': messageId,
      'content': content,
    });
  }

  /// Delete a message
  Future<PhoenixReply> deleteMessage({
    required String conversationId,
    required String messageId,
  }) async {
    final channel = _conversationChannels[conversationId];
    if (channel == null || !channel.isJoined) {
      return PhoenixReply(status: 'error', response: {'reason': 'not_joined'});
    }

    return channel.push(WebSocketConstants.messageDelete, {
      'messageId': messageId,
    });
  }

  /// Add a reaction to a message
  Future<PhoenixReply> addReaction({
    required String conversationId,
    required String messageId,
    required String emoji,
  }) async {
    final channel = _conversationChannels[conversationId];
    if (channel == null || !channel.isJoined) {
      return PhoenixReply(status: 'error', response: {'reason': 'not_joined'});
    }

    return channel.push(WebSocketConstants.messageReactionAdd, {
      'messageId': messageId,
      'emoji': emoji,
    });
  }

  /// Remove a reaction from a message
  Future<PhoenixReply> removeReaction({
    required String conversationId,
    required String messageId,
    required String emoji,
  }) async {
    final channel = _conversationChannels[conversationId];
    if (channel == null || !channel.isJoined) {
      return PhoenixReply(status: 'error', response: {'reason': 'not_joined'});
    }

    return channel.push(WebSocketConstants.messageReactionRemove, {
      'messageId': messageId,
      'emoji': emoji,
    });
  }

  /// Mark a message as read
  Future<PhoenixReply> markAsRead({
    required String conversationId,
    required String messageId,
  }) async {
    final channel = _conversationChannels[conversationId];
    if (channel == null || !channel.isJoined) {
      return PhoenixReply(status: 'error', response: {'reason': 'not_joined'});
    }

    return channel.push(WebSocketConstants.messageRead, {
      'messageId': messageId,
      'conversationId': conversationId,
    });
  }

  /// Start typing indicator
  void startTyping(String conversationId) {
    final channel = _conversationChannels[conversationId];
    if (channel == null || !channel.isJoined) return;

    channel.pushNoReply(WebSocketConstants.typingStart, {
      'conversationId': conversationId,
    });
  }

  /// Stop typing indicator
  void stopTyping(String conversationId) {
    final channel = _conversationChannels[conversationId];
    if (channel == null || !channel.isJoined) return;

    channel.pushNoReply(WebSocketConstants.typingStop, {
      'conversationId': conversationId,
    });
  }

  /// Get message stream for a conversation
  Stream<Message> getMessageStream(String conversationId) {
    _messageControllers.putIfAbsent(
      conversationId,
      () => StreamController<Message>.broadcast(),
    );
    return _messageControllers[conversationId]!.stream;
  }

  /// Get event stream for a conversation (typing, read receipts, etc.)
  Stream<Map<String, dynamic>> getEventStream(String conversationId) {
    _eventControllers.putIfAbsent(
      conversationId,
      () => StreamController<Map<String, dynamic>>.broadcast(),
    );
    return _eventControllers[conversationId]!.stream;
  }

  void _setupChannelHandlers(String conversationId, PhoenixChannel channel) {
    // Handle new messages
    channel.on(WebSocketConstants.messageNew, (payload) {
      final message = Message.fromJson(payload);
      _messageControllers[conversationId]?.add(message);
    });

    // Handle edited messages
    channel.on(WebSocketConstants.messageEdited, (payload) {
      _eventControllers[conversationId]?.add({
        'event': 'message_edited',
        'payload': payload,
      });
    });

    // Handle deleted messages
    channel.on(WebSocketConstants.messageDeleted, (payload) {
      _eventControllers[conversationId]?.add({
        'event': 'message_deleted',
        'payload': payload,
      });
    });

    // Handle reaction added
    channel.on(WebSocketConstants.messageReactionAdded, (payload) {
      _eventControllers[conversationId]?.add({
        'event': 'reaction_added',
        'payload': payload,
      });
    });

    // Handle reaction removed
    channel.on(WebSocketConstants.messageReactionRemoved, (payload) {
      _eventControllers[conversationId]?.add({
        'event': 'reaction_removed',
        'payload': payload,
      });
    });

    // Handle read receipts
    channel.on(WebSocketConstants.messageReadEvent, (payload) {
      _eventControllers[conversationId]?.add({
        'event': 'message_read',
        'payload': payload,
      });
    });

    // Handle typing start
    channel.on(WebSocketConstants.typingStartEvent, (payload) {
      _eventControllers[conversationId]?.add({
        'event': 'typing_start',
        'payload': payload,
      });
    });

    // Handle typing stop
    channel.on(WebSocketConstants.typingStopEvent, (payload) {
      _eventControllers[conversationId]?.add({
        'event': 'typing_stop',
        'payload': payload,
      });
    });
  }

  void dispose() {
    for (final controller in _messageControllers.values) {
      controller.close();
    }
    _messageControllers.clear();

    for (final controller in _eventControllers.values) {
      controller.close();
    }
    _eventControllers.clear();

    for (final channel in _conversationChannels.values) {
      channel.leave();
    }
    _conversationChannels.clear();
  }
}
