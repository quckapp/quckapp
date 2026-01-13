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
import { MESSAGES_PATTERNS } from '../../../shared/contracts/message-patterns';
import {
  MessageDto,
  PaginatedResponseDto,
  ScheduleMessageDto,
  SearchMessagesDto,
  SendMessageDto,
  ServiceResponseDto,
} from '../../../shared/dto';

/**
 * Messages Gateway Controller
 * Routes message requests to Messages Microservice
 */
@Controller('messages')
export class MessagesGatewayController {
  constructor(@Inject(SERVICES.MESSAGES_SERVICE) private messagesClient: ClientProxy) {}

  /**
   * Send a message
   */
  @Post()
  async sendMessage(
    @Req() req: any,
    @Body() dto: Omit<SendMessageDto, 'senderId'>,
  ): Promise<ServiceResponseDto<MessageDto>> {
    return this.sendToService(MESSAGES_PATTERNS.SEND_MESSAGE, {
      ...dto,
      senderId: req.user?.userId,
    });
  }

  /**
   * Get message by ID
   */
  @Get(':id')
  async getMessage(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ServiceResponseDto<MessageDto>> {
    return this.sendToService(MESSAGES_PATTERNS.GET_MESSAGE, {
      messageId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Edit a message
   */
  @Put(':id')
  async editMessage(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: { content: string },
  ): Promise<ServiceResponseDto<MessageDto>> {
    return this.sendToService(MESSAGES_PATTERNS.EDIT_MESSAGE, {
      messageId: id,
      userId: req.user?.userId,
      content: dto.content,
    });
  }

  /**
   * Delete a message
   */
  @Delete(':id')
  async deleteMessage(
    @Param('id') id: string,
    @Req() req: any,
    @Query('type') deleteType: 'for_me' | 'for_everyone' = 'for_me',
  ): Promise<ServiceResponseDto> {
    return this.sendToService(MESSAGES_PATTERNS.DELETE_MESSAGE, {
      messageId: id,
      userId: req.user?.userId,
      deleteType,
    });
  }

  /**
   * Search messages
   */
  @Get('search/query')
  async searchMessages(
    @Req() req: any,
    @Query() query: Omit<SearchMessagesDto, 'userId'>,
  ): Promise<ServiceResponseDto<PaginatedResponseDto<MessageDto>>> {
    return this.sendToService(MESSAGES_PATTERNS.SEARCH_MESSAGES, {
      ...query,
      userId: req.user?.userId,
    });
  }

  /**
   * Mark message as read
   */
  @Post(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(MESSAGES_PATTERNS.MARK_READ, {
      messageId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Add reaction to message
   */
  @Post(':id/reactions')
  async addReaction(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: { reaction: string },
  ): Promise<ServiceResponseDto> {
    return this.sendToService(MESSAGES_PATTERNS.ADD_REACTION, {
      messageId: id,
      userId: req.user?.userId,
      reaction: dto.reaction,
    });
  }

  /**
   * Remove reaction from message
   */
  @Delete(':id/reactions/:reaction')
  async removeReaction(
    @Param('id') id: string,
    @Param('reaction') reaction: string,
    @Req() req: any,
  ): Promise<ServiceResponseDto> {
    return this.sendToService(MESSAGES_PATTERNS.REMOVE_REACTION, {
      messageId: id,
      userId: req.user?.userId,
      reaction,
    });
  }

  /**
   * Pin a message
   */
  @Post(':id/pin')
  async pinMessage(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: { conversationId: string },
  ): Promise<ServiceResponseDto> {
    return this.sendToService(MESSAGES_PATTERNS.PIN_MESSAGE, {
      messageId: id,
      userId: req.user?.userId,
      conversationId: dto.conversationId,
    });
  }

  /**
   * Unpin a message
   */
  @Delete(':id/pin')
  async unpinMessage(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(MESSAGES_PATTERNS.UNPIN_MESSAGE, {
      messageId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Star a message
   */
  @Post(':id/star')
  async starMessage(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(MESSAGES_PATTERNS.STAR_MESSAGE, {
      messageId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Unstar a message
   */
  @Delete(':id/star')
  async unstarMessage(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(MESSAGES_PATTERNS.UNSTAR_MESSAGE, {
      messageId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Get starred messages
   */
  @Get('starred/list')
  async getStarred(
    @Req() req: any,
    @Query() query: { limit?: number; offset?: number },
  ): Promise<ServiceResponseDto<PaginatedResponseDto<MessageDto>>> {
    return this.sendToService(MESSAGES_PATTERNS.GET_STARRED, {
      userId: req.user?.userId,
      ...query,
    });
  }

  /**
   * Schedule a message
   */
  @Post('schedule')
  async scheduleMessage(
    @Req() req: any,
    @Body() dto: Omit<ScheduleMessageDto, 'senderId'>,
  ): Promise<ServiceResponseDto> {
    return this.sendToService(MESSAGES_PATTERNS.SCHEDULE_MESSAGE, {
      ...dto,
      senderId: req.user?.userId,
    });
  }

  /**
   * Get scheduled messages
   */
  @Get('scheduled/list')
  async getScheduled(@Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(MESSAGES_PATTERNS.GET_SCHEDULED, {
      userId: req.user?.userId,
    });
  }

  /**
   * Cancel scheduled message
   */
  @Delete('scheduled/:id')
  async cancelScheduled(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(MESSAGES_PATTERNS.CANCEL_SCHEDULED, {
      scheduledMessageId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Helper method to send requests to Messages service
   */
  private async sendToService<T>(pattern: string, data: any): Promise<ServiceResponseDto<T>> {
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
