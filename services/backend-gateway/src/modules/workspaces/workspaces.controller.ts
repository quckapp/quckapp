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
import { WorkspacesService } from './workspaces.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  InviteMemberDto,
  BulkInviteMembersDto,
  UpdateMemberRoleDto,
} from './dto';
import { Workspace, WorkspaceStatus } from './schemas/workspace.schema';
import { WorkspaceMember, WorkspaceRole, MemberStatus } from './schemas/workspace-member.schema';

@ApiTags('Workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully', type: Workspace })
  async create(@Body() createDto: CreateWorkspaceDto, @Request() req: any): Promise<Workspace> {
    return this.workspacesService.create(createDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workspaces for current user' })
  @ApiQuery({ name: 'status', enum: WorkspaceStatus, required: false })
  @ApiResponse({ status: 200, description: 'List of workspaces', type: [Workspace] })
  async findAll(
    @Request() req: any,
    @Query('status') status?: WorkspaceStatus,
  ): Promise<Workspace[]> {
    return this.workspacesService.findAll(req.user.id, { status });
  }

  @Get('join/:inviteCode')
  @ApiOperation({ summary: 'Get workspace info by invite code' })
  @ApiParam({ name: 'inviteCode', description: 'Workspace invite code' })
  @ApiResponse({ status: 200, description: 'Workspace info', type: Workspace })
  async getByInviteCode(@Param('inviteCode') inviteCode: string): Promise<Workspace> {
    return this.workspacesService.findByInviteCode(inviteCode);
  }

  @Post('join/:inviteCode')
  @ApiOperation({ summary: 'Join workspace using invite code' })
  @ApiParam({ name: 'inviteCode', description: 'Workspace invite code' })
  @ApiResponse({ status: 201, description: 'Joined workspace', type: WorkspaceMember })
  async joinByInviteCode(
    @Param('inviteCode') inviteCode: string,
    @Request() req: any,
  ): Promise<WorkspaceMember> {
    return this.workspacesService.joinByInviteCode(inviteCode, req.user.id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get workspace by slug' })
  @ApiParam({ name: 'slug', description: 'Workspace URL slug' })
  @ApiResponse({ status: 200, description: 'Workspace details', type: Workspace })
  async findBySlug(@Param('slug') slug: string): Promise<Workspace> {
    return this.workspacesService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace by ID' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workspace details', type: Workspace })
  async findOne(@Param('id') id: string): Promise<Workspace> {
    return this.workspacesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workspace updated', type: Workspace })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkspaceDto,
    @Request() req: any,
  ): Promise<Workspace> {
    return this.workspacesService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 204, description: 'Workspace deleted' })
  async delete(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.workspacesService.delete(id, req.user.id);
  }

  // Member management endpoints
  @Get(':id/members')
  @ApiOperation({ summary: 'Get workspace members' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiQuery({ name: 'role', enum: WorkspaceRole, required: false })
  @ApiQuery({ name: 'status', enum: MemberStatus, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'List of members' })
  async getMembers(
    @Param('id') id: string,
    @Query('role') role?: WorkspaceRole,
    @Query('status') status?: MemberStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ members: WorkspaceMember[]; total: number }> {
    return this.workspacesService.getMembers(id, { role, status, limit, offset });
  }

  @Get(':id/members/:userId')
  @ApiOperation({ summary: 'Get specific member' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Member details', type: WorkspaceMember })
  async getMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<WorkspaceMember | null> {
    return this.workspacesService.getMember(id, userId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Member added', type: WorkspaceMember })
  async addMember(
    @Param('id') id: string,
    @Body() body: { userId: string; role?: WorkspaceRole },
    @Request() req: any,
  ): Promise<WorkspaceMember> {
    return this.workspacesService.addMember(id, body.userId, body.role, req.user.id);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite member by email' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  async inviteMember(
    @Param('id') id: string,
    @Body() inviteDto: InviteMemberDto,
    @Request() req: any,
  ): Promise<WorkspaceMember> {
    return this.workspacesService.inviteMember(id, inviteDto, req.user.id);
  }

  @Put(':id/members/:userId/role')
  @ApiOperation({ summary: 'Update member role' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Role updated', type: WorkspaceMember })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateDto: UpdateMemberRoleDto,
    @Request() req: any,
  ): Promise<WorkspaceMember> {
    return this.workspacesService.updateMemberRole(id, userId, updateDto, req.user.id);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ): Promise<void> {
    return this.workspacesService.removeMember(id, userId, req.user.id);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 204, description: 'Left workspace' })
  async leaveWorkspace(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.workspacesService.removeMember(id, req.user.id, req.user.id);
  }

  @Post(':id/invite-code/regenerate')
  @ApiOperation({ summary: 'Regenerate workspace invite code' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'New invite code' })
  async regenerateInviteCode(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ inviteCode: string }> {
    const inviteCode = await this.workspacesService.regenerateInviteCode(id, req.user.id);
    return { inviteCode };
  }

  @Post(':id/transfer-ownership')
  @ApiOperation({ summary: 'Transfer workspace ownership' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Ownership transferred' })
  async transferOwnership(
    @Param('id') id: string,
    @Body() body: { newOwnerId: string },
    @Request() req: any,
  ): Promise<{ success: boolean }> {
    await this.workspacesService.transferOwnership(id, body.newOwnerId, req.user.id);
    return { success: true };
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Workspace health check' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workspace is healthy' })
  async healthCheck(@Param('id') id: string): Promise<{ status: string }> {
    await this.workspacesService.findOne(id);
    return { status: 'healthy' };
  }
}
