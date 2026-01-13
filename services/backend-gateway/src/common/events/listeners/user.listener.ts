import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LoggerService } from '../../logger/logger.service';
import { UserEvents } from '../event.constants';
import {
  User2FAPayload,
  UserCreatedPayload,
  UserLoginFailedPayload,
  UserLoginPayload,
  UserLogoutPayload,
  UserPasswordChangedPayload,
  UserStatusChangedPayload,
} from '../event.payloads';

/**
 * UserEventListener - Handles all user-related events
 * Provides loose coupling between user actions and side effects
 */
@Injectable()
export class UserEventListener {
  constructor(private logger: LoggerService) {}

  @OnEvent(UserEvents.CREATED)
  handleUserCreated(payload: UserCreatedPayload): void {
    this.logger.log(`New user created: ${payload.userId}`, {
      context: 'UserEventListener',
      correlationId: payload.correlationId,
    });

    // Side effects:
    // - Send welcome notification
    // - Initialize user preferences
    // - Create default settings
    // - Track analytics
  }

  @OnEvent(UserEvents.LOGIN)
  handleUserLogin(payload: UserLoginPayload): void {
    this.logger.log(`User logged in: ${payload.userId}`, {
      context: 'UserEventListener',
      correlationId: payload.correlationId,
      deviceType: payload.deviceInfo?.type,
    });

    // Side effects:
    // - Update last active timestamp
    // - Notify other devices
    // - Sync pending data
    // - Record login location
  }

  @OnEvent(UserEvents.LOGOUT)
  handleUserLogout(payload: UserLogoutPayload): void {
    this.logger.log(`User logged out: ${payload.userId} (${payload.reason})`, {
      context: 'UserEventListener',
      correlationId: payload.correlationId,
    });

    // Side effects:
    // - Clear user session
    // - Update presence status
    // - Stop active calls
    // - Save draft messages
  }

  @OnEvent(UserEvents.LOGIN_FAILED)
  handleLoginFailed(payload: UserLoginFailedPayload): void {
    this.logger.warn(`Login failed for ${payload.identifier}: ${payload.reason}`, {
      context: 'UserEventListener',
      correlationId: payload.correlationId,
      ipAddress: payload.ipAddress,
      attemptCount: payload.attemptCount,
    });

    // Side effects:
    // - Increment failed attempt counter
    // - Check for brute force attack
    // - Send security alert if threshold exceeded
    // - Temporarily lock account if needed
  }

  @OnEvent(UserEvents.PASSWORD_CHANGED)
  handlePasswordChanged(payload: UserPasswordChangedPayload): void {
    this.logger.log(`Password changed for user: ${payload.userId}`, {
      context: 'UserEventListener',
      correlationId: payload.correlationId,
    });

    // Side effects:
    // - Invalidate all sessions except current
    // - Send confirmation email/notification
    // - Record in audit log
  }

  @OnEvent(UserEvents.ONLINE)
  handleUserOnline(payload: { userId: string; timestamp: Date }): void {
    this.logger.debug(`User online: ${payload.userId}`, {
      context: 'UserEventListener',
    });

    // Side effects:
    // - Update presence in database
    // - Notify contacts about online status
    // - Deliver pending messages
    // - Resume paused notifications
  }

  @OnEvent(UserEvents.OFFLINE)
  handleUserOffline(payload: { userId: string; timestamp: Date }): void {
    this.logger.debug(`User offline: ${payload.userId}`, {
      context: 'UserEventListener',
    });

    // Side effects:
    // - Update presence in database
    // - Notify contacts about offline status
    // - Save last seen timestamp
    // - Enable push notifications
  }

  @OnEvent(UserEvents.STATUS_CHANGED)
  handleStatusChanged(payload: UserStatusChangedPayload): void {
    this.logger.debug(
      `User ${payload.userId} status changed: ${payload.previousStatus} -> ${payload.newStatus}`,
      {
        context: 'UserEventListener',
      },
    );

    // Side effects:
    // - Broadcast to contacts
    // - Update status in conversations
  }

  @OnEvent(UserEvents.TWO_FACTOR_ENABLED)
  handleTwoFactorEnabled(payload: User2FAPayload): void {
    this.logger.log(`2FA enabled for user: ${payload.userId} (${payload.method})`, {
      context: 'UserEventListener',
      correlationId: payload.correlationId,
    });

    // Side effects:
    // - Send confirmation notification
    // - Update security settings
    // - Log in audit trail
  }

  @OnEvent(UserEvents.TWO_FACTOR_DISABLED)
  handleTwoFactorDisabled(payload: User2FAPayload): void {
    this.logger.warn(`2FA disabled for user: ${payload.userId}`, {
      context: 'UserEventListener',
      correlationId: payload.correlationId,
    });

    // Side effects:
    // - Send security alert
    // - Log in audit trail
  }

  @OnEvent(UserEvents.BLOCKED)
  handleUserBlocked(payload: { userId: string; blockedUserId: string; timestamp: Date }): void {
    this.logger.log(`User ${payload.userId} blocked ${payload.blockedUserId}`, {
      context: 'UserEventListener',
    });

    // Side effects:
    // - Remove from contacts
    // - Hide conversations
    // - Block call attempts
    // - Stop message delivery
  }

  @OnEvent(UserEvents.UNBLOCKED)
  handleUserUnblocked(payload: { userId: string; blockedUserId: string; timestamp: Date }): void {
    this.logger.log(`User ${payload.userId} unblocked ${payload.blockedUserId}`, {
      context: 'UserEventListener',
    });

    // Side effects:
    // - Restore conversation visibility
    // - Allow message delivery
  }
}
