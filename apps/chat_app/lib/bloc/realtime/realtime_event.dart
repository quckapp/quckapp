import 'package:equatable/equatable.dart';

abstract class RealtimeEvent extends Equatable {
  const RealtimeEvent();

  @override
  List<Object?> get props => [];
}

/// Connect to the realtime service
class RealtimeConnect extends RealtimeEvent {
  const RealtimeConnect();
}

/// Disconnect from the realtime service
class RealtimeDisconnect extends RealtimeEvent {
  const RealtimeDisconnect();
}

/// Connection state changed (internal event)
class RealtimeConnectionChanged extends RealtimeEvent {
  final RealtimeConnectionStatus status;

  const RealtimeConnectionChanged(this.status);

  @override
  List<Object?> get props => [status];
}

/// Error occurred (internal event)
class RealtimeErrorOccurred extends RealtimeEvent {
  final String error;

  const RealtimeErrorOccurred(this.error);

  @override
  List<Object?> get props => [error];
}

/// Clear error state
class RealtimeClearError extends RealtimeEvent {
  const RealtimeClearError();
}

enum RealtimeConnectionStatus {
  disconnected,
  connecting,
  connected,
  reconnecting,
  error,
}
