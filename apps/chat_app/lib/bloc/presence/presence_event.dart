import 'package:equatable/equatable.dart';
import '../../models/presence.dart';

abstract class PresenceEvent extends Equatable {
  const PresenceEvent();

  @override
  List<Object?> get props => [];
}

/// Start listening to presence updates
class PresenceStartListening extends PresenceEvent {
  const PresenceStartListening();
}

/// Stop listening to presence updates
class PresenceStopListening extends PresenceEvent {
  const PresenceStopListening();
}

/// Update own status
class PresenceUpdateStatus extends PresenceEvent {
  final PresenceStatus status;
  final String? statusMessage;

  const PresenceUpdateStatus({
    required this.status,
    this.statusMessage,
  });

  @override
  List<Object?> get props => [status, statusMessage];
}

/// Presence data updated (internal event)
class PresenceDataUpdated extends PresenceEvent {
  final Map<String, UserPresence> presences;

  const PresenceDataUpdated(this.presences);

  @override
  List<Object?> get props => [presences];
}
