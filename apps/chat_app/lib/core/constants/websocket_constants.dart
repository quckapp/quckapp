/// WebSocket constants for Phoenix Realtime Service
class WebSocketConstants {
  WebSocketConstants._();

  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration heartbeatInterval = Duration(seconds: 30);
  static const Duration reconnectBaseDelay = Duration(seconds: 1);
  static const Duration reconnectMaxDelay = Duration(seconds: 30);
  static const int maxReconnectAttempts = 10;

  // Phoenix protocol events
  static const String phxJoin = 'phx_join';
  static const String phxLeave = 'phx_leave';
  static const String phxReply = 'phx_reply';
  static const String phxError = 'phx_error';
  static const String phxClose = 'phx_close';
  static const String heartbeat = 'heartbeat';

  // Channel topics
  static const String phoenixTopic = 'phoenix';
  static const String chatTopicPrefix = 'chat:';
  static const String presenceTopicPrefix = 'presence:';
  static const String userTopicPrefix = 'user:';

  // Chat events (client -> server)
  static const String messageSend = 'message:send';
  static const String messageEdit = 'message:edit';
  static const String messageDelete = 'message:delete';
  static const String messageReactionAdd = 'message:reaction:add';
  static const String messageReactionRemove = 'message:reaction:remove';
  static const String messageRead = 'message:read';
  static const String typingStart = 'typing:start';
  static const String typingStop = 'typing:stop';

  // Chat events (server -> client)
  static const String messageNew = 'message:new';
  static const String messageEdited = 'message:edited';
  static const String messageDeleted = 'message:deleted';
  static const String messageReactionAdded = 'message:reaction:added';
  static const String messageReactionRemoved = 'message:reaction:removed';
  static const String messageReadEvent = 'message:read';
  static const String typingStartEvent = 'typing:start';
  static const String typingStopEvent = 'typing:stop';

  // Presence events
  static const String presenceState = 'presence_state';
  static const String presenceDiff = 'presence_diff';
  static const String userOnline = 'user:online';
  static const String userOffline = 'user:offline';

  // Reply status
  static const String replyOk = 'ok';
  static const String replyError = 'error';
  static const String replyTimeout = 'timeout';
}
