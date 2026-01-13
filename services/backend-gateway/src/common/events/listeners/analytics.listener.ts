import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LoggerService } from '../../logger/logger.service';
import {
  CallEvents,
  ConversationEvents,
  MessageEvents,
  PollEvents,
  StatusEvents,
  SystemEvents,
  UploadEvents,
  UserEvents,
} from '../event.constants';

/**
 * AnalyticsEventListener - Tracks events for analytics and metrics
 * Demonstrates async event handling for non-blocking analytics
 */
@Injectable()
export class AnalyticsEventListener {
  private metrics: Map<string, number> = new Map();

  constructor(private logger: LoggerService) {
    // Initialize metrics
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    const metricKeys = [
      'users.created',
      'users.logins',
      'users.active',
      'messages.sent',
      'messages.delivered',
      'messages.read',
      'calls.initiated',
      'calls.completed',
      'calls.duration.total',
      'uploads.completed',
      'uploads.size.total',
      'errors.total',
    ];

    metricKeys.forEach((key) => this.metrics.set(key, 0));
  }

  // ============================================
  // USER ANALYTICS
  // ============================================

  @OnEvent(UserEvents.CREATED, { async: true })
  async trackUserCreated(payload: any): Promise<void> {
    this.incrementMetric('users.created');

    this.logger.debug('Analytics: User created', {
      context: 'AnalyticsEventListener',
      userId: payload.userId,
    });

    // Track user acquisition source
    // Record signup funnel completion
    // Segment user by attributes
  }

  @OnEvent(UserEvents.LOGIN, { async: true })
  async trackUserLogin(payload: any): Promise<void> {
    this.incrementMetric('users.logins');

    // Track login frequency
    // Identify device types
    // Geographic distribution
  }

  @OnEvent(UserEvents.ONLINE, { async: true })
  async trackUserOnline(payload: any): Promise<void> {
    this.incrementMetric('users.active');

    // Track daily/monthly active users
    // Session duration tracking starts
  }

  @OnEvent(UserEvents.OFFLINE, { async: true })
  async trackUserOffline(payload: any): Promise<void> {
    this.decrementMetric('users.active');

    // Calculate session duration
    // Track engagement metrics
  }

  // ============================================
  // MESSAGE ANALYTICS
  // ============================================

  @OnEvent(MessageEvents.SENT, { async: true })
  async trackMessageSent(payload: any): Promise<void> {
    this.incrementMetric('messages.sent');

    // Track message types distribution
    // Media vs text ratio
    // Messages per user
    // Peak messaging hours
  }

  @OnEvent(MessageEvents.DELIVERED, { async: true })
  async trackMessageDelivered(payload: any): Promise<void> {
    this.incrementMetric('messages.delivered');

    // Calculate delivery rate
    // Delivery latency metrics
  }

  @OnEvent(MessageEvents.READ, { async: true })
  async trackMessageRead(payload: any): Promise<void> {
    this.incrementMetric('messages.read');

    // Calculate read rate
    // Time to read metrics
  }

  // ============================================
  // CALL ANALYTICS
  // ============================================

  @OnEvent(CallEvents.INITIATED, { async: true })
  async trackCallInitiated(payload: any): Promise<void> {
    this.incrementMetric('calls.initiated');

    // Track call types (audio vs video)
    // Group vs 1-on-1 calls
  }

  @OnEvent(CallEvents.ENDED, { async: true })
  async trackCallEnded(payload: any): Promise<void> {
    if (payload.reason === 'completed') {
      this.incrementMetric('calls.completed');

      if (payload.duration) {
        this.incrementMetric('calls.duration.total', payload.duration);
      }
    }

    // Track call success rate
    // Average call duration
    // Drop rate
  }

  // ============================================
  // UPLOAD ANALYTICS
  // ============================================

  @OnEvent(UploadEvents.COMPLETED, { async: true })
  async trackUploadCompleted(payload: any): Promise<void> {
    this.incrementMetric('uploads.completed');

    if (payload.fileSize) {
      this.incrementMetric('uploads.size.total', payload.fileSize);
    }

    // Track file types distribution
    // Average file sizes
    // Storage usage per user
  }

  // ============================================
  // STATUS ANALYTICS
  // ============================================

  @OnEvent(StatusEvents.CREATED, { async: true })
  async trackStatusCreated(payload: any): Promise<void> {
    // Track status creation frequency
    // Media types in stories
    // Peak posting times
  }

  @OnEvent(StatusEvents.VIEWED, { async: true })
  async trackStatusViewed(payload: any): Promise<void> {
    // Track view counts
    // View completion rate
    // Engagement metrics
  }

  // ============================================
  // POLL ANALYTICS
  // ============================================

  @OnEvent(PollEvents.CREATED, { async: true })
  async trackPollCreated(payload: any): Promise<void> {
    // Track poll usage
    // Average options per poll
    // Poll topics analysis
  }

  @OnEvent(PollEvents.VOTED, { async: true })
  async trackPollVoted(payload: any): Promise<void> {
    // Track participation rate
    // Vote distribution
  }

  // ============================================
  // ERROR TRACKING
  // ============================================

  @OnEvent(SystemEvents.ERROR_OCCURRED, { async: true })
  async trackError(payload: any): Promise<void> {
    this.incrementMetric('errors.total');

    this.logger.debug('Analytics: Error tracked', {
      context: 'AnalyticsEventListener',
      errorType: payload.errorType,
      severity: payload.severity,
    });

    // Categorize errors
    // Track error frequency
    // Identify error patterns
  }

  // ============================================
  // METRICS HELPERS
  // ============================================

  private incrementMetric(key: string, amount: number = 1): void {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + amount);
  }

  private decrementMetric(key: string, amount: number = 1): void {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, Math.max(0, current - amount));
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.initializeMetrics();
  }
}
