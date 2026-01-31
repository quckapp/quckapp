import 'dart:async';
import 'package:flutter/foundation.dart';
import '../core/constants/websocket_constants.dart';
import '../core/storage/secure_storage.dart';
import '../core/websocket/phoenix_channel.dart';
import '../core/websocket/phoenix_socket.dart';

/// Manages the Phoenix WebSocket connection lifecycle
class RealtimeService {
  final PhoenixSocket _socket;
  final SecureStorage _storage;

  PhoenixChannel? _userChannel;
  PhoenixChannel? _presenceChannel;

  String? _userId;
  bool _isConnecting = false;

  RealtimeService({
    PhoenixSocket? socket,
    SecureStorage? storage,
  })  : _socket = socket ?? PhoenixSocket(),
        _storage = storage ?? SecureStorage.instance;

  PhoenixSocket get socket => _socket;
  SocketState get state => _socket.state;
  bool get isConnected => _socket.isConnected;
  Stream<SocketState> get stateStream => _socket.stateStream;
  Stream<String?> get errorStream => _socket.errorStream;

  /// Connect to the realtime service with the stored auth token
  Future<void> connect() async {
    if (_isConnecting || isConnected) {
      debugPrint('RealtimeService: Already connected or connecting');
      return;
    }

    _isConnecting = true;

    try {
      final token = await _storage.getAccessToken();
      if (token == null) {
        debugPrint('RealtimeService: No token available');
        _isConnecting = false;
        return;
      }

      _userId = await _storage.getUserId();

      debugPrint('RealtimeService: Connecting...');
      await _socket.connect(token);

      // Join user-specific channel for notifications
      if (_userId != null) {
        await _joinUserChannel(_userId!);
      }

      // Join presence channel
      await _joinPresenceChannel();

      debugPrint('RealtimeService: Connected and channels joined');
    } catch (e) {
      debugPrint('RealtimeService: Connection failed: $e');
    } finally {
      _isConnecting = false;
    }
  }

  /// Disconnect from the realtime service
  void disconnect() {
    debugPrint('RealtimeService: Disconnecting...');

    _userChannel?.leave();
    _userChannel = null;

    _presenceChannel?.leave();
    _presenceChannel = null;

    _socket.disconnect();
    _userId = null;
  }

  /// Update the auth token (after refresh)
  void updateToken(String token) {
    _socket.updateToken(token);
  }

  /// Get or create a channel for a conversation
  PhoenixChannel getConversationChannel(String conversationId) {
    return _socket.channel('${WebSocketConstants.chatTopicPrefix}$conversationId');
  }

  /// Leave a conversation channel
  void leaveConversationChannel(String conversationId) {
    final topic = '${WebSocketConstants.chatTopicPrefix}$conversationId';
    _socket.channel(topic).leave();
    _socket.removeChannel(topic);
  }

  /// Get the presence channel
  PhoenixChannel? get presenceChannel => _presenceChannel;

  /// Get the user channel
  PhoenixChannel? get userChannel => _userChannel;

  Future<void> _joinUserChannel(String userId) async {
    final topic = '${WebSocketConstants.userTopicPrefix}$userId';
    _userChannel = _socket.channel(topic);
    final reply = await _userChannel!.join();

    if (reply.isOk) {
      debugPrint('RealtimeService: Joined user channel');
    } else {
      debugPrint('RealtimeService: Failed to join user channel: ${reply.response}');
    }
  }

  Future<void> _joinPresenceChannel() async {
    const topic = '${WebSocketConstants.presenceTopicPrefix}lobby';
    _presenceChannel = _socket.channel(topic);
    final reply = await _presenceChannel!.join();

    if (reply.isOk) {
      debugPrint('RealtimeService: Joined presence channel');
    } else {
      debugPrint('RealtimeService: Failed to join presence channel: ${reply.response}');
    }
  }

  void dispose() {
    disconnect();
    _socket.dispose();
  }
}
