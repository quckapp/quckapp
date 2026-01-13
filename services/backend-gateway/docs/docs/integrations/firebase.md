---
sidebar_position: 1
title: Firebase Integration
description: Firebase setup for push notifications
---

# Firebase Integration

QuckChat uses Firebase Cloud Messaging (FCM) for push notifications on mobile and web.

## Setup Overview

1. Create Firebase project
2. Generate service account credentials
3. Configure environment variables
4. Register device tokens from mobile app
5. Send notifications from backend

## Firebase Console Setup

### 1. Create Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project**
3. Enter project name (e.g., `quckchat-prod`)
4. Enable Google Analytics (optional)
5. Click **Create Project**

### 2. Add Apps

#### Android App
1. Click **Add App** > Android
2. Enter package name (e.g., `com.quckchat.app`)
3. Download `google-services.json`
4. Add to mobile project

#### iOS App
1. Click **Add App** > iOS
2. Enter bundle ID
3. Download `GoogleService-Info.plist`
4. Add to iOS project

#### Web App (optional)
1. Click **Add App** > Web
2. Copy Firebase config

### 3. Generate Service Account

1. Go to **Project Settings** > **Service Accounts**
2. Click **Generate New Private Key**
3. Download the JSON file
4. Extract required values:

```json
{
  "project_id": "your-project-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com"
}
```

## Environment Configuration

### Development

```bash
# .env
FIREBASE_PROJECT_ID_DEV=quckchat-dev
FIREBASE_PRIVATE_KEY_DEV="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhk...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL_DEV=firebase-adminsdk@quckchat-dev.iam.gserviceaccount.com
```

### Production

```bash
FIREBASE_PROJECT_ID_PROD=quckchat-prod
FIREBASE_PRIVATE_KEY_PROD="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhk...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL_PROD=firebase-adminsdk@quckchat-prod.iam.gserviceaccount.com
```

### Important Notes

1. **Private Key Escaping**: The private key must include `\n` for line breaks
2. **Quotes**: Wrap the entire key in double quotes
3. **Security**: Never commit credentials to version control

## Backend Implementation

### Firebase Admin SDK Setup

```typescript
// src/common/firebase/firebase.service.ts
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private app: admin.app.App;

  constructor(private configService: ConfigService) {
    const isDev = configService.get('NODE_ENV') === 'development';

    const projectId = isDev
      ? configService.get('FIREBASE_PROJECT_ID_DEV')
      : configService.get('FIREBASE_PROJECT_ID_PROD');

    const privateKey = (isDev
      ? configService.get('FIREBASE_PRIVATE_KEY_DEV')
      : configService.get('FIREBASE_PRIVATE_KEY_PROD')
    )?.replace(/\\n/g, '\n');

    const clientEmail = isDev
      ? configService.get('FIREBASE_CLIENT_EMAIL_DEV')
      : configService.get('FIREBASE_CLIENT_EMAIL_PROD');

    this.app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });
  }
}
```

### Sending Notifications

```typescript
// src/modules/notifications/notifications.service.ts
@Injectable()
export class NotificationsService {
  constructor(private firebaseService: FirebaseService) {}

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const user = await this.usersService.findById(userId);
    const tokens = user.fcmTokens.map(t => t.token);

    if (tokens.length === 0) return;

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'quckchat_messages',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Handle failed tokens
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        this.removeInvalidToken(userId, tokens[idx]);
      }
    });
  }
}
```

### Notification Types

```typescript
// Message notification
await this.sendPushNotification(
  recipientId,
  senderName,
  messagePreview,
  {
    type: 'message',
    conversationId: conversationId,
    messageId: messageId,
  }
);

// Call notification
await this.sendPushNotification(
  calleeId,
  'Incoming Call',
  `${callerName} is calling...`,
  {
    type: 'call',
    callId: callId,
    callType: 'audio', // or 'video'
  }
);

// Reaction notification
await this.sendPushNotification(
  messageOwnerId,
  `${reactorName} reacted`,
  `${emoji} to your message`,
  {
    type: 'reaction',
    messageId: messageId,
  }
);
```

## Mobile Integration

### React Native Setup

```bash
# Install packages
npm install @react-native-firebase/app @react-native-firebase/messaging
```

### Register Token

```typescript
// mobile/src/services/notifications.ts
import messaging from '@react-native-firebase/messaging';

export async function registerForPushNotifications() {
  // Request permission
  const authStatus = await messaging().requestPermission();

  if (authStatus === messaging.AuthorizationStatus.AUTHORIZED) {
    // Get FCM token
    const token = await messaging().getToken();

    // Send to backend
    await api.post('/users/me/fcm-token', {
      token,
      platform: Platform.OS,
    });
  }

  // Listen for token refresh
  messaging().onTokenRefresh(async (token) => {
    await api.post('/users/me/fcm-token', { token, platform: Platform.OS });
  });
}
```

### Handle Notifications

```typescript
// Foreground handler
messaging().onMessage(async (remoteMessage) => {
  console.log('Foreground notification:', remoteMessage);
  // Show local notification
});

// Background handler
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background notification:', remoteMessage);
});

// Handle notification open
messaging().onNotificationOpenedApp((remoteMessage) => {
  // Navigate to relevant screen
  const { type, conversationId } = remoteMessage.data;
  if (type === 'message') {
    navigation.navigate('Chat', { conversationId });
  }
});
```

## Backend API Endpoints

### Register FCM Token

```bash
POST /users/me/fcm-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "fcm-device-token",
  "platform": "android"
}
```

### Remove FCM Token

```bash
DELETE /users/me/fcm-token/:token
Authorization: Bearer <token>
```

## Notification Data Structure

```typescript
interface PushNotificationPayload {
  notification: {
    title: string;
    body: string;
  };
  data: {
    type: 'message' | 'call' | 'reaction' | 'mention' | 'system';
    conversationId?: string;
    messageId?: string;
    callId?: string;
    senderId?: string;
    timestamp: string;
  };
}
```

## Troubleshooting

### Token Not Registering
- Verify Firebase credentials are correct
- Check network connectivity
- Ensure app is registered in Firebase Console

### Notifications Not Received
- Check FCM token is valid
- Verify notification permissions
- Test with Firebase Console **Messaging** tab

### Invalid Token Errors
- Implement token cleanup for failed deliveries
- Refresh tokens on app launch
- Handle token expiration

### Android-Specific
- Create notification channel for Android 8+
- Check battery optimization settings
- Verify `google-services.json` is in correct location

### iOS-Specific
- Upload APNs certificate to Firebase
- Enable Push Notifications capability
- Check provisioning profile includes Push
