import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  HttpException,
  HttpStatus,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { SERVICES } from '../../../shared/constants/services';
import {
  USERS_PATTERNS,
  MESSAGES_PATTERNS,
  CONVERSATIONS_PATTERNS,
  CALLS_PATTERNS,
  NOTIFICATIONS_PATTERNS,
} from '../../../shared/contracts/message-patterns';

/**
 * Internal API Controller
 *
 * Service-to-service API endpoints for the Elixir realtime service.
 * Protected by API key authentication (not JWT).
 *
 * Routes: /internal/*
 */
@Controller('internal')
export class InternalGatewayController {
  private readonly REQUEST_TIMEOUT = 10000;

  constructor(
    private config: ConfigService,
    @Inject(SERVICES.USERS_SERVICE) private usersClient: ClientProxy,
    @Inject(SERVICES.MESSAGES_SERVICE) private messagesClient: ClientProxy,
    @Inject(SERVICES.CONVERSATIONS_SERVICE) private conversationsClient: ClientProxy,
    @Inject(SERVICES.CALLS_SERVICE) private callsClient: ClientProxy,
    @Inject(SERVICES.NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy,
  ) {}

  // ============================================
  // API Key Validation (called by each endpoint)
  // ============================================

  private validateApiKey(apiKey: string): void {
    const validApiKey = this.config.get('INTERNAL_API_KEY');

    // In development, allow requests without API key
    if (!validApiKey && this.config.get('NODE_ENV') !== 'production') {
      return;
    }

    if (!apiKey || apiKey !== validApiKey) {
      throw new HttpException('Invalid API key', HttpStatus.UNAUTHORIZED);
    }
  }

  private async send<T>(client: ClientProxy, pattern: string, data: any): Promise<T> {
    return firstValueFrom(
      client.send<T>(pattern, data).pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => {
          throw new HttpException(
            err.message || 'Service unavailable',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }),
      ),
    );
  }

  // ============================================
  // Users Endpoints
  // ============================================

  @Get('users/:userId')
  async getUser(@Param('userId') userId: string, @Headers('x-api-key') apiKey: string) {
    this.validateApiKey(apiKey);
    return this.send(this.usersClient, USERS_PATTERNS.GET_USER, { userId });
  }

  @Post('users/batch')
  async getUsersBatch(@Body() body: { userIds: string[] }, @Headers('x-api-key') apiKey: string) {
    this.validateApiKey(apiKey);
    // Get users one by one (or implement a batch endpoint in users-service)
    const users = await Promise.all(
      body.userIds.map((userId) =>
        this.send(this.usersClient, USERS_PATTERNS.GET_USER, { userId }).catch(() => null),
      ),
    );
    return { success: true, data: users.filter(Boolean) };
  }

  @Get('users/:userId/fcm-tokens')
  async getUserFcmTokens(@Param('userId') userId: string, @Headers('x-api-key') apiKey: string) {
    this.validateApiKey(apiKey);
    const result = await this.send<any>(this.usersClient, USERS_PATTERNS.GET_USER, { userId });
    return { success: true, data: result?.data?.fcmTokens || [] };
  }

  @Put('users/:userId/presence')
  async updateUserPresence(
    @Param('userId') userId: string,
    @Body() body: { status: string },
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    const pattern = body.status === 'online' ? USERS_PATTERNS.SET_ONLINE : USERS_PATTERNS.SET_OFFLINE;
    return this.send(this.usersClient, pattern, { userId });
  }

  // ============================================
  // Conversations Endpoints
  // ============================================

  @Get('conversations/:conversationId')
  async getConversation(
    @Param('conversationId') conversationId: string,
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.conversationsClient, CONVERSATIONS_PATTERNS.GET_CONVERSATION, {
      conversationId,
    });
  }

  @Get('conversations/user/:userId')
  async getUserConversations(
    @Param('userId') userId: string,
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.conversationsClient, CONVERSATIONS_PATTERNS.GET_USER_CONVERSATIONS, {
      userId,
    });
  }

  @Get('conversations/:conversationId/participants')
  async getConversationParticipants(
    @Param('conversationId') conversationId: string,
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.conversationsClient, CONVERSATIONS_PATTERNS.GET_PARTICIPANTS, {
      conversationId,
    });
  }

  @Post('conversations/:conversationId/unread/increment')
  async incrementUnreadCount(
    @Param('conversationId') conversationId: string,
    @Body() body: { userIds: string[] },
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.conversationsClient, CONVERSATIONS_PATTERNS.GET_UNREAD_COUNT, {
      conversationId,
      userIds: body.userIds,
      increment: true,
    });
  }

  @Post('conversations/:conversationId/unread/clear')
  async clearUnreadCount(
    @Param('conversationId') conversationId: string,
    @Body() body: { userId: string; lastReadMessageId: string },
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.conversationsClient, CONVERSATIONS_PATTERNS.CLEAR_UNREAD, {
      conversationId,
      userId: body.userId,
      lastReadMessageId: body.lastReadMessageId,
    });
  }

  // ============================================
  // Messages Endpoints
  // ============================================

  @Post('messages')
  async createMessage(
    @Body()
    body: {
      conversationId: string;
      senderId: string;
      type: string;
      content?: string;
      attachments?: any[];
      replyTo?: string;
      metadata?: any;
    },
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.messagesClient, MESSAGES_PATTERNS.SEND_MESSAGE, body);
  }

  @Get('messages/:messageId')
  async getMessage(@Param('messageId') messageId: string, @Headers('x-api-key') apiKey: string) {
    this.validateApiKey(apiKey);
    return this.send(this.messagesClient, MESSAGES_PATTERNS.GET_MESSAGE, { messageId });
  }

  @Put('messages/:messageId')
  async updateMessage(
    @Param('messageId') messageId: string,
    @Body() body: { userId: string; content: string },
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.messagesClient, MESSAGES_PATTERNS.EDIT_MESSAGE, {
      messageId,
      userId: body.userId,
      content: body.content,
    });
  }

  @Delete('messages/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Body() body: { userId: string },
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.messagesClient, MESSAGES_PATTERNS.DELETE_MESSAGE, {
      messageId,
      userId: body.userId,
    });
  }

  @Post('messages/:messageId/reactions')
  async addReaction(
    @Param('messageId') messageId: string,
    @Body() body: { userId: string; emoji: string },
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.messagesClient, MESSAGES_PATTERNS.ADD_REACTION, {
      messageId,
      userId: body.userId,
      emoji: body.emoji,
    });
  }

  @Delete('messages/:messageId/reactions')
  async removeReaction(
    @Param('messageId') messageId: string,
    @Body() body: { userId: string; emoji: string },
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.messagesClient, MESSAGES_PATTERNS.REMOVE_REACTION, {
      messageId,
      userId: body.userId,
      emoji: body.emoji,
    });
  }

  @Post('messages/:messageId/delivered')
  async markDelivered(
    @Param('messageId') messageId: string,
    @Body() body: { userId: string },
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.messagesClient, MESSAGES_PATTERNS.MARK_DELIVERED, {
      messageId,
      userId: body.userId,
    });
  }

  @Post('messages/:messageId/read')
  async markRead(
    @Param('messageId') messageId: string,
    @Body() body: { userId: string },
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.messagesClient, MESSAGES_PATTERNS.MARK_READ, {
      messageId,
      userId: body.userId,
    });
  }

  // ============================================
  // Calls Endpoints
  // ============================================

  @Post('calls')
  async createCall(
    @Body()
    body: {
      initiatorId: string;
      conversationId: string;
      participantIds: string[];
      type: string;
    },
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.callsClient, CALLS_PATTERNS.INITIATE_CALL, body);
  }

  @Put('calls/:callId')
  async updateCall(
    @Param('callId') callId: string,
    @Body() body: any,
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    // Map to appropriate pattern based on status
    if (body.status === 'rejected') {
      return this.send(this.callsClient, CALLS_PATTERNS.REJECT_CALL, { callId, ...body });
    }
    return this.send(this.callsClient, CALLS_PATTERNS.GET_CALL, { callId });
  }

  @Post('calls/:callId/join')
  async joinCall(
    @Param('callId') callId: string,
    @Body() body: { userId: string },
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.callsClient, CALLS_PATTERNS.JOIN_CALL, {
      callId,
      userId: body.userId,
    });
  }

  @Post('calls/:callId/end')
  async endCall(
    @Param('callId') callId: string,
    @Body() body: { endedBy: string; duration?: number; endReason?: string },
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.callsClient, CALLS_PATTERNS.END_CALL, {
      callId,
      userId: body.endedBy,
      duration: body.duration,
      endReason: body.endReason,
    });
  }

  // ============================================
  // Notifications Endpoints
  // ============================================

  @Post('notifications/push')
  async sendPushNotification(
    @Body()
    body: {
      userIds: string[];
      title: string;
      body: string;
      data?: any;
    },
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.notificationsClient, NOTIFICATIONS_PATTERNS.SEND_PUSH, body);
  }

  @Post('notifications/call')
  async sendCallNotification(
    @Body()
    body: {
      userIds: string[];
      callerName: string;
      callType: string;
      callId: string;
      conversationId: string;
    },
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.send(this.notificationsClient, NOTIFICATIONS_PATTERNS.SEND_PUSH, {
      userIds: body.userIds,
      title: `Incoming ${body.callType} call`,
      body: `${body.callerName} is calling you`,
      data: {
        type: 'incoming_call',
        callId: body.callId,
        callType: body.callType,
        conversationId: body.conversationId,
      },
      priority: 'high',
    });
  }
}
