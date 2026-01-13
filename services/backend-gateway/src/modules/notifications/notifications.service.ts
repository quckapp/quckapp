import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { LoggerService } from '../../common/logger/logger.service';

@Injectable()
export class NotificationsService {
  private firebaseApp: admin.app.App;
  private expo: Expo;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.initializeFirebase();
    this.expo = new Expo();
  }

  private initializeFirebase() {
    try {
      const env = this.configService.get('NODE_ENV') || 'development';
      let projectId: string | undefined;
      let privateKey: string | undefined;
      let clientEmail: string | undefined;

      // Use environment-specific Firebase credentials
      if (env === 'production') {
        projectId =
          this.configService.get('FIREBASE_PROJECT_ID_PROD') ||
          this.configService.get('FIREBASE_PROJECT_ID');
        const prodKey = this.configService.get('FIREBASE_PRIVATE_KEY_PROD');
        const fallbackKey = this.configService.get('FIREBASE_PRIVATE_KEY');
        privateKey = prodKey?.replace(/\\n/g, '\n') || fallbackKey?.replace(/\\n/g, '\n');
        clientEmail =
          this.configService.get('FIREBASE_CLIENT_EMAIL_PROD') ||
          this.configService.get('FIREBASE_CLIENT_EMAIL');
      } else {
        projectId =
          this.configService.get('FIREBASE_PROJECT_ID_DEV') ||
          this.configService.get('FIREBASE_PROJECT_ID');
        const devKey = this.configService.get('FIREBASE_PRIVATE_KEY_DEV');
        const fallbackKey = this.configService.get('FIREBASE_PRIVATE_KEY');
        privateKey = devKey?.replace(/\\n/g, '\n') || fallbackKey?.replace(/\\n/g, '\n');
        clientEmail =
          this.configService.get('FIREBASE_CLIENT_EMAIL_DEV') ||
          this.configService.get('FIREBASE_CLIENT_EMAIL');
      }

      if (!projectId || !privateKey || !clientEmail) {
        this.logger.warn(
          'Firebase credentials not configured. Push notifications will be disabled.',
          'NotificationsService',
        );
        return;
      }

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        }),
      });

      this.logger.log(
        `Firebase initialized successfully for ${env} environment`,
        'NotificationsService',
      );
    } catch (error: any) {
      this.logger.error('Failed to initialize Firebase', error.message, 'NotificationsService');
    }
  }

  async sendExpoPushNotification(
    expoPushTokens: string[],
    title: string,
    body: string,
    data?: any,
    options?: {
      priority?: 'default' | 'normal' | 'high';
      channelId?: string;
      badge?: number;
      sound?: string | null;
      ttl?: number;
    },
  ): Promise<void> {
    const messages: ExpoPushMessage[] = [];

    for (const pushToken of expoPushTokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        this.logger.warn(
          `Token ${pushToken} is not a valid Expo push token`,
          'NotificationsService',
        );
        continue;
      }

      // Determine channel ID based on notification type
      const channelId = options?.channelId || this.getChannelId(data?.type);

      messages.push({
        to: pushToken,
        sound: options?.sound !== undefined ? options.sound : 'default',
        title,
        body,
        data: data || {},
        priority: options?.priority || 'high',
        channelId,
        badge: options?.badge,
        ttl: options?.ttl || 3600, // 1 hour default TTL
      });
    }

    if (messages.length === 0) {
      return;
    }

    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        this.logger.log(`Sent ${chunk.length} Expo push notifications`, 'NotificationsService');
      } catch (error) {
        this.logger.error(
          'Error sending Expo push notification chunk',
          error.message,
          'NotificationsService',
        );
      }
    }

    // Check tickets for errors
    for (const ticket of tickets) {
      if (ticket.status === 'error') {
        this.logger.error(
          `Expo notification error: ${ticket.message}`,
          ticket.details?.error || '',
          'NotificationsService',
        );
      }
    }
  }

  /**
   * Get appropriate channel ID based on notification type
   */
  private getChannelId(type?: string): string {
    if (!type) {
      return 'chat_messages';
    }

    switch (type) {
      case 'call':
      case 'incoming_call':
        return 'calls';
      case 'message':
      case 'new_message':
        return 'chat_messages';
      case 'group_message':
        return 'group_messages';
      case 'mention':
        return 'mentions';
      case 'reaction':
        return 'reactions';
      default:
        return 'chat_messages';
    }
  }

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
  ): Promise<void> {
    // Separate Expo tokens from FCM tokens
    const expoTokens = fcmTokens.filter((token) => token.startsWith('ExponentPushToken'));
    const firebaseTokens = fcmTokens.filter((token) => !token.startsWith('ExponentPushToken'));

    // Get channel ID from notification type
    const channelId = this.getChannelId(data?.type);

    // Send to Expo
    if (expoTokens.length > 0) {
      await this.sendExpoPushNotification(expoTokens, title, body, data, {
        ...options,
        channelId,
      });
    }

    // Send to Firebase
    if (!this.firebaseApp || firebaseTokens.length === 0) {
      return;
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: firebaseTokens,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority:
            options?.priority === 'normal' || options?.priority === 'high'
              ? options.priority
              : 'high',
          notification: {
            sound:
              options?.sound !== undefined && options?.sound !== null ? options.sound : 'default',
            channelId,
            priority: options?.priority === 'high' ? 'max' : 'high',
          },
          ttl: options?.ttl || 3600000, // 1 hour
        },
        apns: {
          headers: {
            'apns-priority': options?.priority === 'high' ? '10' : '5',
          },
          payload: {
            aps: {
              sound:
                options?.sound !== undefined && options?.sound !== null ? options.sound : 'default',
              badge: options?.badge || 1,
              contentAvailable: true, // Enable background notifications
            },
          },
        },
      };

      // Use sendEachForMulticast instead of sendMulticast to avoid batch API issues
      // sendMulticast uses the batch endpoint which may return 404 in some configurations
      const response = await admin.messaging().sendEachForMulticast(message);

      if (response.failureCount > 0) {
        this.logger.warn(
          `${response.failureCount} FCM notifications failed to send`,
          'NotificationsService',
        );
        // Log individual failures
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            this.logger.error(
              `Failed to send to token ${idx}: ${resp.error?.message}`,
              '',
              'NotificationsService',
            );
          }
        });
      } else {
        this.logger.log(
          `Successfully sent ${response.successCount} FCM notifications`,
          'NotificationsService',
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to send FCM push notification',
        error.message,
        'NotificationsService',
      );
    }
  }

  async sendMessageNotification(
    fcmTokens: string[],
    senderName: string,
    messageContent: string,
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    await this.sendPushNotification(fcmTokens, senderName, messageContent, {
      type: 'message',
      conversationId,
      messageId,
    });
  }

  async sendCallNotification(
    fcmTokens: string[],
    callerName: string,
    callType: 'audio' | 'video',
    conversationId: string,
    callId: string,
  ): Promise<void> {
    // Separate Expo tokens from FCM tokens
    const expoTokens = fcmTokens.filter((token) => token.startsWith('ExponentPushToken'));
    const firebaseTokens = fcmTokens.filter((token) => !token.startsWith('ExponentPushToken'));

    // Send to Expo tokens using standard notification
    if (expoTokens.length > 0) {
      await this.sendExpoPushNotification(
        expoTokens,
        `Incoming ${callType} call`,
        `${callerName} is calling you`,
        {
          type: 'call',
          callType,
          conversationId,
          callId,
        },
        {
          priority: 'high',
          channelId: 'calls',
          sound: 'default',
          ttl: 30,
        },
      );
    }

    // Send to Firebase tokens with special call handling
    if (!this.firebaseApp || firebaseTokens.length === 0) {
      return;
    }

    try {
      // Include notification payload so Android shows a system notification
      // when the app is killed/closed, since CallKeep doesn't work with New Architecture.
      // The data payload is also included for foreground handling.
      const message: admin.messaging.MulticastMessage = {
        tokens: firebaseTokens,
        // Notification payload - shows system notification when app is killed
        notification: {
          title: `Incoming ${callType} call`,
          body: `${callerName} is calling you`,
        },
        // Data payload - for app to handle when opened
        data: {
          type: 'incoming_call',
          callType,
          conversationId,
          callId,
          callerName,
          // Flag to indicate this should trigger call UI
          showCallUI: 'true',
          // Include title/body in data for JS handler to use if needed
          title: `Incoming ${callType} call`,
          body: `${callerName} is calling you`,
        },
        android: {
          priority: 'high',
          ttl: 30000, // 30 seconds
          notification: {
            channelId: 'calls',
            priority: 'max',
            sound: 'default',
            // Use call-specific settings for high visibility
            defaultVibrateTimings: false,
            vibrateTimingsMillis: [0, 500, 200, 500, 200, 500],
            defaultSound: false,
            visibility: 'public',
            // Note: Don't set clickAction - let Android use default behavior
            // which opens the app's launcher activity. FLUTTER_NOTIFICATION_CLICK
            // was causing issues as it's for Flutter apps only.
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-push-type': 'alert',
          },
          payload: {
            aps: {
              alert: {
                title: `Incoming ${callType} call`,
                body: `${callerName} is calling you`,
              },
              sound: 'default',
              contentAvailable: true,
              category: 'INCOMING_CALL',
            },
          },
        },
      };

      // Use sendEachForMulticast instead of sendMulticast to avoid batch API issues
      // sendMulticast uses the batch endpoint which may return 404 in some configurations
      const response = await admin.messaging().sendEachForMulticast(message);

      if (response.failureCount > 0) {
        this.logger.warn(
          `${response.failureCount} call notifications failed to send`,
          'NotificationsService',
        );
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            this.logger.error(
              `Failed to send call notification to token ${idx}: ${resp.error?.message}`,
              '',
              'NotificationsService',
            );
          }
        });
      } else {
        this.logger.log(
          `Successfully sent ${response.successCount} call notifications`,
          'NotificationsService',
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to send call notification',
        error.message,
        'NotificationsService',
      );
    }
  }
}
