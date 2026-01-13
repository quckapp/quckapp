import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LoggerService } from '../../logger/logger.service';
import {
  CallEvents,
  CommunityEvents,
  MessageEvents,
  NotificationEvents,
  PollEvents,
  StatusEvents,
  UserEvents,
} from '../event.constants';

/**
 * NotificationEventListener - Creates notifications based on various events
 * This listener demonstrates how events enable loose coupling
 */
@Injectable()
export class NotificationEventListener {
  constructor(private logger: LoggerService) {}

  // ============================================
  // MESSAGE NOTIFICATIONS
  // ============================================

  @OnEvent(MessageEvents.SENT)
  async handleNewMessage(payload: any): Promise<void> {
    this.logger.debug('Creating notification for new message', {
      context: 'NotificationEventListener',
      messageId: payload.messageId,
    });

    // Create push notifications for offline recipients
    // This runs asynchronously without blocking the message send
    for (const recipientId of payload.recipientIds) {
      // Check if recipient is online
      // If offline, queue push notification
      // Implement notification batching for multiple messages
    }
  }

  @OnEvent(MessageEvents.REACTION_ADDED)
  async handleReactionNotification(payload: any): Promise<void> {
    this.logger.debug('Creating notification for reaction', {
      context: 'NotificationEventListener',
      messageId: payload.messageId,
      reaction: payload.reaction,
    });

    // Notify message sender about the reaction
    // Don't notify if sender reacted to their own message
  }

  // ============================================
  // CALL NOTIFICATIONS
  // ============================================

  @OnEvent(CallEvents.INITIATED)
  async handleIncomingCall(payload: any): Promise<void> {
    this.logger.debug('Creating notification for incoming call', {
      context: 'NotificationEventListener',
      callId: payload.callId,
    });

    // Send push notifications to callees
    // These need to be high-priority for timely delivery
  }

  @OnEvent(CallEvents.MISSED)
  async handleMissedCall(payload: any): Promise<void> {
    this.logger.debug('Creating notification for missed call', {
      context: 'NotificationEventListener',
      callId: payload.callId,
    });

    // Send missed call notification
  }

  // ============================================
  // USER NOTIFICATIONS
  // ============================================

  @OnEvent(UserEvents.LOGIN_FAILED)
  async handleLoginFailedNotification(payload: any): Promise<void> {
    // After multiple failed attempts, notify user of suspicious activity
    if (payload.attemptCount && payload.attemptCount >= 3) {
      this.logger.warn('Creating security notification for failed logins', {
        context: 'NotificationEventListener',
        identifier: payload.identifier,
        attempts: payload.attemptCount,
      });

      // Send security alert notification
    }
  }

  @OnEvent(UserEvents.PASSWORD_CHANGED)
  async handlePasswordChangeNotification(payload: any): Promise<void> {
    this.logger.debug('Creating notification for password change', {
      context: 'NotificationEventListener',
      userId: payload.userId,
    });

    // Send confirmation notification
    // Alert about password change from new device/location
  }

  @OnEvent(UserEvents.TWO_FACTOR_ENABLED)
  async handle2FAEnabledNotification(payload: any): Promise<void> {
    this.logger.debug('Creating notification for 2FA enabled', {
      context: 'NotificationEventListener',
      userId: payload.userId,
    });

    // Send confirmation notification
  }

  @OnEvent(UserEvents.TWO_FACTOR_DISABLED)
  async handle2FADisabledNotification(payload: any): Promise<void> {
    this.logger.warn('Creating security notification for 2FA disabled', {
      context: 'NotificationEventListener',
      userId: payload.userId,
    });

    // Send security alert - 2FA was disabled
  }

  // ============================================
  // STATUS NOTIFICATIONS
  // ============================================

  @OnEvent(StatusEvents.CREATED)
  async handleNewStatus(payload: any): Promise<void> {
    this.logger.debug('Creating notification for new status', {
      context: 'NotificationEventListener',
      statusId: payload.statusId,
    });

    // Optionally notify close friends about new status
    // Most apps don't do this, but some have "notify contacts" feature
  }

  @OnEvent(StatusEvents.REPLY_SENT)
  async handleStatusReply(payload: any): Promise<void> {
    this.logger.debug('Creating notification for status reply', {
      context: 'NotificationEventListener',
      statusId: payload.statusId,
    });

    // Notify status creator about the reply
  }

  // ============================================
  // POLL NOTIFICATIONS
  // ============================================

  @OnEvent(PollEvents.CLOSED)
  async handlePollClosed(payload: any): Promise<void> {
    this.logger.debug('Creating notification for poll closed', {
      context: 'NotificationEventListener',
      pollId: payload.pollId,
    });

    // Notify all voters about poll results
  }

  // ============================================
  // COMMUNITY NOTIFICATIONS
  // ============================================

  @OnEvent(CommunityEvents.MEMBER_JOINED)
  async handleMemberJoined(payload: any): Promise<void> {
    this.logger.debug('Creating notification for new community member', {
      context: 'NotificationEventListener',
      communityId: payload.communityId,
      userId: payload.userId,
    });

    // Notify admins about new member
    // Welcome message to new member
  }

  @OnEvent(CommunityEvents.ROLE_ASSIGNED)
  async handleRoleAssigned(payload: any): Promise<void> {
    this.logger.debug('Creating notification for role assignment', {
      context: 'NotificationEventListener',
      communityId: payload.communityId,
      userId: payload.userId,
      role: payload.role,
    });

    // Notify user about their new role
  }

  // ============================================
  // NOTIFICATION LIFECYCLE
  // ============================================

  @OnEvent(NotificationEvents.SENT)
  handleNotificationSent(payload: any): void {
    this.logger.debug('Notification sent successfully', {
      context: 'NotificationEventListener',
      notificationId: payload.notificationId,
      channel: payload.channel,
    });
  }

  @OnEvent(NotificationEvents.FAILED)
  handleNotificationFailed(payload: any): void {
    this.logger.error('Notification failed to send', {
      context: 'NotificationEventListener',
      notificationId: payload.notificationId,
      error: payload.error,
    });

    // Retry logic or fallback to different channel
  }
}
