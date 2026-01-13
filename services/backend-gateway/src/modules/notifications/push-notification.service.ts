import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private expo: Expo;

  constructor() {
    this.expo = new Expo();
  }

  async sendPushNotification(
    pushTokens: string[],
    title: string,
    body: string,
    data?: any,
  ): Promise<void> {
    const messages: ExpoPushMessage[] = [];

    for (const pushToken of pushTokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        this.logger.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
      }

      messages.push({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        channelId: 'chat_messages',
      });
    }

    if (messages.length === 0) {
      this.logger.warn('No valid push tokens to send notifications to');
      return;
    }

    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        this.logger.error('Error sending push notification chunk:', error);
      }
    }

    // Check tickets for errors
    for (const ticket of tickets) {
      if (ticket.status === 'error') {
        this.logger.error(`Error sending notification: ${ticket.message}`);
        if (ticket.details?.error) {
          this.logger.error(`Error details: ${ticket.details.error}`);
        }
      }
    }
  }

  async sendMessageNotification(
    recipientTokens: string[],
    senderName: string,
    messageContent: string,
    conversationId: string,
  ): Promise<void> {
    await this.sendPushNotification(recipientTokens, senderName, messageContent, {
      type: 'new_message',
      conversationId,
    });
  }

  async sendCallNotification(
    recipientTokens: string[],
    callerName: string,
    callType: 'audio' | 'video',
    callId: string,
  ): Promise<void> {
    await this.sendPushNotification(
      recipientTokens,
      `${callType === 'video' ? 'Video' : 'Audio'} Call`,
      `Incoming call from ${callerName}`,
      {
        type: 'incoming_call',
        callId,
        callType,
      },
    );
  }
}
