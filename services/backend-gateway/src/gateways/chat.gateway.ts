import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from '../modules/messages/messages.service';
import { UsersService } from '../modules/users/users.service';
import { ConversationsService } from '../modules/conversations/conversations.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { LoggerService } from '../common/logger/logger.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
  transports: ['websocket'],
  pingTimeout: 30000,
  pingInterval: 10000,
  allowEIO3: true,
  maxHttpBufferSize: 1e6,
  perMessageDeflate: false,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(
    private messagesService: MessagesService,
    private usersService: UsersService,
    private conversationsService: ConversationsService,
    private notificationsService: NotificationsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const userId = payload.sub;
      client.data.userId = userId;
      this.connectedUsers.set(userId, client.id);

      await this.usersService.updateStatus(userId, 'online');

      const conversations = await this.conversationsService.getUserConversations(userId);
      conversations.forEach((conv) => {
        client.join(`conversation:${conv._id}`);
      });

      this.server.emit('user:online', { userId });
      this.logger.log(`User ${userId} connected`, 'ChatGateway');
    } catch (error) {
      this.logger.error('Connection error', error.message, 'ChatGateway');
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      this.connectedUsers.delete(userId);
      await this.usersService.updateStatus(userId, 'offline');
      this.server.emit('user:offline', { userId });
      this.logger.log(`User ${userId} disconnected`, 'ChatGateway');
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: string;
      type: string;
      content?: string;
      attachments?: any[];
      replyTo?: string;
      isForwarded?: boolean;
      forwardedFrom?: string;
    },
  ) {
    try {
      const userId = client.data.userId;

      const message = await this.messagesService.createMessage(
        data.conversationId,
        userId,
        data.type,
        data.content,
        data.attachments,
        data.replyTo,
        undefined, // metadata
        data.isForwarded,
        data.forwardedFrom,
      );

      // Parallel fetch for better performance
      const [populatedMessage, conversation, sender] = await Promise.all([
        this.messagesService.findById(message._id.toString()),
        this.conversationsService.findById(data.conversationId),
        this.usersService.findById(userId),
      ]);

      this.server.to(`conversation:${data.conversationId}`).emit('message:new', populatedMessage);

      const recipientIds = conversation.participants
        .filter((p) => p.userId.toString() !== userId)
        .map((p) => p.userId.toString());

      // Run these operations in parallel (non-blocking)
      Promise.all([
        this.conversationsService.incrementUnreadCount(data.conversationId, recipientIds),
        this.usersService.getUsersByIds(recipientIds),
      ])
        .then(([_, recipientUsers]) => {
          // Send notifications to users who are offline OR don't have an active socket connection
          const connectedUserIds = Array.from(this.connectedUsers.keys());
          const offlineRecipients = recipientUsers.filter(
            (u) => u.status === 'offline' || !connectedUserIds.includes(u._id.toString()),
          );

          this.logger.log(
            `Message notification check: ${recipientUsers.length} recipients, ${offlineRecipients.length} offline/disconnected`,
            'ChatGateway',
          );

          if (offlineRecipients.length > 0) {
            const fcmTokens = offlineRecipients.flatMap((u) => u.fcmTokens);
            this.logger.log(`Found ${fcmTokens.length} FCM tokens to notify`, 'ChatGateway');
            if (fcmTokens.length > 0) {
              // Determine notification title based on conversation type
              let notificationTitle = sender.displayName;
              let notificationBody = data.content || 'Sent an attachment';

              if (conversation.type === 'group') {
                notificationTitle = conversation.name || 'Group Chat';
                notificationBody = `${sender.displayName}: ${data.content || 'Sent an attachment'}`;
              }

              // Send notification asynchronously (don't await)
              this.notificationsService
                .sendMessageNotification(
                  fcmTokens,
                  notificationTitle,
                  notificationBody,
                  data.conversationId,
                  message._id.toString(),
                )
                .catch((err) =>
                  this.logger.error('Error sending notification', err.message, 'ChatGateway'),
                );
            }
          }

          // Send notifications to mentioned users (if message contains @mentions)
          if (data.content) {
            const mentionedUserIds = this.extractMentions(data.content);
            if (mentionedUserIds.length > 0) {
              this.usersService
                .getUsersByIds(mentionedUserIds)
                .then((mentionedUsers) => {
                  const offlineMentioned = mentionedUsers.filter(
                    (u) => u.status === 'offline' && !recipientIds.includes(u._id.toString()),
                  );

                  if (offlineMentioned.length > 0) {
                    const mentionTokens = offlineMentioned.flatMap((u) => u.fcmTokens);
                    if (mentionTokens.length > 0) {
                      this.notificationsService
                        .sendPushNotification(
                          mentionTokens,
                          `${sender.displayName} mentioned you`,
                          data.content || '',
                          {
                            type: 'mention',
                            conversationId: data.conversationId,
                            messageId: message._id.toString(),
                          },
                        )
                        .catch((err) =>
                          this.logger.error(
                            'Error sending mention notification',
                            err.message,
                            'ChatGateway',
                          ),
                        );
                    }
                  }
                })
                .catch((err) =>
                  this.logger.error('Error fetching mentioned users', err.message, 'ChatGateway'),
                );
            }
          }
        })
        .catch((err) =>
          this.logger.error('Error in async notification operations', err.message, 'ChatGateway'),
        );

      return { success: true, message: populatedMessage };
    } catch (error) {
      this.logger.error('Error sending message', error.message, 'ChatGateway');
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('message:edit')
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; content: string },
  ) {
    try {
      const userId = client.data.userId;
      const message = await this.messagesService.editMessage(data.messageId, userId, data.content);

      this.server.to(`conversation:${message.conversationId}`).emit('message:edited', message);

      return { success: true, message };
    } catch (error) {
      this.logger.error('Error editing message', error.message, 'ChatGateway');
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string },
  ) {
    try {
      const userId = client.data.userId;
      const message = await this.messagesService.deleteMessage(data.messageId, userId);

      this.server.to(`conversation:${message.conversationId}`).emit('message:deleted', {
        messageId: data.messageId,
        conversationId: message.conversationId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting message', error.message, 'ChatGateway');
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('message:reaction:add')
  async handleAddReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; emoji: string; conversationId: string },
  ) {
    try {
      const userId = client.data.userId;
      const message = await this.messagesService.addReaction(data.messageId, userId, data.emoji);

      // Use conversationId from request instead of searching through all conversations
      const conversationId = data.conversationId || message.conversationId;
      this.server.to(`conversation:${conversationId}`).emit('message:reaction:added', {
        messageId: data.messageId,
        userId,
        emoji: data.emoji,
        conversationId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error adding reaction', error.message, 'ChatGateway');
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('message:reaction:remove')
  async handleRemoveReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; emoji: string; conversationId: string },
  ) {
    try {
      const userId = client.data.userId;
      const message = await this.messagesService.removeReaction(data.messageId, userId, data.emoji);

      // Use conversationId from request instead of fetching message
      const conversationId = data.conversationId || message.conversationId;
      this.server.to(`conversation:${conversationId}`).emit('message:reaction:removed', {
        messageId: data.messageId,
        userId,
        emoji: data.emoji,
        conversationId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error removing reaction', error.message, 'ChatGateway');
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    client.to(`conversation:${data.conversationId}`).emit('typing:start', {
      conversationId: data.conversationId,
      userId,
    });
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      conversationId: data.conversationId,
      userId,
    });
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    try {
      const userId = client.data.userId;
      await this.messagesService.addReadReceipt(data.messageId, userId);
      await this.conversationsService.markAsRead(data.conversationId, userId, data.messageId);

      this.server.to(`conversation:${data.conversationId}`).emit('message:read', {
        messageId: data.messageId,
        userId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error marking message as read', error.message, 'ChatGateway');
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conversation:${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
    return { success: true };
  }

  // Helper method to extract @mentions from message content
  private extractMentions(content: string): string[] {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[2]); // Extract userId from @[displayName](userId)
    }

    return mentions;
  }
}
