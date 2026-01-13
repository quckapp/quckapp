import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChannelsService } from './channels.service';
import { CreateChannelDto, UpdateChannelDto, UpdateMemberPreferencesDto, PinMessageDto } from './dto';
import { Channel, ChannelType, ChannelStatus } from './schemas/channel.schema';
import { ChannelMember, ChannelMemberRole } from './schemas/channel-member.schema';

@ApiTags('Channels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Channel created', type: Channel })
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() createDto: CreateChannelDto,
    @Request() req: any,
  ): Promise<Channel> {
    return this.channelsService.create(workspaceId, createDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all channels in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'type', enum: ChannelType, required: false })
  @ApiQuery({ name: 'status', enum: ChannelStatus, required: false })
  @ApiResponse({ status: 200, description: 'List of channels', type: [Channel] })
  async findAll(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
    @Query('type') type?: ChannelType,
    @Query('status') status?: ChannelStatus,
  ): Promise<Channel[]> {
    return this.channelsService.findAll(workspaceId, req.user.id, { type, status });
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread counts for all channels' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Unread counts by channel' })
  async getUnreadCounts(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ): Promise<Record<string, number>> {
    return this.channelsService.getUnreadCounts(workspaceId, req.user.id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get channel by slug' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'slug', description: 'Channel slug' })
  @ApiResponse({ status: 200, description: 'Channel details', type: Channel })
  async findBySlug(
    @Param('workspaceId') workspaceId: string,
    @Param('slug') slug: string,
    @Request() req: any,
  ): Promise<Channel> {
    return this.channelsService.findBySlug(workspaceId, slug, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get channel by ID' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel details', type: Channel })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<Channel> {
    return this.channelsService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel updated', type: Channel })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateChannelDto,
    @Request() req: any,
  ): Promise<Channel> {
    return this.channelsService.update(id, updateDto, req.user.id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel archived', type: Channel })
  async archive(@Param('id') id: string, @Request() req: any): Promise<Channel> {
    return this.channelsService.archive(id, req.user.id);
  }

  @Post(':id/unarchive')
  @ApiOperation({ summary: 'Unarchive channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel unarchived', type: Channel })
  async unarchive(@Param('id') id: string, @Request() req: any): Promise<Channel> {
    return this.channelsService.unarchive(id, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 204, description: 'Channel deleted' })
  async delete(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.channelsService.delete(id, req.user.id);
  }

  // Member management
  @Get(':id/members')
  @ApiOperation({ summary: 'Get channel members' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'List of members' })
  async getMembers(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ members: ChannelMember[]; total: number }> {
    return this.channelsService.getMembers(id, { limit, offset });
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 201, description: 'Member added', type: ChannelMember })
  async addMember(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { userId: string; role?: ChannelMemberRole },
    @Request() req: any,
  ): Promise<ChannelMember> {
    return this.channelsService.addMember(id, body.userId, body.role, workspaceId, req.user.id);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ): Promise<void> {
    return this.channelsService.removeMember(id, userId, req.user.id);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 201, description: 'Joined channel', type: ChannelMember })
  async join(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ChannelMember> {
    return this.channelsService.addMember(id, req.user.id, ChannelMemberRole.MEMBER, workspaceId);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 204, description: 'Left channel' })
  async leave(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.channelsService.removeMember(id, req.user.id, req.user.id);
  }

  @Put(':id/preferences')
  @ApiOperation({ summary: 'Update channel preferences' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Preferences updated', type: ChannelMember })
  async updatePreferences(
    @Param('id') id: string,
    @Body() preferences: UpdateMemberPreferencesDto,
    @Request() req: any,
  ): Promise<ChannelMember> {
    return this.channelsService.updateMemberPreferences(id, req.user.id, preferences);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark channel as read' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Marked as read' })
  async markAsRead(
    @Param('id') id: string,
    @Body() body: { messageId?: string },
    @Request() req: any,
  ): Promise<ChannelMember> {
    return this.channelsService.markAsRead(id, req.user.id, body.messageId);
  }

  @Post(':id/pin')
  @ApiOperation({ summary: 'Pin a message to channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Message pinned', type: Channel })
  async pinMessage(
    @Param('id') id: string,
    @Body() body: PinMessageDto,
    @Request() req: any,
  ): Promise<Channel> {
    return this.channelsService.pinMessage(id, body.messageId, req.user.id);
  }

  @Delete(':id/pin/:messageId')
  @ApiOperation({ summary: 'Unpin a message from channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message unpinned', type: Channel })
  async unpinMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Request() req: any,
  ): Promise<Channel> {
    return this.channelsService.unpinMessage(id, messageId, req.user.id);
  }
}

// Also expose at /channels for direct access
@ApiTags('Channels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('channels')
export class ChannelsDirectController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get channel by ID (direct access)' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel details', type: Channel })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<Channel> {
    return this.channelsService.findOne(id, req.user.id);
  }

  @Get('health')
  @ApiOperation({ summary: 'Channels health check' })
  @ApiResponse({ status: 200, description: 'Service healthy' })
  async health(): Promise<{ status: string }> {
    return { status: 'healthy' };
  }
}
