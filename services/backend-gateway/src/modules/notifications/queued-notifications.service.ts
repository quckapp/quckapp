import { Injectable, Optional } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationJobData, QueueService } from '../../common/bullmq/services/queue.service';
import { LoggerService } from '../../common/logger/logger.service';

/**
 * QueuedNotificationsService - Wrapper for NotificationsService that uses BullMQ queues
 * Provides async, reliable notification delivery with retry support
 * Falls back to direct delivery if queue is unavailable
 */
@Injectable()
export class QueuedNotificationsService {
  private useQueues: boolean = true;

  constructor(
    private notificationsService: NotificationsService,
    @Optional() private queueService?: QueueService,
    @Optional() private logger?: LoggerService,
  ) {
    this.useQueues = !!queueService;

    if (this.useQueues) {
      this.log('QueuedNotificationsService initialized with BullMQ queues');
    } else {
      this.log('QueuedNotificationsService using direct delivery (no queue service)');
    }
  }

  /**
   * Send push notification via queue (async)
   * Falls back to direct send if queue unavailable
   */
  async sendPushNotification(
    fcmTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
    options?: {
      priority?: 'default' | 'normal' | 'high';
      badge?: number;
      sound?: string | null;
      ttl?: number;
    },
  ): Promise<{ queued: boolean; jobId?: string }> {
    if (this.useQueues && this.queueService) {
      const jobData: NotificationJobData = {
        type: this.getNotificationType(data?.type),
        tokens: fcmTokens,
        title,
        body,
        data,
        options,
      };

      const jobId = await this.queueService.addNotificationJob(jobData);
      return { queued: true, jobId };
    }

    // Fallback to direct delivery
    await this.notificationsService.sendPushNotification(fcmTokens, title, body, data, options);
    return { queued: false };
  }

  /**
   * Send message notification via queue
   */
  async sendMessageNotification(
    fcmTokens: string[],
    senderName: string,
    messageContent: string,
    conversationId: string,
    messageId: string,
  ): Promise<{ queued: boolean; jobId?: string }> {
    if (this.useQueues && this.queueService) {
      const jobData: NotificationJobData = {
        type: 'message',
        tokens: fcmTokens,
        title: senderName,
        body: messageContent,
        data: {
          type: 'message',
          conversationId,
          messageId,
        },
      };

      const jobId = await this.queueService.addNotificationJob(jobData);
      return { queued: true, jobId };
    }

    // Fallback to direct delivery
    await this.notificationsService.sendMessageNotification(
      fcmTokens,
      senderName,
      messageContent,
      conversationId,
      messageId,
    );
    return { queued: false };
  }

  /**
   * Send call notification via queue (high priority)
   */
  async sendCallNotification(
    fcmTokens: string[],
    callerName: string,
    callType: 'audio' | 'video',
    conversationId: string,
    callId: string,
  ): Promise<{ queued: boolean; jobId?: string }> {
    if (this.useQueues && this.queueService) {
      const jobData: NotificationJobData = {
        type: 'call',
        tokens: fcmTokens,
        title: `Incoming ${callType} call`,
        body: `${callerName} is calling you`,
        data: {
          type: 'call',
          callType,
          conversationId,
          callId,
        },
        options: {
          priority: 'high',
          sound: 'default',
          ttl: 30,
        },
      };

      // Use urgent priority for calls
      const jobId = await this.queueService.addUrgentNotificationJob(jobData);
      return { queued: true, jobId };
    }

    // Fallback to direct delivery
    await this.notificationsService.sendCallNotification(
      fcmTokens,
      callerName,
      callType,
      conversationId,
      callId,
    );
    return { queued: false };
  }

  /**
   * Send mention notification via queue
   */
  async sendMentionNotification(
    fcmTokens: string[],
    mentionerName: string,
    messagePreview: string,
    conversationId: string,
    messageId: string,
  ): Promise<{ queued: boolean; jobId?: string }> {
    if (this.useQueues && this.queueService) {
      const jobData: NotificationJobData = {
        type: 'mention',
        tokens: fcmTokens,
        title: `${mentionerName} mentioned you`,
        body: messagePreview,
        data: {
          type: 'mention',
          conversationId,
          messageId,
        },
        options: {
          priority: 'high',
        },
      };

      const jobId = await this.queueService.addNotificationJob(jobData);
      return { queued: true, jobId };
    }

    // Fallback to direct delivery
    await this.notificationsService.sendPushNotification(
      fcmTokens,
      `${mentionerName} mentioned you`,
      messagePreview,
      {
        type: 'mention',
        conversationId,
        messageId,
      },
      { priority: 'high' },
    );
    return { queued: false };
  }

  /**
   * Send reaction notification via queue
   */
  async sendReactionNotification(
    fcmTokens: string[],
    reactorName: string,
    emoji: string,
    messagePreview: string,
    conversationId: string,
    messageId: string,
  ): Promise<{ queued: boolean; jobId?: string }> {
    if (this.useQueues && this.queueService) {
      const jobData: NotificationJobData = {
        type: 'reaction',
        tokens: fcmTokens,
        title: `${reactorName} reacted ${emoji}`,
        body: messagePreview,
        data: {
          type: 'reaction',
          conversationId,
          messageId,
          emoji,
        },
      };

      const jobId = await this.queueService.addNotificationJob(jobData);
      return { queued: true, jobId };
    }

    // Fallback to direct delivery
    await this.notificationsService.sendPushNotification(
      fcmTokens,
      `${reactorName} reacted ${emoji}`,
      messagePreview,
      {
        type: 'reaction',
        conversationId,
        messageId,
      },
    );
    return { queued: false };
  }

  /**
   * Send group invite notification
   */
  async sendGroupInviteNotification(
    fcmTokens: string[],
    inviterName: string,
    groupName: string,
    conversationId: string,
  ): Promise<{ queued: boolean; jobId?: string }> {
    if (this.useQueues && this.queueService) {
      const jobData: NotificationJobData = {
        type: 'group_invite',
        tokens: fcmTokens,
        title: 'Group Invitation',
        body: `${inviterName} invited you to join "${groupName}"`,
        data: {
          type: 'group_invite',
          conversationId,
        },
      };

      const jobId = await this.queueService.addNotificationJob(jobData);
      return { queued: true, jobId };
    }

    // Fallback to direct delivery
    await this.notificationsService.sendPushNotification(
      fcmTokens,
      'Group Invitation',
      `${inviterName} invited you to join "${groupName}"`,
      {
        type: 'group_invite',
        conversationId,
      },
    );
    return { queued: false };
  }

  /**
   * Send batch notifications (multiple recipients, same content)
   */
  async sendBatchNotifications(
    notifications: Array<{
      tokens: string[];
      title: string;
      body: string;
      data?: Record<string, string>;
    }>,
  ): Promise<{ queued: number; direct: number }> {
    let queued = 0;
    let direct = 0;

    for (const notification of notifications) {
      const result = await this.sendPushNotification(
        notification.tokens,
        notification.title,
        notification.body,
        notification.data,
      );

      if (result.queued) {
        queued++;
      } else {
        direct++;
      }
    }

    return { queued, direct };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<any> {
    if (this.queueService) {
      return this.queueService.getQueueStats('notifications');
    }
    return { message: 'Queue service not available' };
  }

  /**
   * Map notification type string to job type
   */
  private getNotificationType(type?: string): NotificationJobData['type'] {
    switch (type) {
      case 'call':
      case 'incoming_call':
        return 'call';
      case 'message':
      case 'new_message':
        return 'message';
      case 'mention':
        return 'mention';
      case 'reaction':
        return 'reaction';
      case 'group_invite':
        return 'group_invite';
      default:
        return 'system';
    }
  }

  private log(message: string): void {
    if (this.logger) {
      this.logger.log(message, 'QueuedNotificationsService');
    }
  }
}
