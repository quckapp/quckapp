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
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@ApiTags('Messages')
@ApiBearerAuth('JWT-auth')
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get('conversation/:conversationId')
  async getConversationMessages(
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
  ) {
    return this.messagesService.getConversationMessages(
      conversationId,
      limit ? parseInt(limit.toString()) : 50,
      before,
    );
  }

  @Get(':id')
  async getMessage(@Param('id') id: string) {
    return this.messagesService.findById(id);
  }

  @Put(':id')
  async editMessage(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body('content') content: string,
  ) {
    return this.messagesService.editMessage(id, req.user.userId, content);
  }

  @Delete(':id')
  async deleteMessage(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.messagesService.deleteMessage(id, req.user.userId);
  }

  @Post(':id/reactions')
  async addReaction(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body('emoji') emoji: string,
  ) {
    return this.messagesService.addReaction(id, req.user.userId, emoji);
  }

  @Delete(':id/reactions/:emoji')
  async removeReaction(
    @Param('id') id: string,
    @Param('emoji') emoji: string,
    @Request() req: AuthRequest,
  ) {
    return this.messagesService.removeReaction(id, req.user.userId, emoji);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.messagesService.addReadReceipt(id, req.user.userId);
    return { success: true };
  }

  @Get('search/query')
  async searchMessages(
    @Request() req: AuthRequest,
    @Query('q') query: string,
    @Query('conversationId') conversationId?: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.messagesService.searchMessages(req.user.userId, query, {
      conversationId,
      limit: limit ? parseInt(limit.toString()) : 20,
      skip: skip ? parseInt(skip.toString()) : 0,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
