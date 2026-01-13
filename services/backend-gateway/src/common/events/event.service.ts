import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoggerService } from '../logger/logger.service';
import {
  AnalyticsEvents,
  AppEvent,
  CallEvents,
  CommunityEvents,
  ConversationEvents,
  ExportEvents,
  MessageEvents,
  NotificationEvents,
  PollEvents,
  StatusEvents,
  SystemEvents,
  UploadEvents,
  UserEvents,
} from './event.constants';
import { BaseEventPayload } from './event.payloads';

/**
 * EventService - Centralized event emission with logging and error handling
 * Provides type-safe event emission throughout the application
 */
@Injectable()
export class EventService {
  constructor(
    private eventEmitter: EventEmitter2,
    private logger: LoggerService,
  ) {}

  /**
   * Emit an event with payload
   * @param event - Event name from constants
   * @param payload - Event payload data
   */
  emit<T extends BaseEventPayload>(event: AppEvent, payload: T): boolean {
    try {
      // Add timestamp if not present
      if (!payload.timestamp) {
        payload.timestamp = new Date();
      }

      // Generate correlation ID if not present
      if (!payload.correlationId) {
        payload.correlationId = this.generateCorrelationId();
      }

      this.logger.debug(`Emitting event: ${event}`, {
        context: 'EventService',
        correlationId: payload.correlationId,
      });

      return this.eventEmitter.emit(event, payload);
    } catch (error) {
      this.logger.error(`Failed to emit event: ${event}`, {
        context: 'EventService',
        errorMessage: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Emit an event asynchronously and wait for all listeners
   */
  async emitAsync<T extends BaseEventPayload>(event: AppEvent, payload: T): Promise<any[]> {
    try {
      if (!payload.timestamp) {
        payload.timestamp = new Date();
      }

      if (!payload.correlationId) {
        payload.correlationId = this.generateCorrelationId();
      }

      this.logger.debug(`Emitting async event: ${event}`, {
        context: 'EventService',
        correlationId: payload.correlationId,
      });

      return await this.eventEmitter.emitAsync(event, payload);
    } catch (error) {
      this.logger.error(`Failed to emit async event: ${event}`, {
        context: 'EventService',
        errorMessage: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * Emit multiple events at once
   */
  emitMany<T extends BaseEventPayload>(events: Array<{ event: AppEvent; payload: T }>): void {
    const correlationId = this.generateCorrelationId();

    events.forEach(({ event, payload }) => {
      payload.correlationId = correlationId;
      this.emit(event, payload);
    });
  }

  // ============================================
  // USER EVENT HELPERS
  // ============================================

  emitUserCreated(userId: string, phoneNumber: string, displayName?: string): void {
    this.emit(UserEvents.CREATED, {
      timestamp: new Date(),
      userId,
      phoneNumber,
      displayName,
      createdAt: new Date(),
    });
  }

  emitUserLogin(userId: string, deviceInfo?: any, ipAddress?: string): void {
    this.emit(UserEvents.LOGIN, {
      timestamp: new Date(),
      userId,
      deviceInfo,
      ipAddress,
    });
  }

  emitUserLogout(
    userId: string,
    reason: 'manual' | 'timeout' | 'forced' | 'security' = 'manual',
  ): void {
    this.emit(UserEvents.LOGOUT, {
      timestamp: new Date(),
      userId,
      reason,
    });
  }

  emitUserOnline(userId: string): void {
    this.emit(UserEvents.ONLINE, {
      timestamp: new Date(),
      userId,
    });
  }

  emitUserOffline(userId: string): void {
    this.emit(UserEvents.OFFLINE, {
      timestamp: new Date(),
      userId,
    });
  }

  // ============================================
  // MESSAGE EVENT HELPERS
  // ============================================

  emitMessageSent(
    messageId: string,
    conversationId: string,
    senderId: string,
    recipientIds: string[],
    messageType: string = 'text',
  ): void {
    this.emit(MessageEvents.SENT, {
      timestamp: new Date(),
      messageId,
      conversationId,
      senderId,
      recipientIds,
      messageType,
      hasMedia: ['image', 'video', 'audio', 'file'].includes(messageType),
      isReply: false,
      isForwarded: false,
    });
  }

  emitMessageDelivered(messageId: string, conversationId: string, recipientId: string): void {
    this.emit(MessageEvents.DELIVERED, {
      timestamp: new Date(),
      messageId,
      conversationId,
      recipientId,
      deliveredAt: new Date(),
    });
  }

  emitMessageRead(messageId: string, conversationId: string, readerId: string): void {
    this.emit(MessageEvents.READ, {
      timestamp: new Date(),
      messageId,
      conversationId,
      readerId,
      readAt: new Date(),
    });
  }

  emitMessageDeleted(
    messageId: string,
    conversationId: string,
    deletedBy: string,
    deleteType: 'for_me' | 'for_everyone' = 'for_me',
  ): void {
    this.emit(MessageEvents.DELETED, {
      timestamp: new Date(),
      messageId,
      conversationId,
      deletedBy,
      deleteType,
    });
  }

  // ============================================
  // CONVERSATION EVENT HELPERS
  // ============================================

  emitConversationCreated(
    conversationId: string,
    creatorId: string,
    participantIds: string[],
    type: 'direct' | 'group' = 'direct',
    name?: string,
  ): void {
    this.emit(ConversationEvents.CREATED, {
      timestamp: new Date(),
      conversationId,
      type,
      creatorId,
      participantIds,
      name,
    });
  }

  emitTypingStarted(conversationId: string, userId: string): void {
    this.emit(ConversationEvents.TYPING_STARTED, {
      timestamp: new Date(),
      conversationId,
      userId,
      isTyping: true,
    });
  }

  emitTypingStopped(conversationId: string, userId: string): void {
    this.emit(ConversationEvents.TYPING_STOPPED, {
      timestamp: new Date(),
      conversationId,
      userId,
      isTyping: false,
    });
  }

  // ============================================
  // CALL EVENT HELPERS
  // ============================================

  emitCallInitiated(
    callId: string,
    callerId: string,
    calleeIds: string[],
    callType: 'audio' | 'video' = 'audio',
  ): void {
    this.emit(CallEvents.INITIATED, {
      timestamp: new Date(),
      callId,
      callerId,
      calleeIds,
      callType,
    });
  }

  emitCallEnded(
    callId: string,
    reason: 'completed' | 'rejected' | 'missed' | 'failed' | 'busy',
    duration?: number,
    participantCount: number = 2,
  ): void {
    this.emit(CallEvents.ENDED, {
      timestamp: new Date(),
      callId,
      reason,
      duration,
      participantCount,
    });
  }

  // ============================================
  // NOTIFICATION EVENT HELPERS
  // ============================================

  emitNotificationCreated(
    notificationId: string,
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): void {
    this.emit(NotificationEvents.CREATED, {
      timestamp: new Date(),
      notificationId,
      userId,
      type,
      title,
      body,
      data,
    });
  }

  // ============================================
  // SYSTEM EVENT HELPERS
  // ============================================

  emitSystemError(
    errorType: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    context?: Record<string, any>,
  ): void {
    this.emit(SystemEvents.ERROR_OCCURRED, {
      timestamp: new Date(),
      errorId: this.generateCorrelationId(),
      errorType,
      message,
      severity,
      context,
    });
  }

  emitSecurityEvent(
    eventType: string,
    details: Record<string, any>,
    severity: 'info' | 'warning' | 'critical' = 'info',
    userId?: string,
    ipAddress?: string,
  ): void {
    this.emit(SystemEvents.SUSPICIOUS_ACTIVITY, {
      timestamp: new Date(),
      eventType,
      userId,
      ipAddress,
      details,
      severity,
    });
  }

  emitRateLimitExceeded(
    ipAddress: string,
    endpoint: string,
    limit: number,
    current: number,
    userId?: string,
  ): void {
    this.emit(SystemEvents.RATE_LIMIT_EXCEEDED, {
      timestamp: new Date(),
      userId,
      ipAddress,
      endpoint,
      limit,
      current,
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private generateCorrelationId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get the underlying EventEmitter2 instance for advanced usage
   */
  getEmitter(): EventEmitter2 {
    return this.eventEmitter;
  }

  /**
   * Check if there are any listeners for an event
   */
  hasListeners(event: AppEvent): boolean {
    return this.eventEmitter.listenerCount(event) > 0;
  }

  /**
   * Get the count of listeners for an event
   */
  listenerCount(event: AppEvent): number {
    return this.eventEmitter.listenerCount(event);
  }
}
