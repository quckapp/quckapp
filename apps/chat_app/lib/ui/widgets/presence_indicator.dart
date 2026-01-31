import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../bloc/bloc.dart';
import '../../models/presence.dart';

/// A small dot indicator showing user online/offline status
class PresenceIndicator extends StatelessWidget {
  final String userId;
  final double size;
  final bool showBorder;

  const PresenceIndicator({
    super.key,
    required this.userId,
    this.size = 12,
    this.showBorder = true,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<PresenceBloc, PresenceState>(
      builder: (context, state) {
        final presence = state.getPresence(userId);
        final status = presence?.status ?? PresenceStatus.offline;

        return Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: _getStatusColor(status),
            shape: BoxShape.circle,
            border: showBorder
                ? Border.all(
                    color: Theme.of(context).scaffoldBackgroundColor,
                    width: 2,
                  )
                : null,
          ),
        );
      },
    );
  }

  Color _getStatusColor(PresenceStatus status) {
    switch (status) {
      case PresenceStatus.online:
        return Colors.green;
      case PresenceStatus.away:
        return Colors.orange;
      case PresenceStatus.offline:
        return Colors.grey;
    }
  }
}

/// Presence indicator that can be positioned on an avatar
class PresenceIndicatorPositioned extends StatelessWidget {
  final String userId;
  final Widget child;
  final double indicatorSize;

  const PresenceIndicatorPositioned({
    super.key,
    required this.userId,
    required this.child,
    this.indicatorSize = 14,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        Positioned(
          right: 0,
          bottom: 0,
          child: PresenceIndicator(
            userId: userId,
            size: indicatorSize,
          ),
        ),
      ],
    );
  }
}
