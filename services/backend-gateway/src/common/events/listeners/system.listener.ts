import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LoggerService } from '../../logger/logger.service';
import { SystemEvents } from '../event.constants';
import { RateLimitPayload, SecurityEventPayload, SystemErrorPayload } from '../event.payloads';

/**
 * SystemEventListener - Handles system-level events
 * Manages errors, security events, and system health
 */
@Injectable()
export class SystemEventListener {
  private errorCounts: Map<string, number> = new Map();
  private rateLimitTracker: Map<string, { count: number; firstHit: Date }> = new Map();

  constructor(private logger: LoggerService) {}

  @OnEvent(SystemEvents.ERROR_OCCURRED)
  handleErrorOccurred(payload: SystemErrorPayload): void {
    // Track error frequency
    const errorKey = payload.errorType;
    const count = (this.errorCounts.get(errorKey) || 0) + 1;
    this.errorCounts.set(errorKey, count);

    this.logger.error(`System error: ${payload.message}`, {
      context: 'SystemEventListener',
      errorId: payload.errorId,
      errorType: payload.errorType,
      severity: payload.severity,
      occurrences: count,
    });

    // Alert if error frequency is too high
    if (count >= 10 && count % 10 === 0) {
      this.logger.warn(`High error frequency: ${errorKey} occurred ${count} times`, {
        context: 'SystemEventListener',
      });

      // Trigger alert notification to ops team
    }
  }

  @OnEvent(SystemEvents.CRITICAL_ERROR)
  handleCriticalError(payload: SystemErrorPayload): void {
    this.logger.error(`CRITICAL ERROR: ${payload.message}`, {
      context: 'SystemEventListener',
      errorId: payload.errorId,
      errorType: payload.errorType,
      stack: payload.stack,
    });

    // Immediate actions:
    // - Send alert to on-call team
    // - Log to external monitoring service (e.g., Sentry, Datadog)
    // - Consider circuit breaker if applicable
  }

  @OnEvent(SystemEvents.SUSPICIOUS_ACTIVITY)
  handleSuspiciousActivity(payload: SecurityEventPayload): void {
    this.logger.warn(`Suspicious activity detected: ${payload.eventType}`, {
      context: 'SystemEventListener',
      userId: payload.userId,
      ipAddress: payload.ipAddress,
      severity: payload.severity,
      details: payload.details,
    });

    // Security actions:
    // - Log to security audit trail
    // - Notify security team if critical
    // - Consider automatic countermeasures
  }

  @OnEvent(SystemEvents.RATE_LIMIT_EXCEEDED)
  handleRateLimitExceeded(payload: RateLimitPayload): void {
    const key = `${payload.ipAddress}:${payload.endpoint}`;
    const tracker = this.rateLimitTracker.get(key);

    if (tracker) {
      tracker.count++;
    } else {
      this.rateLimitTracker.set(key, { count: 1, firstHit: new Date() });
    }

    this.logger.warn(`Rate limit exceeded: ${payload.endpoint}`, {
      context: 'SystemEventListener',
      ipAddress: payload.ipAddress,
      userId: payload.userId,
      limit: payload.limit,
      current: payload.current,
    });

    // Check for potential abuse patterns
    const currentTracker = this.rateLimitTracker.get(key);
    if (currentTracker && currentTracker.count >= 10) {
      this.logger.error(`Potential abuse detected from ${payload.ipAddress}`, {
        context: 'SystemEventListener',
        hitCount: currentTracker.count,
      });

      // Consider temporary IP ban
      // Alert security team
    }
  }

  @OnEvent(SystemEvents.BRUTE_FORCE_DETECTED)
  handleBruteForceDetected(payload: SecurityEventPayload): void {
    this.logger.error(`BRUTE FORCE ATTACK DETECTED`, {
      context: 'SystemEventListener',
      ipAddress: payload.ipAddress,
      targetUserId: payload.userId,
      details: payload.details,
    });

    // Immediate countermeasures:
    // - Block IP temporarily
    // - Lock targeted account temporarily
    // - Alert security team
    // - Log for forensics
  }

  @OnEvent(SystemEvents.SERVER_STARTED)
  handleServerStarted(payload: any): void {
    this.logger.log('Server started successfully', {
      context: 'SystemEventListener',
      timestamp: payload.timestamp,
    });

    // Clear any stale data from previous run
    this.errorCounts.clear();
    this.rateLimitTracker.clear();
  }

  @OnEvent(SystemEvents.SERVER_STOPPING)
  handleServerStopping(payload: any): void {
    this.logger.log('Server is stopping', {
      context: 'SystemEventListener',
      timestamp: payload.timestamp,
    });

    // Graceful shutdown tasks:
    // - Flush pending metrics
    // - Close active connections gracefully
    // - Notify connected clients
  }

  @OnEvent(SystemEvents.MAINTENANCE_STARTED)
  handleMaintenanceStarted(payload: any): void {
    this.logger.log('Maintenance mode started', {
      context: 'SystemEventListener',
      timestamp: payload.timestamp,
    });

    // Notify connected users
    // Redirect traffic if needed
    // Start maintenance tasks
  }

  @OnEvent(SystemEvents.MAINTENANCE_ENDED)
  handleMaintenanceEnded(payload: any): void {
    this.logger.log('Maintenance mode ended', {
      context: 'SystemEventListener',
      timestamp: payload.timestamp,
    });

    // Resume normal operations
    // Clear maintenance notifications
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  /**
   * Get rate limit statistics
   */
  getRateLimitStats(): Array<{ key: string; count: number; firstHit: Date }> {
    return Array.from(this.rateLimitTracker.entries()).map(([key, value]) => ({
      key,
      ...value,
    }));
  }

  /**
   * Clear old rate limit entries (cleanup)
   */
  cleanupRateLimitTracker(maxAgeMs: number = 3600000): void {
    const now = new Date();
    for (const [key, value] of this.rateLimitTracker) {
      if (now.getTime() - value.firstHit.getTime() > maxAgeMs) {
        this.rateLimitTracker.delete(key);
      }
    }
  }
}
