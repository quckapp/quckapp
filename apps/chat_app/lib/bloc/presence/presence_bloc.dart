import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../models/presence.dart';
import '../../services/presence_service.dart';
import 'presence_event.dart';
import 'presence_state.dart';

class PresenceBloc extends Bloc<PresenceEvent, PresenceState> {
  final PresenceService _presenceService;
  StreamSubscription<Map<String, UserPresence>>? _subscription;

  PresenceBloc({required PresenceService presenceService})
      : _presenceService = presenceService,
        super(const PresenceState()) {
    on<PresenceStartListening>(_onStartListening);
    on<PresenceStopListening>(_onStopListening);
    on<PresenceUpdateStatus>(_onUpdateStatus);
    on<PresenceDataUpdated>(_onDataUpdated);
  }

  void _onStartListening(
    PresenceStartListening event,
    Emitter<PresenceState> emit,
  ) {
    if (state.isListening) return;

    _presenceService.startListening();

    _subscription = _presenceService.presenceStream.listen((presences) {
      add(PresenceDataUpdated(presences));
    });

    emit(state.copyWith(isListening: true));
  }

  void _onStopListening(
    PresenceStopListening event,
    Emitter<PresenceState> emit,
  ) {
    _subscription?.cancel();
    _subscription = null;

    _presenceService.stopListening();

    emit(const PresenceState());
  }

  void _onUpdateStatus(
    PresenceUpdateStatus event,
    Emitter<PresenceState> emit,
  ) {
    _presenceService.updateStatus(event.status, statusMessage: event.statusMessage);
  }

  void _onDataUpdated(
    PresenceDataUpdated event,
    Emitter<PresenceState> emit,
  ) {
    emit(state.copyWith(users: event.presences));
  }

  @override
  Future<void> close() {
    _subscription?.cancel();
    return super.close();
  }
}
