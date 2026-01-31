import 'dart:async';
import 'package:flutter/foundation.dart';
import '../core/constants/websocket_constants.dart';
import '../models/presence.dart';
import 'realtime_service.dart';

/// Service for user presence tracking
class PresenceService {
  final RealtimeService _realtimeService;

  final Map<String, UserPresence> _presences = {};
  final StreamController<Map<String, UserPresence>> _presenceController =
      StreamController<Map<String, UserPresence>>.broadcast();

  bool _isListening = false;

  PresenceService(this._realtimeService);

  Map<String, UserPresence> get presences => Map.unmodifiable(_presences);
  Stream<Map<String, UserPresence>> get presenceStream => _presenceController.stream;

  /// Start listening to presence updates
  void startListening() {
    if (_isListening) return;

    final channel = _realtimeService.presenceChannel;
    if (channel == null) {
      debugPrint('PresenceService: Presence channel not available');
      return;
    }

    _isListening = true;

    // Handle initial presence state
    channel.on(WebSocketConstants.presenceState, (payload) {
      _handlePresenceState(payload);
    });

    // Handle presence diff (joins/leaves)
    channel.on(WebSocketConstants.presenceDiff, (payload) {
      _handlePresenceDiff(payload);
    });

    // Handle user online event
    channel.on(WebSocketConstants.userOnline, (payload) {
      final userId = payload['userId'] as String?;
      if (userId != null) {
        _updatePresence(userId, PresenceStatus.online);
      }
    });

    // Handle user offline event
    channel.on(WebSocketConstants.userOffline, (payload) {
      final userId = payload['userId'] as String?;
      if (userId != null) {
        _updatePresence(userId, PresenceStatus.offline);
      }
    });

    debugPrint('PresenceService: Started listening');
  }

  /// Stop listening to presence updates
  void stopListening() {
    _isListening = false;
    _presences.clear();
    _notifyListeners();
    debugPrint('PresenceService: Stopped listening');
  }

  /// Get presence for a specific user
  UserPresence? getPresence(String userId) {
    return _presences[userId];
  }

  /// Check if a user is online
  bool isOnline(String userId) {
    return _presences[userId]?.isOnline ?? false;
  }

  /// Update own status
  void updateStatus(PresenceStatus status, {String? statusMessage}) {
    final channel = _realtimeService.presenceChannel;
    if (channel == null || !channel.isJoined) return;

    channel.pushNoReply('status:update', {
      'status': status.name,
      if (statusMessage != null) 'statusMessage': statusMessage,
    });
  }

  void _handlePresenceState(Map<String, dynamic> state) {
    // Phoenix presence state format: { "user_id": { metas: [...] }, ... }
    _presences.clear();

    state.forEach((userId, presenceData) {
      if (presenceData is Map<String, dynamic>) {
        _presences[userId] = UserPresence.fromPhoenixPresence(userId, presenceData);
      }
    });

    debugPrint('PresenceService: Received presence state for ${_presences.length} users');
    _notifyListeners();
  }

  void _handlePresenceDiff(Map<String, dynamic> diff) {
    // Handle joins
    final joins = diff['joins'] as Map<String, dynamic>?;
    if (joins != null) {
      joins.forEach((userId, presenceData) {
        if (presenceData is Map<String, dynamic>) {
          _presences[userId] = UserPresence.fromPhoenixPresence(userId, presenceData);
        }
      });
    }

    // Handle leaves
    final leaves = diff['leaves'] as Map<String, dynamic>?;
    if (leaves != null) {
      leaves.forEach((userId, _) {
        final existingPresence = _presences[userId];
        if (existingPresence != null) {
          _presences[userId] = existingPresence.copyWith(
            status: PresenceStatus.offline,
            lastSeen: DateTime.now(),
          );
        }
      });
    }

    _notifyListeners();
  }

  void _updatePresence(String userId, PresenceStatus status) {
    final existing = _presences[userId];
    _presences[userId] = UserPresence(
      userId: userId,
      status: status,
      lastSeen: status == PresenceStatus.offline ? DateTime.now() : existing?.lastSeen,
    );
    _notifyListeners();
  }

  void _notifyListeners() {
    _presenceController.add(Map.unmodifiable(_presences));
  }

  void dispose() {
    stopListening();
    _presenceController.close();
  }
}
