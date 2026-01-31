import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../bloc/bloc.dart';
import '../../core/theme/theme.dart';
import '../widgets/common/loading_indicator.dart';
import '../widgets/conversation_tile.dart';

/// Screen showing list of conversations
class ConversationsScreen extends StatefulWidget {
  const ConversationsScreen({super.key});

  @override
  State<ConversationsScreen> createState() => _ConversationsScreenState();
}

class _ConversationsScreenState extends State<ConversationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RealtimeBloc>().add(const RealtimeConnect());
      context.read<ChatBloc>().add(const ChatLoadConversations());
      context.read<PresenceBloc>().add(const PresenceStartListening());
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        final currentUserId = authState.user?.id ?? '';

        return Scaffold(
          appBar: AppBar(
            title: const Text('Chats'),
            actions: [
              // Connection status indicator
              BlocBuilder<RealtimeBloc, RealtimeState>(
                builder: (context, realtimeState) {
                  if (realtimeState.isConnected) return const SizedBox.shrink();

                  return IconButton(
                    icon: Icon(
                      realtimeState.isConnecting || realtimeState.isReconnecting
                          ? Icons.sync
                          : Icons.cloud_off,
                      color: realtimeState.hasError
                          ? AppColors.error
                          : AppColors.grey500,
                    ),
                    onPressed: () {
                      if (realtimeState.hasError) {
                        context.read<RealtimeBloc>().add(const RealtimeConnect());
                      }
                    },
                  );
                },
              ),
              IconButton(
                icon: const Icon(Icons.settings_outlined),
                onPressed: () => context.push('/settings'),
              ),
            ],
          ),
          body: BlocBuilder<ChatBloc, ChatState>(
            builder: (context, chatState) {
              return RefreshIndicator(
                onRefresh: () async {
                  context.read<ChatBloc>().add(const ChatLoadConversations());
                },
                child: chatState.isLoading
                    ? const Center(
                        child: AppLoadingIndicator(size: LoadingSize.large),
                      )
                    : chatState.conversations.isEmpty
                        ? _buildEmptyState(context)
                        : ListView.separated(
                            itemCount: chatState.conversations.length,
                            separatorBuilder: (context, index) => const Divider(
                              height: 1,
                              indent: 80,
                            ),
                            itemBuilder: (context, index) {
                              final conversation = chatState.conversations[index];
                              return ConversationTile(
                                conversation: conversation,
                                currentUserId: currentUserId,
                                onTap: () {
                                  context.push('/chat/${conversation.id}');
                                },
                              );
                            },
                          ),
              );
            },
          ),
          floatingActionButton: FloatingActionButton(
            onPressed: () => context.push('/new-chat'),
            child: const Icon(Icons.edit),
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return AppEmptyState(
      icon: Icons.chat_bubble_outline_rounded,
      title: 'No conversations yet',
      subtitle: 'Start a new chat to begin messaging',
      action: FilledButton.icon(
        onPressed: () => context.push('/new-chat'),
        icon: const Icon(Icons.add),
        label: const Text('Start a chat'),
      ),
    );
  }
}
