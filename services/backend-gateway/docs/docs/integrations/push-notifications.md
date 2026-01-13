---
sidebar_position: 3
title: Push Notifications
description: Complete push notification implementation guide
---

# Push Notifications Setup

Push notifications are **fully implemented** in QuckChat! This guide will help you enable them in production.

## What's Already Implemented

### Mobile App (React Native/Expo)

- Expo push notifications configured
- Notification permissions handling
- Push token registration with backend
- Notification channels for Android (chat, calls, mentions)
- In-app notification listeners
- Deep linking to conversations/calls when tapping notifications

### Backend (NestJS)

- Expo Push Notification service
- Firebase Cloud Messaging (FCM) support
- Automatic notification sending for:
  - New messages (when user is offline)
  - Incoming calls
  - @Mentions in messages
- FCM token storage in user profiles
- Multi-device support (multiple tokens per user)

## Current Status

| Environment | Status | Notes |
|-------------|--------|-------|
| Development | Working | Uses Expo push tokens |
| Production | Needs Config | Requires Firebase on Railway |

## Enable Push Notifications in Production

### Step 1: Add Firebase Credentials to Railway

1. **Go to Railway Dashboard**: https://railway.app/
2. **Select your backend service**
3. **Go to "Variables" tab**
4. **Click "New Variable"** and add these **3 variables**:

#### Variable 1: FIREBASE_PROJECT_ID

```
FIREBASE_PROJECT_ID=quckchat-2a047
```

#### Variable 2: FIREBASE_CLIENT_EMAIL

```
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@quckchat-2a047.iam.gserviceaccount.com
```

#### Variable 3: FIREBASE_PRIVATE_KEY

Copy as single line with `\n` characters:

```
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvAI...\n-----END PRIVATE KEY-----
```

**Important**: Copy the entire key as one line with `\n` characters (not actual newlines).

5. **Save and deploy** - Railway will automatically redeploy

### Step 2: Verify Configuration

After Railway redeploys, check the logs:

**Success:**
```
[MongoDB] Connecting to production database...
[NotificationsService] Firebase initialized successfully
```

**Failure:**
```
[NotificationsService] Firebase credentials not configured. Push notifications will be disabled.
```

## How Push Notifications Work

### 1. User Opens App

```
Mobile App -> Requests notification permission
          -> Gets Expo Push Token
          -> Sends to backend: PUT /api/v1/users/me/fcm-token
          -> Backend stores token in user.fcmTokens array
```

### 2. Message Notification Flow

```
User A sends message
          |
Backend checks if User B is online
          |
If offline -> Get User B's FCM tokens
          |
Send push notification via Expo/Firebase
          |
User B's device receives notification
          |
User taps -> App opens to conversation
```

### 3. Call Notification Flow

```
User A initiates call
          |
Backend gets User B's FCM tokens
          |
Send high-priority call notification
          |
User B's device shows call screen
          |
User can answer or reject
```

## Testing Push Notifications

### Test 1: Message Notification

1. **Login on Device 1** (e.g., your phone)
2. **Close the app completely** (swipe away from recent apps)
3. **Login on Device 2** (another phone or emulator)
4. **Send a message** from Device 2 to Device 1
5. **Device 1 should receive a notification**

### Test 2: Call Notification

1. **Same setup as above**
2. **Initiate a call** from Device 2 to Device 1
3. **Device 1 should receive a call notification**

### Test 3: Mention Notification

1. **In a group conversation**
2. **Send a message with @mention**
3. **Mentioned user receives notification** even if online

## Troubleshooting

### Issue: "Must use physical device for Push Notifications"

**Solution**: Push notifications don't work on iOS Simulator or Android Emulator. Use a physical device.

### Issue: Notifications not received

**Checklist:**
- Is the app completely closed? (not just in background)
- Are notifications enabled in device settings?
- Is the device connected to internet?
- Did the backend successfully initialize Firebase?
- Check backend logs for "Successfully sent X notifications"

### Issue: "Firebase credentials not configured"

**Solution**: Set the 3 Firebase environment variables on Railway (see Step 1)

### Issue: Token registration failed

**Solution:**
- Check if user is logged in
- Verify API endpoint is accessible
- Check mobile app logs for errors

## Monitoring

### Backend Logs

Monitor these messages:

```
[NotificationsService] Successfully sent 5 Expo notifications
[NotificationsService] 2 FCM notifications failed to send
```

### Database Check

Verify tokens are stored:

```javascript
// In MongoDB, users collection
{
  "_id": "...",
  "phoneNumber": "+1234567890",
  "fcmTokens": ["ExponentPushToken[xxx]", "ExponentPushToken[yyy]"],
  ...
}
```

## Security & Best Practices

1. **Token Cleanup**: Old/invalid tokens are automatically removed on failure
2. **Multi-device**: Users can have multiple tokens (phone, tablet, etc.)
3. **Token Refresh**: Mobile app re-registers token on each launch
4. **Selective Notifications**: Only offline users get message notifications
5. **Call Priority**: Call notifications use MAX priority for immediate delivery

## Implementation Files

### Mobile App

| File | Purpose |
|------|---------|
| `mobile/src/services/notifications.ts` | Notification service |
| `mobile/App.tsx` | Notification setup and listeners |
| `mobile/src/screens/*/` | Deep linking handlers |

### Backend

| File | Purpose |
|------|---------|
| `backend/src/modules/notifications/notifications.service.ts` | Notification service |
| `backend/src/gateways/chat.gateway.ts` | Message notifications |
| `backend/src/gateways/webrtc.gateway.ts` | Call notifications |
| `backend/src/modules/users/schemas/user.schema.ts` | FCM token storage |

## Summary

Push notifications are **100% ready** and working! Just add the 3 Firebase environment variables to Railway and you're done.

- **Expo notifications work out of the box** - no Firebase needed for development!
- **Firebase is only required** for production builds with standalone apps.

For now, your app will work perfectly with Expo push tokens in both dev and production environments.
