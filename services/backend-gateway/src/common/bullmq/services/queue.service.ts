import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JobsOptions, Queue } from 'bullmq';
import { LoggerService } from '../../logger/logger.service';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES, QUEUE_PRIORITY } from '../bullmq.module';

/**
 * Notification job data interface
 */
export interface NotificationJobData {
  type: 'message' | 'call' | 'mention' | 'system' | 'reaction' | 'group_invite';
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  options?: {
    priority?: 'default' | 'normal' | 'high';
    badge?: number;
    sound?: string | null;
    ttl?: number;
  };
}

/**
 * Message job data interface
 */
export interface MessageJobData {
  type: 'encrypt' | 'decrypt' | 'index' | 'delete' | 'forward';
  messageId: string;
  conversationId: string;
  payload: any;
}

/**
 * Media job data interface
 */
export interface MediaJobData {
  type: 'compress' | 'thumbnail' | 'convert' | 'cleanup';
  fileId: string;
  filePath: string;
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  };
}

/**
 * Email job data interface
 */
export interface EmailJobData {
  type: 'verification' | 'password_reset' | 'notification' | 'welcome';
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

/**
 * Analytics job data interface
 */
export interface AnalyticsJobData {
  type: 'event' | 'aggregate' | 'report';
  eventName?: string;
  userId?: string;
  data: Record<string, any>;
  timestamp: number;
}

/**
 * QueueService - Centralized service for adding jobs to queues
 * Design Pattern: Facade Pattern - Simplifies queue interactions
 * SOLID: Single Responsibility - Only handles job enqueueing
 */
@Injectable()
export class QueueService {
  private notificationQueue: Queue;
  private messageQueue: Queue;
  private mediaQueue: Queue;
  private emailQueue: Queue;
  private analyticsQueue: Queue;
  private scheduledQueue: Queue;

  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.MESSAGES) messageQueue: Queue,
    @InjectQueue(QUEUE_NAMES.MEDIA) mediaQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EMAIL) emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.ANALYTICS) analyticsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SCHEDULED_TASKS) scheduledQueue: Queue,
    private readonly logger: LoggerService,
  ) {
    this.notificationQueue = notificationQueue;
    this.messageQueue = messageQueue;
    this.mediaQueue = mediaQueue;
    this.emailQueue = emailQueue;
    this.analyticsQueue = analyticsQueue;
    this.scheduledQueue = scheduledQueue;
  }

  /**
   * Add notification job to queue
   */
  async addNotificationJob(data: NotificationJobData, options?: JobsOptions): Promise<string> {
    const priority = this.mapPriority(data.options?.priority);
    const job = await this.notificationQueue.add(data.type, data, {
      ...DEFAULT_JOB_OPTIONS,
      priority,
      ...options,
    });

    this.logger.log(`Notification job added: ${job.id} (type: ${data.type})`, 'QueueService');

    return job.id!;
  }

  /**
   * Add high-priority notification (e.g., calls)
   */
  async addUrgentNotificationJob(data: NotificationJobData): Promise<string> {
    return this.addNotificationJob(data, {
      priority: QUEUE_PRIORITY.URGENT,
      attempts: 5,
      backoff: {
        type: 'fixed',
        delay: 500,
      },
    });
  }

  /**
   * Add message processing job to queue
   */
  async addMessageJob(data: MessageJobData, options?: JobsOptions): Promise<string> {
    const job = await this.messageQueue.add(data.type, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...options,
    });

    this.logger.log(`Message job added: ${job.id} (type: ${data.type})`, 'QueueService');

    return job.id!;
  }

  /**
   * Add media processing job to queue
   */
  async addMediaJob(data: MediaJobData, options?: JobsOptions): Promise<string> {
    const job = await this.mediaQueue.add(data.type, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...options,
    });

    this.logger.log(`Media job added: ${job.id} (type: ${data.type})`, 'QueueService');

    return job.id!;
  }

  /**
   * Add email job to queue
   */
  async addEmailJob(data: EmailJobData, options?: JobsOptions): Promise<string> {
    const job = await this.emailQueue.add(data.type, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...options,
    });

    this.logger.log(`Email job added: ${job.id} (type: ${data.type})`, 'QueueService');

    return job.id!;
  }

  /**
   * Add analytics job to queue (low priority, batch processing)
   */
  async addAnalyticsJob(data: AnalyticsJobData, options?: JobsOptions): Promise<string> {
    const job = await this.analyticsQueue.add(data.type, data, {
      ...DEFAULT_JOB_OPTIONS,
      priority: QUEUE_PRIORITY.LOW,
      ...options,
    });

    return job.id!;
  }

  /**
   * Add scheduled/delayed job
   */
  async addScheduledJob(
    queueName: string,
    jobName: string,
    data: any,
    delay: number,
    options?: JobsOptions,
  ): Promise<string> {
    const job = await this.scheduledQueue.add(
      jobName,
      { queueName, data },
      {
        ...DEFAULT_JOB_OPTIONS,
        delay,
        ...options,
      },
    );

    this.logger.log(`Scheduled job added: ${job.id} (delay: ${delay}ms)`, 'QueueService');

    return job.id!;
  }

  /**
   * Add recurring job (using repeat option)
   */
  async addRecurringJob(
    queueName: string,
    jobName: string,
    data: any,
    cron: string,
  ): Promise<string> {
    const queue = this.getQueueByName(queueName);
    const job = await queue.add(jobName, data, {
      repeat: {
        pattern: cron,
      },
    });

    this.logger.log(`Recurring job added: ${job.id} (cron: ${cron})`, 'QueueService');

    return job.id!;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getQueueByName(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Get all queues statistics
   */
  async getAllQueuesStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const queueName of Object.values(QUEUE_NAMES)) {
      stats[queueName] = await this.getQueueStats(queueName);
    }

    return stats;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.pause();
    this.logger.log(`Queue paused: ${queueName}`, 'QueueService');
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.resume();
    this.logger.log(`Queue resumed: ${queueName}`, 'QueueService');
  }

  /**
   * Clean completed/failed jobs
   */
  async cleanQueue(
    queueName: string,
    grace: number = 3600000, // 1 hour
    status: 'completed' | 'failed' = 'completed',
  ): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.clean(grace, 1000, status);
    this.logger.log(`Queue cleaned: ${queueName} (status: ${status})`, 'QueueService');
  }

  /**
   * Map priority string to BullMQ priority number
   */
  private mapPriority(priority?: string): number {
    switch (priority) {
      case 'high':
        return QUEUE_PRIORITY.HIGH;
      case 'normal':
        return QUEUE_PRIORITY.NORMAL;
      default:
        return QUEUE_PRIORITY.NORMAL;
    }
  }

  /**
   * Get queue instance by name
   */
  private getQueueByName(queueName: string): Queue {
    switch (queueName) {
      case QUEUE_NAMES.NOTIFICATIONS:
        return this.notificationQueue;
      case QUEUE_NAMES.MESSAGES:
        return this.messageQueue;
      case QUEUE_NAMES.MEDIA:
        return this.mediaQueue;
      case QUEUE_NAMES.EMAIL:
        return this.emailQueue;
      case QUEUE_NAMES.ANALYTICS:
        return this.analyticsQueue;
      case QUEUE_NAMES.SCHEDULED_TASKS:
        return this.scheduledQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }
}
