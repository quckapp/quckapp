import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NOTIFICATIONS_PATTERNS } from '../../shared/contracts/message-patterns';
import { NotificationsServiceHandler } from './notifications-service.handler';
import { SendNotificationDto } from '../../shared/dto';

/**
 * Notifications Service Controller
 * Handles incoming messages from the message broker
 */
@Controller()
export class NotificationsServiceController {
  constructor(private handler: NotificationsServiceHandler) {}

  @MessagePattern(NOTIFICATIONS_PATTERNS.SEND_NOTIFICATION)
  async sendNotification(@Payload() dto: SendNotificationDto) {
    return this.handler.sendNotification(dto);
  }

  @MessagePattern(NOTIFICATIONS_PATTERNS.SEND_BULK_NOTIFICATIONS)
  async sendBulkNotifications(
    @Payload()
    dto: {
      userIds: string[];
      type: string;
      title: string;
      body: string;
      data?: Record<string, any>;
    },
  ) {
    return this.handler.sendBulkNotifications(dto);
  }

  @MessagePattern(NOTIFICATIONS_PATTERNS.GET_NOTIFICATIONS)
  async getNotifications(
    @Payload() dto: { userId: string; limit?: number; offset?: number; unreadOnly?: boolean },
  ) {
    return this.handler.getNotifications(dto);
  }

  @MessagePattern(NOTIFICATIONS_PATTERNS.MARK_AS_READ)
  async markAsRead(@Payload() dto: { notificationIds: string[]; userId: string }) {
    return this.handler.markAsRead(dto);
  }

  @MessagePattern(NOTIFICATIONS_PATTERNS.MARK_ALL_AS_READ)
  async markAllAsRead(@Payload() dto: { userId: string }) {
    return this.handler.markAllAsRead(dto);
  }

  @MessagePattern(NOTIFICATIONS_PATTERNS.DELETE_NOTIFICATION)
  async deleteNotification(@Payload() dto: { notificationId: string; userId: string }) {
    return this.handler.deleteNotification(dto);
  }

  @MessagePattern(NOTIFICATIONS_PATTERNS.CLEAR_ALL)
  async clearAll(@Payload() dto: { userId: string }) {
    return this.handler.clearAll(dto);
  }

  @MessagePattern(NOTIFICATIONS_PATTERNS.GET_UNREAD_COUNT)
  async getUnreadCount(@Payload() dto: { userId: string }) {
    return this.handler.getUnreadCount(dto);
  }

  @MessagePattern(NOTIFICATIONS_PATTERNS.REGISTER_PUSH_TOKEN)
  async registerPushToken(@Payload() dto: { userId: string; token: string; platform: string }) {
    return this.handler.registerPushToken(dto);
  }

  @MessagePattern(NOTIFICATIONS_PATTERNS.UNREGISTER_PUSH_TOKEN)
  async unregisterPushToken(@Payload() dto: { userId: string; token: string }) {
    return this.handler.unregisterPushToken(dto);
  }

  @MessagePattern(NOTIFICATIONS_PATTERNS.UPDATE_PREFERENCES)
  async updatePreferences(@Payload() dto: { userId: string; preferences: any }) {
    return this.handler.updatePreferences(dto);
  }

  @MessagePattern(NOTIFICATIONS_PATTERNS.GET_PREFERENCES)
  async getPreferences(@Payload() dto: { userId: string }) {
    return this.handler.getPreferences(dto);
  }
}
