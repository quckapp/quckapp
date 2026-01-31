import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../constants/api_constants.dart';
import '../constants/websocket_constants.dart';
import 'phoenix_channel.dart';

/// Connection state of the Phoenix socket
enum SocketState {
  disconnected,
  connecting,
  connected,
  reconnecting,
  error,
}

/// Phoenix WebSocket client for Elixir Realtime Service
class PhoenixSocket {
  final String url;
  String? _token;

  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  Timer? _heartbeatTimer;
  Timer? _reconnectTimer;

  SocketState _state = SocketState.disconnected;
  int _reconnectAttempts = 0;
  int _ref = 0;
  String? _heartbeatRef;

  final Map<String, PhoenixChannel> _channels = {};
  final StreamController<SocketState> _stateController = StreamController.broadcast();
  final StreamController<String?> _errorController = StreamController.broadcast();

  PhoenixSocket({String? url}) : url = url ?? ApiConstants.realtimeServiceWsUrl;

  SocketState get state => _state;
  bool get isConnected => _state == SocketState.connected;
  Stream<SocketState> get stateStream => _stateController.stream;
  Stream<String?> get errorStream => _errorController.stream;

  /// Connect to the Phoenix socket with JWT token
  Future<void> connect(String token) async {
    if (_state == SocketState.connecting || _state == SocketState.connected) {
      debugPrint('PhoenixSocket: Already connected or connecting');
      return;
    }

    _token = token;
    await _connect();
  }

  /// Disconnect from the socket
  void disconnect() {
    debugPrint('PhoenixSocket: Disconnecting...');
    _stopHeartbeat();
    _cancelReconnect();

    for (final channel in _channels.values) {
      channel.markClosed();
    }
    _channels.clear();

    _subscription?.cancel();
    _subscription = null;
    _channel?.sink.close();
    _channel = null;

    _state = SocketState.disconnected;
    _stateController.add(_state);
    _reconnectAttempts = 0;
  }

  /// Get or create a channel for the given topic
  PhoenixChannel channel(String topic) {
    if (_channels.containsKey(topic)) {
      return _channels[topic]!;
    }

    final channel = PhoenixChannel(
      topic: topic,
      sendMessage: _sendMessage,
      onLeave: () => _channels.remove(topic),
    );

    _channels[topic] = channel;
    return channel;
  }

  /// Remove a channel
  void removeChannel(String topic) {
    final channel = _channels.remove(topic);
    channel?.dispose();
  }

  /// Update the token (for refresh)
  void updateToken(String token) {
    _token = token;
  }

  Future<void> _connect() async {
    _state = SocketState.connecting;
    _stateController.add(_state);

    try {
      final wsUrl = Uri.parse('$url?token=$_token');
      debugPrint('PhoenixSocket: Connecting to $wsUrl');

      _channel = WebSocketChannel.connect(wsUrl);

      // Wait for connection to establish
      await _channel!.ready.timeout(
        WebSocketConstants.connectionTimeout,
        onTimeout: () {
          throw TimeoutException('Connection timeout');
        },
      );

      _subscription = _channel!.stream.listen(
        _onMessage,
        onError: _onError,
        onDone: _onDone,
      );

      _state = SocketState.connected;
      _stateController.add(_state);
      _reconnectAttempts = 0;
      debugPrint('PhoenixSocket: Connected successfully');

      _startHeartbeat();

      // Rejoin existing channels
      for (final channel in _channels.values) {
        if (channel.state != ChannelState.closed) {
          channel.join();
        }
      }
    } catch (e) {
      debugPrint('PhoenixSocket: Connection failed: $e');
      _state = SocketState.error;
      _stateController.add(_state);
      _errorController.add(e.toString());
      _scheduleReconnect();
    }
  }

  void _onMessage(dynamic data) {
    try {
      final message = jsonDecode(data as String) as Map<String, dynamic>;
      final topic = message['topic'] as String?;
      final event = message['event'] as String?;
      final ref = message['ref'] as String?;

      // Handle heartbeat reply
      if (topic == WebSocketConstants.phoenixTopic &&
          event == WebSocketConstants.phxReply &&
          ref == _heartbeatRef) {
        _heartbeatRef = null;
        return;
      }

      // Route message to channel
      if (topic != null && _channels.containsKey(topic)) {
        _channels[topic]!.handleMessage(message);
      }
    } catch (e) {
      debugPrint('PhoenixSocket: Error parsing message: $e');
    }
  }

  void _onError(dynamic error) {
    debugPrint('PhoenixSocket: Socket error: $error');
    _state = SocketState.error;
    _stateController.add(_state);
    _errorController.add(error.toString());
    _scheduleReconnect();
  }

  void _onDone() {
    debugPrint('PhoenixSocket: Socket closed');
    if (_state != SocketState.disconnected) {
      _markChannelsClosed();
      _scheduleReconnect();
    }
  }

  void _startHeartbeat() {
    _stopHeartbeat();
    _heartbeatTimer = Timer.periodic(WebSocketConstants.heartbeatInterval, (_) {
      _sendHeartbeat();
    });
  }

  void _stopHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    _heartbeatRef = null;
  }

  void _sendHeartbeat() {
    if (_state != SocketState.connected) return;

    // Check for missed heartbeat
    if (_heartbeatRef != null) {
      debugPrint('PhoenixSocket: Missed heartbeat, reconnecting...');
      _reconnect();
      return;
    }

    _ref++;
    _heartbeatRef = _ref.toString();

    _sendMessage({
      'topic': WebSocketConstants.phoenixTopic,
      'event': WebSocketConstants.heartbeat,
      'payload': {},
      'ref': _heartbeatRef,
    });
  }

  void _sendMessage(Map<String, dynamic> message) {
    if (_channel == null || _state != SocketState.connected) {
      debugPrint('PhoenixSocket: Cannot send message, not connected');
      return;
    }

    try {
      final encoded = jsonEncode(message);
      _channel!.sink.add(encoded);
    } catch (e) {
      debugPrint('PhoenixSocket: Error sending message: $e');
    }
  }

  void _scheduleReconnect() {
    _cancelReconnect();

    if (_reconnectAttempts >= WebSocketConstants.maxReconnectAttempts) {
      debugPrint('PhoenixSocket: Max reconnect attempts reached');
      _state = SocketState.error;
      _stateController.add(_state);
      _errorController.add('Max reconnect attempts reached');
      return;
    }

    _reconnectAttempts++;
    _state = SocketState.reconnecting;
    _stateController.add(_state);

    // Exponential backoff with jitter
    final baseDelay = WebSocketConstants.reconnectBaseDelay.inMilliseconds;
    final maxDelay = WebSocketConstants.reconnectMaxDelay.inMilliseconds;
    final delay = min(baseDelay * pow(2, _reconnectAttempts - 1).toInt(), maxDelay);
    final jitter = Random().nextInt(1000);

    debugPrint('PhoenixSocket: Reconnecting in ${delay + jitter}ms (attempt $_reconnectAttempts)');

    _reconnectTimer = Timer(Duration(milliseconds: delay + jitter), _reconnect);
  }

  void _cancelReconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
  }

  void _reconnect() async {
    _stopHeartbeat();
    _subscription?.cancel();
    _channel?.sink.close();
    _channel = null;

    if (_token != null) {
      await _connect();
    }
  }

  void _markChannelsClosed() {
    for (final channel in _channels.values) {
      channel.markClosed();
    }
  }

  void dispose() {
    disconnect();
    _stateController.close();
    _errorController.close();
    for (final channel in _channels.values) {
      channel.dispose();
    }
  }
}
