import 'dart:async';
import 'package:flutter/material.dart';

/// Text input field for composing messages
class MessageInput extends StatefulWidget {
  final ValueChanged<String> onSend;
  final VoidCallback? onTypingStart;
  final VoidCallback? onTypingStop;
  final String? hintText;
  final bool enabled;
  final bool autofocus;

  const MessageInput({
    super.key,
    required this.onSend,
    this.onTypingStart,
    this.onTypingStop,
    this.hintText,
    this.enabled = true,
    this.autofocus = false,
  });

  @override
  State<MessageInput> createState() => _MessageInputState();
}

class _MessageInputState extends State<MessageInput> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  Timer? _typingTimer;
  bool _isTyping = false;

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    _typingTimer?.cancel();
    super.dispose();
  }

  void _onTextChanged(String text) {
    if (text.isNotEmpty && !_isTyping) {
      _isTyping = true;
      widget.onTypingStart?.call();
    }

    // Reset typing timer
    _typingTimer?.cancel();
    _typingTimer = Timer(const Duration(seconds: 2), () {
      if (_isTyping) {
        _isTyping = false;
        widget.onTypingStop?.call();
      }
    });

    setState(() {});
  }

  void _onSend() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    widget.onSend(text);
    _controller.clear();

    // Stop typing indicator
    _typingTimer?.cancel();
    if (_isTyping) {
      _isTyping = false;
      widget.onTypingStop?.call();
    }

    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasText = _controller.text.trim().isNotEmpty;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        border: Border(
          top: BorderSide(color: Colors.grey[200]!),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            // Attachment button
            IconButton(
              icon: Icon(Icons.attach_file, color: Colors.grey[600]),
              onPressed: widget.enabled ? _onAttachment : null,
            ),

            // Text field
            Expanded(
              child: Container(
                constraints: const BoxConstraints(maxHeight: 120),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(24),
                ),
                child: TextField(
                  controller: _controller,
                  focusNode: _focusNode,
                  autofocus: widget.autofocus,
                  enabled: widget.enabled,
                  maxLines: null,
                  textCapitalization: TextCapitalization.sentences,
                  onChanged: _onTextChanged,
                  decoration: InputDecoration(
                    hintText: widget.hintText ?? 'Message',
                    hintStyle: TextStyle(color: Colors.grey[500]),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                  ),
                  onSubmitted: (_) => _onSend(),
                ),
              ),
            ),

            const SizedBox(width: 4),

            // Send button
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              child: IconButton(
                icon: Icon(
                  Icons.send_rounded,
                  color: hasText && widget.enabled
                      ? theme.colorScheme.primary
                      : Colors.grey[400],
                ),
                onPressed: hasText && widget.enabled ? _onSend : null,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _onAttachment() {
    // TODO: Implement attachment picker
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Attachments coming soon!'),
        duration: Duration(seconds: 2),
      ),
    );
  }
}
