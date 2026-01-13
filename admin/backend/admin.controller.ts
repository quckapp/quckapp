import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard, SuperAdminGuard } from '../../common/guards/admin.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles, Permissions } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import {
  GetUsersDto,
  BanUserDto,
  UpdateUserRoleDto,
  GetReportsDto,
  UpdateReportDto,
  CreateReportDto,
  GetAnalyticsDto,
  GetAuditLogsDto,
  UpdateSystemSettingsDto,
} from './dto/admin.dto';

interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    role: string;
    permissions: string[];
  };
}

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private getClientInfo(req: Request) {
    return {
      ipAddress: req.ip || req.connection.remoteAddress,
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
}
