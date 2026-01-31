import 'package:equatable/equatable.dart';
import 'realtime_event.dart';

class RealtimeState extends Equatable {
  final RealtimeConnectionStatus status;
  final String? error;

  const RealtimeState({
    this.status = RealtimeConnectionStatus.disconnected,
    this.error,
  });

  bool get isConnected => status == RealtimeConnectionStatus.connected;
  bool get isConnecting => status == RealtimeConnectionStatus.connecting;
  bool get isReconnecting => status == RealtimeConnectionStatus.reconnecting;
  bool get hasError => status == RealtimeConnectionStatus.error;
  bool get isDisconnected => status == RealtimeConnectionStatus.disconnected;

  RealtimeState copyWith({
    RealtimeConnectionStatus? status,
    String? error,
  }) {
    return RealtimeState(
      status: status ?? this.status,
      error: error,
    );
  }

  @override
  List<Object?> get props => [status, error];
}
