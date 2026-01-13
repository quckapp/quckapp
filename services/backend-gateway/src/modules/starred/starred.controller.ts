import { Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { StarredService } from './starred.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@Controller('starred')
@UseGuards(JwtAuthGuard)
export class StarredController {
  constructor(private starredService: StarredService) {}

  @Post(':messageId')
  async starMessage(
    @Param('messageId') messageId: string,
    @Request() req: AuthRequest,
    @Query('conversationId') conversationId: string,
  ) {
    return this.starredService.starMessage(req.user.userId, messageId, conversationId);
  }

  @Delete(':messageId')
  async unstarMessage(@Param('messageId') messageId: string, @Request() req: AuthRequest) {
    await this.starredService.unstarMessage(req.user.userId, messageId);
    return { success: true };
  }

  @Get()
  async getStarredMessages(@Request() req: AuthRequest) {
    return this.starredService.getStarredMessages(req.user.userId);
  }

  @Get('conversation/:conversationId')
  async getStarredMessagesByConversation(
    @Param('conversationId') conversationId: string,
    @Request() req: AuthRequest,
  ) {
    return this.starredService.getStarredMessagesByConversation(req.user.userId, conversationId);
  }
}
