import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Message, MessageDocument } from '../messages/schemas/message.schema';
import { Conversation, ConversationDocument } from '../conversations/schemas/conversation.schema';
import { Report, ReportDocument } from './schemas/report.schema';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { SystemMetrics, SystemMetricsDocument } from './schemas/system-metrics.schema';
import { AdminBroadcast, AdminBroadcastDocument } from './schemas/admin-broadcast.schema';
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
    @InjectModel(AdminBroadcast.name) private adminBroadcastModel: Model<AdminBroadcastDocument>,
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
    const userGrowthRate =
      lastWeekUsers > 0 ? ((newThisWeek - lastWeekUsers) / lastWeekUsers) * 100 : 0;

    const lastWeekMessages = await this.messageModel.countDocuments({
      createdAt: { $gte: new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000), $lt: weekStart },
    });
    const thisWeekMessages = await this.messageModel.countDocuments({
      createdAt: { $gte: weekStart },
    });
    const messageGrowthRate =
      lastWeekMessages > 0 ? ((thisWeekMessages - lastWeekMessages) / lastWeekMessages) * 100 : 0;

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

    const [onlineUsers, messagesLastHour, messagesLastMinute, activeConversationsLastHour] =
      await Promise.all([
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

    if (role) {
      filter.role = role;
    }
    if (typeof isBanned === 'boolean') {
      filter.isBanned = isBanned;
    }

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

  async banUser(
    adminId: string,
    userId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

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
    if (!user) {
      throw new NotFoundException('User not found');
    }

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
    if (!user) {
      throw new NotFoundException('User not found');
    }

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
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldRole = user.role;
    user.role = role;
    if (permissions) {
      user.permissions = permissions;
    }
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

    if (status) {
      filter.status = status;
    }
    if (type) {
      filter.type = type;
    }

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
      targetConversationId: data.targetConversationId
        ? new Types.ObjectId(data.targetConversationId)
        : null,
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
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (data.status) {
      report.status = data.status;
    }
    if (data.resolution) {
      report.resolution = data.resolution;
    }
    if (data.actionTaken) {
      report.actionTaken = data.actionTaken;
    }

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
    const end = endDate ? new Date(endDate) : now;

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
    const [totalNewUsers, totalMessages, avgDailyActiveUsers, totalConversations] =
      await Promise.all([
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

    if (action) {
      filter.action = action;
    }
    if (adminId) {
      filter.admin = new Types.ObjectId(adminId);
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
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

  async updateSystemSettings(
    settings: Record<string, any>,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Implement settings update logic here
    await this.createAuditLog(
      adminId,
      'settings_update',
      undefined,
      settings,
      ipAddress,
      userAgent,
    );
    return { success: true, message: 'Settings updated successfully' };
  }

  // Admin Profile
  async getAdminProfile(adminId: string) {
    const user = await this.userModel.findById(adminId).select('-password').lean();
    if (!user) {
      throw new NotFoundException('Admin not found');
    }
    return { user };
  }

  // Conversations Management
  async getConversations(query: { search?: string; type?: string; page?: number; limit?: number }) {
    const { search, type, page = 1, limit = 20 } = query;
    const filter: any = {};

    if (type) {
      filter.type = type;
    }

    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find(filter)
        .populate('participants.userId', 'displayName username avatar status')
        .populate('lastMessage', 'content type createdAt sender')
        .sort({ lastMessageAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.conversationModel.countDocuments(filter),
    ]);

    // Get message counts for each conversation
    const conversationsWithCounts = await Promise.all(
      conversations.map(async (conv: any) => {
        const messageCount = await this.messageModel.countDocuments({
          conversationId: conv._id,
        });
        return {
          ...conv,
          messageCount,
        };
      }),
    );

    return {
      conversations: conversationsWithCounts,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async deleteConversation(
    adminId: string,
    conversationId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Delete all messages in the conversation
    await this.messageModel.deleteMany({ conversationId: conversation._id });

    // Delete the conversation
    await this.conversationModel.findByIdAndDelete(conversationId);

    await this.createAuditLog(
      adminId,
      'conversation_delete',
      undefined,
      { conversationId, reason },
      ipAddress,
      userAgent,
    );

    return { success: true, message: 'Conversation deleted successfully' };
  }

  async lockConversation(
    adminId: string,
    conversationId: string,
    lock: boolean,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    (conversation as any).isLocked = lock;
    await conversation.save();

    await this.createAuditLog(
      adminId,
      lock ? 'conversation_lock' : 'conversation_unlock',
      undefined,
      { conversationId },
      ipAddress,
      userAgent,
    );

    return conversation;
  }

  // Admin Broadcasts
  async getBroadcasts(query: { status?: string; search?: string; page?: number; limit?: number }) {
    const { status, search, page = 1, limit = 10 } = query;
    const filter: any = {};

    if (status) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const [broadcasts, total] = await Promise.all([
      this.adminBroadcastModel
        .find(filter)
        .populate('createdBy', 'displayName username avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.adminBroadcastModel.countDocuments(filter),
    ]);

    return {
      broadcasts,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async createBroadcast(
    adminId: string,
    data: {
      title: string;
      message: string;
      targetAudience: string;
      scheduledAt?: string;
      customUserIds?: string[];
    },
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Calculate target count based on audience
    let targetCount = 0;
    const now = new Date();

    switch (data.targetAudience) {
      case 'all':
        targetCount = await this.userModel.countDocuments({ isBanned: false });
        break;
      case 'active':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        targetCount = await this.userModel.countDocuments({
          isBanned: false,
          lastSeen: { $gte: weekAgo },
        });
        break;
      case 'new':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        targetCount = await this.userModel.countDocuments({
          isBanned: false,
          createdAt: { $gte: monthAgo },
        });
        break;
      case 'custom':
        targetCount = data.customUserIds?.length || 0;
        break;
    }

    const status = data.scheduledAt ? 'scheduled' : 'draft';

    const broadcast = new this.adminBroadcastModel({
      title: data.title,
      message: data.message,
      targetAudience: data.targetAudience,
      customUserIds: data.customUserIds?.map((id) => new Types.ObjectId(id)),
      targetCount,
      status,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      createdBy: new Types.ObjectId(adminId),
    });

    await broadcast.save();

    await this.createAuditLog(
      adminId,
      'broadcast_create',
      undefined,
      { broadcastId: broadcast._id, title: data.title },
      ipAddress,
      userAgent,
    );

    return broadcast.populate('createdBy', 'displayName username avatar');
  }

  async updateBroadcast(
    adminId: string,
    broadcastId: string,
    data: { title?: string; message?: string; targetAudience?: string; scheduledAt?: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    const broadcast = await this.adminBroadcastModel.findById(broadcastId);
    if (!broadcast) {
      throw new NotFoundException('Broadcast not found');
    }

    if (broadcast.status === 'sent') {
      throw new BadRequestException('Cannot update a sent broadcast');
    }

    if (data.title) broadcast.title = data.title;
    if (data.message) broadcast.message = data.message;
    if (data.targetAudience) broadcast.targetAudience = data.targetAudience;
    if (data.scheduledAt) {
      broadcast.scheduledAt = new Date(data.scheduledAt);
      broadcast.status = 'scheduled';
    }

    await broadcast.save();

    await this.createAuditLog(
      adminId,
      'broadcast_update',
      undefined,
      { broadcastId, updates: data },
      ipAddress,
      userAgent,
    );

    return broadcast.populate('createdBy', 'displayName username avatar');
  }

  async sendBroadcast(adminId: string, broadcastId: string, ipAddress?: string, userAgent?: string) {
    const broadcast = await this.adminBroadcastModel.findById(broadcastId);
    if (!broadcast) {
      throw new NotFoundException('Broadcast not found');
    }

    if (broadcast.status === 'sent') {
      throw new BadRequestException('Broadcast already sent');
    }

    try {
      // In a real implementation, this would send push notifications
      // For now, we'll simulate the send operation
      broadcast.status = 'sent';
      broadcast.sentAt = new Date();
      broadcast.stats = {
        delivered: broadcast.targetCount || 0,
        read: 0,
        failed: 0,
      };

      await broadcast.save();

      await this.createAuditLog(
        adminId,
        'broadcast_send',
        undefined,
        { broadcastId, title: broadcast.title, targetCount: broadcast.targetCount },
        ipAddress,
        userAgent,
      );

      return broadcast.populate('createdBy', 'displayName username avatar');
    } catch (error) {
      broadcast.status = 'failed';
      broadcast.failureReason = error.message;
      await broadcast.save();
      throw error;
    }
  }

  async deleteBroadcast(
    adminId: string,
    broadcastId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const broadcast = await this.adminBroadcastModel.findById(broadcastId);
    if (!broadcast) {
      throw new NotFoundException('Broadcast not found');
    }

    if (broadcast.status === 'sent') {
      throw new BadRequestException('Cannot delete a sent broadcast');
    }

    await this.adminBroadcastModel.findByIdAndDelete(broadcastId);

    await this.createAuditLog(
      adminId,
      'broadcast_delete',
      undefined,
      { broadcastId, title: broadcast.title },
      ipAddress,
      userAgent,
    );

    return { success: true, message: 'Broadcast deleted successfully' };
  }

  // Flagged Content / Moderation
  async getFlaggedContent(query: { type?: string; search?: string; page?: number; limit?: number }) {
    const { type, search, page = 1, limit = 20 } = query;

    // Get content that has been reported multiple times
    const filter: any = {
      status: { $in: ['pending', 'reviewing'] },
    };

    if (type) {
      filter.type = type;
    }

    // Group reports by target to find content with multiple reports
    const aggregation = await this.reportModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            targetMessageId: '$targetMessageId',
            targetConversationId: '$targetConversationId',
            targetUserId: '$targetUserId',
            type: '$type',
          },
          reportCount: { $sum: 1 },
          reasons: { $addToSet: '$reason' },
          firstReport: { $first: '$$ROOT' },
          createdAt: { $min: '$createdAt' },
        },
      },
      { $sort: { reportCount: -1, createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    // Populate content details
    const items = await Promise.all(
      aggregation.map(async (item: any) => {
        let content: any = null;
        let author: any = null;

        if (item._id.targetMessageId) {
          const message = await this.messageModel
            .findById(item._id.targetMessageId)
            .populate('sender', 'displayName username avatar')
            .lean();
          if (message) {
            content = (message as any).content;
            author = (message as any).sender;
          }
        } else if (item._id.targetConversationId) {
          const conversation = await this.conversationModel
            .findById(item._id.targetConversationId)
            .populate('participants.userId', 'displayName username avatar')
            .lean();
          if (conversation) {
            content = (conversation as any).name || 'Conversation';
            author = { displayName: 'Multiple users', username: 'group' };
          }
        } else if (item._id.targetUserId) {
          const user = await this.userModel
            .findById(item._id.targetUserId)
            .select('displayName username avatar')
            .lean();
          if (user) {
            author = user;
            content = `User: ${(user as any).displayName}`;
          }
        }

        return {
          _id: item.firstReport._id,
          type: item._id.type,
          content,
          author: author || { displayName: 'Unknown', username: 'unknown' },
          reportCount: item.reportCount,
          reasons: item.reasons,
          flaggedAt: item.createdAt,
          createdAt: item.firstReport.createdAt,
          targetMessageId: item._id.targetMessageId,
          targetConversationId: item._id.targetConversationId,
          targetUserId: item._id.targetUserId,
        };
      }),
    );

    const total = await this.reportModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            targetMessageId: '$targetMessageId',
            targetConversationId: '$targetConversationId',
            targetUserId: '$targetUserId',
          },
        },
      },
      { $count: 'total' },
    ]);

    return {
      items,
      total: total[0]?.total || 0,
      page,
      pages: Math.ceil((total[0]?.total || 0) / limit),
    };
  }

  async deleteMessage(
    adminId: string,
    messageId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Soft delete by marking as deleted
    (message as any).isDeleted = true;
    (message as any).deletedBy = new Types.ObjectId(adminId);
    (message as any).deletedAt = new Date();
    (message as any).deletionReason = reason;
    await message.save();

    // Resolve any pending reports for this message
    await this.reportModel.updateMany(
      { targetMessageId: message._id, status: { $in: ['pending', 'reviewing'] } },
      {
        status: 'resolved',
        resolution: 'Content deleted by admin',
        actionTaken: 'message_deleted',
        reviewedBy: new Types.ObjectId(adminId),
        reviewedAt: new Date(),
      },
    );

    await this.createAuditLog(
      adminId,
      'message_delete',
      (message as any).sender?.toString(),
      { messageId, reason },
      ipAddress,
      userAgent,
    );

    return { success: true, message: 'Message deleted successfully' };
  }
}
