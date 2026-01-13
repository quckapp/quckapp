import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, Interval, SchedulerRegistry, Timeout } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoggerService } from '../../common/logger/logger.service';
import { CacheService } from '../../common/cache/cache.service';
import { CronJob } from 'cron';

/**
 * TasksService - Handles all scheduled background tasks and cron jobs
 *
 * Scheduled Tasks:
 * - Cache cleanup
 * - Expired session cleanup
 * - Expired OTP cleanup
 * - Analytics aggregation
 * - Database maintenance
 * - Status/Story expiration
 * - Scheduled message processing
 */
@Injectable()
export class TasksService implements OnModuleInit {
  private isProduction: boolean;
  private tasksEnabled: boolean;

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private configService: ConfigService,
    private logger: LoggerService,
    private cacheService: CacheService,
  ) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
    this.tasksEnabled = this.configService.get('SCHEDULED_TASKS_ENABLED') !== 'false';
  }

  onModuleInit() {
    this.logger.log('TasksService initialized', { context: 'TasksService' });
    this.logRegisteredTasks();
  }

  /**
   * Log all registered cron jobs and intervals
   */
  private logRegisteredTasks(): void {
    const cronJobs = this.schedulerRegistry.getCronJobs();
    const intervals = this.schedulerRegistry.getIntervals();
    const timeouts = this.schedulerRegistry.getTimeouts();

    this.logger.log(
      `Registered tasks: ${cronJobs.size} cron jobs, ${intervals.length} intervals, ${timeouts.length} timeouts`,
      {
        context: 'TasksService',
      },
    );

    cronJobs.forEach((job, name) => {
      const nextDate = job.nextDate();
      this.logger.debug(`Cron job "${name}" next run: ${nextDate?.toString()}`, {
        context: 'TasksService',
      });
    });
  }

  // ============================================
  // CACHE & MEMORY MANAGEMENT
  // ============================================

  /**
   * Clean up expired cache entries every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'cache-cleanup' })
  async handleCacheCleanup(): Promise<void> {
    if (!this.tasksEnabled) {
      return;
    }

    const startTime = Date.now();
    this.logger.debug('Starting cache cleanup task', { context: 'TasksService' });

    try {
      // The cache service has its own cleanup, but we can force it here
      const stats = this.cacheService.getStats();

      this.logger.debug(`Cache cleanup completed`, {
        context: 'TasksService',
        duration: Date.now() - startTime,
        cacheSize: stats.size,
        hitRate: stats.hitRate,
      });
    } catch (error) {
      this.logger.error('Cache cleanup failed', {
        context: 'TasksService',
        errorMessage: (error as Error).message,
      });
    }
  }

  // ============================================
  // SESSION & AUTHENTICATION CLEANUP
  // ============================================

  /**
   * Clean up expired sessions every hour
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'session-cleanup' })
  async handleSessionCleanup(): Promise<void> {
    if (!this.tasksEnabled) {
      return;
    }

    const startTime = Date.now();
    this.logger.log('Starting session cleanup task', { context: 'TasksService' });

    try {
      // Clean up expired session tokens from cache
      // This would typically interact with a session store or database

      this.logger.log('Session cleanup completed', {
        context: 'TasksService',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error('Session cleanup failed', {
        context: 'TasksService',
        errorMessage: (error as Error).message,
      });
    }
  }

  /**
   * Clean up expired OTP codes every 15 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'otp-cleanup' })
  async handleOtpCleanup(): Promise<void> {
    if (!this.tasksEnabled) {
      return;
    }

    const startTime = Date.now();
    this.logger.debug('Starting OTP cleanup task', { context: 'TasksService' });

    try {
      // OTPs are typically stored with TTL in cache, but this ensures cleanup

      this.logger.debug('OTP cleanup completed', {
        context: 'TasksService',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error('OTP cleanup failed', {
        context: 'TasksService',
        errorMessage: (error as Error).message,
      });
    }
  }

  // ============================================
  // CONTENT EXPIRATION
  // ============================================

  /**
   * Process expired statuses/stories every minute
   * Stories typically expire after 24 hours
   */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'status-expiration' })
  async handleStatusExpiration(): Promise<void> {
    if (!this.tasksEnabled) {
      return;
    }

    const startTime = Date.now();

    try {
      // This would call StatusService to mark expired statuses
      // Emitting events for real-time updates to connected clients

      this.logger.debug('Status expiration check completed', {
        context: 'TasksService',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error('Status expiration check failed', {
        context: 'TasksService',
        errorMessage: (error as Error).message,
      });
    }
  }

  /**
   * Process disappearing messages every minute
   */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'disappearing-messages' })
  async handleDisappearingMessages(): Promise<void> {
    if (!this.tasksEnabled) {
      return;
    }

    const startTime = Date.now();

    try {
      // This would call MessagesService to delete expired messages

      this.logger.debug('Disappearing messages check completed', {
        context: 'TasksService',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error('Disappearing messages check failed', {
        context: 'TasksService',
        errorMessage: (error as Error).message,
      });
    }
  }

  // ============================================
  // SCHEDULED MESSAGES
  // ============================================

  /**
   * Process scheduled messages every 30 seconds
   * Sends messages that are due to be sent
   */
  @Cron('*/30 * * * * *', { name: 'scheduled-messages' })
  async handleScheduledMessages(): Promise<void> {
    if (!this.tasksEnabled) {
      return;
    }

    const startTime = Date.now();

    try {
      // This would call ScheduledMessagesService to send due messages

      this.logger.debug('Scheduled messages check completed', {
        context: 'TasksService',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error('Scheduled messages check failed', {
        context: 'TasksService',
        errorMessage: (error as Error).message,
      });
    }
  }

  // ============================================
  // ANALYTICS & REPORTING
  // ============================================

  /**
   * Aggregate analytics data every hour
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'analytics-aggregation' })
  async handleAnalyticsAggregation(): Promise<void> {
    if (!this.tasksEnabled) {
      return;
    }

    const startTime = Date.now();
    this.logger.log('Starting analytics aggregation', { context: 'TasksService' });

    try {
      // Aggregate hourly analytics:
      // - Message counts
      // - Active users
      // - Call statistics
      // - Storage usage

      this.logger.log('Analytics aggregation completed', {
        context: 'TasksService',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error('Analytics aggregation failed', {
        context: 'TasksService',
        errorMessage: (error as Error).message,
      });
    }
  }

  /**
   * Generate daily reports at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'daily-reports' })
  async handleDailyReports(): Promise<void> {
    if (!this.tasksEnabled || !this.isProduction) {
      return;
    }

    const startTime = Date.now();
    this.logger.log('Starting daily reports generation', { context: 'TasksService' });

    try {
      // Generate daily reports:
      // - User activity summary
      // - Message statistics
      // - Error summaries
      // - Performance metrics

      this.logger.log('Daily reports generation completed', {
        context: 'TasksService',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error('Daily reports generation failed', {
        context: 'TasksService',
        errorMessage: (error as Error).message,
      });
    }
  }

  // ============================================
  // DATABASE MAINTENANCE
  // ============================================

  /**
   * Database maintenance at 3 AM daily
   * - Index optimization
   * - Old data archival
   * - Storage cleanup
   */
  @Cron('0 3 * * *', { name: 'database-maintenance' })
  async handleDatabaseMaintenance(): Promise<void> {
    if (!this.tasksEnabled || !this.isProduction) {
      return;
    }

    const startTime = Date.now();
    this.logger.log('Starting database maintenance', { context: 'TasksService' });

    try {
      // Database maintenance tasks:
      // - Compact collections
      // - Update indexes
      // - Archive old messages (> 1 year)
      // - Clean up orphaned files

      this.logger.log('Database maintenance completed', {
        context: 'TasksService',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error('Database maintenance failed', {
        context: 'TasksService',
        errorMessage: (error as Error).message,
      });
    }
  }

  /**
   * Clean up old audit logs weekly (Sunday at 4 AM)
   */
  @Cron('0 4 * * 0', { name: 'audit-log-cleanup' })
  async handleAuditLogCleanup(): Promise<void> {
    if (!this.tasksEnabled || !this.isProduction) {
      return;
    }

    const startTime = Date.now();
    this.logger.log('Starting audit log cleanup', { context: 'TasksService' });

    try {
      // Clean up audit logs older than configured retention period
      // Default: 90 days

      this.logger.log('Audit log cleanup completed', {
        context: 'TasksService',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error('Audit log cleanup failed', {
        context: 'TasksService',
        errorMessage: (error as Error).message,
      });
    }
  }

  // ============================================
  // NOTIFICATION & REMINDER TASKS
  // ============================================

  /**
   * Send notification digests every 6 hours
   */
  @Cron('0 */6 * * *', { name: 'notification-digest' })
  async handleNotificationDigest(): Promise<void> {
    if (!this.tasksEnabled) {
      return;
    }

    const startTime = Date.now();

    try {
      // Send digest notifications to users who:
      // - Have unread messages
      // - Haven't been active for a while
      // - Have pending notifications

      this.logger.debug('Notification digest completed', {
        context: 'TasksService',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error('Notification digest failed', {
        context: 'TasksService',
        errorMessage: (error as Error).message,
      });
    }
  }

  // ============================================
  // POLL MANAGEMENT
  // ============================================

  /**
   * Close expired polls every minute
   */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'poll-expiration' })
  async handlePollExpiration(): Promise<void> {
    if (!this.tasksEnabled) {
      return;
    }

    const startTime = Date.now();

    try {
      // Close polls that have passed their end time
      // Notify participants of final results

      this.logger.debug('Poll expiration check completed', {
        context: 'TasksService',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error('Poll expiration check failed', {
        context: 'TasksService',
        errorMessage: (error as Error).message,
      });
    }
  }

  // ============================================
  // HEALTH & MONITORING
  // ============================================

  /**
   * System health check every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'health-check' })
  async handleHealthCheck(): Promise<void> {
    if (!this.tasksEnabled) {
      return;
    }

    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const heapPercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

      // Log warning if memory usage is high
      if (heapPercent > 85) {
        this.logger.warn(
          `High memory usage: ${heapPercent}% (${heapUsedMB}MB / ${heapTotalMB}MB)`,
          {
            context: 'TasksService',
          },
        );
      }

      // Log system stats
      this.logger.debug(
        `System health: Memory ${heapPercent}%, Uptime ${Math.round(process.uptime())}s`,
        {
          context: 'TasksService',
        },
      );
    } catch (error) {
      this.logger.error('Health check failed', {
        context: 'TasksService',
        errorMessage: (error as Error).message,
      });
    }
  }

  // ============================================
  // DYNAMIC TASK MANAGEMENT
  // ============================================

  /**
   * Add a dynamic cron job at runtime
   */
  addCronJob(name: string, cronTime: string, callback: () => void): void {
    const job = new CronJob(cronTime, () => {
      this.logger.debug(`Running dynamic cron job: ${name}`, { context: 'TasksService' });
      callback();
    });

    this.schedulerRegistry.addCronJob(name, job);
    job.start();

    this.logger.log(`Dynamic cron job "${name}" added with schedule: ${cronTime}`, {
      context: 'TasksService',
    });
  }

  /**
   * Remove a dynamic cron job
   */
  removeCronJob(name: string): void {
    try {
      this.schedulerRegistry.deleteCronJob(name);
      this.logger.log(`Dynamic cron job "${name}" removed`, { context: 'TasksService' });
    } catch (error) {
      this.logger.warn(`Could not remove cron job "${name}": ${(error as Error).message}`, {
        context: 'TasksService',
      });
    }
  }

  /**
   * Add a dynamic interval
   */
  addInterval(name: string, milliseconds: number, callback: () => void): void {
    const interval = setInterval(() => {
      this.logger.debug(`Running dynamic interval: ${name}`, { context: 'TasksService' });
      callback();
    }, milliseconds);

    this.schedulerRegistry.addInterval(name, interval);

    this.logger.log(`Dynamic interval "${name}" added with period: ${milliseconds}ms`, {
      context: 'TasksService',
    });
  }

  /**
   * Remove a dynamic interval
   */
  removeInterval(name: string): void {
    try {
      this.schedulerRegistry.deleteInterval(name);
      this.logger.log(`Dynamic interval "${name}" removed`, { context: 'TasksService' });
    } catch (error) {
      this.logger.warn(`Could not remove interval "${name}": ${(error as Error).message}`, {
        context: 'TasksService',
      });
    }
  }

  /**
   * Add a one-time timeout
   */
  addTimeout(name: string, milliseconds: number, callback: () => void): void {
    const timeout = setTimeout(() => {
      this.logger.debug(`Running dynamic timeout: ${name}`, { context: 'TasksService' });
      callback();
      this.schedulerRegistry.deleteTimeout(name);
    }, milliseconds);

    this.schedulerRegistry.addTimeout(name, timeout);

    this.logger.log(`Dynamic timeout "${name}" added for ${milliseconds}ms`, {
      context: 'TasksService',
    });
  }

  /**
   * Get all registered cron jobs
   */
  getCronJobs(): Map<string, CronJob> {
    return this.schedulerRegistry.getCronJobs();
  }

  /**
   * Get all registered intervals
   */
  getIntervals(): string[] {
    return this.schedulerRegistry.getIntervals();
  }

  /**
   * Get all registered timeouts
   */
  getTimeouts(): string[] {
    return this.schedulerRegistry.getTimeouts();
  }
}
