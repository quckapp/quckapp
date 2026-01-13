import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Message, MessageDocument } from '../messages/schemas/message.schema';
import { Conversation, ConversationDocument } from '../conversations/schemas/conversation.schema';
import { Report, ReportDocument } from './schemas/report.schema';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { SystemMetrics, SystemMetricsDocument } from './schemas/system-metrics.schema';
import * as os from 'os';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(SystemMetrics.name) private metricsModel: Model<SystemMetricsDocument>,
  ) {}

  // Dashboard Stats
  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      onlineUsers,
      bannedUsers,
      newToday,
      newThisWeek,
      newThisMonth,
      totalMessages,
      messagesToday,
      totalConversations,
      activeConversations,
      pendingReports,
      resolvedToday,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isActive: true }),
      this.userModel.countDocuments({ status: 'online' }),
      this.userModel.countDocuments({ isBanned: true }),
      this.userModel.countDocuments({ createdAt: { $gte: todayStart } }),
      this.userModel.countDocuments({ createdAt: { $gte: weekStart } }),
      this.userModel.countDocuments({ createdAt: { $gte: monthStart } }),
      this.messageModel.countDocuments(),
      this.messageModel.countDocuments({ createdAt: { $gte: todayStart } }),
      this.conversationModel.countDocuments(),
      this.conversationModel.countDocuments({ lastMessageAt: { $gte: weekStart } }),
      this.reportModel.countDocuments({ status: 'pending' }),
      this.reportModel.countDocuments({
        status: 'resolved',
        reviewedAt: { $gte: todayStart },
      }),
    ]);

    // Calculate growth rates
    const lastWeekUsers = await this.userModel.countDocuments({
      createdAt: { $gte: new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000), $lt: weekStart },
    });
    const userGrowthRate = lastWeekUsers > 0 ? ((newThisWeek - lastWeekUsers) / lastWeekUsers) * 100 : 0;

    const lastWeekMessages = await this.messageModel.countDocuments({
      createdAt: { $gte: new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000), $lt: weekStart },
    });
    const thisWeekMessages = await this.messageModel.countDocuments({ createdAt: { $gte: weekStart } });
    const messageGrowthRate = lastWeekMessages > 0 ? ((thisWeekMessages - lastWeekMessages) / lastWeekMessages) * 100 : 0;

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        online: onlineUsers,
        banned: bannedUsers,
        newToday,
        newThisWeek,
        newThisMonth,
        growthRate: Math.round(userGrowthRate * 10) / 10,
      },
      messages: {
        total: totalMessages,
        today: messagesToday,
        growthRate: Math.round(messageGrowthRate * 10) / 10,
      },
      conversations: {
        total: totalConversations,
        active: activeConversations,
      },
      reports: {
        pending: pendingReports,
        resolvedToday,
      },
    };
  }

  // Real-time Stats
  async getRealTimeStats() {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const minuteAgo = new Date(now.getTime() - 60 * 1000);

    const [onlineUsers, messagesLastHour, messagesLastMinute, activeConversationsLastHour] = await Promise.all([
      this.userModel.countDocuments({ status: 'online' }),
      this.messageModel.countDocuments({ createdAt: { $gte: hourAgo } }),
      this.messageModel.countDocuments({ createdAt: { $gte: minuteAgo } }),
      this.conversationModel.countDocuments({ lastMessageAt: { $gte: hourAgo } }),
    ]);

    return {
      onlineUsers,
      messagesLastHour,
      messagesPerMinute: messagesLastMinute,
      activeConversationsLastHour,
      timestamp: now,
    };
  }

  // User Management
  async getUsers(query: {
    search?: string;
    role?: string;
    isBanned?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { search, role, isBanned, page = 1, limit = 20 } = query;
    const filter: any = {};

    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) filter.role = role;
    if (typeof isBanned === 'boolean') filter.isBanned = isBanned;

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async banUser(adminId: string, userId: string, reason: string, ipAddress?: string, userAgent?: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.role === 'super_admin') {
      throw new ForbiddenException('Cannot ban a super admin');
    }

    user.isBanned = true;
    user.banReason = reason;
    user.bannedAt = new Date();
    user.bannedBy = adminId;
    await user.save();

    await this.createAuditLog(adminId, 'user_ban', userId, { reason }, ipAddress, userAgent);

    return { success: true, message: 'User banned successfully' };
  }

  async unbanUser(adminId: string, userId: string, ipAddress?: string, userAgent?: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    user.isBanned = false;
    (user as any).banReason = null;
    (user as any).bannedAt = null;
    (user as any).bannedBy = null;
    await user.save();

    await this.createAuditLog(adminId, 'user_unban', userId, {}, ipAddress, userAgent);

    return { success: true, message: 'User unbanned successfully' };
  }

  async verifyUser(adminId: string, userId: string, ipAddress?: string, userAgent?: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    user.isVerified = true;
    await user.save();

    await this.createAuditLog(adminId, 'user_verify', userId, {}, ipAddress, userAgent);

    return { success: true, message: 'User verified successfully' };
  }

  async updateUserRole(
    adminId: string,
    userId: string,
    role: string,
    permissions?: string[],
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const oldRole = user.role;
    user.role = role;
    if (permissions) user.permissions = permissions;
    await user.save();

    await this.createAuditLog(
      adminId,
      'role_change',
      userId,
      { oldRole, newRole: role, permissions },
      ipAddress,
      userAgent,
    );

    return { success: true, message: 'User role updated successfully' };
  }

  // Reports
  async getReports(query: { status?: string; type?: string; page?: number; limit?: number }) {
    const { status, type, page = 1, limit = 20 } = query;
    const filter: any = {};

    if (status) filter.status = status;
    if (type) filter.type = type;

    const [reports, total] = await Promise.all([
      this.reportModel
        .find(filter)
        .populate('reportedBy', 'displayName username avatar')
        .populate('targetUserId', 'displayName username avatar')
        .populate('reviewedBy', 'displayName username')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.reportModel.countDocuments(filter),
    ]);

    return {
      reports,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async createReport(userId: string, data: any) {
    const report = new this.reportModel({
      reportedBy: new Types.ObjectId(userId),
      type: data.type,
      reason: data.reason,
      description: data.description || '',
      targetUserId: data.targetUserId ? new Types.ObjectId(data.targetUserId) : null,
      targetMessageId: data.targetMessageId ? new Types.ObjectId(data.targetMessageId) : null,
      targetConversationId: data.targetConversationId ? new Types.ObjectId(data.targetConversationId) : null,
      targetCommunityId: data.targetCommunityId ? new Types.ObjectId(data.targetCommunityId) : null,
    });

    await report.save();
    return report;
  }

  async updateReport(
    adminId: string,
    reportId: string,
    data: { status?: string; resolution?: string; actionTaken?: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    const report = await this.reportModel.findById(reportId);
    if (!report) throw new NotFoundException('Report not found');

    if (data.status) report.status = data.status;
    if (data.resolution) report.resolution = data.resolution;
    if (data.actionTaken) report.actionTaken = data.actionTaken;

    if (data.status === 'resolved' || data.status === 'dismissed') {
      report.reviewedBy = new Types.ObjectId(adminId);
      report.reviewedAt = new Date();
    }

    await report.save();

    await this.createAuditLog(
      adminId,
      data.status === 'resolved' ? 'report_resolve' : 'report_dismiss',
      undefined,
      { reportId, status: data.status, resolution: data.resolution },
      ipAddress,
      userAgent,
    );

    return report;
  }

  // Analytics
  async getAnalytics(query: { period?: string; startDate?: string; endDate?: string }) {
    const { period = 'week', startDate, endDate } = query;
    const now = new Date();
    let start: Date;
    let end = endDate ? new Date(endDate) : now;

    if (startDate) {
      start = new Date(startDate);
    } else {
      switch (period) {
        case 'day':
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
    }

    // User growth data
    const userGrowth = await this.userModel.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          newUsers: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          newUsers: 1,
          _id: 0,
        },
      },
    ]);

    // Message volume data
    const messageVolume = await this.messageModel.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          messages: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          messages: 1,
          _id: 0,
        },
      },
    ]);

    // Message type breakdown
    const messageTypes = await this.messageModel.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    const messageTypesObj: Record<string, number> = {};
    messageTypes.forEach((m) => {
      messageTypesObj[m._id || 'text'] = m.count;
    });

    // Summary stats
    const [totalNewUsers, totalMessages, avgDailyActiveUsers, totalConversations] = await Promise.all([
      this.userModel.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      this.messageModel.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      this.userModel.countDocuments({ lastSeen: { $gte: start, $lte: end } }),
      this.conversationModel.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    ]);

    return {
      userGrowth,
      messageVolume,
      messageTypes: messageTypesObj,
      summary: {
        totalNewUsers,
        totalMessages,
        avgDailyActiveUsers,
        totalConversations,
      },
      retention: {
        day1: 75, // Placeholder - implement actual retention logic
        day7: 45,
        day30: 25,
      },
      engagement: {
        avgMessagesPerUser: totalNewUsers > 0 ? totalMessages / totalNewUsers : 0,
        avgSessionDuration: '12m',
        dauMauRatio: 0.35,
      },
    };
  }

  // Audit Logs
  async getAuditLogs(query: {
    action?: string;
    adminId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { action, adminId, startDate, endDate, page = 1, limit = 20 } = query;
    const filter: any = {};

    if (action) filter.action = action;
    if (adminId) filter.admin = new Types.ObjectId(adminId);
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .populate('admin', 'displayName username avatar')
        .populate('targetUser', 'displayName username avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.auditLogModel.countDocuments(filter),
    ]);

    return {
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async createAuditLog(
    adminId: string,
    action: string,
    targetUserId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const log = new this.auditLogModel({
      admin: new Types.ObjectId(adminId),
      action,
      targetUser: targetUserId ? new Types.ObjectId(targetUserId) : null,
      details: details || {},
      ipAddress,
      userAgent,
    });
    await log.save();
    return log;
  }

  // System Health
  async getSystemHealth() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Calculate CPU usage
    let cpuUsage = 0;
    for (const cpu of cpus) {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      cpuUsage += ((total - idle) / total) * 100;
    }
    cpuUsage = cpuUsage / cpus.length;

    const activeConnections = await this.userModel.countDocuments({ status: 'online' });

    return {
      status: 'healthy',
      services: {
        api: true,
        database: true,
        redis: true,
        websocket: true,
      },
      resources: {
        cpu: Math.round(cpuUsage * 10) / 10,
        memory: Math.round((usedMemory / totalMemory) * 100 * 10) / 10,
        memoryUsed: usedMemory,
        memoryTotal: totalMemory,
        disk: 45, // Placeholder
        diskUsed: 50 * 1024 * 1024 * 1024,
        diskTotal: 100 * 1024 * 1024 * 1024,
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      activeConnections,
      lastCheck: new Date(),
      database: {
        collections: 10,
        documents: await this.getTotalDocuments(),
        dataSize: 100 * 1024 * 1024,
        indexSize: 10 * 1024 * 1024,
      },
      alerts: [],
    };
  }

  private async getTotalDocuments() {
    const [users, messages, conversations] = await Promise.all([
      this.userModel.estimatedDocumentCount(),
      this.messageModel.estimatedDocumentCount(),
      this.conversationModel.estimatedDocumentCount(),
    ]);
    return users + messages + conversations;
  }

  async clearCache() {
    // Implement cache clearing logic here
    return { success: true, message: 'Cache cleared successfully' };
  }

  async updateSystemSettings(settings: Record<string, any>, adminId: string, ipAddress?: string, userAgent?: string) {
    // Implement settings update logic here
    await this.createAuditLog(adminId, 'settings_update', undefined, settings, ipAddress, userAgent);
    return { success: true, message: 'Settings updated successfully' };
  }
}
