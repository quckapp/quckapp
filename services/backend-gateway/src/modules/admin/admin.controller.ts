import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard, SuperAdminGuard } from '../../common/guards/admin.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions, Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import {
  BanUserDto,
  CreateAdminBroadcastDto,
  CreateReportDto,
  DeleteContentDto,
  DeleteConversationDto,
  GetAdminBroadcastsDto,
  GetAnalyticsDto,
  GetAuditLogsDto,
  GetConversationsDto,
  GetFlaggedContentDto,
  GetReportsDto,
  GetUsersDto,
  LockConversationDto,
  UpdateAdminBroadcastDto,
  UpdateReportDto,
  UpdateSystemSettingsDto,
  UpdateUserRoleDto,
} from './dto/admin.dto';

interface AdminUser {
  _id: string;
  userId?: string;
  role: string;
  permissions: string[];
}

interface AuthenticatedRequest extends Omit<Request, 'user'> {
  user: AdminUser;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private getClientInfo(req: AuthenticatedRequest) {
    return {
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
  }

  // Dashboard
  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/realtime')
  async getRealTimeStats() {
    return this.adminService.getRealTimeStats();
  }

  // User Management
  @Get('users')
  @UseGuards(PermissionsGuard)
  @Permissions('manage_users')
  async getUsers(@Query() query: GetUsersDto) {
    return this.adminService.getUsers(query);
  }

  @Post('users/:userId/ban')
  @UseGuards(PermissionsGuard)
  @Permissions('ban_users')
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Param('userId') userId: string,
    @Body() body: BanUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.adminService.banUser(req.user._id, userId, body.reason, ipAddress, userAgent);
  }

  @Post('users/:userId/unban')
  @UseGuards(PermissionsGuard)
  @Permissions('ban_users')
  @HttpCode(HttpStatus.OK)
  async unbanUser(@Param('userId') userId: string, @Req() req: AuthenticatedRequest) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.adminService.unbanUser(req.user._id, userId, ipAddress, userAgent);
  }

  @Post('users/:userId/verify')
  @UseGuards(PermissionsGuard)
  @Permissions('manage_users')
  @HttpCode(HttpStatus.OK)
  async verifyUser(@Param('userId') userId: string, @Req() req: AuthenticatedRequest) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.adminService.verifyUser(req.user._id, userId, ipAddress, userAgent);
  }

  @Patch('users/:userId/role')
  @UseGuards(SuperAdminGuard)
  async updateUserRole(
    @Param('userId') userId: string,
    @Body() body: UpdateUserRoleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.adminService.updateUserRole(
      req.user._id,
      userId,
      body.role,
      body.permissions,
      ipAddress,
      userAgent,
    );
  }

  // Reports
  @Get('reports')
  @UseGuards(PermissionsGuard)
  @Permissions('manage_reports')
  async getReports(@Query() query: GetReportsDto) {
    return this.adminService.getReports(query);
  }

  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  async createReport(@Body() body: CreateReportDto, @Req() req: AuthenticatedRequest) {
    return this.adminService.createReport(req.user._id, body);
  }

  @Patch('reports/:reportId')
  @UseGuards(PermissionsGuard)
  @Permissions('manage_reports')
  async updateReport(
    @Param('reportId') reportId: string,
    @Body() body: UpdateReportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.adminService.updateReport(req.user._id, reportId, body, ipAddress, userAgent);
  }

  // Analytics
  @Get('analytics')
  @UseGuards(PermissionsGuard)
  @Permissions('view_analytics')
  async getAnalytics(@Query() query: GetAnalyticsDto) {
    return this.adminService.getAnalytics(query);
  }

  // Audit Logs
  @Get('audit-logs')
  @UseGuards(PermissionsGuard)
  @Permissions('view_audit_logs')
  async getAuditLogs(@Query() query: GetAuditLogsDto) {
    return this.adminService.getAuditLogs(query);
  }

  // System
  @Get('system/health')
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Post('system/clear-cache')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async clearCache() {
    return this.adminService.clearCache();
  }

  @Patch('system/settings')
  @UseGuards(SuperAdminGuard)
  async updateSystemSettings(
    @Body() body: UpdateSystemSettingsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.adminService.updateSystemSettings(body, req.user._id, ipAddress, userAgent);
  }

  // Admin Profile
  @Get('profile')
  async getAdminProfile(@Req() req: AuthenticatedRequest) {
    return this.adminService.getAdminProfile(req.user._id);
  }

  // Conversations Management
  @Get('conversations')
  @UseGuards(PermissionsGuard)
  @Permissions('manage_users')
  async getConversations(@Query() query: GetConversationsDto) {
    return this.adminService.getConversations(query);
  }

  @Delete('conversations/:conversationId')
  @UseGuards(PermissionsGuard)
  @Permissions('delete_content')
  async deleteConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: DeleteConversationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.adminService.deleteConversation(
      req.user._id,
      conversationId,
      body.reason,
      ipAddress,
      userAgent,
    );
  }

  @Patch('conversations/:conversationId/lock')
  @UseGuards(PermissionsGuard)
  @Permissions('manage_users')
  async lockConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: LockConversationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.adminService.lockConversation(
      req.user._id,
      conversationId,
      body.lock,
      ipAddress,
      userAgent,
    );
  }

  // Admin Broadcasts
  @Get('broadcasts')
  async getBroadcasts(@Query() query: GetAdminBroadcastsDto) {
    return this.adminService.getBroadcasts(query);
  }

  @Post('broadcasts')
  @HttpCode(HttpStatus.CREATED)
  async createBroadcast(
    @Body() body: CreateAdminBroadcastDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.adminService.createBroadcast(req.user._id, body, ipAddress, userAgent);
  }

  @Patch('broadcasts/:broadcastId')
  async updateBroadcast(
    @Param('broadcastId') broadcastId: string,
    @Body() body: UpdateAdminBroadcastDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.adminService.updateBroadcast(req.user._id, broadcastId, body, ipAddress, userAgent);
  }

  @Post('broadcasts/:broadcastId/send')
  @HttpCode(HttpStatus.OK)
  async sendBroadcast(
    @Param('broadcastId') broadcastId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.adminService.sendBroadcast(req.user._id, broadcastId, ipAddress, userAgent);
  }

  @Delete('broadcasts/:broadcastId')
  async deleteBroadcast(
    @Param('broadcastId') broadcastId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.adminService.deleteBroadcast(req.user._id, broadcastId, ipAddress, userAgent);
  }

  // Flagged Content / Moderation
  @Get('moderation/flagged')
  @UseGuards(PermissionsGuard)
  @Permissions('delete_content')
  async getFlaggedContent(@Query() query: GetFlaggedContentDto) {
    return this.adminService.getFlaggedContent(query);
  }

  @Delete('messages/:messageId')
  @UseGuards(PermissionsGuard)
  @Permissions('delete_content')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Body() body: DeleteContentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.adminService.deleteMessage(
      req.user._id,
      messageId,
      body.reason,
      ipAddress,
      userAgent,
    );
  }
}
