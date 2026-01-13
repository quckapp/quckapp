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
import { ScheduledMessagesService } from './scheduled-messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateScheduledMessageDto, UpdateScheduledMessageDto } from './dto';

interface AuthRequest extends Request {
  user: { userId: string; phoneNumber: string };
}

@Controller('scheduled-messages')
@UseGuards(JwtAuthGuard)
export class ScheduledMessagesController {
  constructor(private scheduledMessagesService: ScheduledMessagesService) {}

  @Post()
  async scheduleMessage(@Request() req: AuthRequest, @Body() createDto: CreateScheduledMessageDto) {
    return this.scheduledMessagesService.scheduleMessage(
      req.user.userId,
      createDto.conversationId,
      createDto.type,
      new Date(createDto.scheduledAt),
      createDto.content,
      createDto.attachments,
      createDto.replyTo,
      createDto.metadata,
    );
  }

  @Get()
  async getUserScheduledMessages(@Request() req: AuthRequest, @Query('status') status?: string) {
    return this.scheduledMessagesService.getUserScheduledMessages(req.user.userId, status);
  }

  @Get('conversation/:conversationId')
  async getConversationScheduledMessages(
    @Request() req: AuthRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.scheduledMessagesService.getConversationScheduledMessages(
      conversationId,
      req.user.userId,
    );
  }

  @Get(':id')
  async getScheduledMessage(@Param('id') id: string) {
    return this.scheduledMessagesService.findById(id);
  }

  @Put(':id')
  async updateScheduledMessage(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() updateDto: UpdateScheduledMessageDto,
  ) {
    return this.scheduledMessagesService.updateScheduledMessage(id, req.user.userId, {
      ...updateDto,
      scheduledAt: updateDto.scheduledAt ? new Date(updateDto.scheduledAt) : undefined,
    });
  }

  @Put(':id/cancel')
  async cancelScheduledMessage(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.scheduledMessagesService.cancelScheduledMessage(id, req.user.userId);
  }

  @Delete(':id')
  async deleteScheduledMessage(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.scheduledMessagesService.deleteScheduledMessage(id, req.user.userId);
    return { success: true };
  }
}
