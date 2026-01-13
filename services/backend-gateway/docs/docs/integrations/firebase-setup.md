---
sidebar_position: 2
title: Firebase Setup
description: Complete guide to setting up Firebase for push notifications
---

# Firebase Push Notifications Setup Guide

This guide will help you configure Firebase for push notifications in the QuckChat backend.

## Step 1: Firebase Console Setup

### 1.1 Create or Access Your Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Your project: **quckchat-2a047**
3. If you don't have a project, create one:
   - Click "Add project"
   - Enter project name
   - Follow the setup wizard

### 1.2 Generate Service Account Key

1. In Firebase Console, click the gear icon - **Project Settings**
2. Go to the **Service Accounts** tab
3. Click **Generate New Private Key**
4. Click **Generate Key** - this downloads a JSON file
5. Keep this file secure - it contains sensitive credentials

## Step 2: Extract Credentials from JSON

The downloaded JSON file looks like this:

```json
{
  "type": "service_account",
  "project_id": "quckchat-2a047",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@quckchat-2a047.iam.gserviceaccount.com",
  ...
}
```

Extract these three values:
- `project_id` -> `FIREBASE_PROJECT_ID`
- `private_key` -> `FIREBASE_PRIVATE_KEY`
- `client_email` -> `FIREBASE_CLIENT_EMAIL`

## Step 3: Configure Environment Variables

### For Local Development (.env file)

Add to your `.env` file:

```env
FIREBASE_PROJECT_ID=quckchat-2a047
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCwGg5xkhDjpfBB\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@quckchat-2a047.iam.gserviceaccount.com
```

**Important Notes:**
- Keep the quotes around `FIREBASE_PRIVATE_KEY`
- Keep the `\n` characters (they represent newlines)
- Don't modify the private key format

### For Production (Railway)

When setting on Railway, the format is slightly different. See the [Railway Deployment](/deployment/railway) guide for details.

**Key difference:** On Railway, remove the outer quotes but keep the `\n` characters:

```
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvAI...
```

## Step 4: Verify Configuration

After setting the environment variables, restart your backend server.

### Success Indicators

Check your logs for this message:

```
[NotificationsService] Firebase initialized successfully
```

### Failure Indicators

If you see this warning:

```
[NotificationsService] Firebase credentials not configured. Push notifications will be disabled.
```

**Troubleshooting:**
1. Check that all three environment variables are set
2. Verify the private key format (should include `\n` characters)
3. Make sure there are no extra spaces or quotes
4. Restart the server after changing variables

## Step 5: Enable Cloud Messaging API

1. In Firebase Console - **Project Settings**
2. Go to **Cloud Messaging** tab
3. Under **Cloud Messaging API (Legacy)**, note your **Server Key**
4. Make sure **Cloud Messaging API** is enabled in Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your project
   - Go to **APIs & Services** - **Library**
   - Search for "Firebase Cloud Messaging API"
   - Click **Enable** if not already enabled

## How Push Notifications Work

### Expo Push Tokens

- Mobile app uses Expo's push notification service
- Users get an Expo Push Token (format: `ExponentPushToken[xxx]`)
- Backend sends notifications via Expo's API
- No Firebase required for Expo tokens

### Firebase Cloud Messaging (FCM) Tokens

- For native iOS/Android builds (not Expo)
- Users get an FCM token
- Backend sends via Firebase Admin SDK
- Requires Firebase configuration

### Current Implementation

The backend supports **both** Expo and FCM tokens:
- Automatically detects token type
- Routes to appropriate service (Expo or Firebase)
- See `src/modules/notifications/notifications.service.ts`

## Testing Push Notifications

### 1. Register a Test Device

When a user logs in on mobile app, their push token is saved:

```typescript
// Mobile app automatically sends token
PUT /api/v1/users/me/fcm-token
{
  "fcmToken": "ExponentPushToken[xxx]"
}
```

### 2. Trigger a Notification

Send a message to trigger a notification:
- The chat gateway automatically sends notifications to offline users
- Check `src/gateways/chat.gateway.ts` for notification logic

### 3. Check Logs

Monitor server logs for:

```
[NotificationsService] Successfully sent X Expo notifications
```

## Security Best Practices

1. **Never commit** the service account JSON file or .env file
2. **Rotate keys** if accidentally exposed
3. **Use different projects** for development and production
4. **Restrict API keys** in Firebase Console - Project Settings - API restrictions
5. **Monitor usage** in Firebase Console - Cloud Messaging - Usage

## Current Configuration

Your Firebase project is already configured:
- **Project ID**: quckchat-2a047
- **Service Account**: firebase-adminsdk-fbsvc@quckchat-2a047.iam.gserviceaccount.com
- Push notifications are **enabled** and working

## Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
