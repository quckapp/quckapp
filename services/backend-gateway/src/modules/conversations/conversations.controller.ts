import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { MessagesService } from '../messages/messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from '../../common/services/ai.service';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@ApiTags('Conversations')
@ApiBearerAuth('JWT-auth')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(
    private conversationsService: ConversationsService,
    private messagesService: MessagesService,
    private aiService: AiService,
  ) {}

  @Post('single')
  async createSingleConversation(
    @Request() req: AuthRequest,
    @Body('recipientId') recipientId: string,
  ) {
    return this.conversationsService.createSingleConversation(req.user.userId, recipientId);
  }

  @Post('group')
  async createGroupConversation(
    @Request() req: AuthRequest,
    @Body('name') name: string,
    @Body('participantIds') participantIds: string[],
    @Body('description') description?: string,
  ) {
    return this.conversationsService.createGroupConversation(
      req.user.userId,
      name,
      participantIds,
      description,
    );
  }

  @Get()
  async getUserConversations(@Request() req: AuthRequest) {
    return this.conversationsService.getUserConversations(req.user.userId);
  }

  @Get(':id')
  async getConversation(@Param('id') id: string) {
    return this.conversationsService.findById(id);
  }

  @Put(':id')
  async updateConversation(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() updates: any,
  ) {
    return this.conversationsService.updateConversation(id, req.user.userId, updates);
  }

  @Put(':id/participants')
  async addParticipants(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body('participantIds') participantIds: string[],
  ) {
    return this.conversationsService.addParticipants(id, req.user.userId, participantIds);
  }

  @Delete(':id/participants/:participantId')
  async removeParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @Request() req: AuthRequest,
  ) {
    return this.conversationsService.removeParticipant(id, req.user.userId, participantId);
  }

  @Put(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body('messageId') messageId: string,
  ) {
    await this.conversationsService.markAsRead(id, req.user.userId, messageId);
    return { success: true };
  }

  @Put(':id/mute')
  async toggleMute(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body('isMuted') isMuted: boolean,
  ) {
    await this.conversationsService.toggleMute(id, req.user.userId, isMuted);
    return { success: true };
  }

  @Delete(':id/messages')
  async clearMessages(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.messagesService.clearConversationMessages(id);
    return { success: true };
  }

  @Delete(':id')
  async deleteConversation(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.conversationsService.deleteConversation(id, req.user.userId);
    return { success: true };
  }

  @Put('read-all')
  async markAllAsRead(@Request() req: AuthRequest) {
    await this.conversationsService.markAllAsRead(req.user.userId);
    return { success: true };
  }

  @Get('ai-search')
  async aiSearch(@Request() req: AuthRequest, @Query('query') query: string) {
    if (!query || query.trim() === '') {
      return { results: [], message: 'Query parameter is required' };
    }

    try {
      const conversations = await this.conversationsService.getUserConversations(req.user.userId);
      const results = await this.aiService.searchConversations(
        query,
        conversations,
        req.user.userId,
      );
      return { results, count: results.length };
    } catch (error) {
      return {
        results: [],
        error: error.message,
        message: 'AI search is not available. Please configure OPENAI_API_KEY in your environment.',
      };
    }
  }

  // Message Pinning Endpoints
  @Post(':id/pin/:messageId')
  async pinMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Request() req: AuthRequest,
  ) {
    return this.conversationsService.pinMessage(id, req.user.userId, messageId);
  }

  @Delete(':id/pin/:messageId')
  async unpinMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Request() req: AuthRequest,
  ) {
    return this.conversationsService.unpinMessage(id, req.user.userId, messageId);
  }

  @Get(':id/pinned')
  async getPinnedMessages(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.conversationsService.getPinnedMessages(id, req.user.userId);
  }

  // Disappearing Messages Endpoints
  @Put(':id/disappearing-messages')
  async setDisappearingMessages(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body('timer') timer: number,
  ) {
    return this.conversationsService.setDisappearingMessagesTimer(id, req.user.userId, timer);
  }

  @Get(':id/disappearing-messages')
  async getDisappearingMessagesSettings(@Param('id') id: string) {
    const timer = await this.conversationsService.getDisappearingMessagesTimer(id);
    return {
      enabled: timer > 0,
      timer,
      timerLabel:
        timer === 0
          ? 'Off'
          : timer === 86400
            ? '24 hours'
            : timer === 604800
              ? '7 days'
              : '30 days',
    };
  }
}
