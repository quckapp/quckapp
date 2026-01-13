import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  AnalyticsEvent,
  AnalyticsEventDocument,
  AppMetrics,
  AppMetricsDocument,
  RetentionCohort,
  RetentionCohortDocument,
  UserMetrics,
  UserMetricsDocument,
  UserSession,
  UserSessionDocument,
} from './schemas/analytics.schema';
import { SERVICES } from '../../shared/constants/services';
import {
  ERROR_CODES,
  errorResponse,
  successResponse,
} from '../../shared/utils/service-response.util';
import {
  IPaginatedResponse,
  IServiceResponse,
} from '../../shared/interfaces/microservice.interface';
import * as crypto from 'crypto';

interface AnalyticsEventDto {
  id: string;
  userId: string;
  eventType: string;
  eventName: string;
  properties: Record<string, any>;
  sessionId?: string;
  deviceInfo: Record<string, any>;
  location: Record<string, any>;
  timestamp: Date;
}

interface UserSessionDto {
  id: string;
  sessionId: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date;
  duration: number;
  eventCount: number;
  messagesSent: number;
  messagesReceived: number;
  callsMade: number;
  callDuration: number;
  mediaUploaded: number;
  screensViewed: string[];
  featuresUsed: string[];
  deviceInfo: Record<string, any>;
  isActive: boolean;
}

/**
 * Analytics Service Handler
 * Business logic for analytics operations with MongoDB
 */
@Injectable()
export class AnalyticsServiceHandler {
  private readonly logger = new Logger(AnalyticsServiceHandler.name);

  constructor(
    @InjectModel(AnalyticsEvent.name) private analyticsEventModel: Model<AnalyticsEventDocument>,
    @InjectModel(UserSession.name) private userSessionModel: Model<UserSessionDocument>,
    @InjectModel(UserMetrics.name) private userMetricsModel: Model<UserMetricsDocument>,
    @InjectModel(AppMetrics.name) private appMetricsModel: Model<AppMetricsDocument>,
    @InjectModel(RetentionCohort.name) private retentionCohortModel: Model<RetentionCohortDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {}

  private toEventDto(doc: AnalyticsEventDocument): AnalyticsEventDto {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      eventType: doc.eventType,
      eventName: doc.eventName,
      properties: doc.properties,
      sessionId: doc.sessionId,
      deviceInfo: doc.deviceInfo,
      location: doc.location,
      timestamp: doc.timestamp,
    };
  }

  private toSessionDto(doc: UserSessionDocument): UserSessionDto {
    return {
      id: doc._id.toString(),
      sessionId: doc.sessionId,
      userId: doc.userId.toString(),
      startedAt: doc.startedAt,
      endedAt: doc.endedAt,
      duration: doc.duration,
      eventCount: doc.eventCount,
      messagesSent: doc.messagesSent,
      messagesReceived: doc.messagesReceived,
      callsMade: doc.callsMade,
      callDuration: doc.callDuration,
      mediaUploaded: doc.mediaUploaded,
      screensViewed: doc.screensViewed,
      featuresUsed: doc.featuresUsed,
      deviceInfo: doc.deviceInfo,
      isActive: doc.isActive,
    };
  }

  async trackEvent(dto: {
    userId: string;
    eventType: string;
    eventName: string;
    properties?: Record<string, any>;
    sessionId?: string;
    conversationId?: string;
    messageId?: string;
    callId?: string;
    deviceInfo?: Record<string, any>;
    location?: Record<string, any>;
  }): Promise<IServiceResponse<AnalyticsEventDto>> {
    try {
      const event = new this.analyticsEventModel({
        userId: new Types.ObjectId(dto.userId),
        eventType: dto.eventType,
        eventName: dto.eventName,
        properties: dto.properties || {},
        sessionId: dto.sessionId,
        conversationId: dto.conversationId ? new Types.ObjectId(dto.conversationId) : null,
        messageId: dto.messageId ? new Types.ObjectId(dto.messageId) : null,
        callId: dto.callId ? new Types.ObjectId(dto.callId) : null,
        deviceInfo: dto.deviceInfo || {},
        location: dto.location || {},
        timestamp: new Date(),
      });

      const saved = await event.save();

      // Update session event count if sessionId provided
      if (dto.sessionId) {
        await this.userSessionModel.findOneAndUpdate(
          { sessionId: dto.sessionId },
          { $inc: { eventCount: 1 } },
        );
      }

      this.logger.debug(`Event tracked: ${dto.eventType} for user ${dto.userId}`);

      return successResponse(this.toEventDto(saved), SERVICES.ANALYTICS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to track event: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }

  async trackBatch(dto: {
    events: Array<{
      userId: string;
      eventType: string;
      eventName: string;
      properties?: Record<string, any>;
      sessionId?: string;
      deviceInfo?: Record<string, any>;
      timestamp?: Date;
    }>;
  }): Promise<IServiceResponse<{ tracked: number }>> {
    try {
      const eventsToInsert = dto.events.map((e) => ({
        userId: new Types.ObjectId(e.userId),
        eventType: e.eventType,
        eventName: e.eventName,
        properties: e.properties || {},
        sessionId: e.sessionId,
        deviceInfo: e.deviceInfo || {},
        location: {},
        timestamp: e.timestamp || new Date(),
      }));

      const result = await this.analyticsEventModel.insertMany(eventsToInsert);

      this.logger.log(`Batch tracked: ${result.length} events`);

      return successResponse({ tracked: result.length }, SERVICES.ANALYTICS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to track batch: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }

  async startSession(dto: {
    userId: string;
    deviceInfo?: Record<string, any>;
    location?: string;
  }): Promise<IServiceResponse<UserSessionDto>> {
    try {
      // End any existing active sessions for this user
      await this.userSessionModel.updateMany(
        { userId: new Types.ObjectId(dto.userId), isActive: true },
        {
          $set: {
            isActive: false,
            endedAt: new Date(),
          },
        },
      );

      const sessionId = crypto.randomBytes(16).toString('hex');
      const now = new Date();

      const session = new this.userSessionModel({
        userId: new Types.ObjectId(dto.userId),
        sessionId,
        startedAt: now,
        deviceInfo: dto.deviceInfo || {},
        location: dto.location,
        isActive: true,
      });

      const saved = await session.save();

      // Track app_open event
      await this.trackEvent({
        userId: dto.userId,
        eventType: 'app_open',
        eventName: 'App Opened',
        sessionId,
        deviceInfo: dto.deviceInfo,
      });

      this.logger.log(`Session started: ${sessionId} for user ${dto.userId}`);

      return successResponse(this.toSessionDto(saved), SERVICES.ANALYTICS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to start session: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }

  async endSession(dto: {
    sessionId: string;
    userId: string;
  }): Promise<IServiceResponse<UserSessionDto>> {
    try {
      const session = await this.userSessionModel.findOne({ sessionId: dto.sessionId });

      if (!session) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Session not found',
          SERVICES.ANALYTICS_SERVICE,
        );
      }

      const now = new Date();
      session.endedAt = now;
      session.isActive = false;
      session.duration = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);

      const updated = await session.save();

      // Track app_close event
      await this.trackEvent({
        userId: dto.userId,
        eventType: 'app_close',
        eventName: 'App Closed',
        sessionId: dto.sessionId,
        properties: { duration: session.duration },
      });

      this.logger.log(`Session ended: ${dto.sessionId} (duration: ${session.duration}s)`);

      return successResponse(this.toSessionDto(updated), SERVICES.ANALYTICS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to end session: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }

  async updateSession(dto: {
    sessionId: string;
    userId: string;
    incrementMessagesSent?: number;
    incrementMessagesReceived?: number;
    incrementCallsMade?: number;
    addCallDuration?: number;
    incrementMediaUploaded?: number;
    screenViewed?: string;
    featureUsed?: string;
  }): Promise<IServiceResponse<{ updated: boolean }>> {
    try {
      const updates: any = {};
      const pushUpdates: any = {};

      if (dto.incrementMessagesSent) {
        updates.messagesSent = dto.incrementMessagesSent;
      }
      if (dto.incrementMessagesReceived) {
        updates.messagesReceived = dto.incrementMessagesReceived;
      }
      if (dto.incrementCallsMade) {
        updates.callsMade = dto.incrementCallsMade;
      }
      if (dto.addCallDuration) {
        updates.callDuration = dto.addCallDuration;
      }
      if (dto.incrementMediaUploaded) {
        updates.mediaUploaded = dto.incrementMediaUploaded;
      }
      if (dto.screenViewed) {
        pushUpdates.screensViewed = dto.screenViewed;
      }
      if (dto.featureUsed) {
        pushUpdates.featuresUsed = dto.featureUsed;
      }

      const updateQuery: any = {};
      if (Object.keys(updates).length > 0) {
        updateQuery.$inc = updates;
      }
      if (Object.keys(pushUpdates).length > 0) {
        updateQuery.$addToSet = pushUpdates;
      }

      if (Object.keys(updateQuery).length > 0) {
        await this.userSessionModel.findOneAndUpdate({ sessionId: dto.sessionId }, updateQuery);
      }

      return successResponse({ updated: true }, SERVICES.ANALYTICS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to update session: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }

  async getUserMetrics(dto: {
    userId: string;
    period: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IServiceResponse<any>> {
    try {
      const query: any = {
        userId: new Types.ObjectId(dto.userId),
        period: dto.period,
      };

      if (dto.startDate) {
        query.periodStart = { $gte: dto.startDate };
      }
      if (dto.endDate) {
        query.periodEnd = { $lte: dto.endDate };
      }

      const metrics = await this.userMetricsModel
        .find(query)
        .sort({ periodStart: -1 })
        .limit(30)
        .exec();

      return successResponse(metrics, SERVICES.ANALYTICS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to get user metrics: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }

  async getAppMetrics(dto: {
    period: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IServiceResponse<any>> {
    try {
      const query: any = { period: dto.period };

      if (dto.startDate) {
        query.periodStart = { $gte: dto.startDate };
      }
      if (dto.endDate) {
        query.periodEnd = { $lte: dto.endDate };
      }

      const metrics = await this.appMetricsModel
        .find(query)
        .sort({ periodStart: -1 })
        .limit(30)
        .exec();

      return successResponse(metrics, SERVICES.ANALYTICS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to get app metrics: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }

  async getUserActivity(dto: {
    userId: string;
    limit?: number;
    offset?: number;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IServiceResponse<IPaginatedResponse<AnalyticsEventDto>>> {
    try {
      const limit = Math.min(dto.limit || 50, 100);
      const offset = dto.offset || 0;
      const page = Math.floor(offset / limit) + 1;

      const query: any = { userId: new Types.ObjectId(dto.userId) };

      if (dto.eventType) {
        query.eventType = dto.eventType;
      }
      if (dto.startDate || dto.endDate) {
        query.timestamp = {};
        if (dto.startDate) {
          query.timestamp.$gte = dto.startDate;
        }
        if (dto.endDate) {
          query.timestamp.$lte = dto.endDate;
        }
      }

      const [events, total] = await Promise.all([
        this.analyticsEventModel
          .find(query)
          .sort({ timestamp: -1 })
          .skip(offset)
          .limit(limit)
          .exec(),
        this.analyticsEventModel.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      return successResponse(
        {
          items: events.map((e) => this.toEventDto(e)),
          total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        SERVICES.ANALYTICS_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get user activity: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }

  async getUserSessions(dto: {
    userId: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IServiceResponse<IPaginatedResponse<UserSessionDto>>> {
    try {
      const limit = Math.min(dto.limit || 50, 100);
      const offset = dto.offset || 0;
      const page = Math.floor(offset / limit) + 1;

      const query: any = { userId: new Types.ObjectId(dto.userId) };

      if (dto.startDate || dto.endDate) {
        query.startedAt = {};
        if (dto.startDate) {
          query.startedAt.$gte = dto.startDate;
        }
        if (dto.endDate) {
          query.startedAt.$lte = dto.endDate;
        }
      }

      const [sessions, total] = await Promise.all([
        this.userSessionModel.find(query).sort({ startedAt: -1 }).skip(offset).limit(limit).exec(),
        this.userSessionModel.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      return successResponse(
        {
          items: sessions.map((s) => this.toSessionDto(s)),
          total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        SERVICES.ANALYTICS_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get user sessions: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }

  async getActiveUsers(dto: { period: string; date?: Date }): Promise<IServiceResponse<any>> {
    try {
      const date = dto.date || new Date();
      let startDate: Date;
      const endDate: Date = date;

      switch (dto.period) {
        case 'daily':
          startDate = new Date(date);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate = new Date(date);
          startDate.setDate(date.getDate() - 7);
          break;
        case 'monthly':
          startDate = new Date(date);
          startDate.setMonth(date.getMonth() - 1);
          break;
        default:
          startDate = new Date(date);
          startDate.setHours(0, 0, 0, 0);
      }

      const activeUsers = await this.analyticsEventModel.distinct('userId', {
        timestamp: { $gte: startDate, $lte: endDate },
      });

      return successResponse(
        {
          period: dto.period,
          startDate,
          endDate,
          activeUsers: activeUsers.length,
          userIds: activeUsers.map((id) => id.toString()),
        },
        SERVICES.ANALYTICS_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get active users: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }

  async getRetention(dto: { cohortDate: Date; period: string }): Promise<IServiceResponse<any>> {
    try {
      const retention = await this.retentionCohortModel.findOne({
        cohortDate: dto.cohortDate,
        period: dto.period,
      });

      if (!retention) {
        return successResponse(
          {
            cohortDate: dto.cohortDate,
            period: dto.period,
            cohortSize: 0,
            retention: [],
            activeUsers: [],
          },
          SERVICES.ANALYTICS_SERVICE,
        );
      }

      return successResponse(retention, SERVICES.ANALYTICS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to get retention: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }

  async getFeatureUsage(dto: {
    period: string;
    startDate?: Date;
    endDate?: Date;
    feature?: string;
  }): Promise<IServiceResponse<any>> {
    try {
      const matchStage: any = { eventType: 'feature_used' };

      if (dto.startDate || dto.endDate) {
        matchStage.timestamp = {};
        if (dto.startDate) {
          matchStage.timestamp.$gte = dto.startDate;
        }
        if (dto.endDate) {
          matchStage.timestamp.$lte = dto.endDate;
        }
      }

      if (dto.feature) {
        matchStage['properties.feature'] = dto.feature;
      }

      const pipeline: any[] = [
        { $match: matchStage },
        {
          $group: {
            _id: '$properties.feature',
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            feature: '$_id',
            count: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
          },
        },
        { $sort: { count: -1 as const } },
      ];

      const results = await this.analyticsEventModel.aggregate(pipeline);

      return successResponse(results, SERVICES.ANALYTICS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to get feature usage: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }

  async getDashboardSummary(dto: { period?: string }): Promise<IServiceResponse<any>> {
    try {
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      // Get active users
      const [dailyActive, weeklyActive, monthlyActive] = await Promise.all([
        this.analyticsEventModel.distinct('userId', { timestamp: { $gte: today } }),
        this.analyticsEventModel.distinct('userId', { timestamp: { $gte: weekAgo } }),
        this.analyticsEventModel.distinct('userId', { timestamp: { $gte: monthAgo } }),
      ]);

      // Get today's events breakdown
      const todayEvents = await this.analyticsEventModel.aggregate([
        { $match: { timestamp: { $gte: today } } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
      ]);

      // Get active sessions
      const activeSessions = await this.userSessionModel.countDocuments({ isActive: true });

      // Get latest app metrics
      const latestMetrics = await this.appMetricsModel
        .findOne({ period: 'daily' })
        .sort({ periodStart: -1 });

      return successResponse(
        {
          activeUsers: {
            daily: dailyActive.length,
            weekly: weeklyActive.length,
            monthly: monthlyActive.length,
          },
          activeSessions,
          todayEvents: todayEvents.reduce(
            (acc, e) => {
              acc[e._id] = e.count;
              return acc;
            },
            {} as Record<string, number>,
          ),
          latestMetrics,
          generatedAt: now,
        },
        SERVICES.ANALYTICS_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get dashboard summary: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }

  async aggregateUserMetrics(dto: {
    userId: string;
    period: string;
    date: Date;
  }): Promise<IServiceResponse<any>> {
    try {
      let periodStart: Date;
      let periodEnd: Date;

      switch (dto.period) {
        case 'daily':
          periodStart = new Date(dto.date);
          periodStart.setHours(0, 0, 0, 0);
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + 1);
          break;
        case 'weekly':
          periodStart = new Date(dto.date);
          periodStart.setDate(periodStart.getDate() - periodStart.getDay());
          periodStart.setHours(0, 0, 0, 0);
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + 7);
          break;
        case 'monthly':
          periodStart = new Date(dto.date.getFullYear(), dto.date.getMonth(), 1);
          periodEnd = new Date(dto.date.getFullYear(), dto.date.getMonth() + 1, 1);
          break;
        default:
          throw new Error('Invalid period');
      }

      // Aggregate events for the period
      const eventAggregation = await this.analyticsEventModel.aggregate([
        {
          $match: {
            userId: new Types.ObjectId(dto.userId),
            timestamp: { $gte: periodStart, $lt: periodEnd },
          },
        },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 },
          },
        },
      ]);

      const eventCounts = eventAggregation.reduce(
        (acc, e) => {
          acc[e._id] = e.count;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Aggregate sessions for the period
      const sessionAggregation = await this.userSessionModel.aggregate([
        {
          $match: {
            userId: new Types.ObjectId(dto.userId),
            startedAt: { $gte: periodStart, $lt: periodEnd },
          },
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            totalDuration: { $sum: '$duration' },
            totalMessagesSent: { $sum: '$messagesSent' },
            totalMessagesReceived: { $sum: '$messagesReceived' },
            totalCallsMade: { $sum: '$callsMade' },
            totalCallDuration: { $sum: '$callDuration' },
            totalMediaUploaded: { $sum: '$mediaUploaded' },
          },
        },
      ]);

      const sessionStats = sessionAggregation[0] || {
        totalSessions: 0,
        totalDuration: 0,
        totalMessagesSent: 0,
        totalMessagesReceived: 0,
        totalCallsMade: 0,
        totalCallDuration: 0,
        totalMediaUploaded: 0,
      };

      const metrics = await this.userMetricsModel.findOneAndUpdate(
        {
          userId: new Types.ObjectId(dto.userId),
          period: dto.period,
          periodStart,
        },
        {
          $set: {
            periodEnd,
            totalSessions: sessionStats.totalSessions,
            totalSessionDuration: sessionStats.totalDuration,
            avgSessionDuration:
              sessionStats.totalSessions > 0
                ? Math.round(sessionStats.totalDuration / sessionStats.totalSessions)
                : 0,
            messagesSent: sessionStats.totalMessagesSent,
            messagesReceived: sessionStats.totalMessagesReceived,
            callsMade: sessionStats.totalCallsMade,
            callDuration: sessionStats.totalCallDuration,
            mediaUploaded: sessionStats.totalMediaUploaded,
            contactsAdded: eventCounts['contact_added'] || 0,
            groupsJoined: eventCounts['group_joined'] || 0,
            groupsCreated: eventCounts['group_created'] || 0,
            notificationsReceived: eventCounts['notification_received'] || 0,
            notificationsClicked: eventCounts['notification_clicked'] || 0,
            searchCount: eventCounts['search_performed'] || 0,
            lastActiveAt: new Date(),
          },
        },
        { upsert: true, new: true },
      );

      return successResponse(metrics, SERVICES.ANALYTICS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to aggregate user metrics: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }

  async aggregateAppMetrics(dto: { period: string; date: Date }): Promise<IServiceResponse<any>> {
    try {
      let periodStart: Date;
      let periodEnd: Date;

      switch (dto.period) {
        case 'hourly':
          periodStart = new Date(dto.date);
          periodStart.setMinutes(0, 0, 0);
          periodEnd = new Date(periodStart);
          periodEnd.setHours(periodEnd.getHours() + 1);
          break;
        case 'daily':
          periodStart = new Date(dto.date);
          periodStart.setHours(0, 0, 0, 0);
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + 1);
          break;
        case 'weekly':
          periodStart = new Date(dto.date);
          periodStart.setDate(periodStart.getDate() - periodStart.getDay());
          periodStart.setHours(0, 0, 0, 0);
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + 7);
          break;
        case 'monthly':
          periodStart = new Date(dto.date.getFullYear(), dto.date.getMonth(), 1);
          periodEnd = new Date(dto.date.getFullYear(), dto.date.getMonth() + 1, 1);
          break;
        default:
          throw new Error('Invalid period');
      }

      // Get active users
      const activeUsers = await this.analyticsEventModel.distinct('userId', {
        timestamp: { $gte: periodStart, $lt: periodEnd },
      });

      // Get event counts
      const eventAggregation = await this.analyticsEventModel.aggregate([
        { $match: { timestamp: { $gte: periodStart, $lt: periodEnd } } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
      ]);

      const eventCounts = eventAggregation.reduce(
        (acc, e) => {
          acc[e._id] = e.count;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Get platform breakdown
      const platformBreakdown = await this.analyticsEventModel.aggregate([
        { $match: { timestamp: { $gte: periodStart, $lt: periodEnd } } },
        { $group: { _id: '$deviceInfo.platform', count: { $sum: 1 } } },
      ]);

      // Get session stats
      const sessionStats = await this.userSessionModel.aggregate([
        { $match: { startedAt: { $gte: periodStart, $lt: periodEnd } } },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            avgDuration: { $avg: '$duration' },
            totalCallDuration: { $sum: '$callDuration' },
          },
        },
      ]);

      const stats = sessionStats[0] || { totalSessions: 0, avgDuration: 0, totalCallDuration: 0 };

      const metrics = await this.appMetricsModel.findOneAndUpdate(
        { period: dto.period, periodStart },
        {
          $set: {
            periodEnd,
            activeUsers: activeUsers.length,
            totalSessions: stats.totalSessions,
            avgSessionDuration: Math.round(stats.avgDuration || 0),
            totalMessages:
              (eventCounts['message_sent'] || 0) + (eventCounts['message_received'] || 0),
            totalCalls: eventCounts['call_started'] || 0,
            totalCallDuration: stats.totalCallDuration,
            totalMediaUploads: eventCounts['media_uploaded'] || 0,
            groupsCreated: eventCounts['group_created'] || 0,
            notificationsSent: eventCounts['notification_received'] || 0,
            errorCount: eventCounts['error_occurred'] || 0,
            platformBreakdown: platformBreakdown.reduce(
              (acc, p) => {
                if (p._id) {
                  acc[p._id] = p.count;
                }
                return acc;
              },
              {} as Record<string, number>,
            ),
          },
        },
        { upsert: true, new: true },
      );

      return successResponse(metrics, SERVICES.ANALYTICS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to aggregate app metrics: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }

  async calculateRetention(dto: {
    cohortDate: Date;
    period: string;
  }): Promise<IServiceResponse<any>> {
    try {
      const cohortStart = new Date(dto.cohortDate);
      cohortStart.setHours(0, 0, 0, 0);

      const cohortEnd = new Date(cohortStart);
      cohortEnd.setDate(cohortEnd.getDate() + 1);

      // Get users who had their first event on the cohort date
      const cohortUsers = await this.analyticsEventModel.aggregate([
        {
          $group: {
            _id: '$userId',
            firstEvent: { $min: '$timestamp' },
          },
        },
        {
          $match: {
            firstEvent: { $gte: cohortStart, $lt: cohortEnd },
          },
        },
      ]);

      const cohortUserIds = cohortUsers.map((u) => u._id);
      const cohortSize = cohortUserIds.length;

      if (cohortSize === 0) {
        return successResponse(
          {
            cohortDate: cohortStart,
            period: dto.period,
            cohortSize: 0,
            retention: [],
            activeUsers: [],
          },
          SERVICES.ANALYTICS_SERVICE,
        );
      }

      // Calculate retention for each period
      const retention: number[] = [];
      const activeUsers: number[] = [];
      const periodsToCheck = dto.period === 'daily' ? 30 : dto.period === 'weekly' ? 12 : 6;

      for (let i = 0; i <= periodsToCheck; i++) {
        let checkStart: Date;
        let checkEnd: Date;

        if (dto.period === 'daily') {
          checkStart = new Date(cohortStart);
          checkStart.setDate(checkStart.getDate() + i);
          checkEnd = new Date(checkStart);
          checkEnd.setDate(checkEnd.getDate() + 1);
        } else if (dto.period === 'weekly') {
          checkStart = new Date(cohortStart);
          checkStart.setDate(checkStart.getDate() + i * 7);
          checkEnd = new Date(checkStart);
          checkEnd.setDate(checkEnd.getDate() + 7);
        } else {
          checkStart = new Date(cohortStart);
          checkStart.setMonth(checkStart.getMonth() + i);
          checkEnd = new Date(checkStart);
          checkEnd.setMonth(checkEnd.getMonth() + 1);
        }

        // Don't check future periods
        if (checkStart > new Date()) {
          break;
        }

        const activeInPeriod = await this.analyticsEventModel.distinct('userId', {
          userId: { $in: cohortUserIds },
          timestamp: { $gte: checkStart, $lt: checkEnd },
        });

        activeUsers.push(activeInPeriod.length);
        retention.push(Math.round((activeInPeriod.length / cohortSize) * 100));
      }

      const result = await this.retentionCohortModel.findOneAndUpdate(
        { cohortDate: cohortStart, period: dto.period },
        {
          $set: {
            cohortSize,
            retention,
            activeUsers,
          },
        },
        { upsert: true, new: true },
      );

      return successResponse(result, SERVICES.ANALYTICS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to calculate retention: ${error.message}`, error.stack);
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, SERVICES.ANALYTICS_SERVICE);
    }
  }
}
