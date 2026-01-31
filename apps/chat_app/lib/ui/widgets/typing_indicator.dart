import 'package:flutter/material.dart';

/// Animated typing indicator (three bouncing dots)
class TypingIndicator extends StatefulWidget {
  final Color? color;
  final double dotSize;
  final double spacing;

  const TypingIndicator({
    super.key,
    this.color,
    this.dotSize = 8,
    this.spacing = 4,
  });

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator>
    with TickerProviderStateMixin {
  late final List<AnimationController> _controllers;
  late final List<Animation<double>> _animations;

  @override
  void initState() {
    super.initState();

    _controllers = List.generate(3, (index) {
      return AnimationController(
        duration: const Duration(milliseconds: 600),
        vsync: this,
      );
    });

    _animations = _controllers.map((controller) {
      return Tween<double>(begin: 0, end: -8).animate(
        CurvedAnimation(
          parent: controller,
          curve: Curves.easeInOut,
        ),
      );
    }).toList();

    // Start animations with delay
    for (var i = 0; i < _controllers.length; i++) {
      Future.delayed(Duration(milliseconds: i * 150), () {
        if (mounted) {
          _controllers[i].repeat(reverse: true);
        }
      });
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.color ?? Colors.grey[400]!;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (index) {
        return AnimatedBuilder(
          animation: _animations[index],
          builder: (context, child) {
            return Transform.translate(
              offset: Offset(0, _animations[index].value),
              child: Container(
                margin: EdgeInsets.symmetric(horizontal: widget.spacing / 2),
                width: widget.dotSize,
                height: widget.dotSize,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                ),
              ),
            );
          },
        );
      }),
    );
  }
}

/// A text label with typing indicator
class TypingIndicatorLabel extends StatelessWidget {
  final List<String> typingUserNames;
  final TextStyle? textStyle;

  const TypingIndicatorLabel({
    super.key,
    required this.typingUserNames,
    this.textStyle,
  });

  @override
  Widget build(BuildContext context) {
    if (typingUserNames.isEmpty) {
      return const SizedBox.shrink();
    }

    final text = _buildTypingText();

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const TypingIndicator(dotSize: 6, spacing: 2),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            text,
            style: textStyle ?? Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[600],
                  fontStyle: FontStyle.italic,
                ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  String _buildTypingText() {
    if (typingUserNames.length == 1) {
      return '${typingUserNames[0]} is typing';
    } else if (typingUserNames.length == 2) {
      return '${typingUserNames[0]} and ${typingUserNames[1]} are typing';
    } else {
      return '${typingUserNames.length} people are typing';
    }
  }
}
