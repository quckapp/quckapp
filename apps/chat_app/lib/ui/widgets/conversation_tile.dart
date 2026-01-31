import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/conversation.dart';
import '../../models/message.dart';
import 'presence_indicator.dart';

/// A list tile for displaying a conversation in a list
class ConversationTile extends StatelessWidget {
  final Conversation conversation;
  final String currentUserId;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  const ConversationTile({
    super.key,
    required this.conversation,
    required this.currentUserId,
    this.onTap,
    this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final displayName = conversation.displayName(currentUserId);
    final lastMessage = conversation.lastMessage;
    final hasUnread = conversation.hasUnread;

    // Get other participant for direct chats (for presence indicator)
    final otherParticipant = conversation.getOtherParticipant(currentUserId);

    return InkWell(
      onTap: onTap,
      onLongPress: onLongPress,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            // Avatar with presence indicator
            _buildAvatar(context, displayName, otherParticipant?.id),

            const SizedBox(width: 12),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name and time row
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          displayName,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: hasUnread ? FontWeight.bold : FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (lastMessage != null) ...[
                        const SizedBox(width: 8),
                        Text(
                          _formatTime(lastMessage.createdAt),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: hasUnread
                                ? theme.colorScheme.primary
                                : Colors.grey[500],
                            fontWeight: hasUnread ? FontWeight.w600 : FontWeight.normal,
                          ),
                        ),
                      ],
                    ],
                  ),

                  const SizedBox(height: 4),

                  // Last message and unread count row
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _getLastMessagePreview(lastMessage),
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: hasUnread ? Colors.black87 : Colors.grey[600],
                            fontWeight: hasUnread ? FontWeight.w500 : FontWeight.normal,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (hasUnread) ...[
                        const SizedBox(width: 8),
                        _buildUnreadBadge(context),
                      ],
                      if (conversation.isMuted) ...[
                        const SizedBox(width: 8),
                        Icon(Icons.notifications_off, size: 16, color: Colors.grey[400]),
                      ],
                      if (conversation.isPinned) ...[
                        const SizedBox(width: 8),
                        Icon(Icons.push_pin, size: 16, color: Colors.grey[400]),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatar(BuildContext context, String displayName, String? otherUserId) {
    final avatar = conversation.displayAvatar(currentUserId);
    final initials = _getInitials(displayName);

    Widget avatarWidget = CircleAvatar(
      radius: 28,
      backgroundColor: Theme.of(context).colorScheme.primaryContainer,
      backgroundImage: avatar != null ? NetworkImage(avatar) : null,
      child: avatar == null
          ? Text(
              initials,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.primary,
              ),
            )
          : null,
    );

    // Add presence indicator for direct chats
    if (conversation.isDirect && otherUserId != null) {
      avatarWidget = PresenceIndicatorPositioned(
        userId: otherUserId,
        child: avatarWidget,
      );
    }

    return avatarWidget;
  }

  Widget _buildUnreadBadge(BuildContext context) {
    final count = conversation.unreadCount;
    final displayCount = count > 99 ? '99+' : count.toString();

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: count > 9 ? 8 : 6,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        displayCount,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    } else if (parts.isNotEmpty && parts[0].isNotEmpty) {
      return parts[0][0].toUpperCase();
    }
    return '?';
  }

  String _getLastMessagePreview(Message? message) {
    if (message == null) return 'No messages yet';
    if (message.isDeleted) return 'Message deleted';

    switch (message.type) {
      case 'image':
        return '\ud83d\uddbc Photo';
      case 'file':
        return '\ud83d\udcce File';
      case 'audio':
        return '\ud83c\udfa4 Voice message';
      case 'video':
        return '\ud83c\udfa5 Video';
      default:
        return message.content;
    }
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);

    if (difference.inDays == 0) {
      return DateFormat.jm().format(time);
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return DateFormat.E().format(time); // Day name
    } else {
      return DateFormat.MMMd().format(time); // Month day
    }
  }
}
