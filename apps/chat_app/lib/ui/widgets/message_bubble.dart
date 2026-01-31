import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/message.dart';

/// A chat message bubble
class MessageBubble extends StatelessWidget {
  final Message message;
  final bool isSent;
  final bool showAvatar;
  final bool showTimestamp;
  final bool showReadReceipts;
  final int recipientCount;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  const MessageBubble({
    super.key,
    required this.message,
    required this.isSent,
    this.showAvatar = false,
    this.showTimestamp = true,
    this.showReadReceipts = false,
    this.recipientCount = 0,
    this.onTap,
    this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (message.isDeleted) {
      return _buildDeletedMessage(context);
    }

    return GestureDetector(
      onTap: onTap,
      onLongPress: onLongPress,
      child: Align(
        alignment: isSent ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.75,
          ),
          margin: EdgeInsets.only(
            left: isSent ? 48 : 8,
            right: isSent ? 8 : 48,
            top: 2,
            bottom: 2,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: isSent
                ? theme.colorScheme.primary
                : theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft: Radius.circular(isSent ? 16 : 4),
              bottomRight: Radius.circular(isSent ? 4 : 16),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Message content
              Text(
                message.content,
                style: TextStyle(
                  color: isSent ? Colors.white : theme.colorScheme.onSurface,
                  fontSize: 15,
                ),
              ),

              // Bottom row: timestamp, edit indicator, read receipts
              const SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (message.isEdited) ...[
                    Text(
                      'edited',
                      style: TextStyle(
                        color: isSent
                            ? Colors.white.withValues(alpha: 0.7)
                            : Colors.grey[500],
                        fontSize: 11,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                    const SizedBox(width: 4),
                  ],
                  if (showTimestamp)
                    Text(
                      _formatTime(message.createdAt),
                      style: TextStyle(
                        color: isSent
                            ? Colors.white.withValues(alpha: 0.7)
                            : Colors.grey[500],
                        fontSize: 11,
                      ),
                    ),
                  if (isSent && showReadReceipts) ...[
                    const SizedBox(width: 4),
                    _buildReadReceiptIcon(),
                  ],
                ],
              ),

              // Reactions
              if (message.reactions.isNotEmpty) ...[
                const SizedBox(height: 4),
                _buildReactions(context),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDeletedMessage(BuildContext context) {
    return Align(
      alignment: isSent ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.only(
          left: isSent ? 48 : 8,
          right: isSent ? 8 : 48,
          top: 2,
          bottom: 2,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey[300]!),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.block, size: 16, color: Colors.grey[500]),
            const SizedBox(width: 6),
            Text(
              'This message was deleted',
              style: TextStyle(
                color: Colors.grey[500],
                fontStyle: FontStyle.italic,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReadReceiptIcon() {
    if (message.isPending) {
      return Icon(Icons.access_time, size: 14, color: Colors.white.withValues(alpha: 0.7));
    }
    if (message.hasFailed) {
      return const Icon(Icons.error_outline, size: 14, color: Colors.red);
    }

    final readCount = message.readBy.length;
    if (readCount == 0) {
      // Sent but not read
      return Icon(Icons.check, size: 14, color: Colors.white.withValues(alpha: 0.7));
    } else if (recipientCount > 0 && readCount >= recipientCount) {
      // Read by all
      return Icon(Icons.done_all, size: 14, color: Colors.blue[200]);
    } else {
      // Delivered (at least one read)
      return Icon(Icons.done_all, size: 14, color: Colors.white.withValues(alpha: 0.7));
    }
  }

  Widget _buildReactions(BuildContext context) {
    return Wrap(
      spacing: 4,
      runSpacing: 4,
      children: message.reactions.map((reaction) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(reaction.emoji, style: const TextStyle(fontSize: 12)),
              if (reaction.count > 1) ...[
                const SizedBox(width: 2),
                Text(
                  '${reaction.count}',
                  style: TextStyle(
                    fontSize: 11,
                    color: isSent ? Colors.white : Colors.grey[600],
                  ),
                ),
              ],
            ],
          ),
        );
      }).toList(),
    );
  }

  String _formatTime(DateTime time) {
    return DateFormat.jm().format(time);
  }
}

/// A system message (e.g., "User joined the chat")
class SystemMessageBubble extends StatelessWidget {
  final Message message;

  const SystemMessageBubble({
    super.key,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 32),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          message.content,
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 13,
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
