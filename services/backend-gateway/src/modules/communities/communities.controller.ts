import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@Controller('communities')
@UseGuards(JwtAuthGuard)
export class CommunitiesController {
  constructor(private communitiesService: CommunitiesService) {}

  @Post()
  async createCommunity(
    @Request() req: AuthRequest,
    @Body('name') name: string,
    @Body('description') description?: string,
    @Body('avatar') avatar?: string,
  ) {
    return this.communitiesService.createCommunity(req.user.userId, name, description, avatar);
  }

  @Get()
  async getUserCommunities(@Request() req: AuthRequest) {
    return this.communitiesService.getUserCommunities(req.user.userId);
  }

  @Get(':id')
  async getCommunity(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.communitiesService.getCommunity(id, req.user.userId);
  }

  @Put(':id')
  async updateCommunity(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() updates: any,
  ) {
    return this.communitiesService.updateCommunity(id, req.user.userId, updates);
  }

  @Delete(':id')
  async deleteCommunity(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.communitiesService.deleteCommunity(id, req.user.userId);
    return { success: true };
  }

  @Post(':id/members')
  async addMembers(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body('memberIds') memberIds: string[],
  ) {
    return this.communitiesService.addMembers(id, req.user.userId, memberIds);
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req: AuthRequest,
  ) {
    await this.communitiesService.removeMember(id, req.user.userId, memberId);
    return { success: true };
  }

  @Post(':id/groups')
  async addGroup(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body('groupId') groupId: string,
  ) {
    return this.communitiesService.addGroup(id, req.user.userId, groupId);
  }

  @Delete(':id/groups/:groupId')
  async removeGroup(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Request() req: AuthRequest,
  ) {
    await this.communitiesService.removeGroup(id, req.user.userId, groupId);
    return { success: true };
  }
}
