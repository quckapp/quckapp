/**
 * Huddle Controller - REST API Endpoints
 * SOLID: Single Responsibility - only handles HTTP requests
 * Dependency Inversion: Depends on service abstraction
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HuddleService } from './huddle.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateHuddleDto, JoinHuddleDto, UpdateParticipantDto, InviteToHuddleDto } from './dto/create-huddle.dto';
import { HuddleGateway } from './huddle.gateway';

@Controller('huddle')
@UseGuards(JwtAuthGuard)
export class HuddleController {
  constructor(
    private readonly huddleService: HuddleService,
    private readonly huddleGateway: HuddleGateway,
  ) {}

  /**
   * POST /huddle - Create a new huddle
   * Time Complexity: O(log n)
   */
  @Post()
  async createHuddle(@Req() req: any, @Body() dto: CreateHuddleDto) {
    const userId = req.user._id;
    return this.huddleService.createHuddle(userId, dto);
  }

  /**
   * POST /huddle/join - Join an existing huddle
   * Time Complexity: O(log n)
   */
  @Post('join')
  async joinHuddle(@Req() req: any, @Body() dto: JoinHuddleDto) {
    const userId = req.user._id;
    return this.huddleService.joinHuddle(userId, dto);
  }

  /**
   * POST /huddle/:roomId/leave - Leave a huddle
   * Time Complexity: O(n) where n = participants
   */
  @Post(':roomId/leave')
  async leaveHuddle(@Req() req: any, @Param('roomId') roomId: string) {
    const userId = req.user._id;
    return this.huddleService.leaveHuddle(userId, roomId);
  }

  /**
   * PUT /huddle/:roomId/participant - Update participant settings
   * Time Complexity: O(n) where n = participants
   */
  @Put(':roomId/participant')
  async updateParticipant(
    @Req() req: any,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateParticipantDto,
  ) {
    const userId = req.user._id;
    return this.huddleService.updateParticipant(userId, roomId, dto);
  }

  /**
   * GET /huddle/active/me - Get user's active huddle
   * Time Complexity: O(log n)
   * NOTE: Must be defined BEFORE :roomId routes to avoid route conflicts
   */
  @Get('active/me')
  async getMyActiveHuddle(@Req() req: any) {
    const userId = req.user._id;
    return this.huddleService.findActiveForUser(userId);
  }

  /**
   * GET /huddle/active/count - Get count of active huddles
   * Time Complexity: O(1)
   */
  @Get('active/count')
  async getActiveCount() {
    return this.huddleService.getActiveCount();
  }

  /**
   * GET /huddle/chat/:chatId - Get active huddles for a chat
   * Time Complexity: O(log n)
   */
  @Get('chat/:chatId')
  async getChatHuddles(@Param('chatId') chatId: string) {
    return this.huddleService.findActiveForChat(chatId);
  }

  /**
   * GET /huddle/history/me - Get user's huddle history
   * Time Complexity: O(n log n)
   */
  @Get('history/me')
  async getMyHistory(@Req() req: any, @Query('limit') limit?: number) {
    const userId = req.user._id;
    return this.huddleService.getHistory(userId, limit);
  }

  /**
   * GET /huddle/stats/me - Get user's huddle statistics
   * Time Complexity: O(n)
   */
  @Get('stats/me')
  async getMyStats(@Req() req: any) {
    const userId = req.user._id;
    return this.huddleService.getUserStats(userId);
  }

  /**
   * GET /huddle/:roomId - Get huddle details
   * Time Complexity: O(log n)
   * NOTE: Must be defined AFTER specific routes to avoid route conflicts
   */
  @Get(':roomId')
  async getHuddle(@Param('roomId') roomId: string) {
    return this.huddleService.findByRoomId(roomId);
  }

  /**
   * GET /huddle/:roomId/participants - Get active participants
   * Time Complexity: O(n) where n = participants
   */
  @Get(':roomId/participants')
  async getParticipants(@Param('roomId') roomId: string) {
    return this.huddleService.getActiveParticipants(roomId);
  }

  /**
   * DELETE /huddle/:roomId - End a huddle (admin/initiator only)
   * Time Complexity: O(1)
   */
  @Delete(':roomId')
  async endHuddle(@Param('roomId') roomId: string) {
    return this.huddleService.endHuddle(roomId);
  }

  /**
   * POST /huddle/force-leave - Force leave all active huddles for current user
   * Useful for clearing stuck huddle sessions
   * Time Complexity: O(n) where n = user's active huddles
   */
  @Post('force-leave')
  async forceLeaveAll(@Req() req: any) {
    const userId = req.user._id;
    return this.huddleService.forceLeaveAllHuddles(userId);
  }

  /**
   * POST /huddle/:roomId/invite - Invite users to join a huddle
   * Time Complexity: O(n) where n = number of invited users
   */
  @Post(':roomId/invite')
  async inviteToHuddle(
    @Req() req: any,
    @Param('roomId') roomId: string,
    @Body() dto: InviteToHuddleDto,
  ) {
    const userId = req.user._id;
    const result = await this.huddleService.inviteToHuddle(userId, roomId, dto.userIds);

    // Send socket notifications to invited users
    if (result.invited.length > 0) {
      this.huddleGateway.sendHuddleInvitation(
        result.invited,
        userId,
        {
          roomId: result.huddle.roomId,
          type: result.huddle.type,
          chatId: result.huddle.chatId?.toString(),
        },
      );
    }

    return {
      success: true,
      invited: result.invited,
      message: `Invited ${result.invited.length} user(s) to the huddle`,
    };
  }
}
