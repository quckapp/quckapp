import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { LoggerService } from '../../logger/logger.service';
import { QUEUE_NAMES } from '../bullmq.module';
import { NotificationJobData } from '../services/queue.service';

// Forward reference to avoid circular dependency
// NotificationsService will be injected at runtime
export const NOTIFICATIONS_SERVICE = 'NOTIFICATIONS_SERVICE';

/**
 * NotificationProcessor - BullMQ worker for processing notification jobs
 * Design Pattern: Worker Pattern
 * Handles all notification delivery (FCM, Expo, WebPush)
 */
@Processor(QUEUE_NAMES.NOTIFICATIONS, {
  concurrency: 5, // Process 5 jobs concurrently
  limiter: {
    max: 100,
    duration: 1000, // Max 100 jobs per second
  },
})
@Injectable()
export class NotificationProcessor extends WorkerHost {
  private notificationsService: any = null;

  constructor(private readonly logger: LoggerService) {
    super();
  }

  /**
   * Set the notifications service (called from module initialization to avoid circular deps)
   */
  setNotificationsService(service: any): void {
    this.notificationsService = service;
  }

  /**
   * Process notification job
   * Delegates to NotificationsService for actual delivery
   */
  async process(job: Job<NotificationJobData>): Promise<any> {
    this.logger.log(
      `Processing notification job ${job.id} (type: ${job.data.type})`,
      'NotificationProcessor',
    );

    const { type, tokens, title, body, data, options } = job.data;

    try {
      // Update progress
      await job.updateProgress(10);

      // Validate tokens
      if (!tokens || tokens.length === 0) {
        this.logger.warn(
          `No tokens provided for notification job ${job.id}`,
          'NotificationProcessor',
        );
        return { success: false, reason: 'No tokens provided' };
      }

      await job.updateProgress(30);

      // Process based on notification type
      switch (type) {
        case 'call':
          return await this.processCallNotification(job);
        case 'message':
          return await this.processMessageNotification(job);
        case 'mention':
          return await this.processMentionNotification(job);
        case 'system':
          return await this.processSystemNotification(job);
        case 'reaction':
          return await this.processReactionNotification(job);
        case 'group_invite':
          return await this.processGroupInviteNotification(job);
        default:
          return await this.processGenericNotification(job);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to process notification job ${job.id}`,
        error.message,
        'NotificationProcessor',
      );
      throw error; // Re-throw for retry mechanism
    }
  }

  private async processCallNotification(job: Job<NotificationJobData>): Promise<any> {
    await job.updateProgress(50);

    const { tokens, title, body, data, options } = job.data;

    this.logger.log(
      `Processing call notification for ${tokens.length} recipients`,
      'NotificationProcessor',
    );

    // Use NotificationsService if available
    if (this.notificationsService) {
      await this.notificationsService.sendPushNotification(tokens, title, body, data, {
        ...options,
        priority: 'high',
      });
    }

    await job.updateProgress(100);
    return {
      success: true,
      type: 'call',
      recipientCount: tokens.length,
    };
  }

  private async processMessageNotification(job: Job<NotificationJobData>): Promise<any> {
    await job.updateProgress(50);

    const { tokens, title, body, data, options } = job.data;

    this.logger.log(
      `Processing message notification for ${tokens.length} recipients`,
      'NotificationProcessor',
    );

    // Use NotificationsService if available
    if (this.notificationsService) {
      await this.notificationsService.sendPushNotification(tokens, title, body, data, options);
    }

    await job.updateProgress(100);
    return {
      success: true,
      type: 'message',
      recipientCount: tokens.length,
    };
  }

  private async processMentionNotification(job: Job<NotificationJobData>): Promise<any> {
    await job.updateProgress(50);

    this.logger.log(
      `Processing mention notification for ${job.data.tokens.length} recipients`,
      'NotificationProcessor',
    );

    await job.updateProgress(100);
    return {
      success: true,
      type: 'mention',
      recipientCount: job.data.tokens.length,
    };
  }

  private async processSystemNotification(job: Job<NotificationJobData>): Promise<any> {
    await job.updateProgress(50);

    this.logger.log(
      `Processing system notification for ${job.data.tokens.length} recipients`,
      'NotificationProcessor',
    );

    await job.updateProgress(100);
    return {
      success: true,
      type: 'system',
      recipientCount: job.data.tokens.length,
    };
  }

  private async processReactionNotification(job: Job<NotificationJobData>): Promise<any> {
    await job.updateProgress(50);

    this.logger.log(
      `Processing reaction notification for ${job.data.tokens.length} recipients`,
      'NotificationProcessor',
    );

    await job.updateProgress(100);
    return {
      success: true,
      type: 'reaction',
      recipientCount: job.data.tokens.length,
    };
  }

  private async processGroupInviteNotification(job: Job<NotificationJobData>): Promise<any> {
    await job.updateProgress(50);

    this.logger.log(
      `Processing group invite notification for ${job.data.tokens.length} recipients`,
      'NotificationProcessor',
    );

    await job.updateProgress(100);
    return {
      success: true,
      type: 'group_invite',
      recipientCount: job.data.tokens.length,
    };
  }

  private async processGenericNotification(job: Job<NotificationJobData>): Promise<any> {
    await job.updateProgress(50);

    const { tokens, title, body, data, options } = job.data;

    this.logger.log(
      `Processing generic notification for ${tokens.length} recipients`,
      'NotificationProcessor',
    );

    // Use NotificationsService if available
    if (this.notificationsService) {
      await this.notificationsService.sendPushNotification(tokens, title, body, data, options);
    }

    await job.updateProgress(100);
    return {
      success: true,
      type: 'generic',
      recipientCount: tokens.length,
    };
  }
}
