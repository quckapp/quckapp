import 'dart:async';
import 'package:flutter/foundation.dart';
import '../constants/websocket_constants.dart';

/// Represents a reply from a Phoenix channel push
class PhoenixReply {
  final String status;
  final Map<String, dynamic> response;

  PhoenixReply({required this.status, required this.response});

  bool get isOk => status == WebSocketConstants.replyOk;
  bool get isError => status == WebSocketConstants.replyError;
}

/// Pending push waiting for reply
class _PendingPush {
  final Completer<PhoenixReply> completer;
  final Timer timeoutTimer;

  _PendingPush({required this.completer, required this.timeoutTimer});

  void complete(PhoenixReply reply) {
    timeoutTimer.cancel();
    if (!completer.isCompleted) {
      completer.complete(reply);
    }
  }

  void timeout() {
    if (!completer.isCompleted) {
      completer.complete(PhoenixReply(
        status: WebSocketConstants.replyTimeout,
        response: {'reason': 'timeout'},
      ));
    }
  }
}

/// Represents a subscription to a Phoenix channel topic
class PhoenixChannel {
  final String topic;
  final void Function(Map<String, dynamic> message) _sendMessage;
  final VoidCallback _onLeave;

  ChannelState _state = ChannelState.closed;
  final Map<String, _PendingPush> _pendingPushes = {};
  final Map<String, List<void Function(Map<String, dynamic>)>> _eventHandlers = {};
  final StreamController<ChannelState> _stateController = StreamController.broadcast();
  int _pushRef = 0;
  String? _joinRef;

  PhoenixChannel({
    required this.topic,
    required void Function(Map<String, dynamic> message) sendMessage,
    required VoidCallback onLeave,
  })  : _sendMessage = sendMessage,
        _onLeave = onLeave;

  ChannelState get state => _state;
  bool get isJoined => _state == ChannelState.joined;
  bool get isClosed => _state == ChannelState.closed;
  Stream<ChannelState> get stateStream => _stateController.stream;

  /// Join the channel with optional payload
  Future<PhoenixReply> join([Map<String, dynamic>? payload]) async {
    if (_state == ChannelState.joining || _state == ChannelState.joined) {
      return PhoenixReply(status: 'ok', response: {});
    }

    _state = ChannelState.joining;
    _stateController.add(_state);

    final ref = _nextRef();
    _joinRef = ref;

    final message = {
      'topic': topic,
      'event': WebSocketConstants.phxJoin,
      'payload': payload ?? {},
      'ref': ref,
      'join_ref': ref,
    };

    final reply = await _pushWithReply(ref, message);

    if (reply.isOk) {
      _state = ChannelState.joined;
      _stateController.add(_state);
      debugPrint('PhoenixChannel: Joined $topic');
    } else {
      _state = ChannelState.errored;
      _stateController.add(_state);
      debugPrint('PhoenixChannel: Failed to join $topic: ${reply.response}');
    }

    return reply;
  }

  /// Leave the channel
  Future<void> leave() async {
    if (_state == ChannelState.closed) return;

    final ref = _nextRef();
    final message = {
      'topic': topic,
      'event': WebSocketConstants.phxLeave,
      'payload': {},
      'ref': ref,
      'join_ref': _joinRef,
    };

    _sendMessage(message);
    _cleanup();
    _onLeave();
    debugPrint('PhoenixChannel: Left $topic');
  }

  /// Push an event to the channel
  Future<PhoenixReply> push(String event, Map<String, dynamic> payload) async {
    if (_state != ChannelState.joined) {
      return PhoenixReply(
        status: 'error',
        response: {'reason': 'channel_not_joined'},
      );
    }

    final ref = _nextRef();
    final message = {
      'topic': topic,
      'event': event,
      'payload': payload,
      'ref': ref,
      'join_ref': _joinRef,
    };

    return _pushWithReply(ref, message);
  }

  /// Push an event without waiting for reply
  void pushNoReply(String event, Map<String, dynamic> payload) {
    if (_state != ChannelState.joined) return;

    final ref = _nextRef();
    final message = {
      'topic': topic,
      'event': event,
      'payload': payload,
      'ref': ref,
      'join_ref': _joinRef,
    };

    _sendMessage(message);
  }

  /// Subscribe to an event
  void on(String event, void Function(Map<String, dynamic>) handler) {
    _eventHandlers.putIfAbsent(event, () => []);
    _eventHandlers[event]!.add(handler);
  }

  /// Unsubscribe from an event
  void off(String event, [void Function(Map<String, dynamic>)? handler]) {
    if (handler != null) {
      _eventHandlers[event]?.remove(handler);
    } else {
      _eventHandlers.remove(event);
    }
  }

  /// Handle incoming message from socket
  void handleMessage(Map<String, dynamic> message) {
    final event = message['event'] as String?;
    final payload = message['payload'] as Map<String, dynamic>? ?? {};
    final ref = message['ref'] as String?;

    // Handle replies to pending pushes
    if (event == WebSocketConstants.phxReply && ref != null) {
      final pending = _pendingPushes.remove(ref);
      if (pending != null) {
        final status = payload['status'] as String? ?? 'ok';
        final response = payload['response'] as Map<String, dynamic>? ?? {};
        pending.complete(PhoenixReply(status: status, response: response));
      }
      return;
    }

    // Handle channel errors
    if (event == WebSocketConstants.phxError) {
      _state = ChannelState.errored;
      _stateController.add(_state);
      debugPrint('PhoenixChannel: Error on $topic: $payload');
      return;
    }

    // Handle channel close
    if (event == WebSocketConstants.phxClose) {
      _cleanup();
      return;
    }

    // Dispatch to event handlers
    if (event != null) {
      final handlers = _eventHandlers[event];
      if (handlers != null) {
        for (final handler in handlers) {
          try {
            handler(payload);
          } catch (e) {
            debugPrint('PhoenixChannel: Error in event handler: $e');
          }
        }
      }
    }
  }

  /// Mark channel as closed (called by socket on disconnect)
  void markClosed() {
    _cleanup();
  }

  Future<PhoenixReply> _pushWithReply(String ref, Map<String, dynamic> message) {
    final completer = Completer<PhoenixReply>();
    final timer = Timer(const Duration(seconds: 10), () {
      final pending = _pendingPushes.remove(ref);
      pending?.timeout();
    });

    _pendingPushes[ref] = _PendingPush(completer: completer, timeoutTimer: timer);
    _sendMessage(message);

    return completer.future;
  }

  String _nextRef() {
    _pushRef++;
    return _pushRef.toString();
  }

  void _cleanup() {
    _state = ChannelState.closed;
    _stateController.add(_state);

    for (final pending in _pendingPushes.values) {
      pending.timeoutTimer.cancel();
    }
    _pendingPushes.clear();
    _eventHandlers.clear();
    _joinRef = null;
  }

  void dispose() {
    _cleanup();
    _stateController.close();
  }
}

enum ChannelState {
  closed,
  joining,
  joined,
  errored,
}
