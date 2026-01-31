import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../core/websocket/phoenix_socket.dart';
import '../../services/realtime_service.dart';
import 'realtime_event.dart';
import 'realtime_state.dart';

class RealtimeBloc extends Bloc<RealtimeEvent, RealtimeState> {
  final RealtimeService _realtimeService;
  StreamSubscription<SocketState>? _stateSubscription;
  StreamSubscription<String?>? _errorSubscription;

  RealtimeBloc({required RealtimeService realtimeService})
      : _realtimeService = realtimeService,
        super(const RealtimeState()) {
    on<RealtimeConnect>(_onConnect);
    on<RealtimeDisconnect>(_onDisconnect);
    on<RealtimeConnectionChanged>(_onConnectionChanged);
    on<RealtimeErrorOccurred>(_onErrorOccurred);
    on<RealtimeClearError>(_onClearError);

    _setupListeners();
  }

  void _setupListeners() {
    _stateSubscription = _realtimeService.stateStream.listen((socketState) {
      add(RealtimeConnectionChanged(_mapSocketState(socketState)));
    });

    _errorSubscription = _realtimeService.errorStream.listen((error) {
      if (error != null) {
        add(RealtimeErrorOccurred(error));
      }
    });
  }

  RealtimeConnectionStatus _mapSocketState(SocketState socketState) {
    switch (socketState) {
      case SocketState.disconnected:
        return RealtimeConnectionStatus.disconnected;
      case SocketState.connecting:
        return RealtimeConnectionStatus.connecting;
      case SocketState.connected:
        return RealtimeConnectionStatus.connected;
      case SocketState.reconnecting:
        return RealtimeConnectionStatus.reconnecting;
      case SocketState.error:
        return RealtimeConnectionStatus.error;
    }
  }

  Future<void> _onConnect(
    RealtimeConnect event,
    Emitter<RealtimeState> emit,
  ) async {
    emit(state.copyWith(
      status: RealtimeConnectionStatus.connecting,
      error: null,
    ));
    await _realtimeService.connect();
  }

  void _onDisconnect(
    RealtimeDisconnect event,
    Emitter<RealtimeState> emit,
  ) {
    _realtimeService.disconnect();
    emit(const RealtimeState(status: RealtimeConnectionStatus.disconnected));
  }

  void _onConnectionChanged(
    RealtimeConnectionChanged event,
    Emitter<RealtimeState> emit,
  ) {
    emit(state.copyWith(status: event.status));
  }

  void _onErrorOccurred(
    RealtimeErrorOccurred event,
    Emitter<RealtimeState> emit,
  ) {
    emit(state.copyWith(error: event.error));
  }

  void _onClearError(
    RealtimeClearError event,
    Emitter<RealtimeState> emit,
  ) {
    emit(state.copyWith(error: null));
  }

  @override
  Future<void> close() {
    _stateSubscription?.cancel();
    _errorSubscription?.cancel();
    return super.close();
  }
}
