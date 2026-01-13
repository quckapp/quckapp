import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AnalyticsServiceHandler } from './analytics-service.handler';

@Controller()
export class AnalyticsServiceController {
  private readonly logger = new Logger(AnalyticsServiceController.name);

  constructor(private readonly analyticsHandler: AnalyticsServiceHandler) {}

  @MessagePattern({ cmd: 'analytics.track_event' })
  async trackEvent(
    @Payload()
    data: {
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
    },
  ) {
    this.logger.debug(`Tracking event: ${data.eventType} for user ${data.userId}`);
    return this.analyticsHandler.trackEvent(data);
  }

  @MessagePattern({ cmd: 'analytics.track_batch' })
  async trackBatch(
    @Payload()
    data: {
      events: Array<{
        userId: string;
        eventType: string;
        eventName: string;
        properties?: Record<string, any>;
        sessionId?: string;
        deviceInfo?: Record<string, any>;
        timestamp?: Date;
      }>;
    },
  ) {
    this.logger.debug(`Tracking batch of ${data.events.length} events`);
    return this.analyticsHandler.trackBatch(data);
  }

  @MessagePattern({ cmd: 'analytics.start_session' })
  async startSession(
    @Payload()
    data: {
      userId: string;
      deviceInfo?: Record<string, any>;
      location?: string;
    },
  ) {
    this.logger.debug(`Starting session for user ${data.userId}`);
    return this.analyticsHandler.startSession(data);
  }

  @MessagePattern({ cmd: 'analytics.end_session' })
  async endSession(
    @Payload()
    data: {
      sessionId: string;
      userId: string;
    },
  ) {
    this.logger.debug(`Ending session ${data.sessionId}`);
    return this.analyticsHandler.endSession(data);
  }

  @MessagePattern({ cmd: 'analytics.update_session' })
  async updateSession(
    @Payload()
    data: {
      sessionId: string;
      userId: string;
      incrementMessagesSent?: number;
      incrementMessagesReceived?: number;
      incrementCallsMade?: number;
      addCallDuration?: number;
      incrementMediaUploaded?: number;
      screenViewed?: string;
      featureUsed?: string;
    },
  ) {
    this.logger.debug(`Updating session ${data.sessionId}`);
    return this.analyticsHandler.updateSession(data);
  }

  @MessagePattern({ cmd: 'analytics.get_user_metrics' })
  async getUserMetrics(
    @Payload()
    data: {
      userId: string;
      period: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    this.logger.debug(`Getting metrics for user ${data.userId}`);
    return this.analyticsHandler.getUserMetrics(data);
  }

  @MessagePattern({ cmd: 'analytics.get_app_metrics' })
  async getAppMetrics(
    @Payload()
    data: {
      period: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    this.logger.debug(`Getting app metrics for period ${data.period}`);
    return this.analyticsHandler.getAppMetrics(data);
  }

  @MessagePattern({ cmd: 'analytics.get_user_activity' })
  async getUserActivity(
    @Payload()
    data: {
      userId: string;
      limit?: number;
      offset?: number;
      eventType?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    this.logger.debug(`Getting activity for user ${data.userId}`);
    return this.analyticsHandler.getUserActivity(data);
  }

  @MessagePattern({ cmd: 'analytics.get_user_sessions' })
  async getUserSessions(
    @Payload()
    data: {
      userId: string;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    this.logger.debug(`Getting sessions for user ${data.userId}`);
    return this.analyticsHandler.getUserSessions(data);
  }

  @MessagePattern({ cmd: 'analytics.get_active_users' })
  async getActiveUsers(
    @Payload()
    data: {
      period: string;
      date?: Date;
    },
  ) {
    this.logger.debug(`Getting active users for ${data.period}`);
    return this.analyticsHandler.getActiveUsers(data);
  }

  @MessagePattern({ cmd: 'analytics.get_retention' })
  async getRetention(
    @Payload()
    data: {
      cohortDate: Date;
      period: string;
    },
  ) {
    this.logger.debug(`Getting retention for cohort ${data.cohortDate}`);
    return this.analyticsHandler.getRetention(data);
  }

  @MessagePattern({ cmd: 'analytics.get_feature_usage' })
  async getFeatureUsage(
    @Payload()
    data: {
      period: string;
      startDate?: Date;
      endDate?: Date;
      feature?: string;
    },
  ) {
    this.logger.debug(`Getting feature usage for ${data.period}`);
    return this.analyticsHandler.getFeatureUsage(data);
  }

  @MessagePattern({ cmd: 'analytics.get_dashboard_summary' })
  async getDashboardSummary(
    @Payload()
    data: {
      period?: string;
    },
  ) {
    this.logger.debug('Getting dashboard summary');
    return this.analyticsHandler.getDashboardSummary(data);
  }

  @MessagePattern({ cmd: 'analytics.aggregate_user_metrics' })
  async aggregateUserMetrics(
    @Payload()
    data: {
      userId: string;
      period: string;
      date: Date;
    },
  ) {
    this.logger.debug(`Aggregating metrics for user ${data.userId}`);
    return this.analyticsHandler.aggregateUserMetrics(data);
  }

  @MessagePattern({ cmd: 'analytics.aggregate_app_metrics' })
  async aggregateAppMetrics(
    @Payload()
    data: {
      period: string;
      date: Date;
    },
  ) {
    this.logger.debug(`Aggregating app metrics for ${data.period}`);
    return this.analyticsHandler.aggregateAppMetrics(data);
  }

  @MessagePattern({ cmd: 'analytics.calculate_retention' })
  async calculateRetention(
    @Payload()
    data: {
      cohortDate: Date;
      period: string;
    },
  ) {
    this.logger.debug(`Calculating retention for cohort ${data.cohortDate}`);
    return this.analyticsHandler.calculateRetention(data);
  }

  @MessagePattern({ cmd: 'analytics.health' })
  async healthCheck() {
    return { status: 'ok', service: 'analytics-service' };
  }
}
