import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, timeout } from 'rxjs';
import { SERVICES } from '../../../shared/constants/services';
import {
  CONVERSATIONS_PATTERNS,
  MESSAGES_PATTERNS,
} from '../../../shared/contracts/message-patterns';
import {
  ConversationDto,
  CreateConversationDto,
  MessageDto,
  PaginatedResponseDto,
  ServiceResponseDto,
  UpdateConversationDto,
} from '../../../shared/dto';

/**
 * Conversations Gateway Controller
 * Routes conversation requests to Conversations Microservice
 */
@Controller('conversations')
export class ConversationsGatewayController {
  constructor(
    @Inject(SERVICES.CONVERSATIONS_SERVICE) private conversationsClient: ClientProxy,
    @Inject(SERVICES.MESSAGES_SERVICE) private messagesClient: ClientProxy,
  ) {}

  /**
   * Create a new conversation
   */
  @Post()
  async createConversation(
    @Req() req: any,
    @Body() dto: Omit<CreateConversationDto, 'creatorId'>,
  ): Promise<ServiceResponseDto<ConversationDto>> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.CREATE_CONVERSATION, {
      ...dto,
      creatorId: req.user?.userId,
    });
  }

  /**
   * Get user's conversations
   */
  @Get()
  async getConversations(
    @Req() req: any,
    @Query() query: { limit?: number; offset?: number; includeArchived?: boolean },
  ): Promise<ServiceResponseDto<PaginatedResponseDto<ConversationDto>>> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.GET_USER_CONVERSATIONS, {
      userId: req.user?.userId,
      ...query,
    });
  }

  /**
   * Get conversation by ID
   */
  @Get(':id')
  async getConversation(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ServiceResponseDto<ConversationDto>> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.GET_CONVERSATION, {
      conversationId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Update conversation
   */
  @Put(':id')
  async updateConversation(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateConversationDto,
  ): Promise<ServiceResponseDto<ConversationDto>> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.UPDATE_CONVERSATION, {
      conversationId: id,
      userId: req.user?.userId,
      ...dto,
    });
  }

  /**
   * Delete conversation (for user)
   */
  @Delete(':id')
  async deleteConversation(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.DELETE_CONVERSATION, {
      conversationId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Get or create direct conversation
   */
  @Post('direct/:userId')
  async getOrCreateDirect(
    @Param('userId') targetUserId: string,
    @Req() req: any,
  ): Promise<ServiceResponseDto<ConversationDto>> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.GET_OR_CREATE_DIRECT, {
      userId1: req.user?.userId,
      userId2: targetUserId,
    });
  }

  /**
   * Get conversation messages
   */
  @Get(':id/messages')
  async getMessages(
    @Param('id') id: string,
    @Req() req: any,
    @Query() query: { limit?: number; before?: string; after?: string },
  ): Promise<ServiceResponseDto<PaginatedResponseDto<MessageDto>>> {
    return this.sendToMessages(MESSAGES_PATTERNS.GET_MESSAGES, {
      conversationId: id,
      userId: req.user?.userId,
      ...query,
    });
  }

  /**
   * Get pinned messages
   */
  @Get(':id/pinned')
  async getPinnedMessages(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ServiceResponseDto<MessageDto[]>> {
    return this.sendToMessages(MESSAGES_PATTERNS.GET_PINNED, {
      conversationId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Mark all messages as read
   */
  @Post(':id/read')
  async markAllRead(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.CLEAR_UNREAD, {
      conversationId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Get conversation participants
   */
  @Get(':id/participants')
  async getParticipants(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.GET_PARTICIPANTS, {
      conversationId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Add participant to group
   */
  @Post(':id/participants')
  async addParticipant(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: { userId: string },
  ): Promise<ServiceResponseDto> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.ADD_PARTICIPANT, {
      conversationId: id,
      addedBy: req.user?.userId,
      participantId: dto.userId,
    });
  }

  /**
   * Remove participant from group
   */
  @Delete(':id/participants/:userId')
  async removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ): Promise<ServiceResponseDto> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.REMOVE_PARTICIPANT, {
      conversationId: id,
      removedBy: req.user?.userId,
      participantId: userId,
    });
  }

  /**
   * Leave conversation
   */
  @Post(':id/leave')
  async leaveConversation(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.LEAVE_CONVERSATION, {
      conversationId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Archive conversation
   */
  @Post(':id/archive')
  async archiveConversation(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.ARCHIVE, {
      conversationId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Unarchive conversation
   */
  @Delete(':id/archive')
  async unarchiveConversation(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ServiceResponseDto> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.UNARCHIVE, {
      conversationId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Mute conversation
   */
  @Post(':id/mute')
  async muteConversation(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: { duration?: number },
  ): Promise<ServiceResponseDto> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.MUTE, {
      conversationId: id,
      userId: req.user?.userId,
      duration: dto.duration,
    });
  }

  /**
   * Unmute conversation
   */
  @Delete(':id/mute')
  async unmuteConversation(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.UNMUTE, {
      conversationId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Start typing indicator
   */
  @Post(':id/typing')
  async startTyping(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.TYPING_START, {
      conversationId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Stop typing indicator
   */
  @Delete(':id/typing')
  async stopTyping(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.TYPING_STOP, {
      conversationId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Get unread count
   */
  @Get('unread/count')
  async getUnreadCount(@Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToConversations(CONVERSATIONS_PATTERNS.GET_UNREAD_COUNT, {
      userId: req.user?.userId,
    });
  }

  private async sendToConversations<T>(pattern: string, data: any): Promise<ServiceResponseDto<T>> {
    try {
      const result = await firstValueFrom(
        this.conversationsClient.send<ServiceResponseDto<T>>(pattern, data).pipe(
          timeout(5000),
          catchError((err) => {
            throw new HttpException(
              {
                success: false,
                error: {
                  code: 'SERVICE_ERROR',
                  message: err.message || 'Conversations service error',
                },
              },
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          }),
        ),
      );
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'GATEWAY_ERROR',
            message: 'Failed to communicate with conversations service',
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async sendToMessages<T>(pattern: string, data: any): Promise<ServiceResponseDto<T>> {
    try {
      const result = await firstValueFrom(
        this.messagesClient.send<ServiceResponseDto<T>>(pattern, data).pipe(
          timeout(5000),
          catchError((err) => {
            throw new HttpException(
              {
                success: false,
                error: {
                  code: 'SERVICE_ERROR',
                  message: err.message || 'Messages service error',
                },
              },
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          }),
        ),
      );
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'GATEWAY_ERROR',
            message: 'Failed to communicate with messages service',
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
