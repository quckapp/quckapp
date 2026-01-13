import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  Notification,
  NotificationDocument,
  NotificationPreferences,
  NotificationPreferencesDocument,
  PushToken,
  PushTokenDocument,
} from './schemas/notification.schema';
import { SERVICES } from '../../shared/constants/services';
import {
  ERROR_CODES,
  errorResponse,
  successResponse,
} from '../../shared/utils/service-response.util';
import {
  IPaginatedResponse,
  IServiceResponse,
} from '../../shared/interfaces/microservice.interface';

interface NotificationDto {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  imageUrl?: string;
  actionUrl?: string;
  priority: string;
  createdAt: Date;
}

interface SendNotificationDto {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  priority?: string;
}

/**
 * Notifications Service Handler
 * Business logic for notification operations with MongoDB
 */
@Injectable()
export class NotificationsServiceHandler {
  private readonly logger = new Logger(NotificationsServiceHandler.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(PushToken.name) private pushTokenModel: Model<PushTokenDocument>,
    @InjectModel(NotificationPreferences.name)
    private preferencesModel: Model<NotificationPreferencesDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {}

  private toNotificationDto(doc: NotificationDocument): NotificationDto {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      type: doc.type,
      title: doc.title,
      body: doc.body,
      data: doc.data,
      isRead: doc.isRead,
      readAt: doc.readAt,
      imageUrl: doc.imageUrl,
      actionUrl: doc.actionUrl,
      priority: doc.priority,
      createdAt: (doc as any).createdAt,
    };
  }

  async sendNotification(dto: SendNotificationDto): Promise<IServiceResponse<NotificationDto>> {
    try {
      // Check user preferences first
      const preferences = await this.getOrCreatePreferences(dto.userId);
      if (!this.shouldSendNotification(preferences, dto.type)) {
        this.logger.debug(`Notification blocked by user preferences: ${dto.userId}`);
        return successResponse(null as any, SERVICES.NOTIFICATIONS_SERVICE);
      }

      // Create in-app notification
      const notification = new this.notificationModel({
        userId: new Types.ObjectId(dto.userId),
        type: dto.type,
        title: dto.title,
        body: dto.body,
        data: dto.data || {},
        imageUrl: dto.imageUrl,
        actionUrl: dto.actionUrl,
        priority: dto.priority || 'normal',
        isRead: false,
        isSent: false,
      });

      const saved = await notification.save();

      // Send push notification if enabled
      if (preferences.pushEnabled) {
        await this.sendPushNotification(dto.userId, {
          title: dto.title,
          body: dto.body,
          data: dto.data,
          imageUrl: dto.imageUrl,
        });

        saved.isSent = true;
        saved.sentAt = new Date();
        await saved.save();
      }

      // Invalidate unread count cache
      await this.cacheManager.del(`unread_count:${dto.userId}`);

      this.logger.log(`Notification sent to ${dto.userId}: ${dto.type}`);

      return successResponse(this.toNotificationDto(saved), SERVICES.NOTIFICATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to send notification: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    }
  }

  async sendBulkNotifications(dto: {
    userIds: string[];
    type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }): Promise<IServiceResponse<{ sent: number; failed: number }>> {
    try {
      let sent = 0;
      let failed = 0;

      for (const userId of dto.userIds) {
        const result = await this.sendNotification({
          userId,
          type: dto.type,
          title: dto.title,
          body: dto.body,
          data: dto.data,
        });

        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      }

      return successResponse({ sent, failed }, SERVICES.NOTIFICATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to send bulk notifications: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    }
  }

  async getNotifications(dto: {
    userId: string;
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Promise<IServiceResponse<IPaginatedResponse<NotificationDto>>> {
    try {
      const limit = Math.min(dto.limit || 50, 100);
      const offset = dto.offset || 0;

      const query: any = {
        userId: new Types.ObjectId(dto.userId),
      };

      if (dto.unreadOnly) {
        query.isRead = false;
      }

      const [notifications, total] = await Promise.all([
        this.notificationModel.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).exec(),
        this.notificationModel.countDocuments(query),
      ]);

      return successResponse(
        {
          items: notifications.map((n) => this.toNotificationDto(n)),
          total,
          limit,
          offset,
          hasMore: offset + notifications.length < total,
        },
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get notifications: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    }
  }

  async getUnreadCount(dto: { userId: string }): Promise<IServiceResponse<{ count: number }>> {
    try {
      const cacheKey = `unread_count:${dto.userId}`;
      const cached = await this.cacheManager.get<number>(cacheKey);
      if (cached !== undefined && cached !== null) {
        return successResponse({ count: cached }, SERVICES.NOTIFICATIONS_SERVICE);
      }

      const count = await this.notificationModel.countDocuments({
        userId: new Types.ObjectId(dto.userId),
        isRead: false,
      });

      await this.cacheManager.set(cacheKey, count, 60000); // Cache for 1 minute

      return successResponse({ count }, SERVICES.NOTIFICATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to get unread count: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    }
  }

  async markAsRead(dto: {
    notificationIds: string[];
    userId: string;
  }): Promise<IServiceResponse<{ marked: number }>> {
    try {
      const result = await this.notificationModel.updateMany(
        {
          _id: { $in: dto.notificationIds.map((id) => new Types.ObjectId(id)) },
          userId: new Types.ObjectId(dto.userId),
          isRead: false,
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        },
      );

      await this.cacheManager.del(`unread_count:${dto.userId}`);

      return successResponse({ marked: result.modifiedCount }, SERVICES.NOTIFICATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to mark notifications as read: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    }
  }

  async markAllAsRead(dto: { userId: string }): Promise<IServiceResponse<{ marked: number }>> {
    try {
      const result = await this.notificationModel.updateMany(
        {
          userId: new Types.ObjectId(dto.userId),
          isRead: false,
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        },
      );

      await this.cacheManager.del(`unread_count:${dto.userId}`);

      return successResponse({ marked: result.modifiedCount }, SERVICES.NOTIFICATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to mark all notifications as read: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    }
  }

  async deleteNotification(dto: {
    notificationId: string;
    userId: string;
  }): Promise<IServiceResponse<{ deleted: boolean }>> {
    try {
      const result = await this.notificationModel.deleteOne({
        _id: new Types.ObjectId(dto.notificationId),
        userId: new Types.ObjectId(dto.userId),
      });

      if (result.deletedCount === 0) {
        return errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Notification not found',
          SERVICES.NOTIFICATIONS_SERVICE,
        );
      }

      await this.cacheManager.del(`unread_count:${dto.userId}`);

      return successResponse({ deleted: true }, SERVICES.NOTIFICATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to delete notification: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    }
  }

  async clearAll(dto: { userId: string }): Promise<IServiceResponse<{ cleared: number }>> {
    try {
      const result = await this.notificationModel.deleteMany({
        userId: new Types.ObjectId(dto.userId),
      });

      await this.cacheManager.del(`unread_count:${dto.userId}`);

      return successResponse({ cleared: result.deletedCount }, SERVICES.NOTIFICATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to clear notifications: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    }
  }

  // Push Token Management
  async registerPushToken(dto: {
    userId: string;
    token: string;
    platform: string;
    deviceId?: string;
    deviceName?: string;
  }): Promise<IServiceResponse<{ registered: boolean }>> {
    try {
      await this.pushTokenModel.findOneAndUpdate(
        { token: dto.token },
        {
          userId: new Types.ObjectId(dto.userId),
          token: dto.token,
          platform: dto.platform,
          deviceId: dto.deviceId,
          deviceName: dto.deviceName,
          isActive: true,
          lastUsedAt: new Date(),
        },
        { upsert: true, new: true },
      );

      this.logger.log(`Push token registered for user ${dto.userId}`);

      return successResponse({ registered: true }, SERVICES.NOTIFICATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to register push token: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    }
  }

  async unregisterPushToken(dto: {
    token: string;
  }): Promise<IServiceResponse<{ unregistered: boolean }>> {
    try {
      await this.pushTokenModel.deleteOne({ token: dto.token });

      return successResponse({ unregistered: true }, SERVICES.NOTIFICATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to unregister push token: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    }
  }

  async getUserTokens(dto: { userId: string }): Promise<IServiceResponse<{ tokens: any[] }>> {
    try {
      const tokens = await this.pushTokenModel.find({
        userId: new Types.ObjectId(dto.userId),
        isActive: true,
      });

      return successResponse(
        {
          tokens: tokens.map((t) => ({
            token: t.token,
            platform: t.platform,
            deviceId: t.deviceId,
            deviceName: t.deviceName,
            lastUsedAt: t.lastUsedAt,
          })),
        },
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get user tokens: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    }
  }

  // Preferences Management
  async getPreferences(dto: { userId: string }): Promise<IServiceResponse<any>> {
    try {
      const preferences = await this.getOrCreatePreferences(dto.userId);

      return successResponse(
        {
          pushEnabled: preferences.pushEnabled,
          emailEnabled: preferences.emailEnabled,
          smsEnabled: preferences.smsEnabled,
          messageNotifications: preferences.messageNotifications,
          callNotifications: preferences.callNotifications,
          groupNotifications: preferences.groupNotifications,
          mentionNotifications: preferences.mentionNotifications,
          reactionNotifications: preferences.reactionNotifications,
          statusNotifications: preferences.statusNotifications,
          doNotDisturb: preferences.doNotDisturb,
          doNotDisturbUntil: preferences.doNotDisturbUntil,
          quietHoursEnabled: preferences.quietHoursEnabled,
          quietHoursStart: preferences.quietHoursStart,
          quietHoursEnd: preferences.quietHoursEnd,
        },
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get preferences: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    }
  }

  async updatePreferences(dto: {
    userId: string;
    preferences: Partial<{
      pushEnabled: boolean;
      emailEnabled: boolean;
      smsEnabled: boolean;
      messageNotifications: boolean;
      callNotifications: boolean;
      groupNotifications: boolean;
      mentionNotifications: boolean;
      reactionNotifications: boolean;
      statusNotifications: boolean;
      doNotDisturb: boolean;
      doNotDisturbUntil: Date;
      quietHoursEnabled: boolean;
      quietHoursStart: string;
      quietHoursEnd: string;
    }>;
  }): Promise<IServiceResponse<any>> {
    try {
      const updated = await this.preferencesModel.findOneAndUpdate(
        { userId: new Types.ObjectId(dto.userId) },
        { $set: dto.preferences },
        { new: true, upsert: true },
      );

      return successResponse(updated, SERVICES.NOTIFICATIONS_SERVICE);
    } catch (error: any) {
      this.logger.error(`Failed to update preferences: ${error.message}`, error.stack);
      return errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        error.message,
        SERVICES.NOTIFICATIONS_SERVICE,
      );
    }
  }

  // Helper methods
  private async getOrCreatePreferences(userId: string): Promise<NotificationPreferencesDocument> {
    let preferences = await this.preferencesModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!preferences) {
      preferences = await this.preferencesModel.create({
        userId: new Types.ObjectId(userId),
      });
    }

    return preferences;
  }

  private shouldSendNotification(
    preferences: NotificationPreferencesDocument,
    type: string,
  ): boolean {
    // Check DND
    if (preferences.doNotDisturb) {
      if (!preferences.doNotDisturbUntil || new Date() < preferences.doNotDisturbUntil) {
        return false;
      }
    }

    // Check quiet hours
    if (preferences.quietHoursEnabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (currentTime >= preferences.quietHoursStart && currentTime <= preferences.quietHoursEnd) {
        return false;
      }
    }

    // Check type-specific preferences
    switch (type) {
      case 'message':
        return preferences.messageNotifications;
      case 'call':
        return preferences.callNotifications;
      case 'group':
        return preferences.groupNotifications;
      case 'mention':
        return preferences.mentionNotifications;
      case 'reaction':
        return preferences.reactionNotifications;
      case 'status':
        return preferences.statusNotifications;
      default:
        return true;
    }
  }

  private async sendPushNotification(
    userId: string,
    notification: { title: string; body: string; data?: Record<string, any>; imageUrl?: string },
  ): Promise<void> {
    try {
      const tokens = await this.pushTokenModel.find({
        userId: new Types.ObjectId(userId),
        isActive: true,
      });

      if (tokens.length === 0) {
        this.logger.debug(`No push tokens found for user ${userId}`);
        return;
      }

      // In production, integrate with FCM, APNs, or Expo
      // This is a placeholder for the push notification logic
      for (const token of tokens) {
        this.logger.debug(
          `Would send push to ${token.platform}: ${token.token.substring(0, 20)}...`,
        );

        // Update last used timestamp
        token.lastUsedAt = new Date();
        await token.save();
      }

      this.logger.log(`Push notification sent to ${tokens.length} devices for user ${userId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send push notification: ${error.message}`, error.stack);
    }
  }
}
