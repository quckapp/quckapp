import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../bloc/bloc.dart';
import '../../models/message.dart';
import '../widgets/message_bubble.dart';
import '../widgets/message_input.dart';
import '../widgets/typing_indicator.dart';
import '../widgets/presence_indicator.dart';

/// Screen for chatting in a conversation
class ChatScreen extends StatefulWidget {
  final String conversationId;

  const ChatScreen({
    super.key,
    required this.conversationId,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _scrollController = ScrollController();
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _joinConversation();
  }

  Future<void> _joinConversation() async {
    context.read<ChatBloc>().add(ChatJoinConversation(widget.conversationId));
    context.read<TypingBloc>().add(TypingSubscribe(widget.conversationId));

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    // Leave conversation when screen is disposed
    context.read<ChatBloc>().add(ChatLeaveConversation(widget.conversationId));
    context.read<TypingBloc>().add(TypingUnsubscribe(widget.conversationId));
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        final currentUserId = authState.user?.id ?? '';

        return BlocBuilder<ChatBloc, ChatState>(
          builder: (context, chatState) {
            final conversation = chatState.getConversation(widget.conversationId);
            final messages = chatState.getMessagesForConversation(widget.conversationId);

            // Get other participant for direct chats
            final otherParticipant = conversation?.getOtherParticipant(currentUserId);

            return Scaffold(
              appBar: AppBar(
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => context.pop(),
                ),
                title: Row(
                  children: [
                    // Avatar with presence
                    if (otherParticipant != null) ...[
                      PresenceIndicatorPositioned(
                        userId: otherParticipant.id,
                        indicatorSize: 12,
                        child: CircleAvatar(
                          radius: 18,
                          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                          child: Text(
                            otherParticipant.initials,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                    ],
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            conversation?.displayName(currentUserId) ?? 'Chat',
                            style: const TextStyle(fontSize: 16),
                          ),
                          BlocBuilder<TypingBloc, TypingState>(
                            builder: (context, typingState) {
                              final typingUsers = typingState.getTypingUsers(widget.conversationId);
                              if (typingUsers.isNotEmpty) {
                                return Text(
                                  _buildTypingText(typingUsers),
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                        color: Colors.grey[600],
                                        fontStyle: FontStyle.italic,
                                      ),
                                );
                              }
                              return const SizedBox.shrink();
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                actions: [
                  IconButton(
                    icon: const Icon(Icons.more_vert),
                    onPressed: () {
                      // TODO: Show chat options
                    },
                  ),
                ],
              ),
              body: Column(
                children: [
                  // Messages list
                  Expanded(
                    child: _isLoading
                        ? const Center(child: CircularProgressIndicator())
                        : messages.isEmpty
                            ? _buildEmptyState(context)
                            : _buildMessageList(context, messages, currentUserId),
                  ),

                  // Typing indicator
                  BlocBuilder<TypingBloc, TypingState>(
                    builder: (context, typingState) {
                      final typingUsers = typingState.getTypingUsers(widget.conversationId);
                      if (typingUsers.isNotEmpty) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          alignment: Alignment.centerLeft,
                          child: TypingIndicatorLabel(
                            typingUserNames: _getTypingUserNames(typingUsers),
                          ),
                        );
                      }
                      return const SizedBox.shrink();
                    },
                  ),

                  // Message input
                  MessageInput(
                    onSend: (content) => _sendMessage(content),
                    onTypingStart: () {
                      context.read<TypingBloc>().add(TypingStarted(widget.conversationId));
                    },
                    onTypingStop: () {
                      context.read<TypingBloc>().add(TypingStopped(widget.conversationId));
                    },
                    hintText: 'Type a message',
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.chat_outlined,
            size: 64,
            color: Colors.grey[300],
          ),
          const SizedBox(height: 16),
          Text(
            'No messages yet',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.grey[600],
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Send a message to start the conversation',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[500],
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageList(BuildContext context, List<Message> messages, String currentUserId) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(vertical: 16),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        final message = messages[index];
        final isSent = message.senderId == currentUserId;

        // Check if we should show date separator
        final showDateSeparator = index == 0 ||
            !_isSameDay(messages[index - 1].createdAt, message.createdAt);

        return Column(
          children: [
            if (showDateSeparator)
              _buildDateSeparator(context, message.createdAt),
            if (message.isSystem)
              SystemMessageBubble(message: message)
            else
              MessageBubble(
                message: message,
                isSent: isSent,
                showReadReceipts: isSent,
                onLongPress: () => _showMessageOptions(context, message, currentUserId),
              ),
          ],
        );
      },
    );
  }

  Widget _buildDateSeparator(BuildContext context, DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final messageDate = DateTime(date.year, date.month, date.day);

    String text;
    if (messageDate == today) {
      text = 'Today';
    } else if (messageDate == yesterday) {
      text = 'Yesterday';
    } else {
      text = '${date.day}/${date.month}/${date.year}';
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            text,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[600],
                ),
          ),
        ),
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  Future<void> _sendMessage(String content) async {
    context.read<ChatBloc>().add(ChatSendMessage(
          conversationId: widget.conversationId,
          content: content,
        ));

    // Scroll to bottom after sending
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
  }

  void _showMessageOptions(BuildContext context, Message message, String currentUserId) {
    showModalBottomSheet(
      context: context,
      builder: (bottomSheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.copy),
              title: const Text('Copy'),
              onTap: () {
                // TODO: Copy message to clipboard
                Navigator.pop(bottomSheetContext);
              },
            ),
            ListTile(
              leading: const Icon(Icons.reply),
              title: const Text('Reply'),
              onTap: () {
                // TODO: Implement reply
                Navigator.pop(bottomSheetContext);
              },
            ),
            if (message.senderId == currentUserId) ...[
              ListTile(
                leading: const Icon(Icons.edit),
                title: const Text('Edit'),
                onTap: () {
                  // TODO: Implement edit
                  Navigator.pop(bottomSheetContext);
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete, color: Colors.red),
                title: const Text('Delete', style: TextStyle(color: Colors.red)),
                onTap: () {
                  // TODO: Implement delete
                  Navigator.pop(bottomSheetContext);
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _buildTypingText(Set<String> typingUserIds) {
    if (typingUserIds.length == 1) {
      return 'typing...';
    }
    return '${typingUserIds.length} people typing...';
  }

  List<String> _getTypingUserNames(Set<String> typingUserIds) {
    // TODO: Get actual user names from user service
    return typingUserIds.map((id) => 'User').toList();
  }
}
